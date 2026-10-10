# Implementation status

## 2026-10-10 — Image upload and display performance

Owner request: reduce upload/display delays, automatically compress images and deploy to existing Firebase Hosting/GitHub after verification.

Checklist:
- [x] Audit: every image previously uploaded the full private original first, then a 1600 px display copy; resolved image requests were discarded, causing another Apps Script fetch on navigation. Offscreen media metadata was also read immediately.
- [x] Adapt browser-side WebP compression to placement (800 px branding, 1280 px products, 1600 px offers), with 192/256 KiB targets, bounded quality/dimension reduction and no enlargement of already-efficient small images. PNG transparency remains supported. GIF animation remains unchanged rather than silently flattening it. Configured display cap still applies; source input is bounded at 20 MiB.
- [x] Upload only the display copy by default. Optional checkbox uploads a separate private original and preserves originalMediaId/recovery guards. Existing originals/content are untouched. Show actual source/display sizes, savings and operation stages; no fabricated byte progress.
- [x] Reuse tokenless validated public image bytes in bounded memory/browser CacheStorage (10 minute validity, 64 entries/24 MiB per cache). Fresh authorized Firestore metadata still gates rendering on each mount/revision; metadata, auth replies, private originals and failures are not persisted in this cache. New Drive IDs immediately replace old images; repair/revoke clears local cache, and publication verification always bypasses the cache.
- [x] Share concurrent downloads and concurrent server metadata reads; defer both metadata and bytes until near the viewport. Limit public image network concurrency to four, prioritizing logo/hero/detail cover. Native images use async decode and reserved layout space. No Google script/Rules/service/billing changes.
- [x] Initial local checks: lint/typecheck/build PASS after fixing two TypeScript test/cache declarations; 32 unit tests PASS; 8 Rules security scenarios PASS. Targeted four browser scenarios PASS: all inline editors, optional private originals, GIF replacement/recovery, delayed/broken branding and real browser compression/cache behavior. Synthetic Google responses are explicitly separate from real Google integration.
- [x] Initial measured local stress fixture: a 2400×1800 noisy PNG, 12,712,268 bytes, compressed to 149,168 bytes (819×614 WebP, ~98.8% reduction) in 1.423 s. Small reprocessing did not increase size. Browser cache reload read took 4 ms and made no second Google request; this timing uses a synthetic network fixture, not production latency.
- [x] Final source build/typecheck/lint PASS, 32 unit tests PASS, 8 Rules security tests PASS; final full browser suite 9 PASS (3.0 min). Added an open-visitor price-edit regression: the already-displayed Drive photo must decode again after the content revision without another image download. Source revision keys prevent reuse of a revoked local Blob URL during metadata refresh. Reviewed the compact image options at 375 px Light/Arabic and 1440 px Dark/English, plus actual admin size/stage presentation. The local browser environment/synthetic responses are labeled independently of real cloud evidence.
- [x] Real Firebase/Drive proof from the local production-configured origin: zero mocked requests, 7,800,559-byte PNG became 146,528-byte WebP (819×614, ~98.1% reduction), one display upload, 18.980 s including compression/upload/sharing/fresh verification. A fresh unsigned visitor decoded it in 5.424 s from page navigation; reload took 1.067 s with zero additional Google image requests (cover/thumbnail shared the first request). Temporary product was deleted through admin. Evidence: .local/image-performance-live-local.json. Initial harness attempts used an insufficient 5 s image expectation and sampled data-file-id before its metadata read completed; those were corrected, rather than changing the production network timeout. Small unused verification files remain in Drive; no physical Drive deletion endpoint exists.
- [x] Final targeted inline-image recheck PASS (35.7 s), explicitly measuring the already-loaded visitor's Drive file ID and asserting a nonzero baseline followed by no extra Google request after a live price edit. Final lint and git diff --check PASS.
- [ ] Hosting deployment BLOCKED_EXTERNAL: Firebase CLI deploy --only hosting --project menu-3ebba --non-interactive on 2026-10-10 returned HTTP 403 for project lookup and testIamPermissions. Logged-in CLI account is bavlybasem472@gmail.com; Google reports missing serviceusage.services.use/project access. There is no alternative configured account, credential environment or existing deployment workflow. No IAM/billing/Rules changes were attempted. Owner must sign in with an account authorized for this Firebase project (or restore its intended existing access). Hosted code is still the prior release; final hosted compression/performance acceptance and served hashes are not claimed.
- [x] Tested implementation pushed to GitHub main: 71008cee05ebfaf700b80bf05179625acb425a8c. The actual remote branch matches that revision. This closing documentation update records the verified push and the remaining Firebase permission blocker; runtime credentials, generated images, local proof files and builds stay ignored.

