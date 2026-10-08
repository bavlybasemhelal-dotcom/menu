export async function presentationFile(original: File): Promise<File> {
  const bitmap = await createImageBitmap(original);
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
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
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (v) => (v ? resolve(v) : reject(Error("Image conversion failed"))),
      "image/webp",
      0.82,
    ),
  );
  return new File(
    [blob],
    original.name.replace(/\.[^.]+$/, "") + "-display.webp",
    { type: blob.type },
  );
}
