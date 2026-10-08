# Owner setup and release
## Current release state
Latest owner-requested update: Apps Script is the only connection and reference-project names are removed from product copy. Real Google deployment/sign-in/ping/upload/share succeeded; image and full dynamic acceptance remain independently gated. The current live evidence is in IMPLEMENTATION_STATUS.md.
The owner authorized deployment on 2026-10-08. Hosting, owner-allowlisted Rules and query indexes are deployed to menu-3ebba. Public site: https://menu-3ebba.web.app; admin sign-in: https://menu-3ebba.web.app/admin/login. All 43 indexes reached READY and anonymous catalog/offers/login pages were checked. Production content is empty until configured from admin. Actual owner sign-in and Drive uploads succeeded; the hosted link alone does not prove the remaining complete catalog acceptance.

## Local preview
Application root is this handoff folder. Install Node and run npm ci.
1. Run npm run emulators (requires Firebase CLI and Java 21; ignored .local/java is used if present).
2. In a second terminal: set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 and FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099, then npm run seed:emulator.
3. Run npm run dev:emulator and open http://127.0.0.1:5173.
4. Local-only login is owner@example.test / LocalTest123!. These are disposable emulator fixtures, never production accounts.
Emulator Rules are generated separately in .local/firestore.emulator.rules. Production UID is never replaced in firestore.rules. Seed script refuses to run without both exact local emulator endpoints. The emulator banner always identifies this mode.

## Firebase public configuration
Copy .env.example to .env.local and enter the Web app SDK public configuration from Firebase → Project settings → Your apps.
Existing project: menu-3ebba, Web app ID: 1:982988699945:web:3d3447af4cd1a16dda1f38.
Shop ID: main. Keep production VITE_USE_EMULATORS unset/false.
No Firebase Storage, Functions, service account or payment plan is required by this app.
Do not put account passwords, OAuth Client Secrets or access/refresh tokens in env files.

## Owner authorization
The supplied owner UID is configured in firestore.rules and was deployed with the owner's Hosting request.
If replacing the admin with another Firebase user, copy its User UID from Authentication → Users:
node scripts/configure-admin.mjs NEW_UID main
Review the Rules diff, run security tests and separately approve a Rules deployment.
Changing the email of the existing account keeps its UID and does not require changing Rules.
The browser checks owner access via a server read of privateShopConfig/main; client-side roles cannot grant access.
The production allowlisted Rules are now deployed. Sign in with the actual admin Firebase Authentication email/password; disposable emulator credentials do not work on the hosted site.

## Google Drive setup — permanent in-app guide

Google Apps Script is the only connection. Open /admin/drive, copy/download Code.gs, deploy in your Google account as Me / Anyone, paste the /exec URL and test/save. The bilingual guide covers permissions, account changes, deployment versions and anonymous image verification. No Client ID or browser Drive API key is needed. Files larger than 20 MiB must be reduced before upload. See docs/07_INTEGRATION_SETUP.md for current steps and IMPLEMENTATION_STATUS.md for actual live evidence.

## Verification
npm run lint
npm run typecheck
npm test
npm run test:rules (stop any existing emulators first)
npx playwright install chromium
npm run test:browser (starts temporary isolated emulators)
npm run build

If persistent local emulators are already running, npm run test:e2e uses them and resets/seeds only demo-souqna fixtures. Browser tests intercept a synthetic logo URL; this verifies dynamic Firestore/UI behavior only, not real Google Drive.

## Production deployment — only after explicit owner approval
Before release, replace preview data with owner content through the production admin; never run the emulator seed against cloud.
1. Verify project and allowlisted UID, Spark plan, public SDK config and Apps Script configuration.
2. Obtain explicit approval for production Rules/indexes/Hosting deployment.
3. npm run build
4. firebase deploy --only firestore:rules,firestore:indexes,hosting --project menu-3ebba
5. Wait for indexes to finish building before testing compound filters.
6. Use two sessions: admin and anonymous/incognito. Change name/logo, add category/product, edit independent piece/box/carton prices and packing counts, publish a discount, special and independent bundle. Test a box-only or carton-only product as well. Assert visitor changes appear without rebuild/reload.
7. Test expired offers, hide/delete, related bundle review, media references, refused anonymous writes, contact links, mobile/theme/English and real Drive media on the public domain.
8. Record actual results in IMPLEMENTATION_STATUS.md. Until these pass, live integration/deployment remains BLOCKED_EXTERNAL.

Files are stored in Google Drive. Firestore holds business data and media metadata/links only. Hosting serves app code. Traffic and provider quotas apply; the implementation does not enable billing or add paid infrastructure.
References: https://developers.google.com/workspace/drive/api/quickstart/js and https://firebase.google.com/docs/auth/flutter/manage-users.