Operational limits: a first uncached image still uses Google Apps Script's redirect/read latency; the cache cannot remove the first Google response time or affect visitors on another device. Existing stored files are not retroactively recompressed. GIF preserves animation and is not lossy-compressed. Targets are optimization goals, not an unconditional size guarantee for every format/browser.

## 2026-10-09 — Dynamic splash store identity

Checklist:
- [x] Audit the existing shared Firestore branding and both 01-splash design references. The splash already used dynamic Brand, but its 1.4 s timeout could dismiss before the Drive logo loaded, and compact header styles clipped/shrank the large name on mobile.
- [x] Keep the splash until store data and the selected logo finish loading (or fail), then retain the 1.4 s introduction. Browse now stays available during loading. The shared logo reports native image load, fetch/decode error and missing/unverified metadata; logo changes mount a fresh media reader. Names/logos remain Firestore data, with no fixed brand or catalog content.
- [x] Tie the per-session introduction marker to the saved bilingual name and logo reference. A later visit after identity changes shows the updated introduction; unrelated navigation with unchanged branding skips the repeat. Changing branding does not reopen the splash over an already-browsing visitor.
- [x] Show the complete name with responsive multiline text, a larger contained logo and scoped splash typography that compact header rules cannot override. Shared header/footer logos also use contain rather than cropping. Arabic/English and Light/Dark controls stay available.
- [x] Targeted browser regressions passed for delayed Drive replies, saved name/logo, updated identity on revisit, missing/broken logos and manual browse. These use real Rules-enforced local Firestore edits with synthetic Google responses; they are not a new real Drive test.
- [x] Final full browser regression: 8 PASS (2.5 min), including all existing catalog/Drive/theme/language/density checks and both splash scenarios. Also covers Browse before the first Firestore snapshot completing without an unwanted repeat. Final typecheck/lint/build PASS. Slow-image regression holds responses longer than the introduction while staying below network timeouts, and resumes the test clock for fresh SDK initialization.
- [x] Inspect .local/splash-dynamic-light-ar-375.png and .local/splash-dynamic-dark-en-1440.png: complete responsive names, contained logos and coherent Light/Dark styling. These use synthetic logo bytes, not fixed production branding.
- [x] Firebase Hosting release completed (32 files, 3 changed assets). Root, index-YZmr99Lb.js and index-CW9B7fkD.css return HTTP 200 and match local SHA-256 hashes. Firebase/Drive configuration, Rules and production documents were unchanged.
- [x] Read-only real hosted browser proof PASS at 2026-10-08T23:34:32.995Z (2026-10-09 local): fresh unsigned visitor, zero mocked requests/production writes, saved Arabic name ماركت المحبة appears in the splash and header, automatic transition works and unchanged branding skips the repeat. Evidence: .local/live-splash-proof.json and .local/splash-live-hosted-375.png. Actual shop currently has no logo selected; production-logo rendering is not claimed for this check. Saved/replaced logo behavior is proven by emulator/browser scenarios, while real Drive image delivery was independently proven in the prior release.

## 2026-10-09 — Inline image editing, Media removal and real Drive image delivery

This section supersedes the historical embedded-image blocker and incomplete-upload notes below. No additional provider, paid service, Firebase Storage, Function or billing change was introduced.

