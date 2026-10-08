# Design system and screen-by-screen implementation contract

**Visual sources:** `design/SCREEN_INDEX.md`, `design/light/*.png`, `design/dark/*.png`. Every numbered screenshot pair refers to the **same screen** in two themes. In both public and admin views, reproduce layout principles and visual quality (cards, photography, spacing, navigation, hierarchy, icons) while adjusting copy and behavior to the PRD.

## 1. Visual language

- **Brand concept:** sample `سوقنا / Souqna`, leaf+green/orange basket mark; owner can replace logo/name/colors. Cart shape is brand artwork only; **NO shopping-cart functionality**.
- **Light:** white / near-white canvas, very light gray section backgrounds, pale green/blue/orange accent cards, soft shadows, thin borders.
- **Dark:** deep blue-black / charcoal canvas and dark elevated card surfaces (not pure black everywhere); subdued borders; balanced bright green/orange highlights.
- **Brand tokens (initial, owner-editable):** primary `#16A34A`, accent `#FF6B00`. Strong warning/discount red, success green, informative blue, categorized purple.
- **Example tokens to refine with actual accessibility testing:**

```css
:root[data-theme='light'] {
  --background: #F8FAFC; --surface: #FFFFFF; --surface-muted: #F1F5F9;
  --text-primary: #101828; --text-secondary: #667085;
  --stroke: #E2E8F0; --brand-primary: #16A34A; --brand-accent: #FF6B00;
}
:root[data-theme='dark'] {
  --background: #08131E; --surface: #101D29; --surface-muted: #182733;
  --text-primary: #F8FAFC; --text-secondary: #AEBFCD;
  --stroke: #304251; --brand-primary: #32CF74; --brand-accent: #FF8738;
}
```

These are suggested starting colors, not a requirement to ignore readable contrast or the editable store color settings. Use consistent focus rings and contrast. No font files included; choose legally usable web fonts with Arabic support, e.g. `Cairo` or `Tajawal` plus `Inter`/system fallbacks, only via normal package/web delivery, no embedding copyrighted fonts from the user.

- **Spacing/shape:** 8px spacing scale, 12–20px card radius, 14–18px buttons; big product photos; consistent shadows and status pill shapes. Mobile card grid is usually two columns when readable, one when constrained; desktop grid expands.
- **Theme switch:** visible iconized sun/moon toggle **on every screen, no exception**; controlled state; persistent selection. Add keyboard accessible name (`الوضع الفاتح / الوضع الداكن`, `Switch theme`) and correct active state.
- **Language switch:** AR/EN in header/splash where appropriate; locale applies across admin and public UI; RTL/LTR and aligned chevrons/inputs.
- **Animation:** 150–300ms small interaction transitions; controlled motion on splash/hero; reduced-motion mode must disable nonessential animation; avoid parallax or slow gating.

## 2. Public pages: pairs 01–04

### 01 — `01-splash.png`
**Reference:** clean center identity, grocery product imagery, progress loading, direct entry CTA, toggles. **Implement:** first-load/branding transition that fails gracefully to content; theme toggle, AR/EN, `دخول مباشر`. Language must imply browsing, never shopping or ordering. Avoid blocking app while media fetch fails.

### 02 — `02-catalog-home.png`
**Reference:** header, notice, search, large hero, category icons, filter pills, product cards, family offer strip, fixed dual contact footer. **Implement:** only data-driven published products and offers; CTA `استعرض المنتجات`, product CTA `عرض التفاصيل` + `استفسر عبر واتساب`. Prices for reference only, correctly sourced from Firestore at runtime. **Suppress:** original/generated text such as `تسوق الآن`, `سعر إلكتروني`, `الشحن مجاني`, `طلباتك`, any add-to-cart icon, fake sale/stock claims. Product card may keep an image favorite-heart only if scoped as a non-account visual element, but no permanent wishlist without approved requirement. Recommended omit heart state rather than inventing data.

### 03 — `03-offers.png`
**Reference:** discounted items, bundles and special offers in a bold promotional layout, tabs, badges, rich photography. **Implement:** published valid discounts, independently-priced bundles, promotional conditions and dates, `عرض التفاصيل`, `تفاصيل العرض`, `استفسر الآن`; real countdown only. **Suppress:** example free-shipping banner and purchase CTA. Hero badge should be based on real discount, not made up `50%`.

