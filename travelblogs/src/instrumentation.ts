/**
 * Runs once per server process, before the first request is served.
 *
 * **SMTP check (Story 18.1).** In production every account mail (password reset, invitation,
 * trip-access notice) goes out over SMTP. The settings are knowable at startup, so a deploy that
 * lacks them should fail here, while an operator is still watching, rather than boot, look healthy and
 * lose mail silently later - a password-reset route answers success whether or not the mail went out,
 * so a missing setting would otherwise surface only as a log line nobody reads. A throw from
 * `register()` does not exit the process: Next answers every request with HTTP 500 and the reason
 * goes to the journal. That is why the check runs first and *outside* the backfill `try/catch`, which
 * logs and swallows.
 *
 * **Why the dynamic import inside the `nodejs` branch.** Next still compiles this file for the edge
 * runtime, where `net` and `tls` do not exist. So the check is gated on `NEXT_RUNTIME` and its module is
 * imported dynamically; `smtp-config.ts` itself never imports `nodemailer` (only `email.ts` does, and
 * only route handlers import that).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertSmtpConfigured } = await import("./utils/smtp-config");
    assertSmtpConfigured();

    const { PrismaClient } = await import("@prisma/client");
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const { backfillGpsData } = await import("./utils/backfill-gps");
    const { backfillImageCompression } = await import(
      "./utils/backfill-image-compression",
    );
    const { backfillCountryCodes } = await import(
      "./utils/backfill-country-codes",
    );
    const { backfillWeather } = await import("./utils/backfill-weather");

    const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
    const databasePath = databaseUrl.replace(/^file:/, "");
    const adapter = new PrismaBetterSqlite3({ url: databasePath });
    const prisma = new PrismaClient({ adapter });

    try {
      await backfillGpsData(prisma);
      void backfillImageCompression(prisma)
        .catch((compressionError) => {
          console.error("Image compression backfill failed:", compressionError);
        })
        .then(() => backfillCountryCodes(prisma))
        .catch((countryError) => {
          console.error("Country code backfill failed:", countryError);
        })
        .then(() => backfillWeather(prisma))
        .catch((weatherError) => {
          console.error("Weather backfill failed:", weatherError);
        })
        .finally(() => prisma.$disconnect());
    } catch (error) {
      console.error("GPS backfill failed:", error);
      await prisma.$disconnect();
    }
  }
}
