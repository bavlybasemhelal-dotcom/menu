const mimeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};
export const mediaAccept = Object.keys(mimeByExtension)
  .map((extension) => "." + extension)
  .join(",");
export function resolveFileMime(file: Pick<File, "name" | "type">) {
  const inferred =
    mimeByExtension[file.name.split(".").pop()?.toLowerCase() || ""];
  if (
    !inferred ||
    (file.type &&
      file.type !== "application/octet-stream" &&
      file.type !== inferred)
  )
    throw Error(
      "Supported files: JPEG PNG WebP GIF MP4 WebM PDF DOC DOCX XLS XLSX TXT / اختر صورة أو فيديو أو مستندًا من الأنواع المدعومة",
    );
  return inferred;
}
