import { isDriveAssetUrl } from "../../utils/urls";
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
export async function testAnonymousImage(url: string) {
  if (!isDriveAssetUrl(url)) throw Error("Unsupported public image URL");
  const response = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "strict-origin-when-cross-origin",
    cache: "no-store",
  }).catch(() => {
    throw Error(
      "Anonymous image request failed (network/CORS). Publication is blocked / فشل عرض الصورة بدون دخول بسبب الشبكة أو CORS؛ لا يمكن نشرها قبل نجاح الاختبار",
    );
  });
  if (!response.ok)
    throw Error(
      `Anonymous read failed (${response.status}) / فشل العرض بدون تسجيل دخول`,
    );
  const blob = await response.blob();
  if (!blob.type.startsWith("image/"))
    throw Error("Response is not an image / الرابط لا يعيد صورة");
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
