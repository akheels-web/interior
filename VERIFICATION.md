# Local verification · 29 October 2026

Verified source: E:\Github\Interior, Forma Studio 0.3.0. Next.js 16.4.3 / React 19.2 / Node 25.6.0. No publication or production service change was performed.

## Final checks

- TypeScript: passed.
- Vitest: **141 tests in 11 files passed**, including **24 real PostgreSQL integration tests** on the isolated loopback forma_test database.
- Next.js Turbopack production build: passed; account routes, studio route and both API handlers compiled.
- Strict premium UI static audit: zero findings (premium-audit.json).
- Runtime dependency audit: zero known advisories at verification time.
- Local configuration initializer: newline parsing and preservation of an existing secret file passed in a disposable temporary directory.

Integration coverage includes concurrent attempts against 10 monthly credits, extra-credit spending, idempotent creation, owner isolation, revision conflicts, editable expired projects, suspended accounts, signed/tampered/replayed payments, provider amount validation, monthly period ordering, refunds, fixture provenance, audited administration, Argon2id hashes and revoked sessions. Razorpay responses are synthetic: these are not live provider acceptance tests.

Rendering regressions exercise all 43 catalog asset geometries, units/polygon/opening rules, incremental furniture updates, moving fan/wind/particles, disabled/zero-speed devices, reduced-motion freezing, hidden-tab idling and zoom redraw. Cloud-save tests cover queued changes, Undo during an in-flight save and explicit conflict recovery. Navigation tests cover Back, Forward, multi-entry traversal and old history markers after remount.

## Browser checks

- Signed in as the approved local administrator and a separate designer. The designer saw its own project only and no Administration navigation.
- Created two private projects across the separate accounts; creation reduced each allowance from 10 to 9.
- Inspected ₹1,499/month and ₹299/2-credit billing. Unconfigured checkout was disabled and explicitly reported that no payment could be taken.
- Inspected device sessions. Real session revocation is additionally tested through Better Auth and PostgreSQL.
- Granted two local extra credits to Studio One with an explicit no-payment test reason; account details displayed the audit and the designer saw two extra credits.
- Chose a two-page PDF, switched pages, entered a room, confirmed replacement and reloaded the saved account project successfully.
- Edited sofa shape, cloth, hex colour, wall texture/hex colour, transforms and wall art. Added tube light and CFL; verified independent AC/fan off/on state.
- Exercised a real stale-revision conflict and explicitly kept the chosen current changes through the recovery dialog.
- Browser Back with a pending edit opened the leave/recovery dialog. After the final fresh-sentinel fix, editing a history-restored project removed its stale Forward entry and preserved the pending design.
- Checked desktop and 390-pixel mobile layouts. Fixed a mobile account-table accessible-label overflow; document width then matched its viewport. Mobile navigation uses a focus-managed dialog.

The review browser reports reduced motion, so its airflow preview is intentionally static. Moving uniforms, particles and fan rotation were verified in the actual renderer's frame regression tests with motion enabled. Browser proof: .local/studio-preview.png and .local/billing-desktop.png.

## Remaining launch work

No real Razorpay credentials, paid transaction or external email provider was supplied. Three authentication emails were captured only in local Mailpit. New real accounts receive no automatic paid entitlement. Offline review periods are explicitly marked and excluded in production.

Hosting/domain, SMTP, actual Razorpay test/live checkout/webhooks, tax/invoice policy, production backup/restore, monitoring and measured capacity remain deployment work; see LAUNCH.md. No zero-lag, photorealistic, CFD or engineering-approval claim is made. The previous private Sites v2 remains unchanged.

The owned preview process was stopped after verification. Local Docker services and persistent project data remain available; run npm run dev to reopen the app.
