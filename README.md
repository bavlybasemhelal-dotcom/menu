# Souqna Catalog — Codex Implementation Handoff

## Implemented application

Google Drive uses Google Apps Script as the only media connection. /admin/drive contains generated Code.gs, Google email + /exec URL settings, test-and-save, folder details and a permanent bilingual guide. No Client ID, browser Drive API key or alternative connection selector is needed. The per-file cap is 20 MiB; larger media must be reduced before uploading. Actual live verification is recorded in IMPLEMENTATION_STATUS.md, separately from local fixtures.

Owner-authorized Firebase Hosting release: [public catalog](https://menu-3ebba.web.app) and [admin sign-in](https://menu-3ebba.web.app/admin/login). Rules/indexes are deployed. The owner-requested client presentation now includes 6 categories, 24 products and 5 offer/banner records in real Firestore. All are bilingual, editable in admin and explicitly marked as sample content. The UI contains no fixed demo catalog. Actual embedded Google Drive image delivery remains incomplete.

The React/TypeScript application now lives in this folder alongside the original handoff. Run npm ci, npm run emulators, then npm run dev:emulator for the explicitly labeled local environment. See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for seeding, owner UID, public Firebase configuration, permanent Drive instructions, tests and owner-controlled release. The local app is data-driven through Firestore listeners and CRUD; real Google Drive/production acceptance remains separately gated. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for actual evidence and remaining blockers.

The sections below preserve the supplied handoff requirements.

**This is a full project handoff package, not a prebuilt application.** It contains a source-grounded PRD, architecture and security guidance, an implementation sequence, acceptance tests, and **20 reference images** (10 Light, 10 Dark). Brand "سوقنا / Souqna" is a **replaceable demo identity**.

## Mandatory product definition

**A public electronic menu / product catalog for one store: display ONLY.** Visitors explore products, prices, discounts and promotional bundles and may inquire using WhatsApp or visit Facebook. **NO shopping cart, ordering, checkout, payments, delivery/shipping workflows, sales/revenue dashboards, customer accounts or purchase buttons.** The shopping-cart drawing inside the sample logo is permitted as brand art, never functionality.

**Both Light and Dark mode**, with a visible sun/moon switch on **all screens** and saved preference. Full Arabic/English RTL/LTR.

## Read order for Codex

1. **`AGENTS.md`** — binding execution and safety instructions.
2. **`docs/01_PRD.md`** — source of functional truth and acceptance criteria.
3. **`docs/02_ARCHITECTURE.md`** — stack, integration hard gate, security, operational constraints.
4. **`docs/03_DATA_MODEL_AND_RULES.md`** — conceptual data model and pricing logic.
5. **`design/SCREEN_INDEX.md`** + **`docs/04_DESIGN_SYSTEM_AND_SCREENS.md`** — Light and Dark reference pairing and visual exceptions.
6. **`docs/05_IMPLEMENTATION_PLAN.md`** — phases, dependencies and expected artifacts.
7. **`docs/06_TEST_PLAN.md`** — exact acceptance test scenarios.
8. **`docs/07_INTEGRATION_SETUP.md`** — owner setup and free Google Drive/Firebase proof.
9. **`docs/08_DECISIONS_AND_OPEN_QUESTIONS.md`** — blockers and explicit proposed defaults.
10. **`source/project-plan.md`** — original owner-approved-planning context; latest user refinements in PRD override its old status/copy.

## Directory map

```text
Souqna_Codex_Handoff/
├── README.md                         ← start here
├── AGENTS.md                         ← hard constraints for Codex
├── CODEX_START_HERE.md               ← ready-to-paste Codex instruction
├── docs/
│   ├── 01_PRD.md                     ← complete requirements
│   ├── 02_ARCHITECTURE.md            ← technology + key risk
│   ├── 03_DATA_MODEL_AND_RULES.md    ← entities + pricing + rules
│   ├── 04_DESIGN_SYSTEM_AND_SCREENS.md
│   ├── 05_IMPLEMENTATION_PLAN.md
│   ├── 06_TEST_PLAN.md
│   ├── 07_INTEGRATION_SETUP.md
│   └── 08_DECISIONS_AND_OPEN_QUESTIONS.md
├── design/
│   ├── SCREEN_INDEX.md               ← paired images, route map
│   ├── light/                       ← 10 Light screenshots
│   ├── dark/                        ← 10 Dark screenshots
│   └── manifest.json                ← image paths and dimensions
├── source/project-plan.md            ← supplied project plan
├── config/.env.example               ← no actual secrets
└── scripts/                          ← optional helper notes
```

## Handoff to Codex

1. Unzip this archive to a **new, separate folder** and open that folder (or copy the package into the project repository under `specs/souqna/`). **Do not extract over an existing app without first reviewing its files.**
2. Open Codex in the intended implementation repository/workspace.
3. Paste the complete command text in `CODEX_START_HERE.md` into Codex. The top-level README / AGENTS / docs are the implementation contract; **the ZIP is not executable code**.
4. Let Codex audit current repo and deliver a short plan, then work through phases in order. Build a real app locally, add tests, and report proof/status after each phase. If credentials are missing, use an explicitly named demo adapter, and **never fake cloud completion**.
5. Keep the zipped screenshots as visual references. They are mockups, **not** front-end source or final product data.

## Critical feasibility gate

The original architecture relies on **Google Drive as durable storage for public product photos**, with browser-side upload through Google Identity Services and **Firebase Spark**. **Anonymous public image rendering from Drive without exposing admin tokens must be proven with a real incognito test**. If this fails, Codex must stop claiming production-ready integration and document the blocker and compliant alternatives instead of silently adding Firebase Storage, Functions, Blaze, a paid proxy, or simulated success messages.

## Files of authority / conflict resolution

`docs/01_PRD.md` > `AGENTS.md` and focused design/implementation docs > `source/project-plan.md` > screenshot text details. Screenshots may contain AI-generated misspellings, made-up prices, shipping or purchase copy, unsupported reviews, or old nav tabs. **Do not implement those as features.**

## Local developer workflow — when Codex has scaffolded the app

Expected scripts in app `package.json`: `dev`, `lint`, `typecheck`, `test`, `build`. Use `npm install`, `npm run dev`, then test/build before a handoff. Do not push or deploy to the live Firebase project without owner authorization.

## Unresolved owner-provided values

Firebase configuration and the owner UID are deployed. The owner-authorized Apps Script is deployed and its real connection/upload/share checks succeeded. Store name/logo, WhatsApp/Facebook details and actual catalog content remain owner-editable inputs. Anonymous image delivery and complete dynamic production acceptance must be checked independently; see IMPLEMENTATION_STATUS.md. Never put private account credentials in project files.

## Image editing and current Drive protocol

Upload images directly from products, store-logo settings, category covers and offer/banner editors. The standalone Media page has been removed; its old URL redirects to products. Previous images, display repair and incomplete-upload recovery are available inside each editor. Private administrative documents/videos and original recovery are in the Drive setup section.

The Google script must use protocol 2; copy the generated code from Admin → Google Drive and redeploy a new version while preserving the /exec URL. Execute as Me, access Anyone; keep the app root/subfolders Restricted. Only selected display files are shared. Originals stay private, including GIF originals. The same free bridge supplies anonymous image bytes; only permanent links and metadata are stored in Firestore. Real anonymous rendering and inline Firebase/Drive editing have passed; release evidence and remaining operational limits are in IMPLEMENTATION_STATUS.md.
