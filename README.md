# PlanSaathi Studio (`plansaathi-studio`)

**PlanSaathi** is a full-stack 3D interior design, spatial planning, and live client presentation SaaS built for interior designers, design-build studios, and architectural teams. It combines a real-time procedural **Three.js WebGL studio** with **deep product customization** (from modular switchboards and brand SKUs to 8 sofa silhouettes, cloth weaves, shutter profiles, and architectural ceilings), **live client presentation HUDs**, and **automated BOQ / PDF presentation exports**.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Core Capabilities & Customization Engine](#2-core-capabilities--customization-engine)
3. [Architecture & Directory Structure](#3-architecture--directory-structure)
4. [Prerequisites](#4-prerequisites)
5. [Local Development Quickstart](#5-local-development-quickstart)
6. [Local Infrastructure & Seeded Accounts](#6-local-infrastructure--seeded-accounts)
7. [NPM Scripts Reference](#7-npm-scripts-reference)
8. [Testing & Verification](#8-testing--verification)
9. [Security, Billing & Engineering Guardrails](#9-security-billing--engineering-guardrails)

---

## 1. Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework & Routing** | Next.js `16.4.3` (App Router, Turbopack), React `19.2.0`, TypeScript `5.9` |
| **UI & Styling** | Tailwind CSS `4.3` (utilities only, no preflight) mapped to the brand tokens in `src/brand/brand.css`; shadcn-style primitives on `radix-ui` `1.8` (`src/components/ui`); Geist Variable (body), Fraunces Variable (display serif), Space Grotesk Variable (studio editor) |
| **Landing Motion** | The studio's own Three.js renderer driven by scroll (`src/marketing/LiveFilm.tsx`), `lenis` `1.3` smooth scrolling, CSS-driven reveals and pointer interactions (`src/marketing/ScrollEffects.tsx`) |
| **3D Viewport & Rendering** | Three.js `0.185.0` (`WebGLRenderer`, ACES Filmic tone mapping, PCF soft shadows, procedural `CanvasTexture` materials, GLSL airflow shaders) |
| **Floor Plan Reconstruction** | `pdfjs-dist` `6.2` (lazy-loaded client PDF rasterizer), interactive 2D polygon/wall sketch planner (`src/SketchPlanner.tsx`, `src/PdfPlanner.tsx`) |
| **Client Presentation Export** | `jspdf` `4.2` (multi-page landscape A4 architectural presentation + itemized BOQ schedule) |
| **Authentication & Security** | `better-auth` `1.7`, `@node-rs/argon2` (Argon2id), TOTP MFA + recovery codes, revocable HttpOnly sessions |
| **Database & Cache** | PostgreSQL (`pg` `8.16`) with SQL migrations (`migrations/`), Redis (`ioredis` `5.8`) |
| **Billing & Storage** | Razorpay subscriptions & credit top-ups, S3/Cloudflare R2 (`@aws-sdk/client-s3`) or `.local/plan-assets` in dev |
| **Testing** | Vitest `4.1`, React Testing Library, Happy DOM |

---

## 2. Core Capabilities & Customization Engine

### A. Modular Switchboards & Electrical Configurator (`src/FinishControls.tsx`, `src/scene.ts`)
- **Curated Electrical Brands & Series**:
  - **Legrand** (*Myrius NextGen, Arteor, Lyncus, Allzy*)
  - **Schneider Electric** (*AvatarOn, Zencelo, Unica Pure, Livia*)
  - **Havells** (*Crabtree Signia, Murano Glass, Fabio, Coral*)
  - **Panasonic Anchor** (*Roma Classic, Vision Glass, Woods, Penta*)
  - **Lauritz Knudsen (L&T)** (*Englaze, Entice, Oris*)
  - **Goldmedal** (*Curve, Air, i-Touch, Nixon*), **GM Modular**, **Norisys**, or custom vendor/SKU.
- **Modular Gang Sizes (`SWITCH_GANGS`)**: `1M`, `2M`, `4M`, `6M`, `8M`, `12M` (dual-row master bank), and `touch` (**Smart Capacitive Touch Glass Panel** with glowing LED rings).
- **Cover Plate Finishes (`SWITCH_PLATES`)**: *Velvet Matte Polycarbonate*, *Tempered Crystal Glass*, *Brushed Anodized Metal*, *Natural Timber Veneer*, and *Zero-Bezel Frameless*.
- **Dual-Tone Finish**: Independent faceplate colour (`SWITCH_COLORS`) and inner rocker/bezel accent colour (`ACCENT_COLORS`).

### B. Bespoke Sofa & Seating Configurator
- **8 Sofa Geometries (`SOFA_SHAPES`)**: `three-seater`, `two-seater`, `four-seater`, `l-left` (Left Chaise), `l-right` (Right Chaise), `u-shape` (Double-Lounger Pit Sectional), `curved` (Organic Crescent Bouclé), and `island` (360° Dual-Sided Hotel Lounge Daybed).
- **7 Procedural Cloth & Upholstery Weaves (`FABRIC_STYLES`)**: `plain`, `woven`, `boucle`, `ribbed`, `tufted` (diamond button quilting), `suede` (brushed velvet nap), and `cane` (rattan octagon weave).
- **5 Arm/Backrest Silhouettes (`ARM_STYLES`)**: *Architectural Track*, *Classic Rolled*, *Slouch Pillow*, *High Tuxedo Box*, and *Fluted Timber Shell*.
- **5 Base/Leg Styles (`LEG_STYLES`)**: *Tapered Solid Timber*, *Brushed Brass Stiletto*, *Matte Black Sled*, *Recessed Plinth*, and *Shadow-Gap Floating*.
- **Cushion Divisions & Accents**: Adjustable `1`–`6` seat cushions and customizable throw-pillow/trim accent colours.

### C. Universal Catalog Customization (43 Assets Across 10 Categories)
- **Curated Brand & Series Presets (`BRAND_PRESETS`)**: Covers *Seating*, *Tables*, *Storage*, *Lighting*, *Systems (HVAC/Fans)*, *Kitchen*, *Appliances*, *Bathroom*, *Decor*, and *Electronics*.
- **Category-Specific 3D Profiles**:
  - **Tables (`TOP_SHAPES`)**: *Bevelled Rectangular*, *Pill / Racetrack Oval*, *Circular Pedestal*, *Organic Pebble Curve*.
  - **Wardrobes, Cabinets & Media Consoles (`FRONT_STYLES`)**: *Sleek Handleless J-Pull*, *Reeded / Fluted Glass Insert*, *Timber Louvered Shutters*, *Classic Shaker Frame*, *Rattan Cane Webbing Insert*.
  - **Lighting Kelvin Temperature (`LIGHT_TEMPS`)**: `2700K Lounge Warm`, `3000K Soft Warm`, `4000K Natural Gallery`, `6000K Crisp Daylight` (dynamically tints both the 3D `PointLight` and emissive bulb).
- **BOQ & Specification Metadata**: Per-item `brand`, `modelCode`, `accentColor`, `unitPrice` (`₹ INR`), and `specNote`.

### D. Room Architectural Finishes & 3D Ceilings
- **11 Floor Finishes (`FLOOR_FINISHES`)**: *Natural Oak*, *Smoked Walnut*, *Limestone*, *Microcement*, *White Marble*, *Terrazzo*, *Ivory Tiles*, *Herringbone Wood*, *Charcoal Slate*, *Terracotta*, *Soft Carpet*.
- **8 Wall Textures (`WALL_TEXTURES`)**: *Smooth Paint*, *Limewash*, *Exposed Brick*, *Cast Concrete*, *Wood Panelling*, *Classic Wainscoting*, *Bookmatched Marble*, *Textured Wallpaper*.
- **Wall Finish Brands**: *Asian Paints Royale*, *Berger Silk*, *Dulux Velvet*, *JSW Halo*, *Sabyasachi × Nilaya*.
- **Feature / Accent Wall**: Assign an independent accent colour to any individual wall edge (`Wall 1`–`Wall N`).
- **3D Ceiling Architecture (`CEILING_STYLES`)**: *Flat Minimal*, *Recessed Perimeter LED Cove* (with warm 3D perimeter glow), *Architectural Coffered Grid*, and *Exposed Timber Rafters*.

### E. Live Client Presentation Mode & BOQ Export
- **Lighting Moods (`LightingMood`)**: Switch instantaneously between *Studio Day*, *Golden Hour*, *Evening Lounge*, and *Gallery Crisp*.
- **Interactive In-Presentation Spec Card**: Clicking any object in **Present** mode opens a floating specification card with live brand, shape, cloth, switch module, and colour toggles—without showing wireframe gizmos or accidentally dragging furniture.
- **Material Board & BOQ Modal (`Specs & BOQ`)**: Summarizes total project area, room-by-room architectural finishes, itemized brand/series specifications, and total estimated project cost in `₹ INR`.
- **Client PDF Presentation (`src/export.ts`)**: Generates a multi-page landscape A4 presentation with 3D perspective render, scaled 2D vector floor plan, room finish schedule, and itemized BOQ specification schedule.

---

## 3. Architecture & Directory Structure

```text
interior/
├── migrations/                 # SQL schema migrations & runner (migrations/runner.ts)
├── public/                     # Static brand assets, landing poster images, and PDF.js worker
├── scripts/                    # Local setup, database seeding, PDF worker copy, ops worker
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Public landing page
│   │   ├── layout.tsx          # Root layout & global stylesheets
│   │   ├── tailwind.css        # Tailwind theme mapped to the brand tokens
│   │   ├── error.tsx           # Route error boundary (global-error.tsx covers the root layout)
│   │   ├── demo/               # No-login 3D studio sandbox (/demo)
│   │   ├── dashboard/, billing/, profile/, admin/   # Signed-in workspace routes
│   │   ├── studio/[id]/        # Studio editor for a saved project
│   │   ├── login/, register/, forgot-password/, reset-password/, verify-email/, two-factor/
│   │   └── api/                # REST routes for projects, plans, billing, webhooks, admin, health, auth
│   ├── components/ui/          # shadcn-style primitives: Tooltip (Hint, HelpHint), Card, Badge, Progress, Skeleton
│   ├── marketing/              # Landing page sections
│   │   ├── LiveFilm.tsx        # Scroll-driven film rendered live by StudioScene
│   │   ├── MaterialBand.tsx    # Catalogue marquee and scroll-filled statement
│   │   ├── MaterialBoard.tsx   # Pinned gallery painted from the engine's floor & wall textures
│   │   ├── ScrollEffects.tsx   # Smooth scrolling, reveals, pointer follower, magnetic controls
│   │   └── landing.css, film.css
│   ├── platform/               # Dashboard, Auth, Billing, Profile & Admin React screens
│   ├── server/                 # Server-side auth, PostgreSQL repositories, quota, rate limits, Razorpay & R2
│   ├── brand/                  # Brand tokens, fonts and logo components
│   ├── App.tsx                 # Main 3D Studio Editor, Inspector, Presentation HUD & BOQ Modal
│   ├── EditorControls.tsx      # Room polygon outline editor, door/window editor, HVAC controls
│   ├── FinishControls.tsx      # Sofa, Switchboard, Brand/BOQ Spec, and Wall/Ceiling controls
│   ├── PdfPlanner.tsx          # Assisted PDF/image floor-plan calibration & room tracing
│   ├── SketchPlanner.tsx       # 2D CAD-style interactive floor-plan sketcher
│   ├── Viewport.tsx            # React wrapper around StudioScene with WebGL error boundary
│   ├── airflow.ts              # Procedural AC & ceiling-fan airflow stream ribbons & shaders
│   ├── export.ts               # Multi-page A4 PDF presentation & BOQ generator (jsPDF)
│   ├── model.ts                # Core types, 43-item catalog, brand presets, pricing & validation
│   ├── planGeometry.ts         # Polygon simplicity, intersection & geometric helpers
│   ├── scene.ts                # Three.js StudioScene engine, procedural 3D meshes & lighting moods
│   ├── sceneMaterials.ts       # Procedural CanvasTexture generators for fabrics & walls
│   ├── templates.ts            # Starter residential & commercial project templates
│   ├── units.ts                # Length (m/cm/mm/ft/in) & area (m²/cm²/sq ft/sq yd) conversions
│   ├── useCloudSave.ts         # Optimistic revision-checked cloud autosave hook
│   ├── wallView.ts             # Smart foreground wall cutaway & ghost-wall visibility
│   └── proxy.ts                # Per-request CSP nonce and security headers
├── tests/                      # Database test setup, backup tests & fixtures
├── deploy/                     # Production Caddy proxy, Postgres image, backup units
├── components.json             # shadcn configuration
├── postcss.config.mjs          # Tailwind PostCSS plugin
├── compose.local.yml           # Local Docker Compose (PostgreSQL, Redis, Mailpit)
├── next.config.ts              # Next.js 16 configuration & security headers
└── vitest.config.ts            # Vitest configuration
```

### Landing Page (`/`)
The public page is a progressive enhancement over static content:
- **Live film**: `LiveFilm.tsx` loads `StudioScene` after first paint and maps scroll progress to the camera, wall height (`StudioScene.setCutawayHeight`), finishes, furniture and lighting. The last chapter lets visitors change the sofa, floor and light, and drag the room on desktop.
- **Poster**: `public/brand/landing-hero.jpg` and `landing-hero-portrait.jpg` are captured from the same renderer and hold the stage until WebGL is ready. Re-capture them if the opening shot changes.
- **Material gallery**: `MaterialBoard.tsx` paints each card with `floorTexture()` and `surfaceTexture()`, so the samples and the counts shown always match `src/model.ts`.
- **Fallbacks**: with `prefers-reduced-motion`, or when WebGL is unavailable, the page shows the poster hero and the chapters as static text; smooth scrolling, the pointer follower and the pinned gallery are not started. Touch devices get a native swipe row instead of the pinned gallery.

### Dashboard & Tooltips
- **Dashboard** (`src/platform/Projects.tsx`): plan overview cards, quick-start cards, a first-run guide and skeleton loading, built with the `src/components/ui` primitives.
- **Tooltips**: wrap one control in `<Hint label="…">`, or place `<HelpHint label="…"/>` beside a label for a "?" button. Both are keyboard accessible and render inside open modal dialogs.

---

## 4. Prerequisites

- **Node.js**: `v24.x LTS` (or `v22.12+` / `v25.x`)
- **Docker Desktop**: Required for local PostgreSQL, Redis, and Mailpit containers (`compose.local.yml`)
- **Package Manager**: `npm` (v10+)

---

## 5. Local Development Quickstart

Run the following commands from the repository root (`e:\Github\Interior\interior`):

```powershell
# 1. Install dependencies (if not already installed)
npm ci

# 2. Generate .env.local with random local secrets (preserves existing .env.local if present)
node scripts/setup-local.mjs

# 3. Start local PostgreSQL (port 5548), Redis (port 6388), and Mailpit (ports 1028 / 8028)
npm run infra:up

# 4. Run database migrations
npm run db:migrate

# 5. Seed verified local developer & studio accounts + offline project credits
npm run dev:seed

# 6. Start the Next.js Turbopack development server on http://127.0.0.1:3000
npm run dev
```

Open **`http://127.0.0.1:3000`** in your browser (use `127.0.0.1` rather than `localhost` to match `BETTER_AUTH_URL` and `APP_URL` in `.env.local`).
- **Instant 3D Studio Sandbox (No Login / Docker Required)**: Open **`http://127.0.0.1:3000/demo`** to jump directly into the pre-furnished 3D Luxury Studio (`The Courtyard Residence`) and test all switchboards, sofa shapes, fabrics, brands, lighting moods, and Live Client Presentation Mode immediately.

---

## 6. Local Infrastructure & Seeded Accounts

### Local Service Ports (bound to `127.0.0.1` only)

| Service | Host Address / Port | Purpose |
| :--- | :--- | :--- |
| **Next.js App** | `http://127.0.0.1:3000` | Public landing page (`/`), Demo studio (`/demo`), Dashboard (`/dashboard`), Studio (`/studio/[id]`) |
| **PostgreSQL 18** | `127.0.0.1:5548` | Primary database (`forma`) & test database (`forma_test`) |
| **Redis 8** | `127.0.0.1:6388` | Optional rate-limit cache (PostgreSQL is the fallback) |
| **Mailpit Web UI** | `http://127.0.0.1:8028` | Local email inbox for verification & password-reset links |
| **Mailpit SMTP** | `127.0.0.1:1028` | Local SMTP capture (no emails leave your machine) |

### Seeded Local Accounts (`npm run dev:seed`)
Running `npm run dev:seed` creates three verified local accounts with audited offline development credits and writes their generated credentials to **`.local/development-accounts.json`** (gitignored):
- `admin@forma.local` (or your `SUPER_ADMIN_EMAIL`) — Super-Admin account
- `studio.one@forma.local` — Designer studio account 1
- `studio.two@forma.local` — Designer studio account 2

Open `.local/development-accounts.json` to copy the generated password for any of these accounts.

---

## 7. NPM Scripts Reference

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `next dev --turbopack --hostname 127.0.0.1 --port 3000` | Starts local development server with Turbopack |
| `npm run build` | `node scripts/copy-pdf-worker.mjs && next build --turbopack` | Copies PDF.js worker and builds production bundle |
| `npm run start` | `next start --hostname 127.0.0.1 --port 3000` | Starts compiled production server |
| `npm run typecheck` | `tsc --noEmit` | Runs full TypeScript static type verification |
| `npm test` | `vitest run --config vitest.config.ts` | Runs unit and backend integration test suites |
| `npm run infra:up` | `docker compose --env-file .env.local -f compose.local.yml -p forma-local up -d` | Starts PostgreSQL, Redis, and Mailpit containers |
| `npm run infra:stop` | `docker compose --env-file .env.local -f compose.local.yml -p forma-local stop` | Stops local Docker containers while preserving volumes |
| `npm run db:migrate` | `tsx --env-file=.env.local migrations/runner.ts` | Applies pending SQL migrations to PostgreSQL |
| `npm run dev:seed` | `tsx --env-file=.env.local scripts/seed-local.ts` | Seeds local developer accounts and offline credits |
| `npm run ops:worker` | `node --env-file=.env.local scripts/ops-worker.mjs` | Runs background payment reconciliation & health worker |
| `npm run launch:check` | `tsx scripts/check-launch.ts` | Validates production environment readiness |

---

## 8. Testing & Verification

```powershell
# TypeScript static analysis
npm run typecheck

# Run full test suite (requires local Docker PostgreSQL with forma_test database)
npm test

# Production build check
npm run build
```

> **Note on `forma_test` database**: If running backend integration tests for the first time on a fresh Docker volume, create the isolated test database once:
> ```powershell
> docker compose --env-file .env.local -f compose.local.yml -p forma-local exec postgres createdb -U forma forma_test
> ```

---

## 9. Security, Billing & Engineering Guardrails

- **Super-Admin Bootstrap**: The super-admin account is whichever address `SUPER_ADMIN_EMAIL` names. There is no built-in fallback, so set it in every environment.
- **Rate Limiting**: Auth endpoints are limited per account and per client address (`src/server/client-ip.ts`). The address is read only from `X-Real-IP`, which `deploy/Caddyfile` overwrites, and is stored as an HMAC. If another proxy such as Cloudflare is put in front of Caddy, pass the real visitor address through first. Counters use Redis when `REDIS_URL` is set and fall back to PostgreSQL, retrying Redis after 30 seconds.
- **Browser Security Headers**: A per-request CSP nonce (`src/proxy.ts`), `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy: same-origin`, and HSTS with `includeSubDomains` on HTTPS. Every subdomain of the production domain must therefore serve HTTPS.
- **Strict Schema Validation**: Every project load, import, and cloud save is validated by `validateProject()` (`src/model.ts`), enforcing polygon simplicity, opening bounds, valid hex colours, and catalog constraints (up to 30 rooms, 32 corners/room, 300 objects).
- **3D Bounding-Box Contract**: `fitFurnitureDimensions()` (`src/scene.ts`) guarantees that every procedural 3D mesh—across all 43 catalog kinds, 8 sofa shapes, and 7 switchboard modules—matches its exact `width × height × depth` in metres with `min.y === 0`.
- **Incremental Scene Sync**: `StudioScene.syncProject()` diffs item properties and only rebuilds 3D geometry when visual attributes change, keeping X/Z drag operations and idle frames fast.
- **Spatial Disclaimer**: Procedural 3D assets, AC airflow streams, electrical markers, and BOQ unit prices are spatial concept and presentation aids—always verify site dimensions, structural clearances, electrical loads, and vendor SKUs before procurement or construction.
