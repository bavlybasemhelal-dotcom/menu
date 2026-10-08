import type { Media, PrivateConfig } from "../../features/products/models";
import { recoverMedia, saveMedia, items, strip } from "../firebase/repository";
import { doc, getDocFromServer } from "firebase/firestore";
import { decode } from "../firebase/codec";
import { testAnonymousImage, type DriveFile } from "./client";
import { resolveFileMime } from "./file-types";
import { presentationFile } from "./presentation";
import { mediaCandidate, storageShare, storageUpload } from "./storage";
import type { MediaFolder } from "./apps-script";
export type MediaData = Omit<Media, "id" | "createdAt" | "updatedAt">;
export function mediaData(file: DriveFile): MediaData {
  return {
    name: file.name.slice(0, 200),
    driveFileId: file.id,
    resourceKey: file.resourceKey || null,
    driveWebViewUrl:
      file.webViewLink ||
      "https://drive.google.com/file/d/" + file.id + "/view",
    verifiedPublicAssetUrl: null,
    mimeType: file.mimeType,
    sizeBytes: Number(file.size || 0),
    role: file.mimeType.startsWith("image/")
      ? "image"
      : file.mimeType.startsWith("video/")
        ? "video"
        : "document",
    status: "metadata_saved",
    publicShared: false,
    anonymousRenderTestedAt: null,
    usedBy: [],
    publicUsedBy: [],
    storageProvider: "apps_script",
    driveDirectUrl: file.directUrl || "",
    driveDownloadUrl: file.downloadUrl || "",
    driveFolderId: file.folderId || "",
    driveFolderName: file.folderName || "",
  };
}
export async function verifyImage(
  config: PrivateConfig,
  data: MediaData,
  id: string,
  signal?: AbortSignal,
) {
  const existing = await getDocFromServer(doc(items("media"), id));
  if (!existing.exists() || existing.data().driveFileId !== data.driveFileId)
    throw Error(
      "Media metadata is missing or changed / بيانات الصورة غير موجودة أو تغيرت",
    );
  // Recovery reuses the stored original relationship and usage guards, rather than replacing it with a Drive listing.
  data = strip({ ...(decode(existing.data()) as Media), id }) as MediaData;
  if (data.driveFolderName?.includes("Private Originals"))
    throw Error(
      "Private originals cannot be displayed / الأصل الخاص لا يُستخدم للعرض",
    );
  if (!data.mimeType.startsWith("image/"))
    throw Error("Choose an image / اختر ملف صورة");
  signal?.throwIfAborted();
  await storageShare(config, data.driveFileId);
  const shared = {
    ...data,
    publicShared: true,
    ...(data.status === "failed" ? { status: "metadata_saved" as const } : {}),
  };
  await saveMedia(shared, id);
  const url = mediaCandidate(
    { ...shared, id, createdAt: 0, updatedAt: 0 },
    config,
  );
  await testAnonymousImage(url, signal);
  signal?.throwIfAborted();
  await saveMedia(
    {
      ...shared,
      status: "public_test_passed",
      verifiedPublicAssetUrl: url,
      anonymousRenderTestedAt: Date.now(),
    },
    id,
  );
  return id;
}
export interface PendingImage {
  data: MediaData;
  id?: string;
}
export async function uploadImage(
  config: PrivateConfig,
  input: File,
  folder: MediaFolder,
  pending: (value: PendingImage) => void,
  signal?: AbortSignal,
) {
  const mime = resolveFileMime(input);
  if (!mime.startsWith("image/"))
    throw Error(
      "Choose JPEG, PNG, WebP or GIF / اختر صورة JPEG أو PNG أو WebP أو GIF",
    );
  if (!input.size || input.size > config.maxImageBytes)
    throw Error(
      "Image exceeds the configured limit / الصورة أكبر من حد الرفع المحدد في إعدادات Drive",
    );
  const file =
    input.type === mime ? input : new File([input], input.name, { type: mime });
  // Convert before creating an original so invalid images do not leave an unnecessary upload.
  const display = mime === "image/gif" ? file : await presentationFile(file);
  if (display.size > config.maxImageBytes)
    throw Error("Display image exceeds the configured limit");
  const original = await storageUpload(config, file, "originals", signal);
  const originalMediaId = await recoverMedia(mediaData(original));
  const uploaded = await storageUpload(config, display, folder, signal);
  const data = { ...mediaData(uploaded), originalMediaId };
  pending({ data }); // Retain the Drive file identity if Firestore saving fails; retry never uploads again.
  const id = await recoverMedia(data);
  pending({ data, id });
  return verifyImage(config, data, id, signal);
}
