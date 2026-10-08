# Acceptance test plan and evidence requirements

> Run in real configured environment where available. Tests requiring owner Google/Firebase accounts may be `BLOCKED_EXTERNAL` with clear steps/evidence still needed, but cannot be marked passed without execution.

## Test matrix

| ID | Area | Steps | Expected result |
|---|---|---|---|
| T01 | Public security | Visit catalog incognito, attempt unpublished product/offer read | Published visible; private/draft/hidden denied by Rules |
| T02 | Admin security | Open `/admin` without auth; attempt Firestore create via anonymous SDK | Route redirects; write denied |
| T03 | Admin security | Sign in with non-allowlisted Firebase account | Write and admin config read denied |
| T04 | Theme | Toggle Light→Dark in product detail; refresh, go Home, go Admin login | Choice persists and coherent on **all** pages |
| T05 | i18n | Change Arabic→English on home/product/admin | All UI text, `lang` and `dir`, alignment switch; values fallback clearly |
| T06 | Product price | Publish unit-only product | No empty carton price line |
| T07 | Carton price | Publish product with carton price/count | Unit/carton labels and prices correctly separate |
| T08 | Percent discount | Apply 25% to unit only | Original+discounted unit displayed correctly; carton unchanged |
| T09 | Fixed discount | Apply nonnegative fixed minor amount to carton only | Carton discounted; unit unchanged |
| T10 | Invalid discount | Fixed discount > original, percentage >100, dates reversed | Form and schema/rules reject invalid write |
| T11 | Discount life | Start/end time in Cairo/UTC, advance/test clock | Active only in range; expired removed from offers and base price restored |
| T12 | Bundle | Add 3 products with quantities and independent display price | Details and price correct; no item-level discount stacking |
| T13 | Bundle changes | Hide/change member product after publishing bundle | Bundle marked needs review / blocked per decided behavior |
| T14 | Special offer | Publish time-limited special with conditions | Title/image/conditions displayed; countdown from true deadline only |
| T15 | Admin CRUD | Create/edit/hide/publish category/product/offer | Firestore state persists and public only sees published version |
| T16 | WhatsApp | Configure number, click contact on product | `wa.me` target valid, prefill includes localized name and product URL |
| T17 | Facebook | Configure URL, click footer action | Opens configured safe HTTPS target; no demo placeholder URL |
| T18 | Drive upload | Admin OAuth → select image → upload | File exists in owner's Drive and Firestore contains metadata, not base64/blob |
| T19 | Drive public read | Publicly share **only** test image; open incognito on target origin | Visible in real image tag/load, no owner sign-in/admin token |
| T20 | Drive private read | Leave unpublished image private; incognito tries URL | Access denied; no token embedded |
| T21 | Drive revoke | Revoke OAuth/switch account; revisit admin/media | Clear reconnect/recovery state; no false connected success |
| T22 | Drive missing media | Delete test image from Drive | Visitor placeholder; admin repair prompt; no broken app navigation |
| T23 | Orphan cleanup | Upload succeeds but Firestore save fails | Asset tracked for recovery, not silently lost/untracked |
| T24 | Big upload | Interrupt supported resumable upload once | Progress/retry or explicit retry; do not claim completion prematurely |
| T25 | Responsive | Test widths 375, 768, 1024, 1440 | No unwanted horizontal overflow, clipped buttons or footer overlap |
| T26 | A11y | Keyboard tab through theme, locale, nav, forms, dialog | Focus rings, labels, ARIA state, accessible contrast/reduced motion |
| T27 | Performance | Load multi-page catalog | Bounded Firestore reads + lazy images, no all-products query |
| T28 | Forbidden flows | Search rendered UI/routes/code for cart/order/checkout/payment/shipping | No visitor purchase/order functionality or shipping promises |
| T29 | Fake numbers | Run production mode with empty Firestore | No fictitious prices, product counts, reviews, storage or connected badges |
| T30 | Build | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` | All pass; actual output retained |

## Visual regression review

For each numbered pair in `design/SCREEN_INDEX.md` (01–10):

- Render route in Light and Dark and compare with corresponding screenshot layout (manual or screenshot diff).
- Verify semantic changes demanded by PRD (no buy/order/shipping text; no fake ratings or store metrics).
- Compare at mobile and desktop breakpoints, contrast and text wrapping.
- Confirm theme control exists even on login, loading, setup and derived category/media/offer CRUD pages.

## Security test specifics

- Firestore test with unauthenticated, unauthorized authenticated and allowlisted admin contexts.
- Verify query-compatible public reads do not expose drafts; test direct document get and collections.
- Verify public settings contain no tokens or admin UID allowlist changes.
- Test malicious/invalid URLs, HTML-like product name, oversized price/arrays, negative prices and wrong type writes (not only UI validation).

## Reporting template for implementation status

```md
## Phase N — [title]
Status: PASS | PARTIAL | BLOCKED_EXTERNAL | FAIL
Files changed: ...
Commands run: ...
Tests passed: ...
Tests failed/unrun: ...
Visual pair checks: ...
Firebase/Drive real integration evidence: ...
Blockers/needed owner actions: ...
Next smallest actionable step: ...
```

**Do not mark unexecuted tests as passed**. Redact tokens, upload session URLs, email/password credentials and non-public Drive links before sharing logs.
