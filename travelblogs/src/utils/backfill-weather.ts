import { PrismaClient } from "@prisma/client";
import { fetchHistoricalWeather } from "./fetch-weather";

let hasRun = false;

/**
 * Rate limiter: wait for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const backfillWeather = async (prisma: PrismaClient) => {
  if (hasRun) {
    return;
  }

  try {
    console.log("[Weather Backfill] Starting weather backfill...");

    const entries = await prisma.entry.findMany({
      where: {
        weatherCondition: null,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        title: true,
      },
    });

    if (entries.length === 0) {
      console.log("[Weather Backfill] No entries need weather data.");
      hasRun = true;
      return;
    }

    console.log(
      `[Weather Backfill] Found ${entries.length} entries missing weather data.`,
    );

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let processed = 0;

    for (const entry of entries) {
      // Rate limiting: 1 request per second
      if (processed > 0) {
        await delay(1000);
      }

      try {
        const weatherData = await fetchHistoricalWeather(
          entry.latitude as number,
          entry.longitude as number,
          entry.createdAt,
        );

        if (weatherData) {
          await prisma.entry.update({
            where: { id: entry.id },
            data: {
              weatherCondition: weatherData.condition,
              weatherTemperature: weatherData.temperature,
              weatherIconCode: weatherData.iconCode,
            },
          });
          updated += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        console.warn(
          `[Weather Backfill] Failed to backfill entry ${entry.id}:`,
          error,
        );
        errors += 1;
      }

      processed += 1;
      if (processed % 10 === 0) {
        console.log(
          `[Weather Backfill] Progress: ${processed}/${entries.length} processed.`,
        );
      }
    }

    console.log(
      `[Weather Backfill] Complete. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`,
    );
    hasRun = true;
  } catch (error) {
    console.error("[Weather Backfill] Error during backfill:", error);
    hasRun = true;
  }
};
