# PlanSaathi identity and landing refresh

30 October 2026. Implemented locally in `E:\Github\Interior` following the owner's rejection of the previous colors, typography, logo and landing.

## Direction and references

The new identity uses cobalt, clear white, ink and a pale blue working surface. Geist Variable provides body/controls; Space Grotesk Variable provides display type. Both are self-hosted. The custom mark combines two equal open room corners on a 48-unit grid; the lowercase wordmark is optically spaced Geist 650 converted into SVG outlines. Colored, monochrome and reversed assets share the same paths and proportions. No viewer-installed font is needed for the exported logos.

Public research viewed:
- [RoomSketch / Phenomenon Studio on Dribbble](https://dribbble.com/shots/26523370-RoomSketch-Interior-Design-SaaS-Web-App): a large spatial subject with restrained software controls.
- [Rayon](https://www.rayon.design/): concise product hierarchy and prominent software demonstration. Its product claims were not copied.
- [Pinterest interior-design branding pin](https://in.pinterest.com/pin/interior-design-logo--512988213805465990/): public preview only; a login prompt limited inspection. No account login, saved pin or claim of a comprehensive Pinterest survey.

Mobbin reference search required a paid plan and supplied no reference images. These references informed composition and clarity; their artwork/logos were not used in the project.

## Changes

- Rebuilt landing composition, navigation, workflow illustrations, pricing, FAQs and final account CTA. Existing prices, assisted-import limitations and indexing gates are preserved.
- Replaced the cube/F-style identities with one shared vector system, including the editor's legacy wordmark, favicon and social card. The editor's focus-workspace link keeps its original behavior.
- Changed shared fonts and primary/focus/accent aliases across account/editor surfaces. Existing working layouts, private data, saves, forms and billing behavior remain as before.
- Added an actual product-rendered room example with Plan/3D and sofa-color controls. The first load is a small static capture of the real renderer; Three.js loads only on an explicit demo action. Close/offscreen/unmount releases the scene. Loading has a bounded deadline and recoverable fallback. Demo actions do not create/save projects or consume credits.
- Added a reproducible SVG generator and maintained the design contract/token mapping. Runtime palette is `src/brand/brand.css`; generated palette.ts is the social-image adapter.

## Verification

- TypeScript passed; 187 tests passed across 20 files.
- Strict premium static audit: zero findings. DESIGN.md linter: zero errors, eight advisory orphan-token warnings because it does not infer the documented runtime CSS alias mapping.
- All generated SVG files parse as XML, including a Windows UTF-8 export fix for the identity sheet.
- Browser: actual local fonts and all images load; no initial WebGL canvas; sofa changes render; Plan/3D state changes work; close returns to the poster with no canvas; keyboard Enter opens the FAQ; account CTA reaches registration.
- Phone 390px and narrow tablet 521/560px checked without horizontal overflow after fixes. Example controls retain 44px targets. Reversed logo treatment covers dark mobile navigation.
- Independent source/visual review found and closed dark-mobile-logo visibility, tablet pricing overflow and a hidden-line-break word separator. Reviewer inspected desktop/mobile, real-room poster, logo and registration screenshots. Calibration found a deliberately incorrect price in an isolated scratch copy; that check proves static pricing comparison, not runtime behavior.
- Final production image build passed on 31 October 2026. Isolated read-only, non-root container smoke verification passed: all public brand assets match source bytes, the social card renders as a 1200x630 PNG, landing/login and nonce CSP work, anonymous account/operations access is denied, PDF worker is served, staging indexing stays disabled, and missing production configuration fails closed. Local evidence: `.local/release-smoke-report.json`. External hosting/provider acceptance gates in the production plan still apply. The previous container vulnerability scan is a separate dated artifact and is not replaced by a visual-review claim.

## Assets and maintenance

`public/brand/` contains `plansaathi-mark.svg`, `plansaathi-lockup.svg`, monochrome/reversed variants, `plansaathi-identity.svg` and the real `concept-preview.png`. `src/app/icon.svg` is the favicon. Logo geometry is `src/brand/BrandMark.tsx`; shared rendering is `src/brand/Brand.tsx`.

Regenerate portable assets after changing their source:

```powershell
python -m pip install --target .local/brand-tools fonttools==4.68.0 brotli==1.2.1
python scripts/generate_brand.py
```

Node dependencies must be installed first. Keep mark proportions, one-stroke external clear space and the outlined wordmark. Keep brand and room-material colors separate. The SVG generator validates its output; do not hand-edit generated palette/lockup variants independently.
