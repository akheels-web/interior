---
version: alpha
name: PlanSaathi
description: A private spatial design workspace for interior designers.
colors:
  primary: "#3c49eb"
  background: "#f7f8fc"
  foreground: "#171a2b"
  muted: "#62677b"
  border: "#e4e7f0"
  canvas: "#edf0eb"
  accent: "#3c49eb"
  surface: "#ffffff"
  graphite: "#171a2b"
  platform-background: "#f7f8fc"
  editor-background: "#eef2f2"
typography:
  sans:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: "1.65"
  display:
    fontFamily: "Space Grotesk Variable, Geist Variable, sans-serif"
  mono:
    fontFamily: "ui-monospace, monospace"
rounded:
  DEFAULT: "7px"
  sm: "0.25rem"
  lg: "0.75rem"
spacing:
  base: "0.25rem"
  panel: "1rem"
  control: "2.5rem"
components:
  button:
    rounded: "7px"
  dialog:
    rounded: "0.75rem"
  input:
    rounded: "7px"
---

# PlanSaathi design system

## Overview

The owner rejected the previous teal/brass identity, isometric cube logo and old typography on 30 October 2026. The approved scope is a new modern visual identity and landing, with shared brand, type and primary accents carried into the application. Cobalt on clear white gives the design software a crisp, confident character; real editable space is the subject. The signature is a paired open-room-corner symbol and a lowercase outlined wordmark, followed by an actual product-rendered room.

Audience: interior designers and small practices in India. English UI, INR billing, metric/imperial display units and metre-based stored geometry. Brand/marketing register for the public landing; product register for authenticated working screens. The landing can use large display type and generous spacing. Working controls keep their existing readable density, geometry, state and security behavior. No Japan-market scope is inferred.

Business and interaction authority remains the owner's confirmed product/subscription scope, `UX-CONTRACT.md` and the server contracts. No invented trial, customer logos, testimonial, account activity, photorealistic output, real-time collaboration or automatic plan interpretation. Live sales/indexing and production setup remain gated as described in the production plan.

## Colors

Canonical runtime palette: `src/brand/brand.css`. Cobalt primary #3c49eb; pressed/hover #2935cb; ink #171a2b; muted #62677b; ground #f7f8fc; tint #eef0ff; border #e4e7f0; white surfaces. Cobalt has readable white action text and is the shared focus/action color. Color never replaces status text. Graphite/navy remains appropriate for a working sidebar/header, with a white logo variant. Customer room materials and canvas lighting are separate from the product brand.

| Role | Runtime ownership | Consumers |
| --- | --- | --- |
| Brand palette | `--brand-*` in `src/brand/brand.css` | Marketing stylesheet; aliases in platform/editor CSS |
| Product primary/type/surface aliases | `--pf-forest`, `--pf-ink`, `--pf-ground`, etc. in `src/platform/platform.css`; corresponding editor variables in `src/PremiumStudio.css` | Existing account/editor controls without behavior changes |
| Logo paths | `BRAND_PATHS` in `src/brand/BrandMark.tsx` | Generator, favicon, social image |
| Shared logo | `src/brand/Brand.tsx`; compatibility re-export from platform/shared | Landing, auth, platform; editor retains its focus-workspace link and uses the reversed asset |
| Portable SVG assets and generated palette adapter | `scripts/generate_brand.py` reads paths/CSS and the locked Geist font; writes `public/brand/*.svg`, icon.svg and `src/brand/palette.ts` | Font-independent outlined wordmarks; social metadata image |
| Typography | Local Latin variable WOFF2 files declared in brand.css | Geist Variable body/controls; Space Grotesk Variable display |
| 4px spacing base, 7px product controls/12px dialogs | Existing shared styles and controls | Product forms, dialogs, panels |
| Working canvas #edf0eb | `StudioScene` in `src/scene.ts` | Saved-project editor; marketing demo explicitly uses #eef0f8 background |

This is maintained runtime-source ownership (Model B), not CSS generated from frontmatter. The generated TypeScript social-image palette is an adapter, not a second editable palette. Regenerate brand assets when changing their source. Legacy hue names such as forest/brass remain compatibility aliases; they now resolve to the cobalt identity. Concrete room colors are preserved.

## Typography

