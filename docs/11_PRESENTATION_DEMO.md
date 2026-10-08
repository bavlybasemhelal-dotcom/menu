# Editable client presentation

The owner requested this demo on the live Firebase site. It is real Firestore content, loaded and edited through the same application workflows as owner content; it is never imported into React components.

- 6 categories: pantry, drinks, dairy, snacks, tea/coffee and home care.
- 24 bilingual products with example EGP prices, independently configured piece/box/carton levels, optional packing counts, discounts, availability states and a juice flavor variant.
- 2 independent-price bundles, a special offer, a hero banner and a strip banner.
- Editable bilingual store identity/description explicitly says the catalog is a demo. No fabricated phone/Facebook contacts. The generic brand placeholder is replaced when the owner adds a verified logo.
- Images are optional, and these demo documents intentionally reference none. UI placeholders are not claimed to be uploaded Google Drive photos. Real Drive images still require the existing anonymous browser verification gate.

Fixture source: scripts/demo-catalog.mjs. Its schema/data references are validated by unit tests; the demo pricing edit/live unsigned visitor scenario is exercised in tests/e2e/density.spec.ts against the local emulators. The production insertion used the existing owner-authenticated CLI, create-only document preconditions, a local preflight snapshot and a created-path manifest in ignored .local/demo-export. Existing data and edits are preserved on rerun.

Everything can be edited, hidden or removed in admin. Before using the site for a real store, replace its identity and sample content. Remove demo bundles/banners first, then their products, then empty demo categories using ordinary admin controls; IDs start with demo-. Editing an admin record changes Firestore and the visitor immediately without rebuilding. Do not delete unrelated records or overwrite private Drive settings while replacing the demo.

Layout density comes from smaller gaps/padding, six desktop product columns and compact price cards/table rows. Full product detail pages retain packaging information. Mobile controls preserve 44 px targets, readable inputs, RTL/LTR and both themes. Large catalogs retain bounded queries and pagination.
