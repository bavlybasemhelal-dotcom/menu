# Implementation status

## Latest owner amendment — one standard Drive connection

The owner requested removal of the direct OAuth method and all reference-project branding from the client-facing interface. Apps Script is now the only adapter. Removed the method selector, OAuth settings screen/GIS token and resumable-upload code, unused credentials/configuration fields and method-switch advice. The standard generated script and guide have neutral catalog wording. Rules accept only Apps Script and cap configured upload limits at 20 MiB.

Verification after this amendment: lint/typecheck/build PASS; 26 unit and 8 actual Rules emulator tests PASS. The 4 catalog/responsive browser scenarios passed in the combined run; its Drive scenario failed only on an assertion for copy that had deliberately changed. Updated that assertion and reran the Drive scenario: PASS (12.0 s; total 24.5 s). All 5 scenarios therefore pass against the final application; they still use mocked Google where stated. Script version 2 is deployed on the same /exec URL with neutral comments. Firebase Hosting and Rules deployment completed successfully on menu-3ebba; the app build is index-CNuxI_lM.js (133.02 kB). The actual hosted admin page visibly has one neutral connection form and no method selector/reference branding; real test/save succeeded again at 19:26 Cairo time. No production catalog fixtures were published. A subsequent PowerShell HTTP smoke request timed out; it is not counted as verification. The working hosted browser and CLI release are the live deployment evidence.

Live continuation evidence: actual owner sign-in succeeded; real ping created the catalog folder and saved private Firestore settings. Actual PNG original and WebP display assets uploaded and metadata saved. The selected display file was shared; the original remained private. Anonymous HTTP got WebP image bytes, while the original redirected to Google sign-in/HTML. The owner explicitly confirmed the display image in Incognito. Both production in-app probes failed (first the uc URL, then its observed static usercontent delivery target after deployment). Follow-up anonymous HTTP isolated the discrepancy: the delivery target returns image/webp + Access-Control-Allow-Origin:* with Origin/Referer or cache headers alone, but HTTP 403 HTML without CORS with the browser's cross-site Sec-Fetch headers. Direct-link image access therefore does not prove embedded browser delivery. The candidate remains tokenless; no expiring thumbnail, proxy, credential trick or new storage service was introduced. The selected display asset stays metadata_saved, without a verified public URL, and cannot be published. Real Drive upload/save/share/private-original isolation PASS; anonymous embedded image decode/save gate BLOCKED_DRIVE_PUBLIC_MEDIA. No weakening of the hard gate.

Current remaining acceptance: resolve actual browser image delivery, then exercise production name/logo/product price/offer publication with real owner content and an unsigned visitor. Full project production readiness is not claimed. The dated entries below are a chronological implementation history; their older missing OAuth/configuration statements are superseded by this current amendment.

Final read-only production check returned HTTP 200 for the private connection: provider apps_script, valid Web App URL, connection test saved, root present, and all three obsolete OAuth fields absent. No credentials/settings contents were logged. Final typecheck PASS. Hosted screenshot of the neutral form: .local/drive-single-method-live.jpg.

## 2026-10-08 — Live setup continuation

- Read-only authenticated Google API checks returned HTTP 200 for the exact allowlisted Firebase UID: the account exists, has an email and is not disabled. This is account readiness, not a successful production sign-in or CRUD test.
- Read-only Firestore GET returned HTTP 404 for privateShopConfig/main: no production Drive connection settings are saved yet. No production records were written by these checks.
- Prepared .local/drive-ready/Code.gs from the current bridge template and local public Firebase configuration. Its project and UID match production Rules; Node parsed the generated JavaScript successfully. Added a concise Arabic setup guide beside it. No password or Google token is included.
- After the owner personally signed in to Google, created Menu Catalog Drive Bridge, inserted the prepared code and saved it in Apps Script. Project URL: https://script.google.com/home/projects/1vKzKPDuEKDrQFVfZb5KqBMUF8cg-QlGkUos0vIXjsYyvyqeq9Znrh1cI/edit. Web App deployment setup is in progress; Google authorization, a returned /exec URL, real upload and anonymous/private-file acceptance remain unverified.
- Existing production site still displays the dynamic empty catalog awaiting owner content. No app-source change/build or duplicate Firebase release was necessary for this setup continuation.

