import { prisma } from "./db";

// Known crawlers are filtered out in memory only; the User-Agent value is never
// stored or logged (see Story 16.1 privacy requirements).
//
// The `bot` patterns are deliberately case-sensitive and require a lowercase
// letter before the suffix: `Googlebot`, `bingbot` and `DiscordBot` all match,
// while real device tokens such as `Linux; Android 11; CUBOT NOTE 20` do not.
// A bare /bot/i would classify those readers as crawlers permanently, and the
// undercount would be invisible because the User-Agent is never logged.
const BOT_PATTERNS: RegExp[] = [
  /[a-z](?:bot|Bot)\b/,
  /bot\//i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /facebookexternalhit/i,
  /embedly/i,
  /link preview/i,
  /pinterest/i,
  /whatsapp/i,
  /telegram/i,
  /discord/i,
  /vkshare/i,
  /headlesschrome/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,
  /prerender/i,
  /lighthouse/i,
  /monitoring/i,
  /uptime/i,
  /ia_archiver/i,
  /mediapartners-google/i,
  /google favicon/i,
  /scrapy/i,
  /libwww-perl/i,
  /curl\//i,
  /wget/i,
  /python-requests/i,
  /node-fetch/i,
  /axios\//i,
  /go-http-client/i,
  /okhttp/i,
  /apache-httpclient/i,
  /java\//i,
];

export const startOfUtcDay = (date: Date = new Date()): Date => {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
};

/**
 * Every real browser sends a User-Agent, so a request without one is treated as
 * a bot: otherwise the whole filter is bypassed by omitting a single header
 * (`curl -A ''` would sidestep the `curl/` pattern below).
 */
export const isBotUserAgent = (userAgent: string | null | undefined): boolean => {
  if (!userAgent) {
    return true;
  }

  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
};

const hasPrismaCode = (error: unknown, code: string): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
};

// Row already exists — another request created it between our read and write.
const isUniqueConstraintError = (error: unknown): boolean =>
  hasPrismaCode(error, "P2002");

// The trip or entry was deleted mid-request. Counting is best effort: there is
// nothing left to count, and the reader must never see a 500 for a lost race.
const isMissingTargetError = (error: unknown): boolean =>
  hasPrismaCode(error, "P2025") || hasPrismaCode(error, "P2003");

/**
 * Increments a daily view bucket, creating it on first sight.
 *
 * `upsert` is not atomic against a concurrent creator, so a `P2002` is retried
 * once as a plain `update`. Both the initial write and the retry tolerate the
 * target disappearing underneath them.
 */
const recordView = async (
  upsert: (day: Date) => Promise<unknown>,
  increment: (day: Date) => Promise<unknown>,
): Promise<void> => {
  const day = startOfUtcDay();

  try {
    await upsert(day);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      try {
        await increment(day);
      } catch (retryError) {
        if (isMissingTargetError(retryError)) {
          return;
        }

        throw retryError;
      }

      return;
    }

    if (isMissingTargetError(error)) {
      return;
    }

    throw error;
  }
};

export const recordTripView = async (tripId: string): Promise<void> => {
  await recordView(
    (day) =>
      prisma.tripView.upsert({
        where: { tripId_day: { tripId, day } },
        create: { tripId, day, views: 1 },
        update: { views: { increment: 1 } },
      }),
    (day) =>
      prisma.tripView.update({
        where: { tripId_day: { tripId, day } },
        data: { views: { increment: 1 } },
      }),
  );
};

export const recordEntryView = async (entryId: string): Promise<void> => {
  await recordView(
    (day) =>
      prisma.entryView.upsert({
        where: { entryId_day: { entryId, day } },
        create: { entryId, day, views: 1 },
        update: { views: { increment: 1 } },
      }),
    (day) =>
      prisma.entryView.update({
        where: { entryId_day: { entryId, day } },
        data: { views: { increment: 1 } },
      }),
  );
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// The window is 30 day buckets counted inclusively: today plus the 29 days
// before it. Story 16.1 writes one row per UTC day, so the cutoff is a bucket
// boundary rather than a rolling 30*24h timestamp.
const VIEW_WINDOW_DAYS = 30;

export type TripViewCounts = {
  trip: {
    total: number;
    last30Days: number;
  };
  entries: {
    entryId: string;
    total: number;
  }[];
};

const startOfWindow = (): Date =>
  new Date(startOfUtcDay().getTime() - (VIEW_WINDOW_DAYS - 1) * DAY_IN_MS);

// `_sum` is `null` when no row matches the filter, and callers render the value
// directly, so every sum collapses to 0 here rather than at the UI edge.
const toCount = (value: number | null | undefined): number => value ?? 0;

/**
 * Reads the view counters for a trip and all of its entries.
 *
 * Entry totals are aggregated with a single `groupBy` over the trip's entry
 * ids: the entry list is unbounded, and one query per card would turn a long
 * trip into dozens of round trips. Entries that were never viewed have no
 * `EntryView` row at all, so they are filled in with 0 to keep the UI free of
 * missing-value handling.
 */
export const getTripViewCounts = async (
  tripId: string,
): Promise<TripViewCounts> => {
  const [total, windowed, entries] = await Promise.all([
    prisma.tripView.aggregate({
      where: { tripId },
      _sum: { views: true },
    }),
    prisma.tripView.aggregate({
      where: { tripId, day: { gte: startOfWindow() } },
      _sum: { views: true },
    }),
    prisma.entry.findMany({
      where: { tripId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const entryIds = entries.map((entry) => entry.id);
  const entryTotals =
    entryIds.length === 0
      ? []
      : await prisma.entryView.groupBy({
          by: ["entryId"],
          where: { entryId: { in: entryIds } },
          _sum: { views: true },
        });

  const totalsByEntryId = new Map(
    entryTotals.map((row) => [row.entryId, toCount(row._sum.views)]),
  );

  return {
    trip: {
      total: toCount(total._sum.views),
      last30Days: toCount(windowed._sum.views),
    },
    entries: entryIds.map((entryId) => ({
      entryId,
      total: totalsByEntryId.get(entryId) ?? 0,
    })),
  };
};
