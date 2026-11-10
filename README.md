# PlanSaathi · local SaaS build

Private interior-design projects with Next.js App Router/Turbopack, Three.js, PostgreSQL, Redis, Better Auth and Razorpay. This separate project belongs in E:\Github\Interior.

## Run locally

Use Node 24 LTS and Docker Desktop. The release container uses pinned Node 24; local Windows checks also ran with Node 25.6.

```powershell
cd E:\Github\Interior
npm ci
node scripts/setup-local.mjs
npm run infra:up
npm run db:migrate
npm run dev:seed
npm run dev
```

Open http://127.0.0.1:3000 using this exact origin; the root is now the public landing and /dashboard is the private workspace. Run npm run ops:worker in another terminal to exercise payment recovery/health locally. The ignored .env.local is already prepared with random local secrets. The setup helper preserves existing configuration and generates random secrets on another machine; .env.example documents every field.

The optional seed creates three verified local accounts: grow.lokal1@gmail.com (approved admin), studio.one@forma.local and studio.two@forma.local. Generated passwords are saved only in ignored **.local/development-accounts.json**. Open that file to sign in; do not commit/share it. These accounts use audited **offline development credits**, not paid subscriptions. Production excludes offline entitlements. The seed refuses non-development and non-loopback databases.

Local services bind only to 127.0.0.1: PostgreSQL 5548, Redis 6388, Mailpit SMTP 1028 and inbox http://127.0.0.1:8028. No email leaves Mailpit. Stop the app with Ctrl+C and services with npm run infra:stop. Volumes preserve data.

## Accounts and billing

- Verified email/password login, reset links, Argon2id hashes, HttpOnly sessions, device revocation and authenticator/recovery-code support. Super-admin access requires an explicitly MFA-verified session. Production requires HTTPS. Passwords are hashed, not recoverably encrypted.
- Projects are private per account; every server operation checks ownership. Revision checks prevent silent conflicting saves.
- ₹1,499/month includes 10 newly created projects in each confirmed paid billing period. Unused monthly allowance expires; existing projects remain editable after credits run out.
- ₹299 buys 2 additional creation credits; unused purchased credits carry forward. Monthly credits are consumed first. Creation is atomic/idempotent; archive does not refund credits.
- Approved verified bootstrap email becomes super-admin. Admins inspect/suspend/reactivate accounts and grant audited credits with a reason; they also need creation credits.
- New ordinary accounts have no paid allowance until reconciled payment. Checkout is explicitly unavailable without all Razorpay credentials.

## Designer workflow

Create an empty or furnished project. Import PDF/PNG/JPEG/WebP, choose a page, calibrate a known measurement and trace rectangles or simple polygons. Numeric dimensions/corners remain editable. Assisted reconstruction requires designer verification; it does not automatically interpret every drawing.

Length units: m/cm/mm/ft/in. Area units: m²/cm²/sq ft/sq yd. Stored geometry remains metres. Arrange 43 procedural catalog objects, sofa shapes and cloths, wall art/textures, tube lights/CFLs, appliances and electrical items. Edit arbitrary six-digit hex colours, materials, transforms, door/window/open-passage geometry and camera views. Fan downwash/rotation and AC ribbons/particles have independent power/speed controls; Auto honors reduced-motion preferences. Choose Play wind to explicitly run the animation, or Pause wind to stop both wind and fan motion; the chosen view preference is remembered on this device. Full-height solid walls are the default, with explicit Full walls / Cutaway controls and optional foreground transparency.

Autosave confirms the saved account revision. Keep the editor open while saving, or download a JSON backup before leaving. Export editable JSON, PNG or a client PDF. No live co-editing/team sharing.

Original plan bytes are processed locally. The selected reduced raster reference is stored privately (R2 in production; .local/plan-assets during local development); its owned pointer and geometry are saved in PostgreSQL. Unchanged raster bytes are omitted from ordinary autosaves. Exported JSON may contain client information. Limits: 25 MB plan, 24 megapixels/12,000 pixels per raster side, 1600-pixel saved reference, 30 rooms, 32 corners per room, 300 objects. Simple concave polygons work; CAD/DWG and polygon holes are not supported.

## Verify

```powershell
npm run typecheck
npm test
npm run build
```

Backend integration tests require the dedicated TEST_DATABASE_URL (forma_test locally); check that they ran rather than skipped. On a new local database, create it once with: docker compose --env-file .env.local -f compose.local.yml -p forma-local exec postgres createdb -U forma forma_test. Do not use a production database for tests. Synthetic provider responses cover payment replay/reconciliation, ownership, session revocation and quota concurrency. Tests do not make charges. Live provider acceptance still requires test credentials.

src/platform owns account screens; src/server owns access/billing/persistence; migrations applies Better Auth and application schema. src/App.tsx and useCloudSave.ts own the revision-aware editor; model.ts owns validation; scene.ts updates objects incrementally and skips idle rendering; PDF.js loads only after PDF selection. DESIGN.md and UX-CONTRACT.md record UI decisions.

Concept assets are not manufacturer models. Airflow is illustrative, not CFD/HVAC sizing; electrical paths are placement guides, not circuit engineering. Performance depends on hardware, browser and project size; no zero-lag or production-capacity claim is made.

See [PRODUCTION-PLAN.md](PRODUCTION-PLAN.md), [OPERATIONS.md](OPERATIONS.md) and [LAUNCH.md](LAUNCH.md) and [server setup](src/server/README.md). This v0.4 build is **local only**. The selected launch name is PlanSaathi.com; it has not been purchased. Merchant name and public support email are production-plan tasks. Previous private Sites v2 is unchanged; its historical static hosting manifest cannot deploy this PostgreSQL-backed Next.js app unchanged.

