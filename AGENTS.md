# Codex Work Instructions — Souqna

These instructions apply to all source edits performed while implementing this handoff.

## First action
- Read `README.md`, `docs/01_PRD.md`, `docs/02_ARCHITECTURE.md`, `docs/03_DATA_MODEL_AND_RULES.md`, `design/SCREEN_INDEX.md`, `docs/04_DESIGN_SYSTEM_AND_SCREENS.md`, `docs/05_IMPLEMENTATION_PLAN.md`, `docs/06_TEST_PLAN.md`, and `source/project-plan.md` before implementation.
- Inventory the existing repository if any; do not delete or overwrite code/config blindly. Explain any unavoidable migration and use a safe branch/folder.
- Produce a small execution checklist and record phase outcomes. Then implement without repeatedly asking for known requirements.

## Must respect
1. The product is a **showcase catalog**; no purchase/cart/order/checkout/payment/shipping/customer-account functionality or corresponding CTAs. Do not mistake the cart in the demo logo for a UX requirement.
2. Both **Light and Dark** themes, theme toggle on **every** screen, persistent preference. Full Arabic RTL and English LTR, proper font fallback.
3. Designs: 10 paired screens in `design/light` and `design/dark` with matching numbers. Preserve visual layout hierarchy but do not reproduce AI-generated dummy data/incorrect copy.
4. The sample brand "Souqna / سوقنا" is editable by one authenticated admin. No multi-tenant marketplace or staff admin UI.
5. Use React+TS+Vite, Tailwind, shadcn/ui, Firebase Auth+Firestore+Hosting on Spark. The owner's latest 2026-10-08 amendment selects Google Apps Script + DriveApp as the only media connection; remove the direct OAuth alternative and reference-project names from product copy and generated code. The current per-file cap is 20 MiB. No Functions, Firebase Storage, paid hosting/search/proxy or Blaze without express owner approval.
6. Authentication in Firebase (Email/Password), authorization **enforced by Firestore Rules** with allowlisted UID; no public write, no leaked private settings, no secrets in frontend or source.
7. No Google access/refresh token, client secret or service account key in the web app. Firebase ID tokens go only in the HTTPS Apps Script POST body for the admin's active operation; never in stored media/settings, URLs or logs.
8. **Hard gate:** public visitor must be able to view Drive-hosted published images anonymously in incognito while unpublished private files stay private. Distinguish upload-success from public-view-success.
9. Currency values in minor units; optional carton price; discount scope and date boundaries; independent bundle price; publish/draft/hidden states.
10. Do not claim live Firebase/Drive testing, upload completion, deployed website, or production readiness when working with mocks/unconfigured credentials.

## Implementation cadence
- Stage 0: source/repo audit + risk register; Stage 1: real Firebase/Drive POC or honest blocked state; Stage 2: design system and infrastructure; Stage 3: admin CRUD; Stage 4: public UI; Stage 5: automated/accessibility/integration testing; Stage 6: deployment guide, owner-controlled deployment.
- Work locally without destructive cloud actions. Only deploy after explicit approval and actual configured credentials.
- Keep `IMPLEMENTATION_STATUS.md` up-to-date with completed/partial/blocked status, tests, commands run, screenshots compared, and next action.
- Maintain `docs/08_DECISIONS_AND_OPEN_QUESTIONS.md` for design/integration assumptions. Do not silently invent requirements.
- Add tests for security, pricing, bilingual content, themes, route guards and absence of purchase UI.

## Source authority
- Functionality and scope: `docs/01_PRD.md` wins, including most recent user change.
- Technical details: `docs/02_ARCHITECTURE.md`, `docs/03_DATA_MODEL_AND_RULES.md`, with original plan as context.
- Visual design: screenshot pairs + `docs/04_DESIGN_SYSTEM_AND_SCREENS.md`; visually faithful but semantically filtered.
- Screenshots are image mockups, not certified texts/prices/integration states. Never hardcode fake brands/contact details/metrics as real shop records.
