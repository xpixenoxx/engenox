// web/src/app/security/page.tsx
// Security Policy — Engenox

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security Policy — Engenox',
  description: 'Security practices, vulnerability disclosure, and compliance for Engenox AI Visibility Operating System',
};

export default function SecurityPage() {
  const lastUpdated = '2024-01-15';
  const version = '1.0.0';

  return (
    <main className="min-h-screen bg-surface">
      <article className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-brand font-bold text-heading-xl mb-6">
            <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="currentColor"/>
              <path d="M8 16h16M16 8v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Engenox
          </Link>
          <h1 className="text-heading-2xl font-bold text-text mb-4">Security Policy</h1>
          <p className="text-body-sm text-text-muted">
            Last updated: {lastUpdated} • Version {version} •
            <a href="https://github.com/engenox/security" className="text-brand hover:underline" target="_blank" rel="noreferrer noopener">
              View history
            </a>
          </p>
        </header>

        <div className="prose prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">1. Scope & Commitment</h2>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              This policy covers security practices for Engenox (SaaS), the supporting infrastructure (GCP, Cloudflare, CNPG),
              and the software supply chain. We treat customer data and CIO corpus integrity as our highest obligation.
            </p>
            <p className="text-body text-text-muted leading-relaxed">
              Security is not a checklist. Our architecture enforces security invariants at every layer:
              dual-canonical crypto, Cedar policy gate, RLS-by-tenant, signed append-only corpus, and CI gates that block
              deployments failing security scans.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">2. Data Protection</h2>
            <h3 className="text-body font-medium text-text mb-2">2.1 Encryption at Rest</h3>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
              <li><strong>HSM-backed KEK:</strong> Cloud KMS (GCP) HSM root key encrypts per-tenant DEKs</li>
              <li><strong>Envelope encryption:</strong> Each tenant has unique AES-256-GCM DEK; rotated quarterly</li>
              <li><strong>Dual-canonical two-fence:</strong>
                <ul className="list-circle pl-6 mt-1 space-y-1">
                  <li>DB clone without KEK → unintelligible ciphertext</li>
                  <li>R2 clone without signature → unverifiable integrity</li>
                </ul>
              </li>
              <li><strong>WORM mirror:</strong> ClickHouse → Cloudflare R2 Object Lock (compliance mode, 7-year retention)</li>
            </ul>

            <h3 className="text-body font-medium text-text mb-2">2.2 Encryption in Transit</h3>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
              <li>TLS 1.3 everywhere (Cloudflare edge, ALB, service mesh)</li>
              <li>mTLS for all service-to-service (SPIFFE/SPIRE via Temporal namespace)</li>
              <li>Certificate rotation automated (cert-manager, 90-day certs)</li>
            </ul>

            <h3 className="text-body font-medium text-text mb-2">2.3 Key Management</h3>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
              <li>KEK in Cloud KMS HSM (FIPS 140-2 Level 3)</li>
              <li>DEKs generated per tenant at provisioning; wrapped by KEK</li>
              <li>Quarterly DEK rotation with re-encryption job; old DEKs retained for key-history decryption</li>
              <li>No keys in code, config, CI logs, or container images</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">3. Access Control & Authorization</h2>
            <h3 className="text-body font-medium text-text mb-2">3.1 Authentication</h3>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
              <li>WorkOS AuthKit (OIDC/SAML) — no password storage by us</li>
              <li>MFA required for all admin roles; enforced via WorkOS policies</li>
              <li>Session JWTs: 15min access, 7-day refresh, edge-validated at Cloudflare Workers</li>
              <li>SCIM provisioning for Enterprise; Just-In-Time for Growth</li>
            </ul>

            <h3 className="text-body font-medium text-text mb-2">3.2 Authorization (Cedar Two-Pass Gate)</h3>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
              <li><strong>Pass 1 (Edge):</strong> Cloudflare Worker validates JWT, extracts tenant_id, checks Cedar policy for route access</li>
              <li><strong>Pass 2 (Service):</strong> Each Hono/Go/Python service re-evaluates Cedar for resource-level actions</li>
              <li><strong>p99 {'<'} 2ms</strong> enforced via CI benchmark</li>
              <li>Policy-as-code in Git; changes require Tier-1 adversarial review</li>
              <li>No tenant_id accepted from client — always from validated JWT (<cite>15 §3</cite>)</li>
            </ul>

            <h3 className="text-body font-medium text-text mb-2">3.3 Database RLS</h3>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
              <li>pg_policies on every tenant-scoped table</li>
              <li>CI gate: <code>RLS-introspection</code> fails if any required table lacks policy</li>
              <li>Canary-row test per PR verifies cross-tenant isolation</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">4. Network & Infrastructure</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2">
              <li><strong>GKE Private Clusters:</strong> No public node IPs; control plane authorized networks only</li>
              <li><strong>Cloudflare WAF:</strong> Managed ruleset + custom rules for API abuse, probe replay, token theft</li>
              <li><strong>VPC Service Controls:</strong> Perimeter around Cloud SQL, Memorystore, Storage</li>
              <li><strong>Private Service Connect:</strong> All GCP APIs accessed privately</li>
              <li><strong>Egress Controls:</strong> Cloud NAT for outbound; allowlist for LLM provider endpoints only</li>
              <li><strong>CNPG Postgres:</strong> HA with 3 replicas; PITR + automated backup verification</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">5. Software Supply Chain</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2">
              <li><strong>SBOM:</strong> Trivy-generated CycloneDX on every build; published to artifact registry</li>
              <li><strong>Sigstore Cosign:</strong> Container images signed; verification in Argo CD sync</li>
              <li><strong>Dependency Policy:</strong> Renovate PRs require manual approval; major bumps need ADR</li>
              <li><strong>CI Gates:</strong> Trivy CRITICAL/HIGH block; secret scan (Gitleaks); license check</li>
              <li><strong>Buf Contract Compat:</strong> BACKWARD/FULL incompatible changes fail CI</li>
              <li><strong>Provenance:</strong> SLSA Level 3 build provenance for all artifacts</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">6. CIO Corpus Integrity</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2">
              <li><strong>Append-only:</strong> No UPDATE/DELETE on <code>cio_corpus</code> table; enforced by RLS + trigger</li>
              <li><strong>Cryptographic signing:</strong> Each row signed with tenant DEK; Merkle root per batch</li>
              <li><strong>WORM mirror:</strong> ClickHouse → R2 Object Lock (compliance mode); integrity verified daily</li>
              <li><strong>Verifiable export:</strong> Corpus export includes signature chain + Merkle proofs</li>
              <li><strong>Tamper-evidence:</strong> Any modification breaks signature chain → audit alert</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">7. Monitoring & Detection</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2">
              <li><strong>OpenTelemetry:</strong> Full traces, metrics, logs → Grafana (Mimir, Loki, Tempo)</li>
              <li><strong>LLM Eval:</strong> Langfuse + Arize Phoenix for prompt/response monitoring</li>
              <li><strong>Warm-canary divergence:</strong> Daily job compares probe behavior across surfaces; alerts on drift</li>
              <li><strong>Audit Log:</strong> Immutable append-only; all admin actions, auth events, policy changes</li>
              <li><strong>Alerting:</strong> PagerDuty for CRITICAL; Slack for HIGH/MEDIUM; runbook-linked</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">8. Incident Response</h2>
            <h3 className="text-body font-medium text-text mb-2">8.1 Severity Levels</h3>
            <table className="w-full text-sm text-text-muted border-collapse mb-4">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium">Severity</th>
                  <th className="text-left py-2 px-3 font-medium">Response</th>
                  <th className="text-left py-2 px-3 font-medium">Examples</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium text-critical">CRITICAL</td>
                  <td className="py-2 px-3">15min page, 1h resolution</td>
                  <td className="py-2 px-3">Data breach, corpus tampering, RLS bypass</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium text-warning">HIGH</td>
                  <td className="py-2 px-3">1h page, 4h resolution</td>
                  <td className="py-2 px-3">Auth bypass, probe fleet compromise</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium text-brand">MEDIUM</td>
                  <td className="py-2 px-3">4h page, 24h resolution</td>
                  <td className="py-2 px-3">Service degradation, WAF bypass</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-text-muted">LOW</td>
                  <td className="py-2 px-3">Next business day</td>
                  <td className="py-2 px-3">Log anomaly, minor config drift</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-body font-medium text-text mb-2">8.2 Process</h3>
            <ol className="list-decimal pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
              <li>Detect → Alert → Acknowledge (on-call)</li>
              <li>Triage: severity, blast radius, data impact</li>
              <li>Contain: revoke tokens, block IPs, isolate namespace</li>
              <li>Eradicate: root cause, patch, rotate credentials</li>
              <li>Recover: restore service, verify integrity (corpus audit)</li>
              <li>Postmortem: blameless, published internally within 5 days</li>
            </ol>
            <p className="text-body text-text-muted leading-relaxed">
              Customer notification within 72h for data-impacting incidents (GDPR Art. 33).
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">9. Vulnerability Disclosure</h2>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              We welcome responsible disclosure. Report security issues to:
            </p>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
              <li>Email: <a href="mailto:security@engenox.com" className="text-brand hover:underline">security@engenox.com</a> (GPG key: <a href="https://engenox.com/.well-known/pgp-key.asc" className="text-brand hover:underline">pgp-key.asc</a>)</li>
              <li>HackerOne: <a href="https://hackerone.com/engenox" className="text-brand hover:underline" target="_blank" rel="noreferrer noopener">hackerone.com/engenox</a> (launch Q2 2026)</li>
            </ul>
            <h3 className="text-body font-medium text-text mb-2">9.1 Rules of Engagement</h3>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
              <li>No access to customer data beyond proof-of-concept</li>
              <li>No disruption of services or probe fleet</li>
              <li>No testing of third-party LLM providers via our gateway</li>
              <li>Give us 90 days to remediate before public disclosure</li>
              <li>We credit reporters (with permission) in advisories</li>
            </ul>
            <h3 className="text-body font-medium text-text mb-2">9.2 Bounty Program (Post-MVP)</h3>
            <p className="text-body text-text-muted leading-relaxed">
              Planned tiers: CRITICAL $10,000 / HIGH $5,000 / MEDIUM $1,000 / LOW $250.
              Scope: Engenox SaaS, API, gateway, corpus pipeline. Excludes: Cloudflare/GCP infrastructure, LLM providers.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">10. Compliance & Certifications</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1">
              <li><strong>SOC 2 Type II:</strong> Audit planned post-MVP (Q3 2026); controls implemented now</li>
              <li><strong>GDPR:</strong> DPA available; SCCs with subprocessors; Art. 28 compliance</li>
              <li><strong>CCPA:</strong> Consumer rights implemented (access, deletion, portability, opt-out)</li>
              <li><strong>ISO 27001:</strong> Controls mapped; certification target Q4 2026</li>
              <li><strong>Security.txt:</strong> <a href="https://engenox.com/.well-known/security.txt" className="text-brand hover:underline">/.well-known/security.txt</a></li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">11. Security in Development</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2">
              <li><strong>Threat Modeling:</strong> STRIDE for each service at design; recorded in ADR</li>
              <li><strong>Code Review:</strong> Tier-1 adversarial panel for contracts, RLS, Cedar, crypto, gateway, action</li>
              <li><strong>SAST/SCA:</strong> Biome security rules, golangci-lint, Ruff, Trivy in CI</li>
              <li><strong>Secrets:</strong> Zero-trust; pre-commit hooks + CI scan (Gitleaks); Vault injection at runtime</li>
              <li><strong>Pen Testing:</strong> Annual third-party; continuous via bug bounty</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">12. Customer Security Responsibilities</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1">
              <li>Enforce MFA and SSO for all users</li>
              <li>Rotate API keys / service accounts per your policy</li>
              <li>Review audit logs regularly for anomalous access</li>
              <li>Configure panelist consent and evaluation policies per your compliance needs</li>
              <li>Report suspected compromises immediately to security@engenox.com</li>
              <li>Do not share autonomy dial credentials or bypass dry-run gates</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">13. Contact</h2>
            <address className="not-italic text-body text-text-muted leading-relaxed">
              Security Team<br />
              Pixenox Solutions<br />
              Email: <a href="mailto:security@engenox.com" className="text-brand hover:underline">security@engenox.com</a><br />
              GPG: <a href="https://engenox.com/.well-known/pgp-key.asc" className="text-brand hover:underline">.well-known/pgp-key.asc</a>
            </address>
          </section>
        </div>

        <hr className="border-border my-8" />

        <p className="text-body-xs text-text-muted text-center">
          Version-controlled at
          <a href="https://github.com/engenox/security" className="text-brand hover:underline" target="_blank" rel="noreferrer noopener">
            github.com/engenox/security
          </a>
        </p>
      </article>

      <footer className="border-t border-border bg-surface-elevated py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-body-xs text-text-muted">
          <div className="flex justify-center gap-6 mb-2">
            <Link href="/terms" className="hover:text-brand">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-brand">Privacy Policy</Link>
            <Link href="/" className="hover:text-brand">Engenox Home</Link>
          </div>
          <p>&copy; 2026 Pixenox Solutions. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}