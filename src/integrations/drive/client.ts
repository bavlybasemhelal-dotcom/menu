import { isDriveAssetUrl, isBridgeImageUrl } from "../../utils/urls";
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  resourceKey?: string;
  storageProvider?: "apps_script";
  directUrl?: string;
  downloadUrl?: string;
  folderId?: string;
  folderName?: string;
}
export async function anonymousImageBlob(url: string, signal?: AbortSignal) {
  if (!isDriveAssetUrl(url)) throw Error("Unsupported public image URL");
  const response = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "strict-origin-when-cross-origin",
    cache: "no-store",
    redirect: "follow",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
      : AbortSignal.timeout(30000),
  }).catch(() => {
    throw Error(
      "Anonymous image request failed (network/CORS). Publication is blocked / فشل عرض الصورة بدون دخول بسبب الشبكة أو CORS؛ لا يمكن نشرها قبل نجاح الاختبار",
    );
  });
  if (!response.ok)
    throw Error(
      `Anonymous read failed (${response.status}) / فشل العرض بدون تسجيل دخول`,
    );
  let blob: Blob;
  if (isBridgeImageUrl(url)) {
    if (!response.headers.get("Content-Type")?.includes("application/json"))
      throw Error(
        "Google returned a login page / راجع نشر السكريبت بإتاحة Anyone",
      );
    const data = await response.json();
    if (data.version !== 2 && data.success === true)
      throw Error(
        "Update the Drive script and deploy a new version / حدّث كود Drive من صفحة الإعداد وأعد نشر نسخة جديدة",
      );
    if (
      data.success !== true ||
      data.fileId !== new URL(url).searchParams.get("fileId")
    )
      throw Error(
        "Public image unavailable; verify file sharing / الصورة غير متاحة للزائر؛ راجع مشاركة نسخة العرض",
      );
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        data.mimeType,
      ) ||
      !Number.isSafeInteger(data.fileSize) ||
      data.fileSize <= 0 ||
      data.fileSize > 20 * 1024 * 1024 ||
      typeof data.base64 !== "string" ||
      data.base64.length > Math.ceil(data.fileSize / 3) * 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64)
    )
      throw Error("Invalid image response / رد الصورة غير صحيح");
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.length !== data.fileSize)
      throw Error("Incomplete image response");
    blob = new Blob([bytes], { type: data.mimeType });
  } else blob = await response.blob();
  if (!blob.type.startsWith("image/"))
    throw Error("Response is not an image / الرابط لا يعيد صورة");
  return blob;
}
export async function testAnonymousImage(url: string, signal?: AbortSignal) {
  const blob = await anonymousImageBlob(url, signal);
  const bitmap = await createImageBitmap(blob).catch(() => {
    throw Error(
      "Image could not be decoded / تعذر قراءة الصورة؛ جرّب ملف صورة صالحًا",
    );
  });
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  if (!dimensions.width || !dimensions.height) throw Error("Invalid image");
  return dimensions;
}
