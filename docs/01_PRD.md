# Souqna / سوقنا — Product Requirements Document (PRD)

> **Release:** v1.0 · **Date:** 2026-10-08 · **Status:** implementation-ready specification, subject to successful Google Drive feasibility spike and credentials supplied by the owner.
>
> **Source of truth:** `source/project-plan.md` + the owner's latest requirements: **Light and Dark designs with a toggle on all screens; public site displays products only, without buying.** When screenshots conflict with this document, **this document wins**.

## 1. Product summary

A responsive, mobile-first, bilingual **electronic product catalog / digital menu** for a single business (supermarket, café, or another shop), with prices, promotions, product images and details, and external communication via WhatsApp and Facebook. A single protected administrator can maintain store identity, products, categories, promotional bundles, offers and media. Brand is configurable; **Souqna / سوقنا is only the sample identity** used in the supplied concepts.

**Critical invariant:** Visitors **CANNOT** purchase or order through the site. No shopping cart, basket, quantity-for-purchase, checkout, orders, payments, customer accounts, delivery/shipping promises, order tracking, or add-to-cart. The cart-with-leaf artwork inside the sample brand logo is **an illustration only**, not an interactive shopping control. Prices are for display; WhatsApp is for **inquiries**, not automated orders.

### Goals
- Let visitors discover products by category/search and see pictures, details, availability and **informational** prices.
- Let visitors see valid discounted products, bundles and special offers without using an in-site transaction flow.
- Keep WhatsApp/Facebook visible and working using editable store settings.
- Provide a bilingual Arabic-first admin and customer experience, with proper RTL/LTR.
- Offer coherent **Light + Dark** themes, user-selectable via sun/moon toggle on **every screen**, with persistent preference.
- Keep operating services on Firebase Spark + owner's Google Drive within free quotas and **without** billing-enabling infrastructure.
- Validate anonymous public image display before building a large media-dependent UI.

### Non-goals / explicitly prohibited
`cart`, `basket`, `checkout`, `order`, `payment`, `payment gateway`, `shipping`, `delivery promise`, `cart item`, `purchased`, `sales dashboard`, `revenue`, customer login, paid backend, Firebase Functions, Firebase Storage, permanent Google access/refresh tokens, Drive client secret in frontend, fake cloud-success indicators.

### Primary users
1. **Visitor** — anonymously browses public published catalog and offers; switches theme/language; contacts store externally.
2. **Single admin** — signs in via Firebase Email/Password; manages content, images and branding; connects own Drive interactively.

## 2. Platform, operating constraints, assumptions

- Responsive **web app** with React + TypeScript + Vite, Tailwind CSS and shadcn/ui; Firebase SDK; GIS token model and Google Drive API.
- Firebase project from the original plan: `menu-3ebba`, default Firestore DB; Hosting target `menu-3ebba.web.app` (planned, **not proof of deployment**). Firebase Authentication Email/Password was noted as enabled in source.
- Storage: product data/settings/metadata in Firestore; original media and presentation versions in owner's Google Drive; Hosting serves built app code.
- No Cloud Functions, Firebase Storage, billing/Blaze, paid proxies, or paid full-text-search service.
- Admin authentication **and** Drive authorization are separate. OAuth access token held in browser memory only, not localStorage/Firestore/logs. Session may need reconnection.
- Drive `drive.file` scope and browser OAuth Client ID. Public image read URL remains **unverified until tested anonymously on actual deployment/origin**. Do not use a sharing-page URL, expiring thumbnail, or private OAuth token as a public image solution.
- A single tenant per deployment, configurable shop ID. Data and project cannot be silently overwritten if repo/config already exists.
- Monetary values saved as **integer minor units** in the configured currency. EGP default; other allowed labels USD/SAR/AED/EUR; changing currency **does not FX-convert** saved numeric prices and must prompt for price review.
- Example product images and figures in screen designs are visual **sample data**, never imported as official products or current market prices.
- Admin UID, Google OAuth client ID, and the specific Drive folder require owner setup. File size limits and anticipated traffic remain open and must be configurable/validated, not guessed silently.

## 3. Public visitor experience — requirements

### FR-P01: Splash / first-load screen
- Show store logo/name and short entrance animation; support fallback logo and action **"دخول مباشر"** if loading is delayed.
- Avoid forcing long animation on every navigation. Do not block on a remote Drive image; placeholder works if image unavailable.
- Theme toggle and language switch visible, using global state.

### FR-P02: Header, navigation, controls
- Persistent store logo/name; navigation to Home, Categories, Offers, and an admin-login route that is not exposed as visitor management controls.
- Accessible search input, Arabic/English switch, **Light/Dark toggle always visible**, including mobile and admin pages.
- Theme choice survives refresh and navigation. The first visit may use the chosen default (Light) and optionally a system preference, but manual choice must take precedence and persist.
- Arabic `dir=rtl`, English `dir=ltr`; locale-specific numbers/currency display without changing underlying values.

