import sharp from "sharp";

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 85;

export const compressImage = async (
  inputBuffer: Buffer,
): Promise<{ buffer: Buffer; wasCompressed: boolean }> => {
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (!width || !height) {
    return { buffer: inputBuffer, wasCompressed: false };
  }

  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { buffer: inputBuffer, wasCompressed: false };
  }

  const buffer = await sharp(inputBuffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .withMetadata() // Preserve all EXIF metadata from original
    .toBuffer();

  return { buffer, wasCompressed: true };
};
