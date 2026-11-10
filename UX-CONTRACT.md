# PlanSaathi interaction contract

## Business scope and authority

The owner approved a private multi-user PlanSaathi platform, account billing and the existing assisted plan-reconstruction workflow. The current task prepares it locally. It does not establish public deployment, live payment acceptance, production SMTP delivery or real-time co-editing. The previously hosted private static version remains separate.

| Business rule | Confirmed authority and implementation evidence |
| --- | --- |
| Verified accounts, owner-isolated projects, suspended-account enforcement | Owner's SaaS brief; `src/server/auth.ts`, `src/server/access.ts`, `src/server/projects.ts` |
| ₹1,499/month, 10 newly created projects per paid period; existing work remains editable | Owner's confirmed pricing; `src/server/projects.ts`, `src/server/billing.ts` |
| ₹299 for two extra credits; extras carry forward and monthly allowance is spent first | Owner's credit policy; `src/server/projects.ts`, `src/server/billing.ts` |
| No free allowance, client-clock renewal or admin quota bypass | Owner's entitlement rules; `src/server/projects.ts`, `src/server/development-fixtures.ts` |
| Paid periods require verified captured provider payments, not callback success/authenticated events | Owner's security requirements; `src/server/billing.ts` |
| Archive preserves documents and never refunds creation credits | Owner's lifecycle decision; `src/server/projects.ts` |
| Bootstrap admin is assigned server-side only after verified authentication | Owner-approved email and server configuration; `src/server/access.ts`, `src/server/README.md` |
| Reasoned audited admin actions and last-active-admin protection | Owner's administration scope; `src/server/admin.ts` |
| Assisted reconstruction, original-file handling and finite valid geometry | Owner's reconstruction approval; `src/PdfPlanner.tsx`, `src/planInput.ts`, `src/model.ts`, `src/planGeometry.ts` |

These runtime sources are evidence of confirmed business rules, not permission to broaden them. Visual intent and runtime token ownership are in `DESIGN.md`.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native selects in editor, importer and account forms | This contract | Platform-owned popup geometry | Keyboard/open-popup browser checks |
| Form | `NumberField`, `ColorSwatches`, measurement context in `src/ui.tsx`; `Field` and validation helpers in `src/platform/shared.tsx` | This contract, model bounds and server validation | Metre-backed editor fields; submit-based account forms | Typecheck, model/conversion tests and browser validation |
| Scrollbar | Global baseline in `src/styles.css` | `DESIGN.md` | Internal studio/importer panels; natural account-page scrolling | Strict static audit and browser |
| Toast | Editor live status; one platform-shell live status for account views | This contract | Success/info; actionable errors remain persistent in context | Browser actions/error recovery |
| CRUD | Platform project APIs; editor history, `validateProject` and `useCloudSave` | Server owner, quota and revision checks | Create/archive/restore, local undo, cloud save, validated file replacement | Tenant/concurrency, history/CAS and browser checks |
| Dialog | Shared native wrapper in `src/ui.tsx` | This contract | Confirmations, importer and mobile navigation | Escape, focus trap/restoration and narrow-screen checks |
| Direct manipulation | `StudioScene` and properties inspector | `src/scene.ts`, `src/model.ts` | Floor-plane drag or numeric positions | Browser drag/numeric alternatives |

## Routes and identity

`/login`, `/register`, `/forgot-password`, `/reset-password` and `/verify-email` share the auth owner. `/dashboard`, `/billing`, `/profile` and `/admin` share one platform shell. `/profile?tab=devices` remains a profile/security destination. `/studio/:id` loads an owned server project into the editor. Project/account collections have bounded pagination, search/clear, loading, request errors and empty/no-results states. Committed search/page state is reflected in the URL; responses from superseded queries cannot overwrite current results. Project thumbnails derive from actual document geometry. Empty accounts contain no fabricated projects.

Administration appears in navigation only for a returned super-admin role. Direct navigation never replaces API authorization. Every protected API independently checks the verified session, active account and appropriate owner/admin role. A foreign project lookup does not disclose another owner's record. Account/session/audit information comes from the server. Sign-out is explicit and preserves saved projects.

## Authentication and devices

Better Auth owns sign-up, sign-in, verification, reset, profile-name update, password change and sign-out. Registration accepts no role and seeds no paid customer entitlement. Verified email is required before protected access. New passwords are 15–128 characters, use server-side Argon2id, and are never stored in localStorage/sessionStorage. Forms allow paste and password managers, mask passwords by default and provide accessible reveal controls and current/new-password autocomplete. Reset/verification links belong only to their intended email flows; do not print their tokens into logs or screenshots.