### FR-P03: Catalog home
- Promotional hero that links to catalog/offer details, not to purchases.
- Category icons/list with admin-set ordering, category filtering, pagination/load-more.
- Product cards with image, name, available badge, category if appropriate, piece price, carton price **only when set**, discount badge and original/discounted values only when active and valid.
- CTAs: **"عرض التفاصيل"** and optional **"استفسر عبر واتساب"**. No cart button even in icon form.
- Promoted products and featured banners must be sourced from published Firestore data, not hardcoded examples.

### FR-P04: Product detail
- Cover image/gallery and thumbnails; localized name/description; availability; category; optional variants (sizes/colors/options) and each variant's price/availability where relevant.
- Required piece/unit price; optional carton price and piece count; do not invent a carton price from unit price.
- Clearly separate unit and carton values and discount applicability. Display genuine active discount only.
- Actions: inquiry about **this product** via WhatsApp (URL with localized encoded product name/permalink), share permalink, related catalog products.
- No quantity selector intended for an order. No ratings/reviews unless an actual supported data source and explicitly approved scope are later introduced.

### FR-P05: Offers
- Three tabs/sections: **discounted products**, **bundles**, **special offers**.
- A discounted product appears automatically only while its valid discount is active; remove it when expired/deleted.
- Bundle: title, cover, constituent products with quantity and selling unit, **independent final bundle display price**, optional conditions and dates; display-only action "تفاصيل العرض" / "استفسر الآن".
- Special offer: image, localized title/description, conditions, optional linked products, optional display price or promotional text, optional start/end schedule, published/draft status.
- Countdown only with real end timestamp; otherwise omit. Timezone for display: **Africa/Cairo**, stored timestamps UTC.
- No basket or buy-now buttons.

### FR-P06: Search and filtering
- Search by product name and relevant category/visible metadata, with locale support; do not imply global search if implementation only filters a loaded page.
- For scalable catalogs use bounded Firestore reads, indexes and cursor pagination. An exact/full-text strategy must be verified; if unavailable, clearly scope UI to prefixes/indexed fields or fully loaded bounded subset.
- Filters for category and availability, optionally discount. "Most popular" only if backed by real metrics; do not fabricate popularity or ratings.

### FR-P07: External contact
- Persistent fixed bottom WhatsApp + Facebook bar for public site; compensate with content padding and safe-area handling.
- WhatsApp opens the admin-configured number through `https://wa.me/...` with optional URL-encoded inquiry message; Facebook opens validated configured page in a safe new tab.
- If contact info absent, hide/disable the relevant action with a useful message; never point to arbitrary example contact values.

## 4. Admin experience — requirements

### FR-A01: Auth & authorization
- Admin `/admin/login`, sign out, forgot password; Firebase Auth Email/Password; clear bilingual errors.
- Authorize writes with Firestore Security Rules checking a **server-enforced allowed UID** (do not trust `isAdmin` in a public writable profile field).
- Anonymous visitors can only read intended published public records. No public access to admin settings, tokens or sensitive Drive configuration.
- **One** admin in v1; no unrequested staff role management.

### FR-A02: Dashboard
- Counts: published products, categories, active offers, media assets; recent products; quick actions to products/categories/offers/media/settings/Drive.
- Drive connection **and** public image viability statuses shown separately, only when real checks have run.
- Storage usage only if grounded in a supported API/actual saved values; do not invent 6.8/15GB statistics from mockup.
- No orders/revenue/sales counters.

### FR-A03: Shop settings
- Editable store Arabic+English names/descriptions, logo, WhatsApp, Facebook, currency label, default language, brand primary/accent colors.
- Light/Dark toggle available here and global; theme tokens work in both palettes even if brand colors change.
- Validation of URL, phone digits, color hex, non-empty name. Preview changes prior to save, persistent Firestore storage.
- Source identity may start from mock "Souqna" but must be easy to replace with actual shop branding.

### FR-A04: Categories
- CRUD categories with bilingual name/description (description optional), cover/icon optional, ordering, published/hidden status.
- Safe delete behavior: warn/block deleting an occupied category until products reassigned.
- Public visitor reads only visible categories.

### FR-A05: Products
- List/search/filter by category, visibility, availability, active offer; page/cursor-based loading.
- Create/edit/preview/publish/hide/delete with safeguards and confirmations. Bilingual name/description, gallery, category, availability, required unit price, optional carton price/count, optional variants, discounts and date ranges.
- Draft data is private to admin. Public sees published only, and images only when allowed/display-tested.
- Product preview uses the same components as public detail and **never** an Add to cart button.

