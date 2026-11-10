# Wind, walls and portal refinement · 30 October 2026

The owner's correction concerned the local Next.js app: static-looking wind, partial walls and an ordinary-looking portal.

## Delivered

- Replaced fixed-looking wind tubes with staggered traveling streaks, moving highlights and GPU mist particles. Fan downwash curves spiral down and expand near the floor. Split, tower and cassette AC outlets keep their respective directions.
- Added always-available Play wind / Pause wind / Auto transport. Auto honors reduced motion; explicit Play opts into the preview and enables the wind overlay. Pause freezes wind and fan rotation without a wall-clock jump on resume. Only device/view preferences are remembered locally; no plans, identities or credentials are added to device preference storage.
- Full-height solid walls are the default. Full walls / Cutaway are explicit modes. Optional foreground transparency preserves complete geometry and outlines; it does not shorten walls. Door/window openings remain real geometry. Whole-home clipping occurs only in explicitly selected Cutaway.
- Rebuilt portal/editor recipes with graphite navigation/header, porcelain surfaces, teal actions, brass architectural details, clearer hierarchy, larger controls and actual geometry-derived blueprint project covers.
- Corrected reviewed text contrast and utility sizes. Main Export and motion actions retain 44px minimum targets at mobile breakpoints.

## Verification

- Full suite: 163 tests in 14 files passed, including the existing 24 real PostgreSQL integration tests.
- Final Next.js 16.4.3 Turbopack production build and its TypeScript check passed.
- Strict premium UI audit: zero findings (premium-audit.json).
- Independent renderer review/regressions covered all four air-device kinds, finite GPU attributes, direction/range/speed, explicit reduced-motion override, pause/resume clock, hidden wind overlay, full-height wall visibility, opacity/glass/shadow restoration and clipping removal.
- Independent visual source review found contrast/target/type issues; those were corrected and rechecked. The separate calibration detected a deliberately reduced button font in an isolated CSS copy; this proved only that single-file style difference, not browser layout.
- Actual browser rendering compiled both shaders and advanced motion while reducedMotion=true after explicit Play. A recording was assembled from real browser frames; no generated rendering substitutes for the running product.
- Desktop and 390px mobile portal/editor were checked. Portal document/viewport widths matched (380px content viewport); editor widths matched at 390px. Mobile Export PDF and wind controls measured 44px high.
- Full walls was selected with foreground transparency off in the final local view. Preview remains available for the owner's review.

Proof files are private local artifacts: .local/wind-motion.gif, .local/portal-refined.png and .local/full-walls-refined.png. Earlier VERIFICATION.md records the initial SaaS checks. This refinement changes no billing prices, permissions or deployment. No live payment or public publication occurred.
