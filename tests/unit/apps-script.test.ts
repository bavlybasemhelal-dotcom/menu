import { it, expect, vi, afterEach } from "vitest";
import { createContext, runInContext } from "node:vm";
import {
  buildDriveScript,
  postScript,
  isScriptUrl,
  scriptFile,
  scriptImageUrl,
  publicImageUrl,
} from "../../src/integrations/drive/apps-script";
import { isDriveAssetUrl } from "../../src/utils/urls";
import { normalizeConfig } from "../../src/integrations/drive/config";
import { resolveFileMime } from "../../src/integrations/drive/file-types";
afterEach(() => vi.unstubAllGlobals());
const config = {
  projectId: "test-project",
  apiKey: "public-test-key",
  adminUid: "owner",
  rootFolderName: "Test files",
};
function bridge(
  options: {
    authStatus?: number;
    disabled?: boolean;
    uid?: string;
    sharingFails?: boolean;
    outside?: boolean;
    original?: boolean;
    revoked?: boolean;
    folderShared?: boolean;
    publicFile?: boolean;
    mimeType?: string;
  } = {},
) {
  const properties = new Map<string, string>();
  const empty = () => ({ hasNext: () => false });
  const iterator = (values: unknown[]) => {
    let index = 0;
    return {
      hasNext: () => index < values.length,
      next: () => values[index++],
    };
  };
  const folder = (name: string, id: string, parents: unknown[] = []) => ({
    getId: () => id,
    getName: () => name,
    isTrashed: () => false,
    getSharingAccess: () => (options.folderShared ? "public" : "private"),
    getParents: () => iterator(parents),
    getFoldersByName: empty,
    getFolders: empty,
    getFiles: empty,
    createFolder: (child: string) => folder(child, "child-folder", [root]),
    createFile: vi.fn(() => file),
  });
  const root = folder("Test files", "app-folder");
  let fileAccess = options.publicFile ? "public" : "private";
  const setSharing = vi.fn((access: string) => {
    if (options.sharingFails) throw Error("Workspace restricted sharing");
    fileAccess = access;
  });
  const file = {
    getId: () => "file-id",
    getName: () => "photo.png",
    getSize: () => 3,
    getMimeType: () => options.mimeType || "image/png",
    getSharingAccess: () => fileAccess,
    getBlob: () => ({ getBytes: () => [97, 98, 99] }),
    getUrl: () => "https://drive.google.com/file/d/file-id/view",
    getResourceKey: () => "",
    isTrashed: () => false,
    getParents: () =>
      iterator([
        options.outside
          ? folder("other", "other")
          : options.original
            ? folder("06_الأصول الخاصة (Private Originals)", "originals", [
                root,
              ])
            : root,
      ]),
    setSharing,
  };
  const drive = {
    getRootFolder: vi.fn(() => ({
      getFoldersByName: empty,
      createFolder: () => root,
    })),
    getFolderById: vi.fn(() => root),
    getFileById: vi.fn(() => file),
    getStorageUsed: () => 1000,
    Access: {
      PRIVATE: "private",
      ANYONE_WITH_LINK: "public",
      ANYONE: "anyone",
    },
    Permission: { VIEW: "view" },
  };
  const fetch = vi.fn(() => ({
    getResponseCode: () => options.authStatus || 200,
    getContentText: () =>
      JSON.stringify({
        users: [
          {
            localId: options.uid || "owner",
            disabled: options.disabled || false,
            validSince: options.revoked
              ? String(Math.floor(Date.now() / 1000))
              : "0",
          },
        ],
      }),
  }));
  const context = createContext({
    DriveApp: drive,
    UrlFetchApp: { fetch },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => properties.get(key),
        setProperty: (key: string, value: string) => properties.set(key, value),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      base64DecodeWebSafe: (value: string) => Buffer.from(value, "base64url"),
      base64Decode: (value: string) => [...Buffer.from(value, "base64")],
      base64Encode: (value: Uint8Array) =>
        Buffer.from(value).toString("base64"),
      newBlob: (bytes: Uint8Array) => ({
        getDataAsString: () => Buffer.from(bytes).toString(),
      }),
    },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (value: string) => ({
        setMimeType: () => JSON.parse(value),
      }),
    },
  });
  runInContext(buildDriveScript(config), context);
  return {
    get: (parameter: Record<string, unknown> = {}) => {
      context.event = { parameter };
      return runInContext("doGet(event)", context);
    },
    post: (payload: Record<string, unknown>) => {
      context.event = { postData: { contents: JSON.stringify(payload) } };
      return runInContext("doPost(event)", context);
    },
    drive,
    fetch,
    setSharing,
  };
}
function token(patch = {}) {
  return (
    "header." +
    Buffer.from(
      JSON.stringify({
        aud: config.projectId,
        iss: "https://securetoken.google.com/" + config.projectId,
        sub: "owner",
        exp: Math.floor(Date.now() / 1000) + 3600,
        auth_time: Math.floor(Date.now() / 1000) - 10,
        ...patch,
      }),
    ).toString("base64url") +
    ".signature"
  );
}
it("only accepts the exact HTTPS /exec Google endpoint before sending credentials", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  for (const url of [
    "https://example.com/exec",
    "https://script.google.com.evil.test/macros/s/id/exec",
    "https://script.google.com/macros/s/id/dev",
    "https://script.google.com/macros/s/id/exec?x=1",
  ])
    await expect(
      postScript(url, "token", { action: "ping" }),
    ).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
  expect(isScriptUrl("https://script.google.com/macros/s/test-id/exec")).toBe(
    true,
  );
});
it("anonymous image delivery is read-only and only exposes already-public app images", () => {
  const unconfigured = bridge({ publicFile: true });
  expect(unconfigured.get({ action: "image", fileId: "file-id" }).success).toBe(
    false,
  );
  expect(unconfigured.drive.getRootFolder).not.toHaveBeenCalled();
  const server = bridge({ publicFile: true });
  server.post({ action: "ping", idToken: token() });
  server.fetch.mockClear();
  server.setSharing.mockClear();
  expect(server.get({ action: "image", fileId: "file-id" })).toEqual({
    success: true,
    version: 2,
    fileId: "file-id",
    mimeType: "image/png",
    fileSize: 3,
    base64: "YWJj",
  });
  expect(server.fetch).not.toHaveBeenCalled();
  expect(server.setSharing).not.toHaveBeenCalled();
  server.post({ action: "revoke", idToken: token(), fileId: "file-id" });
  expect(server.get({ action: "image", fileId: "file-id" }).success).toBe(
    false,
  );
  for (const options of [
    {},
    { publicFile: true, original: true },
    { publicFile: true, outside: true },
    { publicFile: true, mimeType: "text/html" },
  ]) {
    const blocked = bridge(options);
    blocked.post({ action: "ping", idToken: token() });
    expect(blocked.get({ action: "image", fileId: "file-id" })).toEqual({
      success: false,
      error: "PUBLIC_IMAGE_UNAVAILABLE",
    });
  }
  expect(
    publicImageUrl("https://script.google.com/macros/s/test/exec", "file-id"),
  ).toBe(
    "https://script.google.com/macros/s/test/exec?action=image&fileId=file-id",
  );
  expect(
    isDriveAssetUrl(
      publicImageUrl("https://script.google.com/macros/s/test/exec", "file-id"),
    ),
  ).toBe(true);
  expect(
    isDriveAssetUrl(
      publicImageUrl(
        "https://script.google.com/macros/s/test/exec",
        "file-id",
      ) + "&idToken=secret",
    ),
  ).toBe(false);
});
it("uses Nexara's text/plain POST and redirect flow, with a per-request Firebase token", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ success: true, version: 1 })),
    );
  vi.stubGlobal("fetch", fetch);
  await postScript(
    "https://script.google.com/macros/s/test/exec",
    "short-lived-test-token",
    { action: "ping", idToken: "untrusted" },
  );
  const init = fetch.mock.calls[0][1];
  expect(init).toMatchObject({
    method: "POST",
    credentials: "omit",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  });
  expect(JSON.parse(init.body)).toEqual({
    action: "ping",
    idToken: "short-lived-test-token",
  });
});
it("does not report Google HTML, server errors or sharing failure as success", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("<html>Login</html>")),
  );
  await expect(
    postScript("https://script.google.com/macros/s/test/exec", "token", {
      action: "ping",
    }),
  ).rejects.toThrow("HTML");
  const server = bridge({ sharingFails: true });
  expect(
    server.post({ action: "share", idToken: token(), fileId: "file-id" }),
  ).toEqual({ success: false, error: "DRIVE_OPERATION_FAILED" });
});
it("anonymous, wrong UID, wrong project, expired and unverifiable tokens cannot access Drive", () => {
  for (const credential of [
    null,
    token({ sub: "stranger" }),
    token({ aud: "other" }),
    token({ exp: 1 }),
  ]) {
    const server = bridge();
    expect(server.post({ action: "upload", idToken: credential }).success).toBe(
      false,
    );
    expect(server.drive.getRootFolder).not.toHaveBeenCalled();
  }
  for (const options of [
    { authStatus: 400 },
    { disabled: true },
    { uid: "stranger" },
    { revoked: true },
  ]) {
    const server = bridge(options);
    expect(server.post({ action: "ping", idToken: token() }).success).toBe(
      false,
    );
    expect(server.drive.getRootFolder).not.toHaveBeenCalled();
  }
});
it("verified owner creates private files with Nexara-shaped links and folders", () => {
  const server = bridge();
  expect(server.post({ action: "ping", idToken: token() })).toMatchObject({
    success: true,
    rootFolderId: "app-folder",
    storageUsed: 1000,
  });
  const result = server.post({
    action: "upload",
    idToken: token(),
    fileData: "YWJj",
    fileName: "photo.png",
    mimeType: "image/png",
    category: "branding",
  });
  expect(result).toMatchObject({
    success: true,
    fileId: "file-id",
    folderName: "03_الهوية والشعار (Branding)",
    publicShared: false,
  });
  expect(server.setSharing).toHaveBeenCalledWith("private", "view");
  expect(scriptFile(result)).toMatchObject({
    id: "file-id",
    directUrl: scriptImageUrl("file-id"),
  });
});
it("sharing is restricted to the app folder and no delete endpoint is exposed", () => {
  const server = bridge({ outside: true });
  expect(
    server.post({ action: "share", idToken: token(), fileId: "file-id" }),
  ).toEqual({ success: false, error: "OUTSIDE_APP_FOLDER" });
  expect(server.setSharing).not.toHaveBeenCalled();
  expect(server.post({ action: "delete", idToken: token() }).success).toBe(
    false,
  );
});
it("private originals cannot be made public through the bridge", () => {
  const server = bridge({ original: true });
  expect(
    server.post({ action: "share", idToken: token(), fileId: "file-id" }),
  ).toEqual({ success: false, error: "PRIVATE_ORIGINAL" });
  expect(server.setSharing).not.toHaveBeenCalled();
  expect(
    server.post({ action: "revoke", idToken: token(), fileId: "file-id" })
      .success,
  ).toBe(true);
  expect(server.setSharing).toHaveBeenCalledWith("private", "view");
});
it("public parent folders cannot make private-upload claims through inherited access", () => {
  const server = bridge({ folderShared: true });
  expect(server.post({ action: "ping", idToken: token() })).toEqual({
    success: false,
    error: "FOLDER_NOT_PRIVATE",
  });
  expect(
    server.post({
      action: "upload",
      idToken: token(),
      fileData: "YWJj",
      fileName: "photo.png",
      mimeType: "image/png",
    }).success,
  ).toBe(false);
  expect(server.setSharing).not.toHaveBeenCalled();
});
it("matches Nexara's Word/Excel/text MIME inference, including missing browser MIME", () => {
  for (const [extension, mime] of [
    ["doc", "application/msword"],
    [
      "docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ["xls", "application/vnd.ms-excel"],
    [
      "xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    ["txt", "text/plain"],
  ]) {
    expect(
      resolveFileMime({
        name: "document." + extension.toUpperCase(),
        type: "",
      }),
    ).toBe(mime);
    expect(
      bridge().post({
        action: "upload",
        idToken: token(),
        fileData: "YWJj",
        fileName: "document." + extension,
        mimeType: mime,
        category: "documents",
      }).success,
    ).toBe(true);
  }
  expect(() => resolveFileMime({ name: "script.exe", type: "" })).toThrow();
  expect(() =>
    resolveFileMime({ name: "photo.png", type: "text/html" }),
  ).toThrow();
});
it("public links exclude auth tokens and old provider settings cannot restore a removed connection method", () => {
  expect(isDriveAssetUrl(scriptImageUrl("file-id", "resource-key"))).toBe(true);
  expect(
    isDriveAssetUrl(scriptImageUrl("file-id") + "&access_token=private"),
  ).toBe(false);
  expect(isDriveAssetUrl("https://drive.google.com/file/d/file-id/view")).toBe(
    false,
  );
  expect(normalizeConfig().driveProvider).toBe("apps_script");
  expect(
    normalizeConfig({
      ...normalizeConfig(),
      id: "main",
      updatedAt: 1,
    } as never),
  ).not.toHaveProperty("id");
  expect(
    normalizeConfig({
      driveProvider: "oauth",
      googleClientId: "old-client",
      driveApiKey: "old-key",
    } as never).driveProvider,
  ).toBe("apps_script");
  expect(
    normalizeConfig({ googleClientId: "old-client" } as never),
  ).not.toHaveProperty("googleClientId");
  expect(isDriveAssetUrl(scriptImageUrl("file-id") + "&idToken=private")).toBe(
    false,
  );
  expect(
    isDriveAssetUrl(
      "https://drive.usercontent.google.com.attacker.test/download?export=view&id=file-id",
    ),
  ).toBe(false);
});
