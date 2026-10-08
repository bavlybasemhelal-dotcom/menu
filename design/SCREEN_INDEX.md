# Reference screen index — Light/Dark pairs

**Both modes are required.** Use the same-number screenshot for visual comparison. Functional requirements and approved copy in `docs/01_PRD.md` override screenshot text and elements.

| # | Screen | Route | Light | Dark |
|---|---|---|---|---|
| 01 | شاشة البداية (`splash`) | `/` | [Light](light/01-splash.png) | [Dark](dark/01-splash.png) |
| 02 | الرئيسية والكتالوج (`catalog-home`) | `/catalog` | [Light](light/02-catalog-home.png) | [Dark](dark/02-catalog-home.png) |
| 03 | العروض والخصومات (`offers`) | `/offers` | [Light](light/03-offers.png) | [Dark](dark/03-offers.png) |
| 04 | تفاصيل المنتج (`product-detail`) | `/products/:id` | [Light](light/04-product-detail.png) | [Dark](dark/04-product-detail.png) |
| 05 | دخول الإدارة (`admin-login`) | `/admin/login` | [Light](light/05-admin-login.png) | [Dark](dark/05-admin-login.png) |
| 06 | لوحة التحكم (`admin-dashboard`) | `/admin` | [Light](light/06-admin-dashboard.png) | [Dark](dark/06-admin-dashboard.png) |
| 07 | إعدادات المتجر (`shop-settings`) | `/admin/settings` | [Light](light/07-shop-settings.png) | [Dark](dark/07-shop-settings.png) |
| 08 | ربط Google Drive (`drive-setup`) | `/admin/integrations/google-drive` | [Light](light/08-drive-setup.png) | [Dark](dark/08-drive-setup.png) |
| 09 | إدارة المنتجات (`product-management`) | `/admin/products` | [Light](light/09-product-management.png) | [Dark](dark/09-product-management.png) |
| 10 | إضافة وتحرير منتج (`product-editor`) | `/admin/products/new` | [Light](light/10-product-editor.png) | [Dark](dark/10-product-editor.png) |

## Screen priority / mapping notes

1. The images represent **10 screens**, each paired across Light and Dark. Treat spacing, hierarchy, media composition and UI themes as references, not executable code.
2. Some example captions in mockups still mention shipping or buying; remove them. **No checkout, cart, order, payment, delivery flows**.
3. Ratings, wishlists, demo review counts, product prices, fictitious admin names, Gmail addresses, OAuth IDs, quota figures and stock statistics shown in images are examples, not real data. Do not display them in production unless supplied by actual data.
4. The logo’s tiny trolley/cart-shaped **brand artwork** is okay; there must not be an interactive shopping cart icon or user transaction flow.
5. No dedicated screenshot exists for category CRUD, media library, offer/bundle editors: design these from the admin system outlined in PRD without adding unrequested features.
6. Use `docs/04_DESIGN_SYSTEM_AND_SCREENS.md` for design tokens, navigational structure and exact suppression/wording rules.