### FR-A06: Offers, bundles, special banners
- Admin screens for creating/updating/removing discount rules, bundles and specials, including type, value, target unit/carton/both, dates, publish state and positioning.
- Percentage range `0..100` and fixed amount non-negative; final price `>= 0` (reject invalid discounts rather than displaying negative prices).
- Do not apply carton discount if carton price absent. Bundles do **not** compound constituent discounts; when source product is hidden/changed show "needs review" before re-publish.

### FR-A07: Media library & Drive setup
- Show all app-owned images/files/videos with metadata, usage references, public/private state, upload progress and issues.
- Admin guide for enabling Drive API, consent, Web OAuth Client, authorized origins, restricted scopes, connecting and selecting/creating folder, upload test and **anonymous public-view test**.
- Upload from authenticated admin browser directly to Google Drive; track `driveFileId`, resourceKey if relevant, MIME type, byte size, media owner/shop, link(s), public visibility verification status, original/optimized relationship.
- Validate MIME/size, progress/retry/resumable upload where supported/tested. Do not mark a product/media published until required upload completes and metadata write succeeds.
- Handle revoke, expired token, browser close, missing files, disallowed public sharing, CORS and public preview failure gracefully. Never silently replace Drive with paid storage.
- Deleting/hiding product in Firestore **does not** revoke Drive public permissions by itself; notify admin, support explicit safe revocation when not shared by other content.

## 5. Visual and interaction acceptance

- **Visual references:** `design/light/01..10` and `design/dark/01..10`; see `design/SCREEN_INDEX.md` and `docs/04_DESIGN_SYSTEM_AND_SCREENS.md`.
- Design system: rounded cards, airy white/light backgrounds in Light; deep charcoal/navy in Dark; green primary `#16A34A`, orange accent `#FF6B00` as sample configurable tokens; sober contrasts; consistent sans Arabic and Latin typography.
- Default implementation should match the **latest** pair of Light/Dark screenshots, but omit wrong copy/features visible in generated images: e.g., shopping/delivery language, old sample stock figures, unsupported ratings, and checkout semantics.
- Show sun/moon theme switch on **every public/admin screen**, with immediate transition, no unstyled flash, persistent preference.
- Appropriate microanimations (splash, card reveal, transitions, hover/focus, progress); obey `prefers-reduced-motion` and avoid long forced transitions.
- Accessibility: keyboard, clear focus, alt texts, accessible forms, >=44px primary tap targets when mobile, good contrast, safe fixed footer, no horizontal overflow at 375/768/1024/1440 viewport widths.
- Screens are conceptual **design targets**, not production-ready source or a guarantee that small depicted text or prices are accurate.

## 6. Information architecture / route list

**Public:** `/` (splash within initial home loading), `/catalog`, `/categories/:slug`, `/products/:id`, `/offers`, `/offers/:id` (including bundle detail), optionally `/about` if content configured.

**Admin:** `/admin/login`, `/admin/forgot-password`, `/admin` (dashboard), `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`, `/admin/categories`, `/admin/offers`, `/admin/offers/new` (types: discount/bundle/special), `/admin/media`, `/admin/settings`, `/admin/integrations/google-drive`.

Admin screens without mockups should inherit the same admin design system. Do **not** invent order, checkout, staff management, sales analytics, or billing pages.

## 7. Content and business logic

### Price display
- `unitPriceMinor` required non-negative integer; `cartonPriceMinor` nullable and shown only if present. `cartonQuantity` integer >0 if configured. Variants optional.
- Discount `{type: percentage|fixed, value, appliesTo: unit|carton|both, startsAt?, endsAt?}`; active if current time inside interval and product published.
- Round monetary calculations predictably in minor units, validate all boundaries and show original + discounted values when discount actually applies.
- Changing currency label is not FX conversion and should require review; do not auto-interpret an existing EGP integer as USD.
- Bundle display price is independent; do not calculate by taking already-discounted product subtotals.

### Content states
- Product content status `draft | published | hidden`, separate availability `available | limited | unavailable` (optional precise inventory numbers not required).
- Offer states `draft | published | hidden`, plus effective scheduled status computed from timestamps.
- Media state `selected | uploading | uploaded | metadata_saved | public_test_passed | failed | orphan` as applicable.
- Handle unpublished/offline cases with placeholder and no leakage of private content.

## 8. Security/privacy/performance

