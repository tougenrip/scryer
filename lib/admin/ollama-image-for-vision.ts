import sharp from "sharp";

/** Longest edge in pixels; keeps vision model token use predictable (context limits). */
const MAX_EDGE = 1280;
/** If source is under this and already within MAX_EDGE, skip re-encode. */
const SMALL_FILE_BYTES = 1_200_000;

/**
 * Resizes and re-encodes map/token images so Ollama vision models stay within context.
 * Large PNG/WebP battlemaps are the usual cause of "context full" and slow failures.
 */
export async function bufferForOllamaVision(input: Buffer): Promise<Buffer> {
  if (input.length === 0) {
    return input;
  }
  let pipeline = sharp(input, {
    // Guard against decompression bombs
    limitInputPixels: 268_402_689,
  });
  const meta = await pipeline.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (
    w > 0 &&
    h > 0 &&
    w <= MAX_EDGE &&
    h <= MAX_EDGE &&
    input.length <= SMALL_FILE_BYTES
  ) {
    return input;
  }
  try {
    pipeline = sharp(input, { limitInputPixels: 268_402_689 }).rotate();
    if (w > MAX_EDGE || h > MAX_EDGE || input.length > SMALL_FILE_BYTES) {
      pipeline = pipeline.resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside" as const,
        withoutEnlargement: true,
      });
    }
    let out: Buffer;
    if (meta.hasAlpha) {
      out = await pipeline.png({ compressionLevel: 8 }).toBuffer();
    } else {
      out = await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    }
    if (out.length > 2.5 * 1024 * 1024) {
      return sharp(out)
        .resize(960, 960, { fit: "inside" as const, withoutEnlargement: true })
        .jpeg({ quality: 75, mozjpeg: true })
        .toBuffer();
    }
    return out;
  } catch (e) {
    console.error("[ollama-image-for-vision] preprocess failed", e);
    if (input.length > 6 * 1024 * 1024) {
      throw new Error(
        "Image could not be processed; use a smaller file or a standard PNG/JPEG/WebP."
      );
    }
    return input;
  }
}
