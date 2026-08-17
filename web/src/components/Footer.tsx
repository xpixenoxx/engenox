// web/src/components/Footer.tsx
// Site footer — navigation, legal, social links

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border bg-surface-muted/30" role="contentinfo">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-brand mb-4" aria-label="Engenox Home">
              <span aria-hidden="true">🧭</span>
              <span>Engenox</span>
            </Link>
            <p className="text-body-sm text-text-muted">
              AI Visibility Operating System. Perceive → Diagnose → Propose → Measure.
            </p>
          </div>
          <nav aria-label="Product">
            <h4 className="font-semibold text-text mb-4">Product</h4>
            <ul className="space-y-2 text-body-sm text-text-muted">
              <li><Link href="/features" className="hover:text-text transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-text transition-colors">Pricing</Link></li>
              <li><Link href="/docs" className="hover:text-text transition-colors">Documentation</Link></li>
              <li><Link href="/changelog" className="hover:text-text transition-colors">Changelog</Link></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <h4 className="font-semibold text-text mb-4">Company</h4>
            <ul className="space-y-2 text-body-sm text-text-muted">
              <li><Link href="/about" className="hover:text-text transition-colors">About</Link></li>
              <li><Link href="/blog" className="hover:text-text transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="hover:text-text transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-text transition-colors">Contact</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h4 className="font-semibold text-text mb-4">Legal</h4>
            <ul className="space-y-2 text-body-sm text-text-muted">
              <li><Link href="/privacy" className="hover:text-text transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-text transition-colors">Terms</Link></li>
              <li><Link href="/security" className="hover:text-text transition-colors">Security</Link></li>
              <li><Link href="/cookies" className="hover:text-text transition-colors">Cookies</Link></li>
            </ul>
          </nav>
        </div>
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-body-xs text-text-muted">
            © {new Date().getFullYear()} Engenox. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://twitter.com/engenox" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text transition-colors" aria-label="Twitter">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.915L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://github.com/engenox" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text transition-colors" aria-label="GitHub">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            </a>
            <a href="https://linkedin.com/company/engenox" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text transition-colors" aria-label="LinkedIn">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 21.571V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}