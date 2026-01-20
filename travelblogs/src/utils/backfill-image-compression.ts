import { PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import { compressImage } from "./compress-image";
import { getMediaTypeFromUrl } from "./media";

let hasRun = false;

export const backfillImageCompression = async (prisma: PrismaClient) => {
  if (hasRun) {
    return;
  }

  try {
    console.log("[Image Compression] Starting image compression backfill...");

    const mediaItems = await prisma.entryMedia.findMany();
    if (mediaItems.length === 0) {
      console.log("[Image Compression] No entry media found for compression.");
      hasRun = true;
      return;
    }

    let compressed = 0;
    let skipped = 0;
    let errors = 0;
    let processed = 0;

    for (const mediaItem of mediaItems) {
      if (getMediaTypeFromUrl(mediaItem.url) === "video") {
        skipped += 1;
        processed += 1;
        continue;
      }

      const filePath = path.join(
        process.cwd(),
        "public",
        mediaItem.url.replace(/^\//, ""),
      );

      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      if (!fileExists) {
        console.warn(`[Image Compression] Missing file: ${filePath}`);
        errors += 1;
        processed += 1;
        continue;
      }

      try {
        const buffer = await fs.readFile(filePath);
        const result = await compressImage(buffer);

        if (result.wasCompressed) {
          await fs.writeFile(filePath, result.buffer);
          console.log(
            `[Image Compression] Compressed ${path.basename(filePath)}: ${buffer.length} -> ${result.buffer.length}`,
          );
          compressed += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        console.warn(`[Image Compression] Failed to process ${filePath}:`, error);
        errors += 1;
      }

      processed += 1;
      if (processed % 10 === 0) {
        console.log(
          `[Image Compression] Progress: ${processed}/${mediaItems.length} processed.`,
        );
      }
    }

    console.log(
      `[Image Compression] Complete. Compressed: ${compressed}, Skipped: ${skipped}, Errors: ${errors}`,
    );
    hasRun = true;
  } catch (error) {
    console.error("[Image Compression] Error during backfill:", error);
    hasRun = true;
  }
};
