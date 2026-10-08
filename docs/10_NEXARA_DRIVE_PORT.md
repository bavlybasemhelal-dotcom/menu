# Nexara Drive reference port — 2026-10-08

The owner requested the integration at D:/Projects/Nexera/Nexara. That project was inspected read-only and remains unchanged. The user request authorizes this change from the original GIS-only plan.

| Reference detail | Catalog implementation |
| --- | --- |
| google_drive_service.dart: get/saveDoctorDriveSettings | Private Firestore settings, live listener, admin-only Rules; one store instead of doctor-specific collections |
| DoctorDriveSettings: googleEmail/webAppUrl/isConnected/lastTestedAt/rootFolderId/rootFolderName | Equivalent fields; scriptConnected and last test are historical, not an invented live-health state |
| settings_tab.dart: Gmail, Web App URL, test-and-save button, guide and copy script | Same workflow in /admin/drive, bilingual themes, generated code + copy/download/read-only source |
| POST text/plain;charset=utf-8 with JSON action=ping | Same content type/body/action; browser follows ContentService redirects; 18-second timeout |
| upload fileData base64/fileName/mimeType/category | Same payload; 45-second timeout; one request, no pretend resumable percentage |
| automatic root/child folders | Products, Offers & Banners, Branding, Documents, Videos, Private Originals mapped to catalog scope |
| fileId/name/size/MIME/directUrl/viewUrl/downloadUrl/folderId/folderName | Saved in prescribed media collection; files stay in owner Drive, business data stays in Firestore |
| JPEG/PNG/GIF/WebP/PDF/DOC/DOCX/XLS/XLSX/TXT MIME inference | Supported; missing/octet-stream browser MIME falls back to the same extension mapping. MP4/WebM retained for the catalog's video requirement |
| owner executes script, Web App access Anyone | Same deployment steps, but every POST additionally verifies the allowlisted Firebase admin |
| a free Google-owned deployment | Same owner-run Apps Script, no Firebase Storage/Functions/Blaze/billing changes |

Mandatory security/acceptance differences: reference accepts unauthenticated uploads, automatically shares every file and suppresses sharing errors. This port checks Firebase accounts:lookup plus project/issuer/UID/expiry/disabled/revocation boundaries, restricts file operations to app folders, keeps originals private and requires explicit sharing followed by an anonymous image gate. Folder names and file-type limits are visible; no hospital/patient data or reference deployment is copied. The raw template has a null CONFIG intentionally; use the admin-generated version, which inserts public identifiers and the logged-in owner's UID.

The root and category folders must stay Restricted. Public parent folders can grant inherited access to new files; the bridge rejects those folders rather than claiming private storage or silently revoking pre-existing access.

Account-level permission is broader than the bridge's operation limits: DriveApp requires the full drive OAuth scope, and UrlFetchApp requires script.external_request. The owner's real project overview showed both scopes. The owner explicitly approved both on 2026-10-08; approval is not evidence that Google's consent was completed. The admin guide now explains the difference from the advanced drive.file adapter and the Run → Review permissions fallback for failed first deployment.

The bridge has a 20 MiB application cap per file (not a statement of Google's platform limit); its base64 request, timeout and Google quotas are material constraints. The previous direct API/GIS adapter is retained as an advanced option for larger/resumable uploads and existing assets. Changing providers or accounts does not migrate files. Recovery lists at most 100 files; the admin can open Drive for the rest. Recovery detects an existing driveFileId before creating another record. Disconnecting the saved URL does not archive the Google deployment; both actions are explained in-app.

Anonymous rendering remains a real acceptance gate: the uc?export=view URL matches Nexara's direct URL, but a successful upload/ping is not proof it embeds. CORS/login/HTML/bad image bytes/sharing restrictions must fail publication. The browser probe omits credentials and decodes actual image bytes; owner incognito confirmation is separate. Local protocol/Google/image fixtures do not establish real Drive acceptance.

Official references checked during implementation: [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web), [ContentService redirects](https://developers.google.com/apps-script/guides/content), [Quotas](https://developers.google.com/apps-script/guides/services/quotas), [Firebase token account lookup](https://firebase.google.com/docs/reference/rest/auth).