Cookies are HttpOnly, SameSite Lax and secure in production. Sessions are database-backed and revocable, with cookie caching disabled. Origin checks, JSON requirements and server rate limits apply independently of controls. Suspension blocks protected APIs and new sessions. The configured bootstrap address is promoted only after verified server authentication, never from a client flag.

Forgot-password/verification-resend acknowledge account-existence states generically while surfacing actual transport/setup failures. Reset requires a valid token. Verification/reset mail needs SMTP configuration; local development can use loopback-only Mailpit. Email changes and account deletion are not offered as fake settings.

Authenticator setup requires the current password, saved recovery codes and a valid time-based code. A password-only session cannot access administration or reconfigure an enrolled factor. Successful factor verification records session assurance; password rotation preserves the original proof time, and factor changes invalidate earlier assurance. MFA changes refresh both account and device state. Secrets/recovery codes remain in component memory during setup, never browser storage or URLs.

Profile shows actual device/session labels and timestamps, marks the current device, and supports revoking one session or all other sessions. APIs return session IDs, never raw session tokens. Revocation takes effect immediately on the server. Password change revokes other sessions. Revoking this browser's current session returns it to sign-in.

## Entitlements, billing and payments

₹1,499 per monthly paid period includes 10 newly created projects. Creation atomically spends monthly allowance before purchased/admin-granted extras. Blank and furnished-template projects have the same cost. The same UUID Idempotency-Key and request body return the same project without another credit. Concurrent requests cannot overspend. Ordinary saves, replacing geometry within the current owned project, archive and restore do not create a row and spend no creation credit. Creating/importing a separate project follows creation quota.

Existing projects stay editable when credits run out or a paid period expires. Archive preserves the document and never refunds credits. Customer UI has no hard-delete action. A new project needs an active paid period even if stored extra credits remain. ₹299 buys two extra credits; unused purchased/admin-granted extras carry forward. Monthly credits reset only after a verified new paid billing cycle. Client time, subscription-authenticated events and client success callbacks cannot create paid periods or renew allowance.

PostgreSQL owns paid periods, creation usage, remaining extras, checkout intents and payment idempotency. Optional Redis caches rate counters, never entitlement/session authority. The UI displays returned status, allowance, prices and dates. New accounts have no free subscription or admin creation bypass. Explicit local offline fixtures are audited, labeled `offline_development_fixture` and excluded from production eligibility; they are not real payments.

When the server reports payment setup absent, checkout is disabled with an honest explanation. User-initiated configured checkout lazy-loads Razorpay, obtains a server-created subscription/order intent and opens the provider window. Failure/dismissal never increments local credits. Callback fields go to `/api/billing/verify`; only successful server verification is followed by a fresh account read. Unknown outcomes require checking current account state before another payment. The server checks signatures and reconciles captured INR amount, order/invoice, subscription and configured monthly plan. Duplicate/out-of-order events cannot grant twice or move periods backward. Reversed/refunded payments cannot create credits.

Signed webhooks commit a minimal durable inbox record before provider calls. A leased worker retries and reconciles recent missed deliveries through bounded provider polling. Checkouts are idempotent; ambiguous creation and older unpaid subscriptions remain blocked/reused until resolved. Pausing new live sales does not stop existing payment/refund reconciliation.

Cancellation is an explicit at-period-end request. It does not represent current paid access as ending immediately; existing projects and unused extras remain. Live credentials, provider approvals, production email delivery and real-provider test-mode verification remain separate setup until verified.

## Cloud persistence and recovery

Authenticated documents save to their owner's PostgreSQL project row. There is no shared localStorage autosave, automatic adoption of another customer's browser project, or client credential storage. Users may explicitly open an exported legacy JSON file in a chosen owned project; a separate new row still follows quota. File replacement is confirmed and validated first. The server fixes the saved document ID to its owned row ID.

`useCloudSave` debounces edits by 900ms, sends one PUT at a time and queues the latest subsequent edit. Saves send the last acknowledged revision. The server updates only an owned row with that revision, increments it and returns confirmation. “Saved to your account” follows acknowledgement. Interrupted, unauthorized, malformed or failed saves never report success. Saves spend no creation credits. Local history is bounded to 60 undo/redo states and is not server version history.

