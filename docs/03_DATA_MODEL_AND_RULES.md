# Data model, business contracts and rule checklist

## Owner packaging amendment — 2026-10-08

The owner requires piece → box → carton packaging. This amendment supersedes the original piece/carton-only price contract below. Product unitPriceMinor is nullable, with boxPriceMinor nullable, boxQuantity (pieces per box) and cartonBoxQuantity (boxes per carton). At least one of the three prices is required. A priced box requires pieces per box; a priced carton requires boxes per carton and pieces per box. Counts must be positive integers. Total pieces is boxQuantity × cartonBoxQuantity for display; no prices are calculated from this count. Missing selling prices hide that level. The legacy cartonQuantity remains readable for old records, but the current editor uses the explicit hierarchy.

Discount target adds box and all. all applies independently to all priced levels; legacy both means piece+carton. Fixed discounts cannot exceed any targeted price. Bundle units can be unit, box or carton, and publication requires a referenced product with that selling unit configured. Bundle final price remains independent. These contracts are validated in Zod, Firestore Rules, unit tests and browser workflows.

> Conceptual schema to guide implementation. Validate against real Firestore SDK data representations and security-rule query behavior. Do not treat this as pre-existing data.

## 1. Firestore collection paths

```text
shops/{shopId}
shops/{shopId}/categories/{categoryId}
shops/{shopId}/products/{productId}
shops/{shopId}/offers/{offerId}
shops/{shopId}/media/{mediaId}
privateShopConfig/{shopId}                 # restricted admin-only settings/Drive IDs
```

**Source-prescribed:** one fixed shop ID per deployment; no multi-vendor platform. `shopId` in config, not selected freely by visitor.

### `shops/{shopId}` — public store settings

```ts
type StorePublic = {
  name: { ar: string; en: string };
  description?: { ar?: string; en?: string };
  logoMediaId?: string | null;
  whatsappNumber?: string | null;           // validated international digits
  facebookUrl?: string | null;              // https URL
  currency: 'EGP'|'USD'|'SAR'|'AED'|'EUR';
  defaultLanguage: 'ar'|'en';
  branding: { primary: string; accent: string };
  updatedAt: Timestamp;
};
```

Public record must **never** include email/password, Google access/refresh tokens, authorized admin config, upload session IDs, secrets or unauthorized Drive folder IDs.

### Categories

```ts
type Category = {
  name: { ar: string; en: string };
  description?: { ar?: string; en?: string };
  order: number;
  coverMediaId?: string | null;
  status: 'published'|'hidden';
  createdAt: Timestamp; updatedAt: Timestamp;
};
```

### Products

```ts
type Product = {
  name: { ar: string; en: string };
  description?: { ar?: string; en?: string };
  categoryId: string;
  slug: string;
  status: 'draft'|'published'|'hidden';
  availability: 'available'|'limited'|'unavailable';
  unitPriceMinor: number;                    // integer >= 0
  cartonPriceMinor?: number | null;          // optional integer >= 0
  cartonQuantity?: number | null;            // > 0, if present
  imageMediaIds: string[];                   // first is primary image
  variants?: Array<{
    id: string; label: {ar: string;en: string};
    kind: 'size'|'color'|'option';
    unitPriceMinor?: number | null;
    available?: boolean;
  }>;
  discount?: Discount | null;
  createdAt: Timestamp; updatedAt: Timestamp;
};
type Discount = {
  kind: 'percent'|'fixed';
  value: number;                             // % as 0..100 or minor units for fixed
  target: 'unit'|'carton'|'both';
  startsAt?: Timestamp | null;
  endsAt?: Timestamp | null;
};
```

### Offers / bundles / special campaigns

```ts
type Offer = {
  type: 'bundle'|'special';
  status: 'draft'|'published'|'hidden';
  name: {ar: string;en: string};
  description?: {ar?: string;en?: string};
  imageMediaId?: string | null;
  startsAt?: Timestamp | null; endsAt?: Timestamp | null;
  conditions?: {ar?: string;en?: string};
  featured?: boolean;
  displayOrder?: number;
  // bundle-only:
  bundleItems?: Array<{productId: string; quantity: number; unit: 'unit'|'carton'}>;
  bundleFinalPriceMinor?: number;
  needsReview?: boolean;
  // special-only:
  productIds?: string[];
  specialDisplayPriceMinor?: number | null;
  callout?: {ar?: string;en?: string};
  createdAt: Timestamp; updatedAt: Timestamp;
};
```

### Media

```ts
type Media = {
  driveFileId: string;
  resourceKey?: string | null;
  driveWebViewUrl?: string | null;             // NOT assumed direct image URL
  verifiedPublicAssetUrl?: string | null;    // only after incognito proof
  mimeType: string;
  sizeBytes: number;
  width?: number | null; height?: number | null;
  role: 'image'|'video'|'document'|'logo';
  status: 'uploaded'|'metadata_saved'|'public_test_passed'|'private'|'orphan'|'failed';
  publicShared: boolean;
  anonymousRenderTestedAt?: Timestamp | null;
  usedBy: string[];                          // references or reverse lookup strategy
  createdAt: Timestamp; updatedAt: Timestamp;
};
```

**Private config** includes Drive folder ID and integration setup info accessible only to admin, without token. If using Firebase Web OAuth client ID in public configuration, treat it as public identifier, not a secret.

## 2. Discount algorithms (normative)