Checklist:
- [x] Remove the standalone Media page/navigation. Its old URL redirects to Products. Direct image upload, preview, replacement, removal, existing-image reuse, repair and section-scoped recovery now live inside product, store-logo, category and offer/banner editors. Administrative documents/videos and private-original recovery belong in the existing Drive settings section.
- [x] Preserve the existing Firestore media references, usage guards and owner content. Every image has a separate private original, including GIFs; only display copies are shared. Recovery deduplicates by Drive file ID and preserves originalMediaId/current usage relationships. Retry a known uploaded file without uploading it again.
- [x] Add protocol 2 read-only image delivery to the existing Apps Script bridge. Anonymous GET only reads an already-shared image in a private app folder; rejects originals, private/foreign files, unsupported types, oversized files and missing roots. It cannot create folders or change permissions. All mutations still require the allowlisted Firebase administrator in the HTTPS POST body.
- [x] Enforce anonymous fetch and actual image decoding before attachment/publication. Firestore contains only metadata/permanent links; browser memory holds temporary Blob URLs. Near-viewport images load on demand and simultaneous requests share an in-flight fetch. Public URL Rules allow only the strict image endpoint without tokens or arbitrary query parameters.
- [x] Block editor saving during image operations, prevent duplicate operations and cancel/release local previews on unmount. Store settings wait for initial Firestore data before showing editable fields. Image/product pagination uses non-submit buttons, so browsing previous assets never saves the enclosing form.
- [x] Keep catalog/store subscriptions live. Asset metadata is read freshly from the server on image-reference, store, user or content revision changes, avoiding a detached image listener losing permission during replacement. The regression scenario proves an open unsigned visitor receives a replacement logo, including animated GIF bytes.
- [x] Owner manually updated/deployed the prepared Google script, preserving the existing /exec URL. Live ping reports protocol 2. It initially rejected the publicly shared root with FOLDER_NOT_PRIVATE; the owner restricted the root/subfolders and the two selected display files were then shared individually. The computer-use tool was unavailable, so no automatic Google editor/deployment action is claimed.
- [x] **Real Drive acceptance PASS:** fresh unsigned Chromium, zero mocked requests, fetched/decoded both the actual 4×4 probe WebP and the owner's uploaded 720×1600 WebP. Both private originals and a foreign ID were denied. Only those two proven display records were marked verified with update-time preconditions. Local evidence: .local/drive-browser-proof.json. No password, token, private original or image bytes were added to source/Firestore.
- [x] **Actual Firebase/Drive inline workflow PASS:** real admin uploaded an image directly in a temporary published product; a fresh unsigned visitor decoded it, received a price edit and image removal live; the test product was deleted through the UI. Evidence: .local/live-inline-proof.json. Small unused test files remain in Drive; no physical Drive deletion endpoint exists. Other owner/demo content was preserved.
- [x] Final lint PASS, 29 unit tests PASS across 6 files; 8 Rules emulator security tests PASS for the strict endpoint/public-private guards. Production typecheck/build PASS. Final full browser suite: 6 PASS (2.3 min). The catalog name/logo/offer scenario, every editor, GIF replacement, recovery/error retry and responsive/theme/language checks use isolated emulators and synthetic Google responses; these are explicitly separate from the real cloud evidence. Store-loading and non-submit controls address edit/navigation races found during verification; the final suite ran after the completed build without source/documentation changes during execution.
- [x] Final Hosting release completed: 32 files, 3 changed assets. Root and /admin/login return HTTP 200 with the exact dist/index.html; served index-CxQhBaBe.js and index-DQprLEuV.css return 200 and match local SHA-256 hashes. Existing strict image Rules were already deployed successfully in this change.
- [x] Final actual hosted browser proof PASS at 2026-10-08T23:06:54.418Z (2026-10-09 local): zero mocked requests; an unsigned visitor decoded the existing verified real Drive image in a newly published temporary product, received a live price edit and image removal, and the temporary product 0QYvdjcbHfgkTNHndc97 was deleted. A separate authenticated read confirms HTTP 404 for that product; anonymous private settings still return 403. This hosted check reuses the verified image; the earlier local-origin/real-cloud scenario separately proves direct upload. Evidence: .local/live-hosted-image-proof.json. Local network initially reset TLS connections; HTTP/1.1 with IPv4/TLS 1.2 and Chromium using the observed IPv4 DNS result completed verification with normal certificate validation.
- [x] Implementation commit fd141d0 pushed to GitHub main; its full local/remote revision matched fd141d0ebf6e3f36772857a9dd4d669b6ad690d9. This status-only closing update records that verified release; runtime credentials, proof files, screenshots, generated local code and build artifacts remain ignored.

Visual checks: .local/inline-images-375.png (Light/Arabic) and .local/inline-images-1440.png (Dark/English) inspected; compact editor grids, mobile controls, image previews and previous-asset recovery remain readable. Actual final hosted visitor evidence is in .local/live-hosted-image-proof.json and .local/live-inline-visitor.png.

Operational limits: the same Apps Script/Drive quotas apply; one-request files remain capped at 20 MiB (or the lower administrator-configured type limit), with no resumable transfer. Root/subfolders must remain Restricted. Public image delivery is proven for the tested real files; production video/document streaming and real-cloud store-name/logo/offer edits are not claimed. Those edits and all natural image fields are covered by emulator/browser scenarios. No integration blocker remains for the tested real product-image workflow.

## 2026-10-09 — Compact UI and owner-requested client presentation

