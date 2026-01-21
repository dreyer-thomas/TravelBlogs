import { PrismaClient } from "@prisma/client";
import { reverseGeocode } from "./reverse-geocode";

let hasRun = false;

export const backfillCountryCodes = async (prisma: PrismaClient) => {
  if (hasRun) {
    return;
  }

  try {
    console.log("[Country Code Backfill] Starting country code backfill...");

    const entries = await prisma.entry.findMany({
      where: {
        countryCode: null,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
    });

    if (entries.length === 0) {
      console.log("[Country Code Backfill] No entries need country codes.");
      hasRun = true;
      return;
    }

    console.log(
      `[Country Code Backfill] Found ${entries.length} entries missing country codes.`,
    );

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let processed = 0;

    for (const entry of entries) {
      try {
        const countryCode = await reverseGeocode(
          entry.latitude as number,
          entry.longitude as number,
        );

        if (countryCode) {
          await prisma.entry.update({
            where: { id: entry.id },
            data: { countryCode },
          });
          updated += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        console.warn(
          `[Country Code Backfill] Failed to backfill entry ${entry.id}:`,
          error,
        );
        errors += 1;
      }

      processed += 1;
      if (processed % 10 === 0) {
        console.log(
          `[Country Code Backfill] Progress: ${processed}/${entries.length} processed.`,
        );
      }
    }

    console.log(
      `[Country Code Backfill] Complete. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`,
    );
    hasRun = true;
  } catch (error) {
    console.error("[Country Code Backfill] Error during backfill:", error);
    hasRun = true;
  }
};
