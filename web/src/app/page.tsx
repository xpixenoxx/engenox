// web/src/app/page.tsx
// Landing page — public marketing surface with semantic HTML, structured data

import { Footer } from '@/components/Footer';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Engenox — AI Visibility Operating System',
  description: 'Perceive, diagnose, and intervene on your brand\'s AI presence across ChatGPT, Perplexity, Gemini, Grok, and Claude.',
  keywords: ['AI visibility', 'AI search optimization', 'brand monitoring', 'LLM monitoring', 'AI presence'],
  authors: [{ name: 'Engenox' }],
  creator: 'Engenox',
  publisher: 'Engenox',
  robots: 'index, follow',
  openGraph: {
    title: 'Engenox — AI Visibility Operating System',
    description: 'Perceive, diagnose, and intervene on your brand\'s AI presence.',
    type: 'website',
    url: 'https://engenox.com',
    siteName: 'Engenox',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Engenox — AI Visibility Operating System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Engenox — AI Visibility Operating System',
    description: 'Perceive, diagnose, and intervene on your brand\'s AI presence.',
    images: ['/og-default.png'],
    creator: '@engenox',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

const surfaces = [
  { name: 'ChatGPT', icon: '💬', color: 'text-surface-chatgpt', description: 'OpenAI\'s conversational AI' },
  { name: 'Perplexity', icon: '🔍', color: 'text-surface-perplexity', description: 'Answer engine with citations' },
  { name: 'Gemini', icon: '✨', color: 'text-surface-gemini', description: 'Google\'s multimodal AI' },
  { name: 'Grok', icon: '⚡', color: 'text-surface-grok', description: 'xAI\'s real-time AI' },
  { name: 'Claude', icon: '📘', color: 'text-surface-claude', description: 'Anthropic\'s constitutional AI' },
];

const features = [
  {
    title: 'Perceive',
    description: 'Continuous probing across 5+ AI surfaces. See what AI systems actually say about your brand — with citations and confidence.',
    icon: '👁️',
  },
  {
    title: 'Diagnose',
    description: 'Entity-level truth: assertions, evidence, conflicts, and fallback states. Understand not just what\'s said, but why.',
    icon: '🔬',
  },
  {
    title: 'Propose',
    description: 'Interventions with diff previews, provenance chains, and candor scores. Every proposal shows its evidence and uncertainty.',
    icon: '💡',
  },
  {
    title: 'Measure',
    description: 'Causal Intervention-Outcome (CIO) corpus. Real uplift with confidence intervals, not vanity metrics.',
    icon: '📊',
  },
  {
    title: 'Autonomy Dial',
    description: 'Four-tier control: Observe → Propose → Approve → Execute. Three-axis ledger (Safety, Consent, Evidence) gates escalation.',
    icon: '🎛️',
  },
  {
    title: 'Candor Floor',
    description: 'No CI omitted. No contrarian block hidden. Provenance audit hover on every claim. Honesty is the product.',
    icon: '📜',
  },
];

const navItems = [
  { href: '#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Documentation' },
  { href: '/about', label: 'About' },
  { href: '/login', label: 'Login', variant: 'ghost' },
  { href: '/signup', label: 'Start Free', variant: 'primary' },
];

export default function HomePage() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 text-xl font-bold text-brand" aria-label="Engenox Home">
                <span className="text-2xl" aria-hidden="true">🧭</span>
                <span>Engenox</span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                {navItems.slice(0, 4).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm font-medium text-text-muted hover:text-text transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:block px-4 py-2 text-sm font-medium text-text-muted hover:text-text transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-medium bg-brand text-background rounded-lg hover:bg-brand-hover transition-colors"
              >
                Start Free
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section
          className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8"
          aria-labelledby="hero-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="text-center space-y-8">
              <h1
                id="hero-heading"
                className="text-display-xl font-bold text-text tracking-tight prose-max"
              >
                AI Visibility Operating System
              </h1>
              <p className="text-body-lg text-text-muted max-w-2xl mx-auto prose-max">
                Perceive what AI systems say about your brand. Diagnose conflicts with evidence.
                Propose interventions with candor. Measure causal uplift. The closed loop from
                perception → intervention → outcome.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-8 py-3 text-base font-medium bg-brand text-background rounded-lg hover:bg-brand-hover transition-colors"
                >
                  Start Free — 14 Day Trial
                </Link>
                <Link
                  href="/docs"
                  className="w-full sm:w-auto px-8 py-3 text-base font-medium border border-border text-text rounded-lg hover:bg-surface-muted transition-colors"
                >
                  Read the Docs
                </Link>
              </div>
              <p className="text-body-sm text-text-muted">
                No credit card required. SOC 2 Type II. Self-managed Postgres + AGE option.
              </p>
            </div>
          </div>
        </section>

        <section
          className="py-20 px-4 sm:px-6 lg:px-8 bg-surface-muted/50"
          aria-labelledby="surfaces-heading"
        >
          <div className="mx-auto max-w-7xl">
            <header className="text-center space-y-4 mb-16">
              <h2 id="surfaces-heading" className="text-heading-xl font-bold text-text">
                Five AI Surfaces. One Truth Layer.
              </h2>
              <p className="text-body-lg text-text-muted max-w-2xl mx-auto">
                We probe every major AI surface your buyers use. Each assertion carries citations,
                confidence, and integrity status.
              </p>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {surfaces.map((surface) => (
                <article
                  key={surface.name}
                  className="p-6 bg-surface-raised border border-border rounded-xl hover:border-brand/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl" aria-hidden="true">{surface.icon}</span>
                    <h3 className="text-heading-sm font-semibold text-text">{surface.name}</h3>
                  </div>
                  <p className="text-body-sm text-text-muted">{surface.description}</p>
                  <span className={`inline-block mt-4 text-body-xs font-medium ${surface.color}`}>
                    Surface-specific accent
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="py-20 px-4 sm:px-6 lg:px-8"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-7xl">
            <header className="text-center space-y-4 mb-16">
              <h2 id="features-heading" className="text-heading-xl font-bold text-text">
                Built for the Intelligence Stack
              </h2>
              <p className="text-body-lg text-text-muted max-w-2xl mx-auto">
                Not a dashboard. An operating system for AI visibility.
              </p>
            </header>
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 bg-surface-raised border border-border rounded-xl"
                >
                  <dt className="flex items-center gap-3 mb-4">
                    <span className="text-3xl" aria-hidden="true">{feature.icon}</span>
                    <span className="text-heading-sm font-semibold text-text">{feature.title}</span>
                  </dt>
                  <dd className="text-body-sm text-text-muted">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          className="py-20 px-4 sm:px-6 lg:px-8 bg-surface-muted/50"
          aria-labelledby="architecture-heading"
        >
          <div className="mx-auto max-w-7xl">
            <header className="text-center space-y-4 mb-16">
              <h2 id="architecture-heading" className="text-heading-xl font-bold text-text">
                Architecture That Compounds
              </h2>
              <p className="text-body-lg text-text-muted max-w-2xl mx-auto">
                Two spines. One proposing layer. Six consented, time-accumulated assets a clone cannot copy.
              </p>
            </header>
            <div className="space-y-12">
              <article className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-heading-lg font-bold text-text mb-4">Bi-Temporal Knowledge Graph</h3>
                  <p className="text-body-base text-text-muted mb-4">
                    Postgres + AGE for operational graph. FalkorDB graduation for analytical workloads.
                    Valid-time + transaction-time on every assertion. RLS by tenant at the row level.
                  </p>
                  <ul className="space-y-2 text-body-sm text-text-muted">
                    <li>• Assertion view library (libs/kg) — only sanctioned query path</li>
                    <li>• Atlas migrations — expand/contract native, CI-integrated</li>
                    <li>• pgvector for working-set embeddings → Qdrant graduation</li>
                  </ul>
                </div>
                <div className="p-6 bg-surface-raised border border-border rounded-xl font-mono text-body-xs text-text-muted">
                  {"ASSERTION(entity_id, surface, query, claim, evidence[], confidence, valid_from, valid_to, txn_from, txn_to, integrity_hash)"}
                </div>
              </article>
              <article className="grid lg:grid-cols-2 gap-8 items-center">
                <div className="p-6 bg-surface-raised border border-border rounded-xl font-mono text-body-xs text-text-muted">
                  {"CIO_ROW(intervention_id, before_probe, after_probe, uplift_ci, n, segment, consent_timestamp, reviewer_ids[])"}
                </div>
                <div>
                  <h3 className="text-heading-lg font-bold text-text mb-4">Causal Intervention-Outcome Corpus</h3>
                  <p className="text-body-base text-text-muted mb-4">
                    Signed, integrity-tagged rows. Conformal prediction for CIs. Argilla human review +
                    consented panel ground truth. WORM mirror in R2 Object-Lock.
                  </p>
                  <ul className="space-y-2 text-body-sm text-text-muted">
                    <li>• Six consented assets: brand, queries, panel, corpus, dial, provenance</li>
                    <li>• Counterfactual uplift estimator — not correlation</li>
                    <li>• ClickHouse OLAP → nightly sync from Postgres</li>
                  </ul>
                </div>
              </article>
              <article className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-heading-lg font-bold text-text mb-4">Bounded Proposing Layer</h3>
                  <p className="text-body-base text-text-muted mb-4">
                    Six stateless, schema-constrained seams. Cross-family Critic (GPT-5 + Gemini 3).
                    Never commits — only proposes. Dial default: Propose. Human merges.
                  </p>
                  <ul className="space-y-2 text-body-sm text-text-muted">
                    <li>• Extract → Draft → Embed → Adjudicate → Score&Plan → Abduce</li>
                    <li>• Constrained decoding (Outlines/XGrammar/GBNF)</li>
                    <li>• Deadlock → human escalation. No LLM tiebreaker.</li>
                  </ul>
                </div>
                <div className="p-6 bg-surface-raised border border-border rounded-xl font-mono text-body-xs text-text-muted">
                  {"SEAMS: Perceive | Diagnose | Propose | Review | Execute | Measure"}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          className="py-20 px-4 sm:px-6 lg:px-8"
          aria-labelledby="candor-heading"
        >
          <div className="mx-auto max-w-7xl text-center">
            <header className="space-y-4 mb-16">
              <h2 id="candor-heading" className="text-heading-xl font-bold text-text">
                Candor Is Not Optional
              </h2>
              <p className="text-body-lg text-text-muted max-w-2xl mx-auto">
                Every metric shows its CI. Every claim shows its evidence. Every proposal shows its
                contrarian block. The Provenance Audit Hover is on every assertion.
              </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <article className="p-6 bg-surface-raised border border-border rounded-xl text-left">
                <h3 className="text-heading-sm font-semibold text-text mb-2">Confidence Intervals</h3>
                <p className="text-body-sm text-text-muted">
                  {'No lift number renders without its 95% CI. Small-N honesty microcopy when n < 30. Conformal prediction, not bootstrap.'}
                </p>
              </article>
              <article className="p-6 bg-surface-raised border border-border rounded-xl text-left">
                <h3 className="text-heading-sm font-semibold text-text mb-2">Contrarian Block</h3>
                <p className="text-body-sm text-text-muted">
                  The strongest counter-evidence rendered alongside every proposal. Honesty expandable
                  shows the full ledger.
                </p>
              </article>
              <article className="p-6 bg-surface-raised border border-border rounded-xl text-left">
                <h3 className="text-heading-sm font-semibold text-text mb-2">Provenance Audit Hover</h3>
                <p className="text-body-sm text-text-muted">
                  One hover: source ID, claim, confidence, evidence count, integrity status, timestamp.
                  No hidden provenance.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          className="py-20 px-4 sm:px-6 lg:px-8 bg-surface-muted/50"
          aria-labelledby="cta-heading"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="cta-heading" className="text-heading-xl font-bold text-text mb-6">
              Ready to See What AI Knows?
            </h2>
            <p className="text-body-lg text-text-muted mb-8">
              Connect your brand, define buyer queries, run your first AtlasCycle. 14-day trial.
              No credit card. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3 text-base font-medium bg-brand text-background rounded-lg hover:bg-brand-hover transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/demo"
                className="w-full sm:w-auto px-8 py-3 text-base font-medium border border-border text-text rounded-lg hover:bg-surface-muted transition-colors"
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

