# Visual implementation and verification
All 20 supplied images were inspected as 10 corresponding pairs. Hashes/dimensions matched the manifest. Inspection composites are ignored .local/reference-pairs/01–10.jpg. No reference screenshot is used as page content.

| Pair | Implemented screen | Reference elements retained |
| --- | --- | --- |
| 01 | Public first-load splash | Dynamic centered name/logo, short progress, direct entry, theme/language |
| 02 | Catalog home | Header, search, promotional hero, categories, piece/box/carton cards, fixed external contact bar |
| 03 | Offers | Discount/bundle/special tabs, product cards and larger offer cards |
| 04 | Product details | Gallery/thumbnails, prices/options, product inquiry/share, related items |
| 05 | Login/reset | Centered identity/form, password visibility, remember session, recovery |
| 06 | Dashboard | Welcome, actual counts, quick actions, recent products, responsive admin navigation |
| 07 | Settings | Bilingual identity/logo, contacts, currency/language/colors, save and account security |
| 08 | Drive setup | Permanent numbered guide, separate connection/upload/public verification, actual error states |
| 09 | Products list | Search/filters, responsive table, publication controls and CRUD actions |
| 10 | Product editor | Numbered sections, bilingual fields, media, prices/discounts/options, shared live preview |

Additional categories, offers/bundles editor, banners and media library use the same design tokens. Arabic Cairo typography is bundled locally. CSS logical properties implement RTL/LTR. Light uses airy pale green/white surfaces; Dark uses dark green/charcoal with corresponding borders and muted text. Brand colors and identity come from the public shop document. Controls are keyboard accessible and reduced-motion preference disables decorative motion.

Product photos, logo and banners from screenshots are preview references only. Local emulator examples are stored only by guarded seed/test scripts; production has no fixed shop identity or catalog. Missing media receives a neutral illustration/failed asset state and never a fabricated working Drive image.

Browser evidence and final viewport results are recorded in IMPLEMENTATION_STATUS.md. Real Drive media appearance remains blocked until owner OAuth/public-image tests.

Final automated browser review on 2026-10-08 covered five visitor/login routes and ten admin routes at 375, 768, 1024 and 1440 pixels. Light Arabic/RTL and Dark English/LTR toggles persisted and all horizontal-overflow assertions passed. Saved full-page captures include both catalog themes on mobile/desktop, dashboard and product editor in Dark, and the permanent Drive guide in Light. The product editor visibly includes all three prices and both packing counts. Dark semantic brand tones were adjusted after visual review to keep labels/prices readable; raw saved brand colors remain unchanged. Capture-time animation suppression produces settled screenshots while the application still animates normally.

After the owner-authorized release, https://menu-3ebba.web.app was inspected in an unsigned browser. Catalog, offers/bundles and admin login render from production Hosting; the empty catalog correctly prompts for store setup. All 43 deployed indexes reached READY before the final check. The actual hosted Light/Arabic page was saved as .local/hosting-live-light-ar.jpg. No emulator examples were copied to production.
# Drive reference port verification — 2026-10-08

The new /admin/drive page was verified at 375 px Light Arabic and 1440 px Dark English with its script source expanded; no horizontal overflow. Screenshots: .local/drive-script-light-ar-375.png and .local/drive-script-dark-en-1440.png. The full existing 4-width bilingual/theme browser regression plus the new Apps Script protocol scenario passed (5 total scenarios). Google calls/media in the new scenario are explicit network fixtures; the local-test banner stays visible. They prove the UI/Firestore wiring and gate behavior, not live Drive access. A previously selected logo can now be replaced by selecting the new one directly; the unsigned visitor receives the change without rebuilding.
