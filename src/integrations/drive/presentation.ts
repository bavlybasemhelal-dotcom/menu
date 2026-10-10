export interface CompressionOptions {
  maxDimension?: number;
  targetBytes?: number;
}
export async function presentationFile(
  original: File,
  { maxDimension = 1280, targetBytes = 192 * 1024 }: CompressionOptions = {},
): Promise<File> {
  // Preserve GIF animation. Its original is optional, as for other formats.
  if (original.type === "image/gif") return original;
  const bitmap = await createImageBitmap(original);
  const ratio = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw Error("Image conversion unavailable / تعذر تجهيز نسخة العرض");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  async function encode(quality: number) {
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (v) => (v ? resolve(v) : reject(Error("Image conversion failed"))),
        "image/webp",
        quality,
      ),
    );
  }
  let blob = await encode(0.78);
  for (const quality of [0.66, 0.56]) {
    if (blob.size <= targetBytes) break;
    blob = await encode(quality);
  }
  // Very detailed photographs also need fewer pixels; don't sacrifice all quality.
  while (
    blob.size > targetBytes &&
    Math.max(canvas.width, canvas.height) > 640
  ) {
    const reduced = document.createElement("canvas");
    reduced.width = Math.max(1, Math.round(canvas.width * 0.8));
    reduced.height = Math.max(1, Math.round(canvas.height * 0.8));
    reduced
      .getContext("2d")!
      .drawImage(canvas, 0, 0, reduced.width, reduced.height);
    canvas.width = reduced.width;
    canvas.height = reduced.height;
    context.drawImage(reduced, 0, 0);
    blob = await encode(0.7);
  }
  // Tiny, already-efficient images should not get larger during conversion.
  if (ratio === 1 && original.size <= blob.size && original.size <= targetBytes)
    return original;
  return new File(
    [blob],
    original.name.replace(/\.[^.]+$/, "") +
      (blob.type === "image/webp" ? "-display.webp" : "-display.png"),
    { type: blob.type },
  );
}
