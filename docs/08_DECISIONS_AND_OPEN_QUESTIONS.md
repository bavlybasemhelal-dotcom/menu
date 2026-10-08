# Decisions, source-vs-inference, external blockers

## Latest owner amendment: reference Nexara Drive connection

- On 2026-10-08 the owner requested the exact Drive workflow from D:/Projects/Nexera/Nexara. Read-only audit covered AGENTS/README/referenced plan, lib/services/google_drive_service.dart, DoctorDriveSettings, the settings_tab.dart inline guide/script and google_drive_script/nexara_drive_script.js. The reference project was not edited.
- This is explicit authorization to add Google Apps Script as the default bridge, superseding the original GIS-only architecture. It preserves Firebase data/Hosting and Google Drive media, with no billing/services change.
- Preserve the integration details: Gmail + Web App URL, test-and-save, folder information and last test date, copyable guide/code, ping/upload POST text/plain, base64 files, automatic category folders, direct/view/download links saved as metadata. Clinic patient/staff folders are mapped to catalog Products/Offers/Branding/Documents/Videos/Private Originals.
- Reference upload endpoints accept anonymous uploads and swallow sharing errors. The catalog instead checks the allowed Firebase UID on every POST, restricts file operations to the app folder, keeps uploads/originals private and propagates failures. These are documented security/publication requirements, not silent changes.
- Application cap: 20 MiB/file for the one-request bridge, indeterminate progress, 18 s ping/operation and 45 s upload timeout matching the reference client. Interrupted uploads are ambiguous and require folder recovery. The advanced direct adapter stays available for larger/resumable uploads and legacy files.
- Remaining live input for the default method is the owner's newly deployed Apps Script /exec URL and Google authorization; browser Client ID/restricted Drive key are only needed for the advanced method. A real public/incognito image test is still mandatory. Local mocked protocol tests do not satisfy that gate.

## Confirmed from supplied `source/project-plan.md` and the user's later instructions

- Product is a catalog/display menu, **no cart/orders/payments**.
- Single store per deployment, one admin in first version.
- Light + Dark screenshots and visible cross-screen toggle required by latest user instructions.
- Arabic/English, RTL/LTR, configurable name/logo and theme colors.
- WhatsApp/Facebook as visitor external contact.
- Products support nullable independent piece, box and carton prices and packing counts, following the owner's later amendment recorded below.
- Discount type percent/fixed, selected target and optional schedule; bundles have independent final price.
- Firebase Auth + Firestore + Hosting in Spark; owner Google Drive media; no Firebase Storage/Functions/paid backend.
- Google Drive anonymous public-image display **not yet proven**.

## Implementation suggestions made by this handoff (not explicit decisions by owner)

- Vite+React with React Router, Zod/React Hook Form, i18next, Vitest, Playwright and layered feature folders.
- Initial Light preference until user switches (could later allow system preference); persist theme via localStorage — **not** OAuth tokens.
- Example design tokens in `docs/04_DESIGN_SYSTEM_AND_SCREENS.md`.
- Query page size around 12–24, to adjust for real needs and quotas.
- Category delete safeguards, soft-hide by default, orphan media tracking and upload-state model.
- Discount rounding via integer minor units with documented `Math.round` policy.

Codex must record deviations/new assumptions rather than silently treating the above as owner statements.

## Real owner inputs not available in this archive

| Item | Why needed | Allowed interim behavior |
|---|---|---|
| Firebase public Web config | Connect actual app | mock/demo adapter clearly labeled |
| Firebase admin UID | Real allowlist-based Rules | static `TODO` + emulator-denied by default, **not permissive production Rules** |
| OAuth Web Client ID | Drive connect | guide and disabled/blocked state |
| Google account permission | Drive upload & public image POC | blocked test, no false connected badge |
| Actual product data | Real content/prices | local examples marked DEMO, never production default records |
| Store name/logo/WhatsApp/Facebook | Correct brand/contact | editable settings + placeholders clearly marked |
| Upload max sizes/traffic | Validation and quotas | document proposed conservative limit, do not assert owner agreement |
| Deployment approval | Mutate production/live hosting | prepare guide only |

## Known generated-image discrepancies to explicitly suppress

- Top banners claiming free shipping, delivery regions or purchase threshold.
- CTA texts `تسوق الآن`, `تسوق العروض`, shopping cart icons/buttons/quantity controls.
- Status text about order processing, `متابعة طلبك`, “بيع” terminology if it changes the site into checkout UX.
- User ratings/review counts, dummy store statistics, dummy prices, stock levels and Google Drive “connected” success stamps.
- Any nav links for `الطلبات`, `المبيعات`, `السلة` or payment.
- Text rendering mistakes/inconsistent amounts from AI images.

## Definition of BLOCKED vs DEMO

- **DEMO:** local UI with explicitly simulated products and media, no claim of cloud integration.
- **BLOCKED_EXTERNAL:** feature code may be prepared but owner config/API/permission/integration test cannot be performed; report exact missing input.
- **BLOCKED_DRIVE_PUBLIC_MEDIA:** upload worked or could not be fully verified, and incognito direct image display has not been proven. Cannot claim real production media delivery.
- **DONE:** code + tests plus real integration proof where applicable.