### 04 — `04-product-detail.png`
**Reference:** substantial product gallery with variants/thumbs, title, availability, separate prices, feature area, description, similar products and contact footer. **Implement:** actual product info, verified price logic, responsive stacked mobile view. Add WhatsApp inquiry, share link, related items. **Suppress:** add-to-cart, quantity selector, reviews/rating counts unless they exist as supported scoped features; picture mockup shows stars that are **not** a requirement.

## 3. Admin pages: pairs 05–10

### 05 — `05-admin-login.png`
**Implement:** Firebase email/password login, forgot password, validation, real auth errors, admin UID checks; no registration for public users. Keep themed grocery side imagery and form card. Provide theme toggle even without authentication.

### 06 — `06-admin-dashboard.png`
**Implement:** intro banner, CRUD quick actions, 4 cards with real counts (products/categories/offers/media), Drive status, upload status, latest updated items and content-quality tips. Only show storage figures if actually available. **Suppress:** orders/revenue/sales/marketplace concepts; sample counts and fake `connected` status.

### 07 — `07-shop-settings.png`
**Implement:** logo upload, bilingual identity and descriptions, WhatsApp, Facebook, currency, language, editable color tokens, preview/save. Theme switch global. **Suppress:** shopping/checkout promises and any sampled real-looking contact details once production is configured.

### 08 — `08-drive-setup.png`
**Implement:** secure instructional steps, OAuth Client ID, connect account, choose app folder, test upload, test **anonymous public view separately**, broken/revoke states and remedies; status cards correspond to tests, not images. **Suppress:** sample OAuth client ID as real value, sample connected status as fact. **Do not** ask for/store Client Secret.

### 09 — `09-product-management.png`
**Implement:** search, category/publish/availability/discount filters, real status/price rows, edit/preview/hide actions, pagination. Admin available on mobile (convert table to cards/horizontal controlled scroll as needed). **Suppress:** sample stock values and product prices as actual record data.

### 10 — `10-product-editor.png`
**Implement:** numbered sections for basic info, bilingual descriptions, media, prices and targeted discounts, optional variants, dates, draft/publish; right live preview with `عرض التفاصيل`/`استفسار عبر واتساب`. **Suppress:** `إضافة إلى السلة`, selling-specific inventory checkout terms. `منتج معروض` is a preferred availability/publication phrase. Ensure save validation and independent Drive upload gate.

## 4. Screens not explicitly depicted

Build the below using **same admin visual system** and every-screen light/dark control; do not claim they have dedicated images:

- **Category list and editor:** responsive ordered category cards/table, bilingual fields, visibility/order controls; delete warnings.
- **Offers management:** segmented offers list and editor for discounts, bundles, specials; product selector for bundles; date/schedule UI; disabled/dependent states.
- **Media library:** upload tiles, preview, file usage, upload errors, public-view status and recovery controls.
- **Password reset screen:** visually consistent with admin login, Firebase reset feedback.
- **Offer/bundle detail page:** derived from catalog product/offer style, contains informational content and inquiry CTA only.

## 5. Component checklist

| Component | Light/Dark | AR/EN | Behavioral contract |
|---|---|---|---|
| `ThemeToggle` | required | required | Works on every route, preference persisted |
| `LanguageToggle` | required | required | Updates `lang` and `dir` |
| `AppHeader` / `AdminHeader` | required | required | No cart, has search/navigation as needed |
| `ProductCard` | required | required | Image/availability/true prices, info CTAs |
| `PriceDisplay` | required | required | Minor units, optional carton, active discount |
| `ContactBar` | required | required | Fixed outside content; configured WhatsApp/Facebook |
| `ProductGallery` | required | required | Accessible controls and image fallback |
| `OfferCard` / `BundleCard` | required | required | Details/inquiry, no purchase |
| `MediaUploader` | required | required | Honest progress/status and Drive errors |
| `AdminFormShell` | required | required | Bilingual errors and unsaved-change handling |

## 6. Visual verification requirements

For each pair (01–10): compare Light screenshot with rendered Light route, and Dark with rendered Dark. At each of 375/768/1024/1440, check key visual hierarchy and responsive stacking; text should remain readable, menus accessible, no overlapping fixed bars, and no imitation of purchase controls. Use Playwright screenshots when available, place comparison notes/screens in `IMPLEMENTATION_STATUS.md`. Do not embed the screen image as one static page and pretend it is a functional UI.
