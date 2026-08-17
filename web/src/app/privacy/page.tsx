// web/src/app/privacy/page.tsx
// Privacy Policy — publicly accessible, machine-readable

import type { Metadata } from 'next';
import Link from 'next/link';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Privacy Policy — Engenox',
  description: 'Engenox Privacy Policy — How we collect, use, and protect your data',
};

const lastUpdated = '2026-07-15';
const effectiveDate = '2026-07-15';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-border bg-surface-elevated">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-brand font-bold text-heading-lg">
            <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="currentColor"/>
              <path d="M8 16h16M16 8v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Engenox
          </Link>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h1 className="text-heading-xl font-bold text-text">Privacy Policy</h1>
          <p className="text-body-sm text-text-muted mt-2">
            Last updated: {lastUpdated} • Effective: {effectiveDate}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">1. Data Controller</h2>
          <p className="text-body text-text-muted leading-relaxed">
            Pixenox Solutions ("we", "us", "our") is the data controller for personal data processed through Engenox.
            Contact: <a href="mailto:privacy@engenox.com" className="text-brand hover:underline">privacy@engenox.com</a>
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">2. Data We Collect</h2>
          <h3 className="text-body font-medium text-text mb-2">Account & Authentication Data</h3>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
            <li>Email, name, organization (via WorkOS SSO/OIDC)</li>
            <li>Authentication logs, session tokens, MFA status</li>
          </ul>
          <h3 className="text-body font-medium text-text mb-2">Brand Entity Data</h3>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
            <li>Entity name, type, website, description, founding date, founders, industry, HQ</li>
            <li>Attribute confidence scores, evidence citations, provenance records</li>
            <li>Buyer queries you configure for perception probing</li>
          </ul>
          <h3 className="text-body font-medium text-text mb-2">Perception & Measurement Data</h3>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
            <li>AI surface responses (ChatGPT, Perplexity, Gemini, Grok, Claude) to your queries</li>
            <li>Extracted assertions with confidence scores and evidence citations</li>
            <li>Conflict detections, fallback flags, entity truth scores</li>
            <li>Intervention proposals, dry-run results, approved PRs, execution outcomes</li>
            <li>CIO corpus rows: intervention ID, before/after metrics, uplift, conformal CI, n, status</li>
          </ul>
          <h3 className="text-body font-medium text-text mb-2">Consented Panelist Data</h3>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
            <li>Panelist name, email, role, affiliation (provided by you or recruited via concierge)</li>
            <li>Explicit consent records per evaluation cycle</li>
            <li>Evaluation responses: assertion ratings, confidence, rationale (blind or attributed per config)</li>
            <li>Calibration metadata for conformal prediction</li>
          </ul>
          <h3 className="text-body font-medium text-text mb-2">Telemetry & Operational Data</h3>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
            <li>API request logs (timestamp, endpoint, latency, status, tenant ID from JWT)</li>
            <li>Error traces, performance metrics, feature flag evaluations</li>
            <li>Audit log entries for administrative actions</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">3. Legal Basis (GDPR Art. 6)</h2>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2">
            <li><strong>Contract performance (Art. 6(1)(b)):</strong> Providing the Service, running probes, generating reports</li>
            <li><strong>Legitimate interest (Art. 6(1)(f)):</strong> Security monitoring, fraud prevention, service improvement</li>
            <li><strong>Explicit consent (Art. 6(1)(a) / Art. 9(2)(a)):</strong> Panelist evaluations, special category data if any</li>
            <li><strong>Legal obligation (Art. 6(1)(c)):</strong> Audit logs, security incident records</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">4. How We Use Your Data</h2>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2">
            <li>Execute perception probes against configured buyer queries</li>
            <li>Extract assertions, detect conflicts, compute entity truth scores</li>
            <li>Generate intervention proposals with diff previews</li>
            <li>Run dry-run simulations and measure causal uplift via CIO corpus</li>
            <li>Render Candor Reports with CIs, honesty ledger, contrarian blocks, provenance</li>
            <li>Manage autonomy dial state and enforce escalation gates</li>
            <li>Operate consented panel evaluations with calibrated ground truth</li>
            <li>Maintain security, audit trails, and comply with legal obligations</li>
            <li><strong>Never:</strong> Train AI models on your brand data or panelist responses</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">5. Data Sharing & Subprocessors</h2>
          <h3 className="text-body font-medium text-text mb-2">Subprocessors (Data Processors)</h3>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
            <li><strong>WorkOS:</strong> Authentication, SSO, user management</li>
            <li><strong>Cloudflare:</strong> Edge Workers, R2 (WORM mirror), KV, DNS</li>
            <li><strong>GCP:</strong> Compute (GKE), Cloud SQL (CNPG Postgres), Memorystore Valkey, Cloud Storage</li>
            <li><strong>Temporal:</strong> Workflow orchestration (self-hosted on GCP)</li>
            <li><strong>LLM Providers (via LiteLLM gateway):</strong> Anthropic, OpenAI, Google — only prompt/response for probe execution</li>
            <li><strong>Argilla:</strong> Human review platform for panel calibration (if enabled)</li>
          </ul>
          <h3 className="text-body font-medium text-text mb-2">No Sale of Data</h3>
          <p className="text-body text-text-muted leading-relaxed mb-4">
            We do not sell personal data. We do not share brand data with third parties for their purposes.
            Panelist data is never shared outside the evaluation workflow.
          </p>
          <h3 className="text-body font-medium text-text mb-2">Legal Disclosure</h3>
          <p className="text-body text-text-muted leading-relaxed">
            We may disclose data if required by law, court order, or to protect rights/safety.
            We will notify you unless legally prohibited.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">6. Data Retention</h2>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
            <li><strong>Account data:</strong> Retained while account active; deleted 90 days after termination</li>
            <li><strong>Perception/measurement data:</strong> Retained for duration of subscription + 2 years for trend analysis</li>
            <li><strong>CIO corpus:</strong> Append-only, signed, WORM-mirrored to R2 Object Lock — retained indefinitely for audit integrity</li>
            <li><strong>Panelist evaluations:</strong> Retained 3 years post-evaluation for calibration validity</li>
            <li><strong>Audit logs:</strong> Retained 7 years per security policy</li>
            <li><strong>Telemetry:</strong> Rolling 90-day window</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">7. Your Rights</h2>
          <p className="text-body text-text-muted leading-relaxed mb-4">
            Under GDPR, CCPA, and applicable laws, you have the right to:
          </p>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
            <li>Access your personal data and receive a copy</li>
            <li>Rectify inaccurate or incomplete data</li>
            <li>Erase your data (subject to legal hold / CIO corpus integrity)</li>
            <li>Restrict or object to processing</li>
            <li>Data portability (JSON/CSV export of your brand data, queries, reports)</li>
            <li>Withdraw consent (for panelist evaluations)</li>
            <li>Lodge a complaint with a supervisory authority</li>
          </ul>
          <p className="text-body text-text-muted leading-relaxed">
            To exercise rights, email <a href="mailto:privacy@engenox.com" className="text-brand hover:underline">privacy@engenox.com</a>.
            We respond within 30 days (GDPR) / 45 days (CCPA).
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">8. Security Measures</h2>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
            <li><strong>Encryption at rest:</strong> HSM-backed KEK → per-tenant envelope DEK (quarterly rotation); dual-canonical two-fence</li>
            <li><strong>Encryption in transit:</strong> TLS 1.3 everywhere; mTLS for service-to-service</li>
            <li><strong>Access control:</strong> Cedar two-pass policy gate ({'<2ms'} p99); RLS-by-tenant in Postgres; JWT from WorkOS edge</li>
            <li><strong>Network:</strong> Private GKE clusters; Cloudflare WAF; no public DB endpoints</li>
            <li><strong>Secrets:</strong> HashiCorp Vault; no secrets in code or config</li>
            <li><strong>Monitoring:</strong> OpenTelemetry → Grafana; Langfuse + Phoenix for LLM eval; daily warm-canary divergence job</li>
            <li><strong>Incident response:</strong> Defined runbooks; 24/7 on-call for critical severity</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">9. International Transfers</h2>
          <p className="text-body text-text-muted leading-relaxed mb-4">
            Data processed in USA (GCP us-central1, Cloudflare global edge). For EEA/UK customers:
          </p>
          <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-1 mb-4">
            <li>Standard Contractual Clauses (SCCs) with all subprocessors</li>
            <li>Supplementary measures: encryption, access controls, no government access via subprocessors</li>
            <li>Data Processing Addendum (DPA) available at <a href="mailto:legal@engenox.com" className="text-brand hover:underline">legal@engenox.com</a></li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">10. Children's Privacy</h2>
          <p className="text-body text-text-muted leading-relaxed">
            The Service is not directed to individuals under 18. We do not knowingly collect data from children.
            If you believe we have, contact us for immediate deletion.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">11. Changes to This Policy</h2>
          <p className="text-body text-text-muted leading-relaxed">
            We may update this Policy with 30 days' notice via email and in-app banner. Material changes require
            explicit re-consent. Version history at <a href="https://github.com/engenox/privacy" className="text-brand hover:underline" target="_blank" rel="noreferrer noopener">github.com/engenox/privacy</a>.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-heading-sm font-semibold text-text mb-4">12. Contact</h2>
          <address className="not-italic text-body text-text-muted leading-relaxed">
            Data Protection Officer: Pixenox Solutions<br />
            San Francisco, CA, USA<br />
            Email: <a href="mailto:privacy@engenox.com" className="text-brand hover:underline">privacy@engenox.com</a><br />
            Security: <a href="mailto:security@engenox.com" className="text-brand hover:underline">security@engenox.com</a>
          </address>
        </section>

        <hr className="border-border my-8" />

        <p className="text-body-xs text-text-muted text-center">
          This Policy is version-controlled. View history at
          <a href="https://github.com/engenox/privacy" className="text-brand hover:underline" target="_blank" rel="noreferrer noopener">
            github.com/engenox/privacy
          </a>
        </p>
      </article>

      <footer className="border-t border-border bg-surface-elevated py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-body-xs text-text-muted">
          <p>&copy; 2026 Pixenox Solutions. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-2">
            <Link href="/terms" className="hover:text-brand">Terms of Service</Link>
            <Link href="/security" className="hover:text-brand">Security Policy</Link>
            <Link href="/" className="hover:text-brand">Engenox Home</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}