```ts
function isDiscountActive(d, nowUtcMs) {
  return !!d && (!d.startsAt || nowUtcMs >= d.startsAt)
    && (!d.endsAt || nowUtcMs <= d.endsAt);
}
function discountAmountMinor(originalMinor, d) {
  if (d.kind === 'percent') return Math.round(originalMinor * d.value / 100);
  return d.value; // fixed amount ALREADY in minor units
}
function finalPriceMinor(originalMinor, d) {
  const discount = discountAmountMinor(originalMinor, d);
  if (discount < 0 || discount > originalMinor) throw new Error('Invalid discount');
  return originalMinor - discount;
}
```

Round methodology must be documented and tested. `percent` must be `0..100` (can support fractional percent with controlled precision); `fixed` must be non-negative integer in minor units and cannot exceed relevant original price. `both` applies separately to both values, not to a combined or calculated carton value. A missing carton price remains `null` and is hidden. Disallow end before start.

**Example tests:** piece only; carton only; both; missing carton; percent 0/100; fixed amount exceeding price; midnight Cairo boundaries; expired promotion removal. **Do not use the inconsistent mockup prices as test fixtures for reality.**

## 3. Bundle contract

- `bundleFinalPriceMinor` is **independent** from regular unit/carton and item discount prices.
- `bundleItems` specify each product ID, positive quantity and `unit` (unit/carton). Require carton availability if used.
- On change/hidden/deletion of member product, flag `needsReview=true`. Admin re-confirms before republishing (or derived visible banner warns, per explicit UX decision).
- A published bundle must have current, visible, valid member references, valid title, cover if needed and independent display price.

## 4. Rules policy (enforcement, not pasted production Rules)

| Path | Anonymous read | Authenticated admin read/write |
|---|---|---|
| public shop profile | allow | allow, validated updates |
| categories | only published | all + CRUD |
| products | only published | all + CRUD |
| offers | only published | all + CRUD |
| media | public-safe view only, preferably only used published metadata | all + CRUD |
| `privateShopConfig` | **deny** | allow for configured UID only |

**Example auth predicate:**

```js
function isAdmin() {
  return request.auth != null && request.auth.uid == '<REPLACE_WITH_ALLOWED_UID>';
}
```

Generate/maintain the actual allowed UID through a reviewed deployment procedure, **never** from a user-writeable Firestore `isAdmin` field. No open client write access for public shop settings. Validate IDs, strings, price integers, array lengths, media types, URL schemes and allowed changed fields. Use stable query-compatible publication field and actual indexes. Don't write production Rules by copying this sample placeholder unchanged.

**Important:** Firestore Rules do not filter queries; customer reads should query `where('status','==','published')`, and tests must verify anonymous `get` to hidden/draft denies. If metadata for a private file is visible to visitors, metadata should not itself grant file access.

## 5. Data/query/indexes

- Primary product list: by shop, `status=published`, optional `categoryId`, `orderBy(updatedAt/createdAt)` and `limit`.
- Discounts may be nested product fields; query strategy for active discounts must be documented (client filtering a **bounded** result or denormalized `discountEligible`, not a misleading all-catalog claim). Dynamic date checks still required.
- Offers: by `status=published`, `type` and `displayOrder`; time window filtering must consider server time/clock skew.
- Manage composite indexes in `firestore.indexes.json` after discovering actual query shapes, not speculating over many unused indexes.

## 6. Deletion/media consistency

- Prefer reversible hidden/unpublished state for products/offers rather than immediate irreversible removal.
- On failed Firestore save after Drive upload, record an orphan asset and show a cleanup/retry screen. Never delete files without checking shared references.
- Making a product hidden is **not** equivalent to removing public Drive share rights; explicit admin remediation is required.
- Public image must be accessible without any admin token and without blanket Drive folder sharing. Drive share/download links are not interchangeable.
# Drive reference amendment — 2026-10-08

privateShopConfig adds optional driveProvider (apps_script|oauth), googleEmail, webAppUrl, scriptConnected, lastTestedAt (timestamp|null), rootFolderId/rootFolderName and storageUsedBytes (integer|null). They are private admin-only metadata; OAuth tokens, Firebase ID tokens, passwords, client secrets and upload sessions are rejected by Rules. Existing configurations without these fields remain readable as the advanced OAuth connection when a Client ID exists.

media adds optional storageProvider, driveDirectUrl, driveDownloadUrl, driveFolderId and driveFolderName. The existing verifiedPublicAssetUrl may now be a strictly validated tokenless Drive uc?export=view&id=FILE_ID[&resourcekey=...] URL as well as the existing API media URL. Normalized Firestore listener metadata (id/updatedAt) is not written back as configuration fields. Upload/shared/public-test-passed remain separate stages; the allowlisted admin must confirm incognito and run tokenless image fetch/decode before publication. No extra public collection or file content storage is added.


## Latest owner amendment — 2026-10-08

Google Apps Script is the only media connection. Remove the direct OAuth alternative and reference-project names from user-visible copy/generated code; do not ask for a browser Client ID or Drive API key. Per-file and configurable type limits are at most 20 MiB. Existing Firebase + owner Drive architecture and publication/private-original gates remain. Credential-free display probes use the observed tokenless Drive usercontent delivery endpoint for the same file ID; no expiring thumbnail, proxy or paid service. Historical direct-adapter notes above are superseded. Current implementation/evidence is in IMPLEMENTATION_STATUS.md.
