import { auth } from "../firebase/client";
import template from "../../../google_drive_script/catalog_drive_script.js?raw";
import type { DriveFile } from "./client";
export const SCRIPT_MAX_BYTES = 20 * 1024 * 1024;
export type MediaFolder =
  "products" | "offers" | "branding" | "documents" | "videos" | "originals";
export interface ScriptFile extends DriveFile {
  directUrl: string;
  downloadUrl: string;
  folderId: string;
  folderName: string;
}
export function isScriptUrl(value: string) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(
    value,
  );
}
export function buildDriveScript(config: {
  projectId: string;
  apiKey: string;
  adminUid: string;
  rootFolderName: string;
}) {
  return template.replace("/*__PUBLIC_CONFIG__*/ null", JSON.stringify(config));
}
const errors: Record<string, string> = {
  UNAUTHORIZED:
    "Administrator authorization required / الحساب غير مصرح له أو انتهت جلسته",
  AUTH_CHECK_FAILED:
    "Firebase token check failed / تعذر التحقق من حساب الأدمن؛ راجع مفتاح Firebase وقيوده",
  NOT_CONFIGURED:
    "Copy the generated script from Drive setup / انسخ السكريبت المجهز من إعداد Drive",
  OUTSIDE_APP_FOLDER:
    "File belongs to another app folder / الملف خارج مجلد هذا الربط",
  PRIVATE_ORIGINAL:
    "Private originals cannot be shared / لا يمكن مشاركة مجلد الأصول الخاصة",
  FOLDER_NOT_PRIVATE:
    "Keep the app folders Restricted in Drive / اجعل المجلد الرئيسي ومجلداته الفرعية Restricted في Drive؛ شارك الملفات المطلوبة فقط",
  FILE_TOO_LARGE:
    "Apps Script upload limit is 20 MB / حد الرفع بهذه الطريقة 20 MB",
};
export async function postScript(
  url: string,
  token: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
) {
  if (!isScriptUrl(url))
    throw Error(
      "Use the Google Web App /exec URL / أدخل رابط تطبيق Google المنتهي بـ /exec",
    );
  if (!token) throw Error("Sign in as administrator / سجل دخول الأدمن أولاً");
  const timeout = AbortSignal.timeout(
    payload.action === "upload" ? 45000 : 18000,
  );
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, idToken: token }),
    credentials: "omit",
    redirect: "follow",
    signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
  }).catch(() => {
    throw Error(
      "Drive request interrupted. Inspect app folder before retrying / انقطع الطلب؛ افحص مجلد التطبيق قبل إعادة الرفع فقد يكون الملف وصل",
    );
  });
  if (!response.ok)
    throw Error(
      `Google Web App failed (${response.status}) / تعذر طلب تطبيق Google`,
    );
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error(
      "Google returned a sign-in/HTML page. Deploy as Me, access Anyone / Google رجّع صفحة دخول؛ راجع إعدادات النشر Me وAnyone",
    );
  }
  if (!data || data.success !== true)
    throw Error(
      errors[data?.error] ||
        "Drive operation failed / فشلت العملية؛ راجع نشر السكريبت وصلاحيات Drive",
    );
  return data as Record<string, unknown>;
}
async function request(
  url: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
) {
  if (!auth?.currentUser)
    throw Error("Sign in as administrator / سجل دخول الأدمن أولاً");
  return postScript(url, await auth.currentUser.getIdToken(), payload, signal);
}
function requiredString(value: unknown) {
  if (typeof value !== "string" || !value || value.length > 500)
    throw Error("Invalid Drive response / رد Drive غير صحيح");
  return value;
}
export function scriptFile(value: Record<string, unknown>): ScriptFile {
  const id = requiredString(value.fileId);
  if (
    !/^[a-zA-Z0-9_-]+$/.test(id) ||
    !Number.isSafeInteger(value.fileSize) ||
    Number(value.fileSize) < 0
  )
    throw Error("Invalid Drive file response");
  return {
    id,
    name: requiredString(value.fileName),
    mimeType: requiredString(value.mimeType),
    size: String(value.fileSize),
    webViewLink: "https://drive.google.com/file/d/" + id + "/view",
    resourceKey:
      typeof value.resourceKey === "string" ? value.resourceKey : undefined,
    directUrl: scriptImageUrl(
      id,
      typeof value.resourceKey === "string" ? value.resourceKey : null,
    ),
    downloadUrl: "https://drive.google.com/uc?export=download&id=" + id,
    folderId: typeof value.folderId === "string" ? value.folderId : "",
    folderName: typeof value.folderName === "string" ? value.folderName : "",
  };
}
export async function testScriptConnection(url: string) {
  const value = await request(url, { action: "ping" });
  if (value.version !== 1)
    throw Error(
      "Copy this catalog's script, then deploy a new version / انسخ سكريبت الكتالوج وأعد نشر نسخة جديدة",
    );
  return {
    rootFolderId: requiredString(value.rootFolderId),
    rootFolderName: requiredString(value.rootFolderName),
    storageUsedBytes:
      Number.isSafeInteger(value.storageUsed) && Number(value.storageUsed) >= 0
        ? Number(value.storageUsed)
        : null,
  };
}
function fileBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () =>
      reject(Error("Could not read file / تعذر قراءة الملف"));
    reader.readAsDataURL(file);
  });
}
export async function scriptUpload(
  url: string,
  file: File,
  category: MediaFolder,
  signal?: AbortSignal,
) {
  if (!file.size || file.size > SCRIPT_MAX_BYTES)
    throw Error(errors.FILE_TOO_LARGE);
  const fileData = await fileBase64(file);
  signal?.throwIfAborted();
  return scriptFile(
    await request(
      url,
      {
        action: "upload",
        fileData,
        fileName: file.name,
        mimeType: file.type,
        category,
      },
      signal,
    ),
  );
}
export async function scriptShare(url: string, id: string) {
  await request(url, { action: "share", fileId: id });
}
export async function scriptRevoke(url: string, id: string) {
  await request(url, { action: "revoke", fileId: id });
}
export async function scriptList(url: string) {
  const value = await request(url, { action: "list" });
  if (!Array.isArray(value.files) || value.files.length > 100)
    throw Error("Invalid file listing");
  return {
    files: value.files.map((file) => scriptFile(file)),
    truncated: value.truncated === true,
  };
}
export function scriptImageUrl(id: string, resourceKey: string | null = null) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw Error("Invalid file ID");
  return (
    "https://drive.usercontent.google.com/download?export=view&id=" +
    id +
    (resourceKey ? "&resourcekey=" + encodeURIComponent(resourceKey) : "")
  );
}