## 2026-10-08 — Owner-requested Nexara Drive integration amendment

Execution checklist:
- [x] Read-only audit of reference AGENTS/README/referenced plan, Dart service/settings model, inline settings guide/script and standalone Apps Script. Reference files left unchanged.
- [x] Default Apps Script adapter, exact text/plain/base64/ping/upload link contract and 18 s / 45 s timeouts; Gmail + /exec URL + test/save + date/folder/storage-used-at-test; generated copyable/downloadable script and bilingual permanent guide.
- [x] Category folders for catalog media, upload/private original/optimized display, explicit sharing/revoke, incomplete-upload recovery, Firestore metadata. Existing direct OAuth adapter remains compatible/advanced.
- [x] Firebase allowlist authorization on every bridge POST, project/expiry/disabled/revoked-account checks, app-folder restriction, secret-free persisted settings, honest sharing failure and mandatory image gate.
- [x] Typecheck/lint/build PASS; 26 unit tests PASS; 8 actual Rules emulator tests PASS.
- [x] All 5 browser scenarios PASS (1.6 minutes): prior catalog/packaging/CRUD/responsive tests plus the Nexara-style connection/upload/share/recovery/logo replacement/failure-state scenario. Mocked Google responses are explicitly not real Drive evidence.
- [x] Published updated Hosting + Rules to menu-3ebba (32 files, 5 new/changed assets); Rules compiled/released and Hosting release completed. No production data was written or seeded.
- [ ] Actual owner Apps Script deployment/consent, upload and public/incognito image acceptance: BLOCKED_EXTERNAL, no Web App URL supplied.

The reference's anonymous upload and swallowed public-sharing failure are deliberately corrected. Google account ownership comes from the script's deploying account, not the email text field. Bridge upload is one request with a 20 MiB application cap and indeterminate progress; interruption may leave a recoverable Drive file. See docs/02, docs/07 and docs/08 for the recorded owner-approved architecture change. No paid service, Firebase Storage, Function or billing change.

Verification caught and fixed configuration listener id/updatedAt being written back (Rules correctly rejected it), and single-image selection retaining an old logo when a new one was chosen. Normalization now whitelists only configured fields, and logo selection replaces the existing choice. A corrupt test PNG correctly failed actual browser bitmap decoding and was replaced with valid test bytes. Bridge tests also deny revoked/disabled/wrong-project accounts, public parent folders and attempted public sharing of private originals. Word/Excel/text types and MIME fallback match the reference, alongside the catalog's video types. Published URLs remain tokenless and strictly validated. Screenshots: .local/drive-script-light-ar-375.png and .local/drive-script-dark-en-1440.png.

Hosted verification after release: root and /admin/drive returned HTTP 200 with the exact dist/index.html; the served index-DTuYav9V.js returned 200 and contains the Apps Script adapter/private-folder gate. One initial PowerShell route request timed out, then an independent recheck succeeded. The actual hosted browser settled to the anonymous empty catalog without query errors; navigating to /admin/drive redirects an unsigned visitor to /admin/login, retaining theme/language controls. Production owner sign-in/CRUD and real Apps Script actions were not run. Direct guide URL: https://menu-3ebba.web.app/admin/drive.

After testing, only the disposable demo-souqna emulator was reset/reseeded so saved mocked script URLs/connection states do not remain in the local preview. The final clean local guide was inspected in the app browser, with empty connection fields and test/save disabled until a real URL is entered. Additional screenshot: .local/drive-script-guide-preview.jpg. No production records were touched.

Updated: 2026-10-08 (Africa/Cairo). The owner explicitly requested Firebase Hosting deployment and a public link. Hosting, the required owner-allowlisted Rules and query indexes have now been deployed to menu-3ebba. Drive setup and full production content acceptance remain incomplete.

