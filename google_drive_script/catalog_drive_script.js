/**
 * Google Drive media bridge for the catalog.
 * Copy the generated version from Admin → Drive setup into Code.gs.
 * Deploy as Web app → Execute as Me → Who has access Anyone.
 * Every POST still requires the allowlisted Firebase administrator's ID token.
 * No password, refresh token, client secret or service account is needed.
 */
const CONFIG = /*__PUBLIC_CONFIG__*/ null;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // Application cap, not a Google quota guarantee.
const FOLDERS = {
  products: "01_المنتجات (Products)",
  offers: "02_العروض والبنرات (Offers & Banners)",
  branding: "03_الهوية والشعار (Branding)",
  documents: "04_المستندات (Documents)",
  videos: "05_الفيديوهات (Videos)",
  originals: "06_الأصول الخاصة (Private Originals)",
};

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === "image") {
      // Anonymous reads never create folders, change sharing, or serve private originals.
      const file = appFile(e.parameter.fileId, true);
      if (isOriginal(file)) throw Error("PRIVATE_ORIGINAL");
      if (
        ![DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Access.ANYONE].includes(
          file.getSharingAccess(),
        )
      )
        throw Error("FILE_NOT_PUBLIC");
      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.getMimeType(),
        )
      )
        throw Error("UNSUPPORTED_TYPE");
      if (!file.getSize() || file.getSize() > MAX_FILE_BYTES)
        throw Error("FILE_TOO_LARGE");
      return jsonResponse({
        success: true,
        version: 2,
        fileId: file.getId(),
        mimeType: file.getMimeType(),
        fileSize: file.getSize(),
        base64: Utilities.base64Encode(file.getBlob().getBytes()),
      });
    }
    return jsonResponse({
      success: true,
      service: "Catalog Drive Bridge",
      version: 2,
    });
  } catch (_) {
    // Deliberately identical for inaccessible, private, original and foreign files.
    return jsonResponse({ success: false, error: "PUBLIC_IMAGE_UNAVAILABLE" });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents)
      throw Error("INVALID_PAYLOAD");
    if (
      e.postData.contents.length >
      Math.ceil((MAX_FILE_BYTES * 4) / 3) + 16000
    )
      throw Error("FILE_TOO_LARGE");
    const data = JSON.parse(e.postData.contents);
    authorizeAdmin(data.idToken);
    if (data.action === "ping") {
      const root = rootFolder();
      return jsonResponse({
        success: true,
        version: 2,
        rootFolderId: root.getId(),
        rootFolderName: root.getName(),
        storageUsed: DriveApp.getStorageUsed(),
        message: "Connected to Google Drive successfully",
      });
    }
    if (data.action === "upload") return jsonResponse(handleFileUpload(data));
    if (data.action === "list") return jsonResponse(listAppFiles());
    if (data.action === "share" || data.action === "revoke") {
      const file = appFile(data.fileId);
      if (data.action === "share" && isOriginal(file))
        throw Error("PRIVATE_ORIGINAL");
      file.setSharing(
        data.action === "share"
          ? DriveApp.Access.ANYONE_WITH_LINK
          : DriveApp.Access.PRIVATE,
        DriveApp.Permission.VIEW,
      );
      // Sharing failures propagate; a stored file never implies public access.
      return jsonResponse({
        success: true,
        ...fileInfo(file),
        publicShared: data.action === "share",
      });
    }
    throw Error("UNKNOWN_ACTION");
  } catch (error) {
    const known = [
      "INVALID_PAYLOAD",
      "UNAUTHORIZED",
      "AUTH_CHECK_FAILED",
      "NOT_CONFIGURED",
      "UNKNOWN_ACTION",
      "INVALID_FILE",
      "UNSUPPORTED_TYPE",
      "FILE_TOO_LARGE",
      "OUTSIDE_APP_FOLDER",
      "PRIVATE_ORIGINAL",
      "FOLDER_NOT_PRIVATE",
    ];
    const code = known.includes(error.message)
      ? error.message
      : "DRIVE_OPERATION_FAILED";
    return jsonResponse({ success: false, error: code }); // Never echo tokens or raw Google responses.
  }
}

function authorizeAdmin(token) {
  if (!CONFIG || !CONFIG.projectId || !CONFIG.apiKey || !CONFIG.adminUid)
    throw Error("NOT_CONFIGURED");
  if (typeof token !== "string" || token.length > 10000)
    throw Error("UNAUTHORIZED");
  let claims;
  try {
    claims = JSON.parse(
      Utilities.newBlob(
        Utilities.base64DecodeWebSafe(token.split(".")[1]),
      ).getDataAsString(),
    );
  } catch (_) {
    throw Error("UNAUTHORIZED");
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    claims.aud !== CONFIG.projectId ||
    claims.iss !== "https://securetoken.google.com/" + CONFIG.projectId ||
    claims.sub !== CONFIG.adminUid ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now ||
    !Number.isFinite(claims.auth_time) ||
    claims.auth_time > now
  )
    throw Error("UNAUTHORIZED");
  // Decode alone is NOT authentication. Firebase verifies the token before any Drive operation.
  const response = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" +
      encodeURIComponent(CONFIG.apiKey),
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ idToken: token }),
      muteHttpExceptions: true,
    },
  );
  if (response.getResponseCode() !== 200) throw Error("AUTH_CHECK_FAILED");
  const user = (JSON.parse(response.getContentText()).users || [])[0];
  if (
    !user ||
    user.localId !== CONFIG.adminUid ||
    user.disabled ||
    claims.auth_time < Number(user.validSince || 0)
  )
    throw Error("UNAUTHORIZED");
}

