import { PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { extractGpsFromImage } from "./entry-location";

let hasRun = false;

export const backfillGpsData = async (prisma: PrismaClient) => {
  if (hasRun) {
    return;
  }

  try {
    console.log("[GPS Backfill] Starting GPS data extraction for existing entries...");

    const entriesWithoutLocation = await prisma.entry.findMany({
      where: {
        AND: [
          { latitude: null },
          { longitude: null },
        ],
      },
      include: {
        media: true,
      },
    });

    if (entriesWithoutLocation.length === 0) {
      console.log("[GPS Backfill] No entries need GPS extraction.");
      hasRun = true;
      return;
    }

    console.log(`[GPS Backfill] Found ${entriesWithoutLocation.length} entries without location data.`);

    let updated = 0;
    let skipped = 0;

    for (const entry of entriesWithoutLocation) {
      if (entry.media.length === 0) {
        skipped++;
        continue;
      }

      let extractedLocation = null;

      for (const mediaItem of entry.media) {
        const imagePath = path.join(
          process.cwd(),
          "public",
          mediaItem.url.replace(/^\//, ""),
        );

        try {
          const fileExists = await fs.access(imagePath).then(() => true).catch(() => false);
          if (!fileExists) {
            continue;
          }

          const buffer = await fs.readFile(imagePath);
          const location = await extractGpsFromImage(buffer);

          if (location) {
            extractedLocation = location;
            break;
          }
        } catch (error) {
          console.warn(`[GPS Backfill] Failed to process ${imagePath}:`, error);
          continue;
        }
      }

      if (extractedLocation) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: {
            latitude: extractedLocation.latitude,
            longitude: extractedLocation.longitude,
          },
        });
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`[GPS Backfill] Complete. Updated: ${updated}, Skipped: ${skipped}`);
    hasRun = true;
  } catch (error) {
    console.error("[GPS Backfill] Error during GPS extraction:", error);
    hasRun = true;
  }
};
