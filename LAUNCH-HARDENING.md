# PlanSaathi 0.4 — local release evidence

Checked 30 October 2026. Project: `E:\Github\Interior`. This is a completed local hardening pass, not a public launch, external penetration test or guarantee of zero vulnerabilities/lag.

## Implemented

- Accounts: verified email/password, Argon2id hashes, 15–128 character new passwords, HttpOnly database sessions, session/device revocation and password-reset session invalidation. Authentication requests, email sends and expensive password work are bounded.
- Administration: authenticator TOTP and single-use recovery codes, encrypted factor data, explicit session MFA assurance. Enabling MFA on one device does not upgrade older sessions; concurrent factor/password rotation cannot refresh stale assurance. Administration requires an assured session even for the approved owner role.
- Customer isolation: every project/preview read, update, archive and upload checks the owner. Revision conflicts preserve the saved version and the local draft. An account cannot select another customer's object key or use a foreign preview reference.
- Storage: private R2 adapter with server-generated keys; validated/re-encoded raster references, metadata removal, pixel/concurrency/upload/storage budgets, deduplication and conservative orphan cleanup. Original PDF bytes stay in the importer. Unchanged preview bytes are omitted from autosave; a replacement or explicit conflict overwrite sends the full reference.
- Billing: confirmed ₹1,499/10 monthly creations and ₹299/2 carrying-forward extras; transactional consumption, idempotent checkout/credit reconciliation, durable signed webhook inbox, leased retries and recent-payment polling. Authorization alone grants no credits. Unknown provider creation results block duplicate subscriptions. Pausing new sales preserves reconciliation/cancellation of existing payments.
- Public site: approved PlanSaathi identity, server-rendered landing/pricing/FAQ, configurable canonical/OG/sitemap/robots, and noindex private routes. Public indexing remains disabled until the real domain and policies exist.
- Operations: non-root, read-only app; pinned vendor images; private database network; bounded pools/timeouts, worker/readiness, encrypted backup tools, restore procedure, CI and weekly dependency-update configuration. Redis is optional for the initial single-server deployment.

## Verification

| Check | Result and scope |
| --- | --- |
| TypeScript | Passed `npm run typecheck`. |
| Automated tests | 187 passed across 20 files, including 39 real PostgreSQL integration tests. Repeated against a brand-new isolated `forma_test` database on the final patched PostgreSQL image. Added a guarded bootstrap that migrates before test workers initialize auth, matching production startup. Synthetic provider responses; no charges. |
| npm advisory audit | 0 known vulnerabilities in the current lockfile, including development dependencies (342 total dependency entries reported). Snapshot, not an absence-of-vulnerabilities claim. |
| Linux release build | Patched Node 24 Alpine production Docker build passed; checks that Next API runtime, PostgreSQL, Argon2, Sharp and AWS SDK packages load and that native Argon2 hashing/verification works. |
| Production runtime smoke | Passed non-root/read-only runtime, SSR landing, strict nonce CSP without unsafe-eval, no-store HTML, login page, anonymous account denial, operations-token denial, authenticated maintenance/readiness, minimal public health, PDF worker delivery, staging robots and fail-closed missing configuration. Uses the isolated local database and clearly synthetic provider settings; no external SMTP/R2/Razorpay verification. |
| Fresh database migration | Migration image applied all eight application migrations and auth schema to a newly created disposable database; key tables verified. Repeated with the final Alpine migration image against the patched PostgreSQL container. Disposable databases/containers removed. |
| Proxy/Compose | Production Compose structure and Caddy configuration validate. Read-only proxy runtime passed actual reverse-proxy routing, public operations-route denial, client-IP overwrite and 10MiB body-limit enforcement. No public DNS/TLS or server deployment tested. |
| Backup/restore drill | Real PostgreSQL custom dump → AES-256-GCM encryption → authenticated decryption → isolated restore → sentinel row verified. 49,641 dump bytes / 49,675 encrypted bytes. Wrong-key/tampering/overwrite checks are covered by automated tests. No cloud upload occurred. |
| Browser | Landing and narrow-phone layout; associated form errors/focus; sign-out/login; foreign-owner project denial; administrator authenticator gate. At 390px viewport, document width 380px with no horizontal overflow. Owner credentials/factor were not changed. |
| Independent review | Reviewed authentication/MFA, billing and UI against the launch checklist. Findings were repaired and regression-tested, including stale assurance, subscription duplication and preview-reference comparison. External providers and selected-host capacity were not evaluated. |
| Container advisory scan | Final exact images scanned with Grype 0.121.0 / database built 30 October: app 0 critical, 0 high, 3 medium; database 0 critical, 0 high, 3 medium; proxy 0 critical, 1 high, 6 medium, 2 unknown. No fixable medium/high/critical matches. The remaining high is an unfixed upstream JOSE v3 issue; see `SECURITY-REGISTER.md`. Docker Scout required a sign-in; Grype received only image archives/public references, never a Docker socket or credentials. |

