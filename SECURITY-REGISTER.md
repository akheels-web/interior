# PlanSaathi security findings and launch review

Reviewed 30 October 2026. Local preparation only. No finding below is silently suppressed or treated as proof of exploitation. Counts in scanner reports are package/advisory matches, not unique exploitable paths.

## Open: proxy JOSE v3 dependency

- **High — GHSA-mgcc-cww5-fp2q / CVE-2026-116587**, `github.com/go-jose/go-jose/v3` 3.0.5 in the standard Caddy dependency graph. The [upstream advisory](https://github.com/advisories/GHSA-mgcc-cww5-fp2q) lists no patched v3 release. Crafted RSA private JWK parsing can exhaust CPU. The v4 dependency is upgraded to patched 4.1.6; Go 1.27.3 and x/net 0.60.0 remove the other identified fixable Go findings.
- Current configuration disables Caddy's administration API and exposes only the reverse-proxy site. It configures no OIDC/JWT/JWK ingestion or ACME server endpoint. This reduces apparent exposure; it is a configuration-based inference, **not a completed call-graph/reachability proof**. The proxy has a memory limit, restricted capabilities and a read-only root.
- **Before launch:** complete a dependency reachability review, move to an upstream release that removes/patches v3, or choose a reviewed proxy alternative. Record the chosen disposition and rerun the exact image scan. Do not label this finding fixed, claim a clean scan, or enable optional identity/PKI features without reassessment. There is no owner risk acceptance recorded.

## Patches applied during this pass

- Initial Node/Debian image: 2 critical and 76 high matches, including OS libraries and unused npm-bundled packages. Moved the application to a verified Node 24 Alpine base, applied available distribution patches, and removed runtime npm/Yarn. A native Argon2 hash/verify guard and runtime smoke verify compatibility.
- Initial official proxy: 8 critical and 27 high matches. Rebuilt standard Caddy from a locked Go module graph with patched Go/network/JOSE v4, and applied Alpine curl/brotli fixes. Result: **0 critical / 1 high** (the open v3 issue above), 6 medium and 2 unknown matches.
- PostgreSQL Alpine candidate: 3 critical and 6 high matches. Applied available Alpine curl/brotli fixes. Patched image result: **0 critical / 0 high**, 3 medium matches. Fresh database initialization/migration passes; production restore/load tests remain separate.
- npm lockfile audit: no known advisories. This does not cover all operating-system packages, embedded code, unpublished issues or deployment misconfiguration.
- Final application image result: **0 critical / 0 high**, 3 medium matches. Final database: 3 medium; proxy: 6 medium and 2 unknown in addition to the open high. Review these before launch; severity alone does not establish application reachability or acceptance.
- Applied the remaining available medium fixes too: proxy chi 5.4.0, and Alpine su-exec replacing the database's gosu helper while preserving its postgres privilege drop. Fresh initialization, all 187 regressions and the migration/proxy drill passed. Final scans contain no fixable medium-or-higher matches.

Full machine-readable scans stay in ignored `.local/` (`container-scan.json`, `proxy-patched-scan.json`, `db-patched-scan.json`); the completion results are summarized in `LAUNCH-HARDENING.md`. Scanner: Grype 0.121.0, database built 30 October 2026. It received only image archives/public image references, never application environments or a Docker socket.

CI fails on known **fixable** medium/high/critical findings. It deliberately does not imply that unfixed or unknown findings are accepted. Review those alongside provider tests, HTTPS, secret handling, backups and measured capacity at every release. Weekly checks and dependency PRs are prepared but not active until the repository is hosted on GitHub.
