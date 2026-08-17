// web/src/app/terms/page.tsx
// Terms of Service — Engenox

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Engenox',
  description: 'Terms of Service for Engenox AI Visibility Operating System',
};

export default function TermsPage() {
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
          <h1 className="text-heading-2xl font-bold text-text mb-4">Terms of Service</h1>
          <p className="text-body-sm text-text-muted">
            Last updated: {lastUpdated} • Version {version} •
            <a href="https://github.com/engenox/terms" className="text-brand hover:underline" target="_blank" rel="noreferrer noopener">
              View history
            </a>
          </p>
        </header>

        <div className="prose prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">1. Acceptance of Terms</h2>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              By accessing or using Engenox ("the Service"), you agree to be bound by these Terms of Service ("Terms").
              If you do not agree, you may not use the Service.
            </p>
            <p className="text-body text-text-muted leading-relaxed">
              These Terms constitute a legally binding agreement between you ("Customer", "you") and Pixenox Solutions ("Company", "we", "us"),
              a California entity with principal place of business in San Francisco, CA.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">2. Description of Service</h2>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              Engenox is an AI Visibility Operating System that provides:
            </p>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2 mb-4">
              <li><strong>Perception:</strong> Multi-surface AI probing (ChatGPT, Perplexity, Gemini, Grok, Claude) against configured buyer queries</li>
              <li><strong>Diagnosis:</strong> Assertion extraction, conflict detection, entity truth verification against consented human panel</li>
              <li><strong>Proposal:</strong> Intervention generation (schema.org, content corrections, technical SEO, competitive pages) with dry-run preview</li>
              <li><strong>Measurement:</strong> Causal uplift estimation via signed CIO corpus with conformal confidence intervals</li>
              <li><strong>Candor Reports:</strong> Metrics with 95% CIs, trajectory charts, honesty ledger, contrarian blocks, provenance audit</li>
              <li><strong>Autonomy Dial:</strong> Four-tier intervention autonomy (Observe → Propose → Approve → Autonomous) with three-axis escalation gate</li>
            </ul>
            <p className="text-body text-text-muted leading-relaxed">
              The Service is provided via SaaS. No on-premise deployment in MVP. We reserve the right to modify features
              with 30 days' notice; material adverse changes require your consent.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">3. Accounts & Eligibility</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2 mb-4">
              <li>You must be 18+ and legally capable of entering contracts</li>
              <li>You must provide accurate registration info and keep it updated</li>
              <li>You are responsible for all activity under your credentials</li>
              <li>Use WorkOS SSO/OIDC; notify us immediately of unauthorized access</li>
              <li>One account per legal entity; seats per plan tier</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">4. Subscription & Billing</h2>
            <h3 className="text-body font-medium text-text mb-2">Plans (MVP)</h3>
            <table className="w-full text-sm text-text-muted border-collapse mb-4">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium">Tier</th>
                  <th className="text-left py-2 px-3 font-medium">Price</th>
                  <th className="text-left py-2 px-3 font-medium">Seats</th>
                  <th className="text-left py-2 px-3 font-medium">Surfaces</th>
                  <th className="text-left py-2 px-3 font-medium">Queries</th>
                  <th className="text-left py-2 px-3 font-medium">Panel</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium text-text">Starter</td>
                  <td className="py-2 px-3">$129/mo</td>
                  <td className="py-2 px-3">1</td>
                  <td className="py-2 px-3">5</td>
                  <td className="py-2 px-3">50</td>
                  <td className="py-2 px-3">Seeded (3)</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium text-text">Growth</td>
                  <td className="py-2 px-3">$499/mo</td>
                  <td className="py-2 px-3">5</td>
                  <td className="py-2 px-3">15</td>
                  <td className="py-2 px-3">200</td>
                  <td className="py-2 px-3">Customer-recruited</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-text">Enterprise</td>
                  <td className="py-2 px-3">Custom</td>
                  <td className="py-2 px-3">Unlimited</td>
                  <td className="py-2 px-3">Custom</td>
                  <td className="py-2 px-3">Custom</td>
                  <td className="py-2 px-3">Full management</td>
                </tr>
              </tbody>
            </table>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2 mb-4">
              <li>Billed monthly in advance via Stripe; auto-renews unless cancelled</li>
              <li>Price changes: 30 days' notice; you may cancel before effective date</li>
              <li>No refunds for partial months; Enterprise contracts have custom terms</li>
              <li>Overages (queries, surfaces) billed at plan rates</li>
              <li>Concierge panel add-on seeds 3 panelists for Starter; Growth/Enterprise recruit own</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">5. Your Data & Content</h2>
            <h3 className="text-body font-medium text-text mb-2">5.1 Brand Data</h3>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              You retain all rights to your brand identity, website content, queries, and interventions.
              You grant us a limited license to process this data solely to provide the Service.
            </p>
            <h3 className="text-body font-medium text-text mb-2">5.2 Panelist Data</h3>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              For consented panel evaluations, you (or we via concierge) recruit panelists who provide explicit consent.
              Panelist responses are used only for calibrated ground truth and conformal prediction — never for model training.
            </p>
            <h3 className="text-body font-medium text-text mb-2">5.3 CIO Corpus</h3>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              The Causal Intervention-Outcome corpus is append-only, cryptographically signed, and WORM-mirrored to Cloudflare R2 Object Lock.
              It constitutes the integrity backbone of measurement. You may export your corpus rows; the cryptographic chain is part of the export.
            </p>
            <h3 className="text-body font-medium text-text mb-2">5.4 No Training</h3>
            <p className="text-body text-text-muted leading-relaxed">
              <strong>We do not use your brand data, queries, assertions, or panelist responses to train or fine-tune any AI model.</strong>
              LLM calls are stateless, per-query, via our constrained-decoding gateway.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">6. Intellectual Property</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2">
              <li>Engenox software, algorithms, UI, reports, and methodology are our proprietary IP</li>
              <li>You receive a limited, non-exclusive, non-transferable license to use the Service during your subscription</li>
              <li>Candor Report methodology (CI rendering, contrarian block, provenance hover, dial semantics) is trade secret</li>
              <li>No reverse engineering, decompilation, or extraction of model weights/gateway logic</li>
              <li>Feedback you provide becomes our property without obligation</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">7. Acceptable Use</h2>
            <p className="text-body text-text-muted leading-relaxed mb-4">You will not:</p>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2 mb-4">
              <li>Probe brands you don't own/authorize without consent</li>
              <li>Scrape, crawl, or extract data from the Service programmatically (except via documented API)</li>
              <li>Attempt to bypass rate limits, authentication, or the autonomy dial gates</li>
              <li>Use the Service for illegal activities, spam, or competitive intelligence harvesting</li>
              <li>Interfere with probe execution, panel evaluations, or CIO corpus integrity</li>
              <li>Share credentials or exceed seat limits</li>
            </ul>
            <p className="text-body text-text-muted leading-relaxed">
              Violation may result in immediate suspension or termination without refund.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">8. Service Level & Availability</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2 mb-4">
              <li>Target: 99.5% monthly uptime (excluding scheduled maintenance)</li>
              <li>Maintenance windows: Sundays 02:00–06:00 UTC with 48h notice</li>
              <li>Probe execution SLA: 95% success rate across configured surfaces per cycle</li>
              <li>Credits: 10% monthly fee per 99.5% uptime miss; 5% per probe SLA miss (max 50% monthly)</li>
              <li>Force majeure, your network issues, and LLM provider outages excluded</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">9. Warranties & Disclaimers</h2>
            <h3 className="text-body font-medium text-text mb-2">9.1 Limited Warranty</h3>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              We warrant the Service will substantially conform to its documentation.
              <strong>No warranty on:</strong> AI surface outputs, panelist judgments, uplift estimates, visibility scores,
              or any metric derived from third-party LLM behavior.
            </p>
            <h3 className="text-body font-medium text-text mb-2">9.2 Disclaimer</h3>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
              INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
              ACCURACY OF AI PERCEPTION DATA, OR CONTINUOUS AVAILABILITY.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">10. Limitation of Liability</h2>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2 mb-4">
              <li>OUR TOTAL LIABILITY ≤ FEES PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM</li>
              <li>NO LIABILITY FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
              <li>NO LIABILITY FOR LOST PROFITS, DATA, BRAND REPUTATION, OR AI VISIBILITY CHANGES</li>
              <li>NO LIABILITY FOR THIRD-PARTY LLM OUTPUTS, PROVIDER OUTAGES, OR PANELIST ERRORS</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">11. Indemnification</h2>
            <p className="text-body text-text-muted leading-relaxed">
              You indemnify us against claims arising from: your brand data, queries, interventions, panelist recruitment,
              violation of these Terms, or infringement of third-party rights. We indemnify you against IP infringement
              claims from the Service itself (not from your content or LLM outputs).
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">12. Term & Termination</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2 mb-4">
              <li>Monthly terms auto-renew; cancel anytime effective end of billing period</li>
              <li>We may terminate for material breach (7-day cure), non-payment (15-day cure), or AUP violation</li>
              <li>On termination: access revoked; data export available for 90 days; CIO corpus integrity preserved</li>
              <li>Surviving sections: IP, Disclaimers, Liability, Indemnification, Governing Law</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">13. Governing Law & Disputes</h2>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              Governed by California law, exclusive venue: San Francisco County state/federal courts.
            </p>
            <p className="text-body text-text-muted leading-relaxed mb-4">
              <strong>Arbitration:</strong> Disputes {'< $25,000'} resolved via JAMS streamlined arbitration; opt-out within 30 days of acceptance by emailing <a href="mailto:legal@engenox.com" className="text-brand hover:underline">legal@engenox.com</a>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">14. General</h2>
            <ul className="list-disc pl-6 text-body text-text-muted leading-relaxed space-y-2">
              <li>Entire agreement; supersedes prior discussions</li>
              <li>Amendments require written agreement (email sufficient)</li>
              <li>Waiver of one breach ≠ waiver of others</li>
              <li>Severability: invalid provisions don't affect the rest</li>
              <li>Assignment: we may assign to affiliate/acquirer; you may not assign without consent</li>
              <li>Notices via email or in-app banner</li>
              <li>English language controls</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-heading-lg font-semibold text-text mb-4">15. Contact</h2>
            <address className="not-italic text-body text-text-muted leading-relaxed">
              Pixenox Solutions<br />
              San Francisco, CA, USA<br />
              Email: <a href="mailto:legal@engenox.com" className="text-brand hover:underline">legal@engenox.com</a><br />
              Billing: <a href="mailto:billing@engenox.com" className="text-brand hover:underline">billing@engenox.com</a>
            </address>
          </section>
        </div>

        <hr className="border-border my-8" />

        <p className="text-body-xs text-text-muted text-center">
          Version-controlled at
          <a href="https://github.com/engenox/terms" className="text-brand hover:underline" target="_blank" rel="noreferrer noopener">
            github.com/engenox/terms
          </a>
        </p>
      </article>

      <footer className="border-t border-border bg-surface-elevated py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-body-xs text-text-muted">
          <div className="flex justify-center gap-6 mb-2">
            <Link href="/privacy" className="hover:text-brand">Privacy Policy</Link>
            <Link href="/security" className="hover:text-brand">Security Policy</Link>
            <Link href="/" className="hover:text-brand">Engenox Home</Link>
          </div>
          <p>&copy; 2026 Pixenox Solutions. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}