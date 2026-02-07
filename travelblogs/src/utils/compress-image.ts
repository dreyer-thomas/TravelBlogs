import sharp from "sharp";

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 85;

type CompressImageOptions = {
  forceJpeg?: boolean;
};

export const compressImage = async (
  inputBuffer: Buffer,
  options: CompressImageOptions = {},
): Promise<{ buffer: Buffer; wasCompressed: boolean }> => {
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const shouldForceJpeg = Boolean(options.forceJpeg);

  if (!width || !height) {
    if (shouldForceJpeg) {
      const buffer = await sharp(inputBuffer)
        .withMetadata()
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      return { buffer, wasCompressed: true };
    }
    return { buffer: inputBuffer, wasCompressed: false };
  }

  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && !shouldForceJpeg) {
    return { buffer: inputBuffer, wasCompressed: false };
  }

  const pipeline = sharp(inputBuffer).withMetadata();
  const resized =
    width > MAX_DIMENSION || height > MAX_DIMENSION
      ? pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
      : pipeline;
  const buffer = await resized
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer, wasCompressed: true };
};
