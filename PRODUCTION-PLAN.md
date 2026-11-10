# PlanSaathi production plan

Owner decisions: ₹1,000–₹2,000/month infrastructure budget, excluding domain and payment fees. Brand/domain choice: PlanSaathi.com. Prepare locally first; choose hosting before launch. The merchant/trading name and public support email are not chosen and must remain production tasks, as requested on 30 October 2026.

## Goals and acceptance gates

| Goal | Local implementation | Before public launch |
| --- | --- | --- |
| Safe accounts | Verified email/password, Argon2id, 15-character new-password minimum, revocable database sessions, bounded auth requests, email/CPU budgets | Verified sending domain; real verification/reset delivery and recovery drill |
| Protected administration | Authenticator and single-use recovery codes; explicit session MFA assurance; pre-enrollment and concurrent-rotation regressions | Owner enrolls their authenticator and securely keeps recovery codes; confirm lost-device procedure |
| Customer isolation | Owner checks for every project, save, archive and stored preview; optimistic revisions | Two-customer staging smoke test with real R2 credentials |
| Reliable billing | ₹1,499/10 projects, ₹299/2 extras carrying forward; transactional credits, idempotent checkouts, durable signed inbox, leased retries, recent-payment polling | Razorpay test-mode acceptance matrix, merchant activation, production plan/webhook, real cancellation/refund behavior |
| Private plan storage | Private S3/R2 adapter, byte/pixel/concurrency budgets, opaque server keys, deduplication, safe cleanup, lightweight unchanged-image autosaves | Verify both buckets are private; bucket-scoped tokens; set account billing alerts and backup lifecycle |
| Public acquisition | Server-rendered PlanSaathi landing, honest assisted workflow/pricing, configurable canonical/OG/sitemap/robots, private routes noindex | Purchase domain, configure HTTPS, publish merchant/policy/contact pages, enable indexing |
| Operable deployment | Pinned Node 24/PostgreSQL/Caddy images, non-root app, private DB network, worker, health/status, encrypted backup tools and restore drill | Selected-VPS load test, production backup restore, uptime alerts, patch and incident ownership |
| Image security | Patched Alpine runtime images; standard Caddy rebuilt with patched Go/modules; no critical or fixable high scan matches | Review/resolve the remaining unfixed proxy JOSE v3 high finding and medium/unknown results in `SECURITY-REGISTER.md` |

Completed checks and their limits belong in `LAUNCH-HARDENING.md`. Neither passing tests nor a dependency scan proves absence of every vulnerability, uninterrupted provider availability or unlimited rendering performance.

## Budget recommendation

Start with one small VPS; colocate Next.js, PostgreSQL, Caddy and one lightweight worker. Leave Redis optional until measurements justify its extra memory and maintenance. Three.js rendering runs on the customer's device. Build images on a development machine/CI rather than on a 2 GB server.

DigitalOcean lists a regular 2 GiB / 1 vCPU / 50 GiB SSD VM at **US$12/month**, before taxes, foreign-exchange/card charges and optional provider backups. Bangalore (`blr1`) is an available region. Treat this as a pilot candidate within the chosen INR envelope only after reviewing the actual checkout total. The 4 GiB plan is US$24/month and may exceed this budget. Measure realistic concurrency before choosing a larger plan. No server has been bought.

Use R2 **Standard** for private previews and encrypted backups. Published free allowance is 10 GB-month, 1M Class A and 10M Class B requests monthly, with free egress. It is shared across the Cloudflare account and is not a spending cap. Production template reserves at most 6 billion bytes for application assets; keep separate encrypted backup retention at seven daily copies, each at most 250 MiB. Monitor other account usage. Unexpected provider charges remain possible if account limits/alerts are ignored.

Resend is a compatible SMTP option: its current free daily limit is 100; application defaults are 80 sends/day and 2,200/month, including failed/ambiguous attempts. Domain verification is required. No provider account or key has been configured. A mailbox used for customer support is a separate decision.

Sources checked 30 October 2026: [VM pricing](https://www.digitalocean.com/pricing/droplets), [regions](https://docs.digitalocean.com/platform/regional-availability/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Resend pricing](https://resend.com/pricing), [SMTP configuration](https://resend.com/docs/send-with-smtp).

## Domain and brand

PlanSaathi.com had no Verisign registry registration record and was offered for registration in [Namecheap search](https://www.namecheap.com/domains/registration/results/?domain=plansaathi.com) on 30 October 2026. This is a transient observation, not a reservation. Confirm the final registration/renewal price, taxes and availability at purchase. The page showed a currency-symbol inconsistency, so no INR domain quote is asserted here. No domain was added to a cart or bought. Registration availability is not trademark clearance.

The earlier Forma name overlaps [Autodesk's architecture product](https://www.autodesk.com/products/forma-building-design/overview); the owner selected PlanSaathi. Existing internal database/service identifiers and legacy file compatibility remain unchanged.

## Required owner decisions — still open

1. Merchant/trading or registered business name and public support email. Do not publish the private administrator email as support without a separate decision.
2. Refund/cancellation terms, privacy/retention notice, terms of use and applicable tax/invoice treatment. The current code charges the confirmed ₹1,499/₹299 totals and does not implement an additional tax engine or statutory invoices. Do not change the charge silently.
3. Hosting provider/region after reviewing the final INR invoice; domain purchase and DNS control.
4. Production SMTP, separate private R2 application/backup bucket credentials, independent authentication/operations/encryption secrets and Razorpay test/live configuration. Enter secrets in protected environment files, not chat, source or Git.
5. Real provider, recovery and selected-hardware acceptance tests. Keep `RAZORPAY_LIVE_APPROVED`, `LAUNCH_POLICIES_APPROVED` and `PUBLIC_INDEXING_ENABLED` false until the relevant work is signed off.

`OPERATIONS.md` contains the deployment, backup, patching and payment-recovery procedures. This plan authorizes no external purchase, live charge, DNS change or deployment by itself.