- Rules: public published-only reads; admin UID-only writes; schema limits, validated values and bounded settings; not possible to become admin from user-writeable doc; Firestore queries respect Rules (Rules are **not** automatic filters).
- No client secrets, private credentials, Drive auth token, refresh token, service-account key, access token, upload session URI, or Firebase private key in Firestore, localStorage, code repository, logs or public URL.
- Firebase Web API config can be public, but the admin allowlist must still be enforced in actual deployed Rules.
- Treat user input/content as untrusted: avoid XSS, sanitize/escape displayed text, validate outbound URL schemes (https only for Facebook), file type and size.
- Paginated reads, lazy images, appropriate caches only for confirmed stable public media, progressive enhancement and error states for network failures.
- Hosting on Firebase Spark within quotas; no server components that need payment. Deployment only when approved by owner and credentials configured.

## 9. Success / acceptance criteria (definition of done)

1. Visitor has no account requirement, cannot read drafts/admin documents or write Firestore.
2. Both themes look coherent in all 10 pictured screens **and** derived admin CRUD screens; switching on one screen updates all and persists across refresh/navigation.
3. Arabic RTL/English LTR works; bilingual fields and fallback are correct.
4. Product with only a unit price shows no empty carton field. Product with carton price shows both with correct labels.
5. Active/expired percentage/fixed discounts change shown price and offers listing correctly without negative prices.
6. Bundle shows item quantities and independent bundle price; special offer shows conditions and only real countdowns.
7. Admin can create/update/publish/hide products, categories, discounts, bundles, specials and store settings, all persisted in real Firestore when configured.
8. WhatsApp and Facebook use configured destinations; product inquiry prefills product name/link. No in-site orders, cart, checkout, payment or shipping copy at any route.
9. Admin can connect Drive, upload a test image, and visitor in incognito can see the image without owner login/token. **If this cannot be demonstrated, mark integration BLOCKED and do not claim production-ready media.**
10. Drive revoke/missing file and Firestore write failures have clear admin recovery and visitor fallback; no loss of unreferenced files without tracking.
11. Responsive widths 375/768/1024/1440, keyboard/focus access, reduced-motion, no horizontal overflow or obstructed bottom content.
12. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (or documented exact equivalent) succeed; integration tests and smoke tests are documented with evidence.
13. Firebase project configuration remains Spark; do not enable billing or introduce Functions/Storage without explicit owner permission.
14. Deployment and live OAuth tests require owner credentials/permission, and may be marked external blockers rather than falsely completed.

## 10. Execution gates and priorities

**P0 — first:** repo audit → data/security foundation → Firebase+Drive public image proof of concept with real owner accounts → no paid dependency. This is a hard gate.

**P1:** themes/i18n/design system + complete admin CRUD (including categories, offers, bundles, specials, media) with secure Firestore.

**P2:** public home/catalog/product/offers/contact, polished mobile interactions and animation.

**P3:** accessibility, tests, performance, deploy-ready docs; deploy only after explicit go-ahead.

The UI may be developed with an openly labeled `demo` adapter while credentials unavailable, but it is **not** a substitute for verified persistence/media; never mark mocked sections as connected to Firebase/Drive.

## 11. Open items requiring actual credentials/owner decisions

- Authorized admin UID and production sign-in account (keep passwords out of docs/chat).
- Google OAuth Web Client ID, origin(s), public image delivery test, and exact app Drive folder.
- Final store name/logo/phone/Facebook URL, desired initial language/theme, and real products/media.
- Allowed upload max sizes, expected traffic and precise policies for public/private media.
- Whether owner authorizes final deployment to the existing `menu-3ebba` project; do not deploy automatically as part of an initial local Codex run.

Any additional assumption by implementer must be added to `docs/08_DECISIONS_AND_OPEN_QUESTIONS.md`, clearly distinguished from source requirements.
# Owner amendment — 2026-10-08

The owner explicitly requested Nexara's Google Drive connection workflow. Default integration is now Google Apps Script Web App + DriveApp, with Google email, /exec URL, copyable generated script, test/save, automatic folders, base64 uploads and direct/view/download metadata. Original GIS/direct Drive API remains an advanced option for large files and backward compatibility. Every bridge operation checks the allowlisted Firebase administrator; unpublished originals remain private and anonymous image proof still gates publication. See docs/02_ARCHITECTURE.md and docs/07_INTEGRATION_SETUP.md. This amendment overrides GIS-only setup requirements below; Firebase Spark data/Hosting, bilingual themes and display-only scope remain unchanged.


## Latest owner amendment — 2026-10-08

Google Apps Script is the only media connection. Remove the direct OAuth alternative and reference-project names from user-visible copy/generated code; do not ask for a browser Client ID or Drive API key. Per-file and configurable type limits are at most 20 MiB. Existing Firebase + owner Drive architecture and publication/private-original gates remain. Credential-free display probes use the observed tokenless Drive usercontent delivery endpoint for the same file ID; no expiring thumbnail, proxy or paid service. Historical direct-adapter notes above are superseded. Current implementation/evidence is in IMPLEMENTATION_STATUS.md.