A 409 revision conflict pauses autosave. The UI offers downloading current JSON, loading the latest server document, or explicitly keeping current changes. Keeping current changes reads the latest revision and performs another compare-and-swap; a new race can still conflict. No silent last-writer-wins or collaborative lock is implied. Failed saves retain the in-memory model with retry/download recovery. Navigation/unload guards must preserve unconfirmed edits; closing a browser before acknowledgement is not durable offline storage.

The bounded `sourcePlan` raster reference is stored privately in R2 (local private filesystem for development); its owner/project-bound pointer, name, page and dimensions synchronize with the PostgreSQL geometry. Ordinary saves omit unchanged image bytes only when all reference metadata matches the same revision. Replacements and explicit conflict overwrite send the full local raster. Original PDF/image bytes exist only in the importer session and can be downloaded there. They are not uploaded as original files or separately kept in shared browser storage. Geometry can later differ from its reference. Portable JSON backups include the retained raster and full editable model.

## Operation and feedback ledger

| Operation | Pending | Success | Failure/recovery |
| --- | --- | --- | --- |
| Sign up/verify/reset | Submit disabled; masked password | Acknowledgement or navigation after the appropriate confirmed step | Associated field/global error; no fabricated session or enumeration |
| Search collections | Immediate input, 300ms committed debounce, IME suppression, stale-request cancellation | Actual returned records/count/page | Persistent error/retry; clear resets query/page and refocuses input |
| Create | One request and stable UUID key | Open actual studio, or refresh collection if its dialog closed | Preserve key/details after uncertainty; safe retry and quota/list refresh |
| Archive/restore | Explicit confirmation and disabled mutation | Refresh records; document preserved | Keep error context; never claim a credit refund |
| Edit/save | Model validates; CAS pending | Acknowledged revision | Retain model; download/retry or explicit conflict decision |
| Monthly/add-on payment | Server intent, provider window, verification | Refresh actual entitlement | Unavailable/cancel/error/unknown state; no optimistic credit grant |
| Password/device action | Disable duplicate submit; explicit security action | Refresh devices or require sign-in after current-session revocation | Preserve context and actual error |
| Admin action | Named account/action and required reason | Refresh account/audit after server acknowledgement | Preserve permission/last-admin errors; uncertain grant requires account/audit refresh before another attempt |

## Administration

Administration has a bounded directory, account details and bounded audit history. The server enforces admin access, protects the last active super-admin and offers no arbitrary role escalation. Suspend, restore, revoke sessions and grant credits need a 10–500-character reason. Grants accept 1–10,000 whole credits, are audited and do not fabricate paid periods. Suspension/revocation are server effects, not local labels. There is no account hard-delete action.

## Units and geometry

Stored dimensions are metres; length and area preferences persist independently. `NumberField` converts only length fields (`unit=m`), leaving degrees, percentages and counts unchanged. Length units are m/cm/mm/ft/in; areas are m²/cm²/sq ft/sq yd. A unit change never rescales geometry. Positions share x/z, height is y and rotation is degrees. Concave polygons are allowed but must stay simple/non-degenerate. Openings reference existing edges/normalized offsets, fit within the wall/below the ceiling, and clear other openings. Invalid numeric edits preserve the previous model and show correction guidance.

Furniture footprint/overlap signals are approximate guides, not proof of safe circulation or code compliance. Pointer movement snaps to 0.1m when enabled; numeric alternatives remain available. Dragging and numeric position edits share room-assignment logic. Selection/history keeps the editing context aligned with an object's room.

## Files and exports

Plan imports accept PDF, PNG, JPEG and WebP up to 25MB, with byte validation and a bounded local preview. PDF.js loads after PDF selection and uses a local worker; opening the picker does not wait for parsing. Raster inputs are capped at 24 megapixels / 12,000 pixels per side before decode. References reduce to 1600 pixels on the longest side. Closing the importer cancels pending work. Failed/cancelled imports preserve the project; no sample is substituted for unreadable input.

Designers choose a PDF page/image, calibrate a known length, and trace rectangles/polygons or enter numerical geometry. They review measurements and explicitly confirm replacement of current rooms/furnishings. Original bytes can be downloaded while available in the importer. Project JSON imports are limited to 10MB, validate before replacement and never execute embedded content.

Presentation export creates a real PDF with captured views, room plans, finishes and an object schedule. PNG exports the current view. Full JSON remains editable. PDF uses built-in Latin-compatible fonts/documented transliteration; model names remain Unicode. A client PDF is a presentation, not a construction drawing.

## Flexible plan and finish editing

