import type { PrivateConfig } from "../../features/products/models";
export const emptyConfig: PrivateConfig = {
  driveProvider: "apps_script",
  googleEmail: "",
  webAppUrl: "",
  scriptConnected: false,
  lastTestedAt: null,
  rootFolderName: "",
  rootFolderId: "",
  storageUsedBytes: null,
  maxImageBytes: 0,
  maxVideoBytes: 0,
  maxDocumentBytes: 0,
};
export function normalizeConfig(value?: PrivateConfig | null): PrivateConfig {
  return {
    ...emptyConfig,
    ...Object.fromEntries(
      Object.keys(emptyConfig).map((key) => [
        key,
        value?.[key as keyof PrivateConfig] ??
          emptyConfig[key as keyof PrivateConfig],
      ]),
    ),
    driveProvider: "apps_script",
  };
}