Checklist:
- [x] Inspect existing source, paired-screen design contract, styling skills and live public catalog before changes. Live shop/categories/products/offers were empty; private Drive configuration was preserved.
- [x] Compact shared spacing, typography hierarchy, hero, cards, form panels, statistics, sidebar and table rows. Six product columns at 1440 px, five on smaller desktops, four on tablets, three on wide mobile and two on narrow mobile. Touch targets remain at least 44 px on mobile. Product cards keep all configured price levels; full packaging captions remain on detail pages. Single-page pagination is hidden only when there is no next page.
- [x] Publish editable demo content into actual Firestore with create-only/existence-precondition writes: 1 store, 6 categories, 24 products, 5 offers/banners (two bundles, one special, hero and strip). All use bilingual sample copy, EGP minor units, optional piece/box/carton levels, percentage/fixed discounts, limited/unavailable examples and editable variants. No fake contact numbers or unverified images. Stable demo- IDs; local preflight and created-path manifest retained in ignored .local/demo-export. Commit time: 2026-10-08T17:31:23.537312Z.
- [x] Recheck seed idempotence: dry-run after commit plans 0 writes, preserves all 36 existing demo documents and does not replace owner edits. No private configuration/media changes.
- [x] Anonymous real Firestore HTTP reads of store/product/bundle returned 200; privateShopConfig/main returned 403 without credentials.
- [x] Lint/typecheck/build PASS; 27 unit tests PASS including schema, bilingual data, prices, category references and bundle unit validity. Full 6 browser scenarios PASS (3.3 min) after moving the previous card-only packaging assertion to the full detail page. Includes genuine Rules-enforced emulator admin editing and immediate unsigned visitor updates, all route/theme/language/width checks, and mocked Drive explicitly separated from real integration proof.
- [x] Final targeted browser recheck after hiding inactive single-page controls: PASS (24.5 s), including absence of redundant visitor pagination and working next/first admin navigation. Final lint and typecheck PASS.
- [x] Firebase Hosting deploy completed (32 files, 3 new/changed assets). Anonymous curl HTTP 200 returned the exact final dist/index.html; SHA-256 of served index-Bf5GAn4u.js and index-DFqffOmR.css matches the local build. Served CSS contains the six-column layout; demo shop names are absent from the application bundle.
- [x] Actual anonymous published-data queries returned HTTP 200 with exactly 6 categories, 24 products and 5 offers. Private settings still return 403. An initial Node HTTPS Hosting check failed at the network layer; subsequent independent curl checks succeeded and are the live asset proof.
- [x] Compact UI/demo-source/documentation changes committed as bad9e89 and pushed successfully to existing GitHub main. Runtime credentials, local publication snapshots/manifests, mock artifacts and screenshots remain excluded.

Visual inspection: .local/compact-demo-public-ar-1440.png, compact-demo-public-en-375.png and compact-demo-admin-ar-1440.png. The synthetic local screenshots contain emulator preview records and are not production-browser proof. Current in-app browser tool cannot initialize (missing runtime assets); no claim of a new live browser screenshot or completed production admin edit is made. Live public data was independently verified over anonymous HTTP.

Existing Drive image-delivery gate remains BLOCKED_DRIVE_PUBLIC_MEDIA. Demo products deliberately have no media IDs; ordinary UI placeholders are shown, with no fake upload/verification. This owner-authorized presentation dataset supersedes the older prohibition on demo production records; it is not a claim of final real-store content or full integration readiness.

## 2026-10-08 — Owner-authorized GitHub source upload

Initialized this application folder as a Git repository on main and pushed the complete source handoff to https://github.com/bavlybasemhelal-dotcom/menu.git. Initial commit 08433cfc2d8574b8ac0b96a223231292f2cdad81 was confirmed identical to GitHub refs/heads/main using git ls-remote. The remote was empty before the first push; no history was overwritten or force-pushed. Local main tracks origin/main.

Export includes 105 files: application, dependency lockfile, Firebase Rules/indexes/configuration, Apps Script template, tests, documentation and all 20 supplied design references. Staged files total 33.85 MiB (largest 1.97 MiB). Preflight found no private keys, Google/GitHub tokens, client secrets or unintended admin passwords. .env.local, runtime credentials, .local, .firebase, dependencies, build output, test reports and debug logs are excluded; safe environment templates and the isolated demo-souqna emulator configuration are included. Extended .gitignore to ignore other real .env variants while retaining those templates.

This export changes no application behavior and requires no repeat of the prior passing application tests. Real embedded Drive image delivery remains BLOCKED_DRIVE_PUBLIC_MEDIA as recorded below; uploading the source does not resolve that integration gate or declare production readiness.

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