Limits remain 30 rooms/zones, 32 corners per room and 300 objects. Trace simple concave polygons/rectangles, zoom/pan or enter dimensions/corners numerically. Crossing/collapsed geometry is rejected. Open boundaries omit a zone edge's wall; move/remove its doors/windows before opening that boundary. Shared collinear walls inherit intersecting cutouts with vertical/horizontal clipping; only the authored opening owns its frame and leaf. Adjacent spaces should use a common wall centreline. This is assisted reconstruction, not automatic wall detection or CAD/DWG interpretation.

Whole-home view frames the layout. Room/object selection establishes editing context. Full walls are the default and retain model height. Foreground transparency is an explicit option. Full walls / Cutaway modes are visible controls; optional whole-home cutaway clips walls/leaves at 1.05m and room-focused views preserve full heights. Disable Cutaway or use Walk for full-height concepts. View settings do not alter stored geometry.

The 43-asset catalog includes wall art, tube lights and CFL bulbs. Sofas support three-/two-seater and left/right chaise shapes; cloth supports plain/woven/bouclé/ribbed. Walls support paint/limewash/brick/concrete/wood panel, alongside 11 floors and 16 wall-color presets. Material, texture, shape, dimensions and color remain independent properties. Shared color controls accept native selection and validated typed `#RRGGBB`, with luminance-aware selection marks. Invalid colors preserve the model.

## Accessibility and layout

Target WCAG 2.2 AA for surrounding controls; browser evidence is required before claiming conformance. Forms use `noValidate`, visible associated labels, field/global errors, disabled/busy submit and first-error focus. Password managers/paste work. Native selects intentionally retain platform popup behavior. Shared native dialogs own focus, Escape and restoration, including mobile account navigation. Primary/device-power controls use approximately 40–45px targets. Icon actions have accessible names/focus; search clears immediately. No browser alert/confirm/prompt UI is used.

Account pages scroll naturally. Tables have explicit horizontal overflow and bounded pagination. Studio panels, drawers and importer have their own scroll owners. At 390px, every route, file action and non-drag editing alternative remains available. WebGL has a descriptive accessible label; semantic fields can edit every object property. Auto follows reduced-motion preferences; explicit Play opts into the fan/wind preview, Pause freezes both, and hidden-tab handling limits animation; forced-colors retains focus/scrollbars. Static audit success does not prove runtime accessibility.

## Simulation and performance limits

Airflow is illustrative, not CFD, temperature prediction or HVAC sizing. Electrical relationships are concept placement, not engineered circuits, certified loads or wiring approval. Fans/ACs have per-device power/speed, and AC direction/range; overlay visibility is separate. Doors have hinge/style/opening control. Lights affect rendering, not computed lux. Procedural assets are not manufacturer models or photorealistic promises.

The renderer incrementally updates changed data and reuses unchanged geometry/textures, caps pixel ratio/shadow resources and uses time-based animation. Reduced-motion and invisible-tab behavior are part of the contract. The wind/fan transport remains visible even when the wind overlay is hidden, reports actual motion status, and supports Auto/Play/Pause. Play reveals the airflow overlay; power remains an independent per-device state. No “zero lag” or production-throughput guarantee follows from local tests.

## Verification ownership

`premium-ui.json` declares the register, canonical map and required typecheck/unit/build commands. The strict static audit checks source/contracts but does not run the app. Model, plan-input, shared-wall, units, renderer-update, editor-route and cloud-save tests cover their named contracts. Isolated PostgreSQL tests cover ownership, revocation, quota concurrency, period/payment rules and provider tampering. Browser journeys must exercise local verification/reset, separate accounts, admin actions, save conflicts, billing-unavailable/recovery states, imports/exports and narrow layouts. Synthetic payment fixtures do not establish real Razorpay charging or live-provider reconciliation.

## Authorized visual refinement

The current account shell and studio use graphite #17262d, porcelain #f6f7f5, slate #596b73, teal #397c83 actions and restrained brass #ad8b55 details. The replaced platform/editor CSS recipes preserve the existing account, credit, checkout, validation and recovery owners. Main forms/actions use approximately 44px targets with 14px body and readable utility text. Mobile retains navigation in the shared native dialog and editor tools in explicit drawers.

Project blueprint covers use only the returned first-room polygon, its stored-metre bounding extents and actual document revision. They must not invent rooms, furniture, customer photography or account metrics. A missing outline has an honest fallback. Search, project links, creation idempotency, archive/restore and server-backed allowance remain functional alongside the visual changes.