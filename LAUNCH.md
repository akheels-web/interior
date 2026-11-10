# Before commercial launch

The current local release is PlanSaathi v0.4. Hosting, production credentials, merchant identity/support email and policy decisions remain open. No domain purchase, live charge, external email delivery or public deployment has occurred.

1. Follow [PRODUCTION-PLAN.md](PRODUCTION-PLAN.md) for the owner's budget, selected PlanSaathi.com name and remaining business decisions.
2. Follow [OPERATIONS.md](OPERATIONS.md) for pinned container deployment, private R2, SMTP, MFA, payment recovery, encrypted backups, health, monitoring and rollback.
3. Review [LAUNCH-HARDENING.md](LAUNCH-HARDENING.md) for completed local checks and explicit limits.
4. Run the actual SMTP, Razorpay test-mode, R2 privacy/failure, selected-host load, production restore and owner-recovery acceptance checks. Synthetic tests do not replace these.
5. Keep live sales and indexing gated until merchant policies, external setup and acceptance tests are complete. Existing customer payment reconciliation must continue if new sales are paused.

This is a standalone Next.js/PostgreSQL application. The historical Sites static manifest is not a deployment path for this release. Do not deploy the local database or seeded account credentials.