## Checklist
- [x] Read AGENTS, README, CODEX_START_HERE, PRD, docs/01–08, scripts/README, source/project-plan, design index and manifest.
- [x] Inspect all 20 reference images as 10 matching Light/Dark pairs; verify hashes and dimensions.
- [x] Audit workspace: handoff package only; no application/package/lockfile/git repository to preserve.
- [x] Phase 1 local foundation and security tests.
- [ ] Phase 1 real Drive acceptance: upload/save/share/private-original isolation PASS; owner Incognito direct-link confirmation PASS; embedded anonymous image decode gate BLOCKED_DRIVE_PUBLIC_MEDIA.
- [x] Phase 2 themes, localization and shared components.
- [x] Phase 3 admin CRUD and persistence: PASS_LOCAL_EMULATOR.
- [x] Phase 4 visitor catalog and live updates: PASS_LOCAL_EMULATOR.
- [x] Phase 5 feasible automated/security/responsive/dynamic tests.
- [x] Phase 6 Hosting/Rules/indexes configuration and deployment guide.
- [x] Phase 6 owner-authorized Hosting/Rules/indexes deployment and anonymous public-page smoke checks.
- [ ] Phase 6 full production owner CRUD, real Drive and incognito-image acceptance.

## Phase 0 — Audit
Status: PASS.
Application root: this handoff folder, preserving all supplied documents/designs/source files.
References inspected: pairs 01–10 in .local/reference-pairs; these composites are inspection aids, never application assets.
Known environment: Node/npm/Firebase CLI available. Portable official Java 21 and Playwright Chromium installed locally for verification; no system Java replacement. Archive initially contained requirements and references without an application.
Read-only Firebase check: Web SDK configuration retrieved from the existing menu-3ebba Web app. No new cloud resources or production writes.
Current risk: real Drive images are accessible by direct link but Google rejects the browser's cross-site image request. Owner connection settings and 20 MiB limits are saved. OAuth Client ID is no longer required by the selected architecture.

## Truthfulness
Hosting/Rules/indexes deployment and the hosted browser passed. Actual admin sign-in, private settings save, Drive upload, explicit display sharing and private-original isolation passed; two named probe media records were created. Anonymous direct-link access and owner Incognito confirmation passed, but actual browser embedding/decode still failed and no media was marked verified or published. Full production owner content CRUD acceptance has NOT passed. Catalog CRUD scenarios below use isolated demo-souqna emulators. No production shop/product/offer fixtures were seeded. The production application has no built-in shop identity or catalog.

## Phase 1 — Security and integrations
Status: PASS_LOCAL_EMULATOR; real Google Drive POC BLOCKED_EXTERNAL.
Firebase public Web configuration was retrieved read-only. The owner supplied an admin UID, now configured in deployed production Rules. No Google client ID, restricted Drive API key or authorized Google session is available.
Prepared: typed models and validation, money/schedule/localization logic, Firebase codec, deny-by-default allowlisted Rules, query indexes, memory-only GIS/Drive adapter, resumable upload, tokenless image probe, unit and emulator-security tests.
Production Rules/indexes were deployed after the owner's later explicit Hosting request. No production content was written. The image probe is not proof of real Drive success until executed on an owner-authorized actual file and incognito origin.

Phase 1 final local evidence: 16 unit tests PASS; 6 Firestore Rules emulator tests PASS on 2026-10-08. Java 21 is in ignored .local/java. Dependency audit: 0 reported vulnerabilities. Owner authorization, anonymous read/write isolation, invalid money/packing counts, unverified private media and bundle-member units were exercised against actual Rules.

## Phase 2 — Shared foundations
Status: PASS_LOCAL. Theme tokens, self-hosted Cairo typography, prepaint preference persistence, RTL/LTR layouts, accessible Radix confirmation dialogs, shared forms/cards/prices and route-wide controls. Stored branding remains editable; displayed tones adapt for readable contrast in both themes. Browser verification passed at 375/768/1024/1440 widths.

## Phase 3 — Admin workflows
Status: PASS_LOCAL_EMULATOR; live Drive lifecycle and real-account email/password changes unverified. Implemented email/password login/reset, server Rules-based owner authorization, reauthenticated account changes, editable store/contact/colors/currency, categories/products/discounts/variants, offers/bundles/banners, media lifecycle and permanent bilingual Drive/account-change guide. CRUD calls persist to Firestore. Filters and catalog lists are bounded and indexed.

Latest owner amendment: piece → box → carton, nullable independent prices, pieces per box and boxes per carton; total pieces per carton are calculated from packing counts. At least one price is required; omitted price levels are hidden. Discounts can target a box or all configured levels. Bundles support piece/box/carton units with an independent final price. This is packaging/catalog information, without an inventory ledger or purchase workflow.