Locally hosted Geist Variable body/controls and a Geist 650 outlined wordmark. Space Grotesk Variable provides the geometric display voice. Marketing H1 uses a responsive 40–90px range with deliberate tight tracking; working typography preserves the 14px body/12px utility baseline. Native font weights/ranges avoid artificial bolding. Numeric controls use tabular figures. Exported wordmarks are paths, not text requiring the viewer to install fonts. PDF text continues its documented compatible-font/transliteration behavior.

## Layout

Public page (owner direction, 11 November 2026: a premium, interactive, animated landing with a premium display font): dark gallery-stage palette (ink #090a12, bone #f3efe7, cobalt accents) with Fraunces Variable as the display serif, also used for platform headings; the editor keeps its working type. Smooth scrolling (Lenis), a pointer follower, magnetic calls to action and a pinned horizontal material gallery are progressive enhancements that switch off for reduced motion and touch. The page opens on a full-viewport scroll film rendered live by the studio engine (`src/marketing/LiveFilm.tsx`), a dark catalogue band, a material board painted from the engine's own floor and wall textures, one flat cobalt pricing region, native FAQ disclosures and clear account destinations. A poster captured from the same renderer holds the stage until Three.js has loaded after first paint. Reduced-motion visitors and devices without WebGL get the poster hero and the chapters as static text. The film pauses offscreen and its changes never create/save projects or consume credits.

Authenticated screens retain their working shell, actual project data, validation, permissions and save/conflict behavior. New type and primary accents do not invent new workflows. The editor remains a spatial workbench with room/catalog properties and its largest continuous canvas.

## Elevation & Depth

The actual spatial model supplies depth. Use fine borders and restrained shadows around the example viewport and floating controls. No decorative stacked cards, fake activity or unsupported photorealistic outcome. The first-load poster is captured from the real renderer, not synthetic imagery.

## Shapes

The logo consists of two equal-thickness open room corners turned 180 degrees, balanced on a 48-unit grid. Keep at least one stroke-width of external clear space; maintain monochrome and reversed versions. Do not add gradients, roof/cube details or distort proportions. Small favicon uses a cobalt tile and reversed symbol; standalone mark remains usable at 16–40px. Product control/dialog radii stay as recorded above; public layouts can use a restrained viewport radius.

## Components

Reuse shared app primitives, their focus/validation/state contracts and native link/button semantics. Marketing uses native anchors and details/summary; demo buttons expose pressed/disabled states and accessible names. Every primary action remains at least 44px, including mobile. Readable utility labels use a 12px floor. Keyboard focus is visible, reduced motion is honored, and demo motion stays paused unless explicitly operated. No account, billing or permission state is inferred from appearance.

## Do's and Don'ts

Do show editable concepts honestly. Do preserve private project/source-plan handling, subscription limits, session security and pending launch gates. Do reuse the same logo assets/type/accent roles across public and authenticated surfaces. Do not claim that a PDF automatically becomes a complete model, that the concept is photorealistic/engineering approved, or that this local redesign is a public deployment.


## Designer workspace extensions

Length selectors support metres, centimetres, millimetres, feet and inches. Area selectors independently support square metres, square centimetres, square feet and square yards. Unit changes never rescale the design. Shared NumberField owns conversion at its boundary; model and renderer store metres. Whole-home framing and open boundary edges support room suites and open-plan zones. Door leaves and swing arcs show main, interior, glass, sliding and open-passage options.

The 43-object catalog uses procedural geometry and matching thumbnails, including wall art, tube lights and CFL bulbs. Systems lists provide text-labeled Power on/off buttons and explicit current state, separate from airflow visibility. Per-device air/fan speed, direction and illustrative range own operation. Eleven floor finishes and sixteen wall swatches retain arbitrary custom colors. `ColorSwatches` accepts a native picker and validated typed `#RRGGBB` value with inline errors; the selected check adapts to swatch luminance.

`FinishControls.tsx` owns sofa shapes (three-seater, two-seater, left/right chaise), cloth textures (plain, woven, bouclé, ribbed), wall textures (paint, limewash, brick, concrete, wood panel), and supplementary thumbnails. Dimensions, material, color and texture remain separate model properties. A shape change does not silently rescale a designer's dimensions.

Full-height walls are the default; foreground transparency is an explicit view option that preserves height. Full walls / Cutaway are visible modes, rather than an unexplained shortened model. Optional whole-home cutaway clips walls and door leaves at 1.05m; room-focused views preserve full heights. Disable Cutaway or use Walk for full-height concepts. This view setting does not alter stored geometry.

## Account workspace

Projects are owner-isolated; geometry and owned asset pointers are stored in PostgreSQL and raster previews in private R2. Never invent account activity, free entitlements or shared presence. A furnished template is an explicit new-project choice and uses a credit like a blank project. ₹1,499 per monthly paid period includes 10 new projects; ₹299 buys two extra creation credits. Existing projects stay editable when credits are exhausted. The full credit/payment behavior and sources belong to `UX-CONTRACT.md`, not to visual recipes.

Verified authentication, optional authenticator protection for customers, mandatory session MFA for administrators, and revocable server sessions protect account access. Credentials do not belong in browser storage, source, logs or decorative examples. Reset/verification URLs are limited to their intended auth flow. Password fields support paste, password managers and accessible reveal. Admin navigation is role-aware while APIs independently authorize every protected request. Appearance never grants permission.


## Bespoke Business Customization, Material Board & Client Presentation

- **Granular Furniture & Seating Configurator**:
  - **Sofa Shapes (`SOFA_SHAPES`)**: `three-seater`, `two-seater`, `four-seater`, `l-left`, `l-right`, `u-shape`, `curved`, `island` (360° hotel lounge island).
  - **Cloth & Upholstery Weaves (`FABRIC_STYLES`)**: `plain`, `woven`, `boucle`, `ribbed`, `tufted`, `suede`, `cane`.
  - **Silhouettes & Bases**: 5 arm/backrest silhouettes (`track`, `rolled`, `pillow`, `tuxedo`, `fluted`), 5 leg/base styles (`tapered-wood`, `brass-stiletto`, `matte-black-sled`, `plinth`, `floating`), adjustable seat cushion divisions (`1`–`6`), and throw-cushion/trim `accentColor`.
- **Modular Switchboard & Electrical Configurator (`SwitchControls`)**:
  - **Curated Electrical Brands**: Legrand (`Myrius NextGen`, `Arteor`, `Lyncus`, `Allzy`), Schneider Electric (`AvatarOn`, `Zencelo`, `Unica Pure`), Havells (`Crabtree Signia`, `Murano Glass`), Panasonic Anchor (`Roma Classic`, `Vision Glass`), Lauritz Knudsen (`Englaze`, `Entice`), Goldmedal (`Curve`, `i-Touch`), GM Modular, Norisys, or custom vendor/SKU.
  - **Modular Gang Sizes (`SWITCH_GANGS`)**: `1M`, `2M`, `4M`, `6M`, `8M`, `12M` (dual-row), and `touch` (capacitive smart glass panel with LED rings).
  - **Cover Plate Finishes (`SWITCH_PLATES`)**: `matte`, `glass`, `metal`, `wood-veneer`, `frameless`, plus `SWITCH_COLORS` faceplate swatches and `ACCENT_COLORS` rocker/bezel trim.
- **Universal Catalog Customization (`BrandAndSpecControls`)**:
  - Every catalog category (Seating, Tables, Storage, Lighting, Systems, Kitchen, Appliances, Bathroom, Decor, Electronics) supports curated Brand & Series presets, custom Brand/Model inputs, category-specific geometry (`topShape`, `frontStyle`, `lightTemp`), secondary/hardware `accentColor`, unit price in `₹ INR`, and designer specification notes.
- **Room Architectural Finishes**:
  - 8 wall textures (`paint`, `limewash`, `brick`, `concrete`, `wood-panel`, `wainscoting`, `marble-cladding`, `wallpaper`), wall paint brand (`wallBrand`), feature/accent wall (`accentWallEdge` + `accentWallColor`), and 3D ceiling architecture (`flat`, `cove` with perimeter warm LED glow, `coffered`, `rafters`).
- **Interactive Client Presentation HUD & BOQ Export**:
  - Lighting mood presets (`studio`, `golden`, `evening`, `gallery`).
  - Clicking any object in Presentation Mode opens a floating **Live Client Specification Card** with real-time brand, shape, module, fabric, and colour toggles.
  - **Material Board & BOQ Schedule Modal** and **Client PDF Export** summarize room finishes, itemized brand/series specs, and total project cost in `₹ INR`.
