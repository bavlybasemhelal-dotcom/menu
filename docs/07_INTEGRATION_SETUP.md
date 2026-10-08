# Firebase and Google Drive setup

Google Apps Script is the only supported connection. Text, prices and metadata are in Firestore; files are in the owner's Drive; app code is on Firebase Hosting. No paid service, Firebase Storage, Functions or browser OAuth client is required.

1. Sign in to /admin/drive with the allowlisted Firebase Email/Password account. Enter your Google email for reference and optional storage folder name.
2. Copy/download the generated Code.gs. It includes only public Firebase identifiers and your current admin UID, without passwords or Google tokens.
3. Open https://script.google.com/home/start in the Google account that will own files. Create a project, replace Code.gs and save.
4. Deploy → New deployment → Web app → Execute as Me → Who has access Anyone. Review Google permissions yourself and copy the /exec URL, not /dev. All file operations still require the allowlisted Firebase administrator.
5. DriveApp needs the full drive scope (see/edit/create/delete all Drive files), plus script.external_request to verify Firebase. The code limits operations to the catalog folders and has no delete action; the Google grant itself is broader. Review the actual consent.
6. If deployment fails before authorization: select doGet, Run → Review permissions, complete Google consent and retry deployment. If the popup does not appear, open the same script in your normal browser.
7. Paste /exec URL, choose limits and test/save. Zero disables a file type. Each type supports at most 20 MiB per file; reduce larger files before upload. The last test is historical, not a promise of current access.
8. Upload a small image from Media. Optional optimization saves a private original and a separate WebP display version (up to 1600px). Products, Offers/Banners, Branding, Documents and Videos have separate private folders.
9. Share the display file only. Keep root/category folders Restricted and private originals private. Check the candidate image in Incognito without Google login, then run the browser's credential-free fetch/decode probe. Failure blocks publication.
10. Public image candidates use the observed static drive.usercontent.google.com/download target with export=view and a file ID. The original Drive sharing/view link remains metadata. There are no auth tokens, signed expiry parameters or expiring thumbnails. Do not assert future availability: Google sharing policies, traffic limits and endpoint behavior can change.
11. Fill actual shop branding/contact data and catalog, then test with an unsigned visitor: change name/logo, add/edit/hide/delete products and prices, publish an offer and verify live updates without rebuilding.

## Account changes and errors

- The deploying Google account owns storage; editing the email field does not migrate files.
- To change Google accounts, deploy in the new account, replace/test its URL and reupload/retest assets as needed. Archive the old deployment to stop it.
- Changing a Firebase admin's email preserves UID. Creating a different Firebase user requires updating Rules and generating/deploying new code.
- For code changes: Manage deployments → Edit → New version → Deploy.
- If Firebase lookup fails because the Web API key is restricted to HTTP referrers, use a separate server-compatible key restricted to Identity Toolkit API in CONFIG.apiKey. Keep the site's existing restrictions.
- A sharing failure, login/HTML response, CORS/network error or invalid bitmap must not be reported as successful image acceptance. A Workspace admin may prohibit public sharing.
- Interrupted uploads can leave a recoverable private Drive file. The recovery screen lists up to 100 files and detects existing metadata.

## Verified infrastructure and remaining acceptance

Project menu-3ebba, shop main, allowlisted owner Rules and 43 indexes are deployed. The Apps Script deployment, real owner sign-in, ping, upload and file-only sharing succeeded on 2026-10-08. The owner confirmed the display image in Incognito; private original access was denied. See IMPLEMENTATION_STATUS.md for the latest in-app image and full production acceptance results. Local mocked tests alone never prove live Google delivery.

Official references: [Web Apps](https://developers.google.com/apps-script/guides/web), [Content Service](https://developers.google.com/apps-script/guides/content), [Quotas](https://developers.google.com/apps-script/guides/services/quotas), [Firebase Auth REST](https://firebase.google.com/docs/reference/rest/auth).
