# Codex execution plan — phases and deliverables

The package contains **requirements and design references, not app source**. Implement in the existing repo if appropriate, after safety audit. Deliver working code plus tests; do not end at a Figma-like screenshot clone.

## Phase 0 — Audit + preparation

- Read all source/spec files and 20 screenshots. Inspect current repo tree, package manager, git state, previous code and config before edits.
- Create `IMPLEMENTATION_STATUS.md` and maintain completed/blocked/test evidence sections.
- Resolve any conflicting instructions using PRD source priority. Avoid destructive edits or cloud deployments.
- Setup TypeScript/Vite app skeleton only after verifying no existing scaffold is being overwritten.
- Document missing credentials in `docs/08_DECISIONS_AND_OPEN_QUESTIONS.md`.

**Done when:** plan/checklist exists, package/project state understood, routes/components mapped, purchase scope excluded.

## Phase 1 — Firebase/Drive security and technical spike (hard gate)

- Firebase client config via `.env`, Auth login, allowlisted UID check and Firestore Rules, public/draft read tests using emulator if available.
- Google Identity Services secure admin OAuth path; folder handling; upload small test image; metadata save.
- Independently test anonymous public image read **from incognito**. Prove no admin token is required and unpublished file remains inaccessible.
- Error/revoke/permissions states and `BLOCKED` status if integration cannot be verified.
- No Functions/Storage/Blaze/paid backend.

**Done when:** real account test evidence recorded OR clearly named owner-credential blocker. Never claim success from mocks.

## Phase 2 — Shared UI foundations

- CSS design tokens for Light and Dark, persistent theme toggle and prepaint initialization.
- Arabic/English localization and RTL/LTR; route structure; accessible layout/nav; mobile fixed contact footer.
- Core components for banners, product cards, price block, category lists, discounts, upload status and admin form shell.
- Test theme/language cross-route persistence; visual checks on example pages.

**Done when:** both themes available on all routes (including placeholder pages), working toggles, no cart/checkout controls.

## Phase 3 — Admin content workflows

- Login/forgot-password, protected admin dashboard, public settings/branding/contact.
- Categories CRUD + order/visibility; product list/new/edit/preview/draft/publish/hide with media attachments.
- Discount rules, bundles and specials create/edit/publish/scheduling, visibility, validity; independent bundle pricing; `needsReview` on changed member.
- Media library, Drive status/setup and staged uploads; errors/orphans.
- Firestore persistence with validation, sensible loading/empty/error states and reduced motion.

**Done when:** end-to-end admin CRUD (configured Firebase), real rules and tests, not a static form mock.

## Phase 4 — Customer catalog

- Splash / home/catalog; categories and product filters; bounded product search; product detail gallery and similar items.
- Offers page with discounts/bundles/specials; effective date logic; actual image cards.
- WhatsApp product inquiry and Facebook contact configured from admin settings.
- Responsive navigation, empty/offline/expired promotion states, no purchase semantics.

**Done when:** public read only works correctly with configured backend, all illustrated public screens functional.

## Phase 5 — Verification and hardening

- Unit tests: money/discounts, schedules, i18n fallback, contact URL generation, model validation.
- Integration security: anonymous Firestore access and admin-only writes; Drive public image gates, missing media, expired/revoked OAuth (where credentials available).
- E2E: 375/768/1024/1440 viewports, theme persistence, language direction, card navigation, no horizontal overflow or fixed-footer collisions, publish/unpublish.
- Verify there are zero cart/checkout/order/payment/shipping controls and no misleading status badges/metrics.
- Run lint/typecheck/test/build; report actual commands/outcomes.

**Done when:** all feasible tests pass and remaining external blockers declared without invented success.

## Phase 6 — Owner handoff / deployment (permission-gated)

- Prepare Firebase Hosting config, Firebase rules/indexes and `DEPLOYMENT_GUIDE.md` with correct OAuth origins, env variables and checks.
- Confirm owner's explicit approval before production deploy or cloud configuration mutation.
- Run public-domain/incognito smoke test and confirm DNS/origin OAuth, contact links and media after approved deploy.

**Done when:** deployment is explicitly approved and tested, or clearly documented as ready-for-owner-actions with no fake live URL claims.

## Minimum output artifact checklist

- Source app with documented install/run/test/build scripts.
- Firestore Rules and indexes, no sensitive secrets committed.
- `IMPLEMENTATION_STATUS.md` with phase-by-phase pass/partial/blocked.
- `DEPLOYMENT_GUIDE.md` with safe owner instructions.
- Test suite and actual output/results.
- Visual cross-check (10 pairs) report; new admin pages visually consistent.
- Owner blocker list in one place.