## Revision policy

## Implementation decisions — 2026-10-08

- Owner initially authorized local implementation, then explicitly requested Firebase Hosting deployment and a link on 2026-10-08. Hosting and the necessary Rules/indexes were deployed; no production content or preview fixtures were written.
- Owner supplied admin UID; it is now configured in deployed Rules. Drive API is owner-reported enabled. Google OAuth Client ID and restricted Drive API key are still missing. Google Cloud browser session is signed out. Live Drive POC remains BLOCKED_EXTERNAL; a successful Hosting release does not imply working Drive media.
- App root is this handoff folder. Preserve all supplied reference/source documents and all 20 images.
- Fixed shop ID initially `main`, configurable with reviewed Rules and env together.
- Production data starts empty. Test fixtures only exist in tests and an explicitly isolated demo-souqna emulator; no screenshots or hardcoded shop/products are production data.
- Add `searchTokens` and `discountEligible` to products and `bundleProductIds` to offers for bounded indexed queries and dependent-bundle review.
- Model editable banners as special offers with `placement: none|hero|strip`; use the prescribed offers collection instead of adding another backend.
- Maximum 6 gallery assets / 6 bundle items / 12 variants initially for validation and Firestore Rules access limits; owner may revise after security tests.
- `publicUsedBy` complements `usedBy` on media. Anonymous metadata reads only for tested shared assets with published uses. File sharing remains independent of Firestore hiding.
- Upload size fields initially zero (disabled until owner/admin chooses limits), rather than assuming acceptance of arbitrary limits.
- Owner steering on 2026-10-08 adds explicit piece → box → carton hierarchy. Products have nullable independent piece/box/carton prices, boxQuantity = pieces per box, cartonBoxQuantity = boxes per carton. At least one selling price is required. Box/carton prices require their packing counts. Legacy cartonQuantity is retained only for reading older direct-piece counts and is not edited in the new form. No prices are derived from packing quantities. Discounts add box/all targets; legacy both retains piece+carton semantics. Bundle items support piece, box or carton. This owner instruction supersedes the original piece/carton-only model, without adding inventory transactions or purchasing.
- Original/presentation media relationship is stored as originalMediaId within the prescribed media collection. Optional browser-generated WebP display assets are uploaded to Drive separately from private originals. Neither stored credentials nor a paid conversion service is introduced.
- Saved branding colors remain unchanged in Firestore. Displayed semantic tones adapt to Light/Dark for readable text and button foregrounds. This prevents a pale color on white or a dark color on charcoal from hiding prices and labels.
- Admin product/status/category/availability/discount and offer/status/type/placement filters use bounded indexed Firestore queries. Banner listing filters placement on the server so ordinary offers cannot consume its page.

## Revision policy (continued)

Any future change to paid storage, authorization, data sharing, purchase behavior, app marketplace, customer registration or mobile native app requires owner approval and a new PRD revision. This package never grants permission to deploy, spend, or change cloud billing settings.


## Latest owner amendment — 2026-10-08

Google Apps Script is the only media connection. Remove the direct OAuth alternative and reference-project names from user-visible copy/generated code; do not ask for a browser Client ID or Drive API key. Per-file and configurable type limits are at most 20 MiB. Existing Firebase + owner Drive architecture and publication/private-original gates remain. Credential-free display probes use the observed tokenless Drive usercontent delivery endpoint for the same file ID; no expiring thumbnail, proxy or paid service. Historical direct-adapter notes above are superseded. Current implementation/evidence is in IMPLEMENTATION_STATUS.md.

Live result: neutral single-method UI and Rules are deployed; actual test/save of the Apps Script connection passed again. Real upload/share worked and private originals remained inaccessible anonymously. The owner confirmed direct-link image access in Incognito. However both real embedded image probes failed; the current delivery target returns 403 HTML when the request includes cross-site browser Sec-Fetch headers. Anonymous HTTP without those headers is insufficient evidence of browser embedding. Keep the publication gate enforced and mark BLOCKED_DRIVE_PUBLIC_MEDIA until a real credential-free browser image decode and metadata verification succeed. No reintroduction of the removed OAuth method or speculative success.

## Client presentation amendment — 2026-10-09

The owner requests compact visitor/admin layouts and demo data on the live site to show a client. The previously empty real catalog may now receive this explicitly authorized demonstration dataset. Use create-only writes with existence preconditions, stable `demo-` IDs and a local creation manifest; preserve owner data/edits and private configuration. All names, products, prices and offers remain editable Firestore data. No UI import of the dataset, schema or security-rule relaxation, fake phone numbers, or claimed Drive image verification. Optional media stays absent and uses the existing visual placeholders. Compact cards keep all configured price levels; packaging counts stay in full detail pages. Dense desktop grids expand to six columns, mobile stays two columns with readable controls. Hide inactive single-page pagination to avoid wasting space, while preserving controls for multiple pages.