The runtime smoke caught an error that a successful compile missed: standalone tracing omitted the Next API runtime and executable files from a transitive PostgreSQL package. The release now includes complete production dependencies, explicitly traces the API runtime, and has a build-time import guard. CI also builds the Docker app image. Do not replace runtime checks with compile-only evidence.

Local non-secret aggregate reports are in ignored `.local/release-smoke-report.json`, `.local/migration-drill-report.json`, `.local/container-drill-report.json`, `.local/patched-db-tests-report.json`, `.local/security-scan-summary.json` and `.local/restore-drill-report.json`. Browser proofs are in the Codex visualization workspace. Private environments, fixtures, uploaded plans, image archives and scanner caches are excluded from Git and Docker build contexts. Temporary scanner archives/caches were removed after verification.

## Still required before launch

1. Purchase the chosen PlanSaathi.com domain and select hosting after reviewing the actual INR total. No domain/server was purchased. Follow the ₹1,000–₹2,000/month plan in `PRODUCTION-PLAN.md`; build off-server.
2. Choose the merchant/trading name and public support email, as the owner deferred. Publish reviewed contact, terms, privacy/retention, refund/cancellation and applicable tax/invoice details. Current confirmed charges must not silently gain an extra tax amount.
3. Configure a verified SMTP sending domain; prove verification/reset inbox delivery and account recovery. The owner must enroll their authenticator and keep recovery codes independently.
4. Configure separate private R2 application/backup buckets and bucket-scoped credentials; confirm privacy, real ownership access, storage alerts, seven-day backup retention and a cloud-backed restore. Account-wide free-tier usage is not a hard spending cap.
5. Run the Razorpay test-mode acceptance matrix in `OPERATIONS.md`: initial paid invoice/renewal, failed payment, closed browser, duplicate/out-of-order events, ambiguous timeout, add-on replay, refunds, cancellation and re-subscription. Activate the merchant/live plan/webhook only after those results and policies are reviewed.
6. Patch/protect the selected VPS, configure HTTPS and external uptime/backup alerts, then test ten representative concurrent accounts and realistic imports/30-room/300-object projects on target laptops. This local pass does not establish production capacity or guarantee smooth rendering on every device.
7. Resolve or formally review the open upstream proxy dependency finding and remaining medium/unknown matches in `SECURITY-REGISTER.md`. No risk acceptance is recorded and a clean-image claim is not justified.

Keep live-payment/policy approval and indexing switches disabled until their gates pass. See `PRODUCTION-PLAN.md` for decisions and budget, `OPERATIONS.md` for deployment/recovery, and `LAUNCH.md` for the checklist. The historical static Sites preview is unchanged and cannot host this database-backed release as-is.

## Container scan completion note

The initial app and proxy images contained critical and fixable high findings despite the clean npm audit. Applied available distribution fixes, removed unused runtime package managers, rebuilt standard Caddy with patched Go/network/JOSE v4 and tested native Alpine app dependencies. The final app/database images have no high/critical matches; the proxy retains one unfixed high finding. CI now builds all three runtime images and rejects fixable medium/high/critical advisories, with weekly/manual runs prepared. Unfixed/medium/unknown results still require explicit release review. The GitHub-hosted workflow itself has not run because no repository was published.