## Phase 4 — Visitor catalog
Status: PASS_LOCAL_EMULATOR. Dynamic shop splash/header/title, live paginated catalog/search/filters, offers, details/galleries/options, WhatsApp inquiry and Facebook contact footer. Published changes reach an unsigned visitor without rebuilding. No cart/orders/checkout/payment controls. Real images still require the Drive gate.

## Phase 5 — Final local verification

| Command/check | Actual outcome |
| --- | --- |
| npm run lint | PASS |
| npm run build (includes tsc --noEmit) | PASS; dist generated |
| npm test | 16 PASS across 4 unit files |
| npm run test:integration with running local emulators | 6 PASS |
| npm run test:e2e with local emulators | 4 PASS, final run 1.5 minutes |
| npm audit --omit=dev | 0 reported vulnerabilities |
| Responsive routes | 375/768/1024/1440; Light Arabic and Dark English, no horizontal overflow |

Browser scenario 1: create/edit/delete category; publish box-only product with a box discount; verify no invented piece/carton price; hide, republish and delete while an unsigned visitor stays open.
Browser scenario 2: change shop name and logo from admin, create piece/box/carton product (6 pieces per box, 4 boxes per carton = 24 pieces), edit price, publish special, create box bundle, invalidate it on member change, review and republish. Visitor updates observed live.
Browser scenario 3: anonymous admin redirect, theme/language persistence through routes and reload, five visitor/login routes at four widths and both theme/language directions; purchase controls absent.
Browser scenario 4: ten admin routes at four widths, toggles and overflow checks in both themes/directions.

The dynamic-logo browser test intercepts a synthetic test image. It proves Firestore binding/UI updates, NOT live Google Drive upload or anonymous delivery. Account reauthentication, actual Drive consent/upload/cancellation/revocation and production-origin contact/media checks remain external acceptance work.

Visual evidence in ignored .local: visitor-light-ar-375.png, visitor-light-ar-1440.png, visitor-dark-en-375.png, visitor-dark-en-1440.png, admin-products-new-dark-en-375.png, admin-products-new-dark-en-1440.png, admin-dark-en-375.png, admin-dark-en-1440.png and drive-guide-light-ar.png. Screenshots disable animation only while capturing, so transient fade-in frames do not obscure the review. References are mapped in docs/09_VISUAL_VERIFICATION.md.

Non-blocking diagnostics: Vite reports the Firebase SDK chunk at about 561 kB (166 kB gzip) and strips two misplaced PURE annotations from Zod. Test-only Admin SDK initialization emits a metadata lookup warning; fixture writes are explicitly restricted to demo-souqna/local emulator endpoints. These diagnostics did not fail any checks.

## Phase 6 — Handoff and release

Status: HOSTING_DEPLOYED / DRIVE_ACCEPTANCE_PENDING. Production build passed, then Firebase CLI deploy --only firestore:rules,firestore:indexes,hosting --project menu-3ebba --non-interactive succeeded. Hosting uploaded 32 files and released the site at https://menu-3ebba.web.app. Rules compiled successfully and were released with the supplied owner UID. Read-only server inspection confirmed all 43 query indexes READY. No paid infrastructure, billing change, Firebase Storage or Functions was introduced.

Hosted smoke checks: /, /offers and /admin/login load the production React application. Anonymous catalog/category/product/bundle queries settled without error after indexes reached READY; empty content shows preparation/empty states. The first check during index creation showed failed-precondition, resolved after READY and reload. Hosting root, offers and login HTTP 200 content matched dist/index.html; a transient offers network timeout was followed by a successful independent recheck. Screenshot evidence: .local/hosting-live-light-ar.jpg. Production admin sign-in/content writes and live media were not performed. Admin URL: https://menu-3ebba.web.app/admin/login.

Remaining owner actions: sign in with the actual Firebase admin email/password and fill store identity/catalog; create Google OAuth Web Client ID and a restricted Drive API key using the permanent /admin/drive guide; choose upload limits; authorize the actual Drive account; execute the small-image/private-original/incognito gate. Run the same dynamic scenario with the real admin and an unsigned visitor on the deployed origin and record actual results. The full project is not declared production-complete until these gates pass.