function getOrCreateFolder(parent, name) {
  const found = parent.getFoldersByName(name);
  return privateFolder(
    found.hasNext() ? found.next() : parent.createFolder(name),
  );
}
function privateFolder(folder) {
  if (folder.isTrashed()) throw Error("INVALID_FILE");
  if (folder.getSharingAccess() !== DriveApp.Access.PRIVATE)
    throw Error("FOLDER_NOT_PRIVATE");
  return folder;
}

function rootFolder() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty("ROOT_FOLDER_ID");
  if (existing) {
    const root = DriveApp.getFolderById(existing);
    if (root.isTrashed()) throw Error("INVALID_FILE");
    return privateFolder(root);
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const saved = props.getProperty("ROOT_FOLDER_ID");
    if (saved) return privateFolder(DriveApp.getFolderById(saved));
    const root = getOrCreateFolder(
      DriveApp.getRootFolder(),
      CONFIG.rootFolderName,
    );
    props.setProperty("ROOT_FOLDER_ID", root.getId());
    return root;
  } finally {
    lock.releaseLock();
  }
}

function handleFileUpload(data) {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];
  if (!allowed.includes(data.mimeType)) throw Error("UNSUPPORTED_TYPE");
  if (
    typeof data.fileName !== "string" ||
    !data.fileName.trim() ||
    data.fileName.length > 200 ||
    typeof data.fileData !== "string" ||
    !data.fileData ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(data.fileData)
  )
    throw Error("INVALID_FILE");
  if (data.fileData.length > Math.ceil(MAX_FILE_BYTES / 3) * 4)
    throw Error("FILE_TOO_LARGE");
  const bytes = Utilities.base64Decode(data.fileData);
  if (!bytes.length || bytes.length > MAX_FILE_BYTES)
    throw Error("FILE_TOO_LARGE");
  const category = Object.prototype.hasOwnProperty.call(FOLDERS, data.category)
    ? data.category
    : "products";
  const folder = getOrCreateFolder(rootFolder(), FOLDERS[category]);
  const file = folder.createFile(
    Utilities.newBlob(bytes, data.mimeType, data.fileName.trim()),
  );
  // Originals and unpublished files stay private. Sharing is an explicit admin action.
  file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
  return {
    success: true,
    ...fileInfo(file),
    folderId: folder.getId(),
    folderName: folder.getName(),
    publicShared: false,
    createdAt: new Date().toISOString(),
  };
}

function fileInfo(file) {
  const id = file.getId(),
    resourceKey = file.getResourceKey() || "";
  const extra = resourceKey
    ? "&resourcekey=" + encodeURIComponent(resourceKey)
    : "";
  return {
    fileId: id,
    fileName: file.getName(),
    fileSize: file.getSize(),
    mimeType: file.getMimeType(),
    resourceKey,
    directUrl: "https://drive.google.com/uc?export=view&id=" + id + extra,
    downloadUrl: "https://drive.google.com/uc?export=download&id=" + id + extra,
    viewUrl: file.getUrl(),
  };
}

function appFile(id, readOnly) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id))
    throw Error("INVALID_FILE");
  const savedRoot =
    PropertiesService.getScriptProperties().getProperty("ROOT_FOLDER_ID");
  if (readOnly && !savedRoot) throw Error("NOT_CONFIGURED");
  const root = readOnly
      ? privateFolder(DriveApp.getFolderById(savedRoot)).getId()
      : rootFolder().getId(),
    file = DriveApp.getFileById(id);
  if (file.isTrashed()) throw Error("INVALID_FILE");
  const parents = file.getParents();
  while (parents.hasNext()) {
    const parent = parents.next();
    if (parent.getId() === root) return file;
    const grandparents = parent.getParents();
    while (grandparents.hasNext())
      if (grandparents.next().getId() === root) {
        privateFolder(parent);
        return file;
      }
  }
  throw Error("OUTSIDE_APP_FOLDER");
}

function isOriginal(file) {
  const parents = file.getParents();
  while (parents.hasNext())
    if (parents.next().getName() === FOLDERS.originals) return true;
  return false;
}

function listAppFiles() {
  const root = rootFolder(),
    folders = [root],
    children = root.getFolders(),
    files = [];
  while (children.hasNext() && folders.length < 20)
    folders.push(children.next());
  let truncated = children.hasNext();
  for (const folder of folders) {
    privateFolder(folder);
    const iterator = folder.getFiles();
    while (iterator.hasNext() && files.length < 100) {
      const file = iterator.next();
      if (!file.isTrashed())
        files.push({
          ...fileInfo(file),
          folderId: folder.getId(),
          folderName: folder.getName(),
        });
    }
    if (iterator.hasNext() || files.length >= 100) {
      truncated = true;
      break;
    }
  }
  return { success: true, files, truncated };
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
