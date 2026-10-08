import type { Media, PrivateConfig } from "../../features/products/models";
import { auth } from "../firebase/client";
import {
  scriptUpload,
  scriptShare,
  scriptRevoke,
  scriptList,
  scriptImageUrl,
  isScriptUrl,
  type MediaFolder,
} from "./apps-script";
export function storageReady(config: PrivateConfig) {
  return (
    !!auth?.currentUser &&
    config.scriptConnected === true &&
    isScriptUrl(config.webAppUrl || "")
  );
}
export function canManageMedia(config: PrivateConfig, media: Media) {
  return (
    storageReady(config) &&
    (!media.storageProvider || media.storageProvider === "apps_script")
  );
}
export async function storageUpload(
  config: PrivateConfig,
  file: File,
  category: MediaFolder,
  signal?: AbortSignal,
) {
  return {
    ...(await scriptUpload(config.webAppUrl || "", file, category, signal)),
    storageProvider: "apps_script" as const,
  };
}
export function storageShare(config: PrivateConfig, id: string) {
  return scriptShare(config.webAppUrl || "", id);
}
export function storageRevoke(config: PrivateConfig, id: string) {
  return scriptRevoke(config.webAppUrl || "", id);
}
export async function storageList(config: PrivateConfig) {
  const result = await scriptList(config.webAppUrl || "");
  return {
    ...result,
    files: result.files.map((f) => ({
      ...f,
      storageProvider: "apps_script" as const,
    })),
  };
}
export function mediaCandidate(media: Media) {
  return scriptImageUrl(media.driveFileId, media.resourceKey);
}
