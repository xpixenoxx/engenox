'use client';
// web/src/app/(auth)/login/page.tsx
// Login — WorkOS AuthKit entry point

import { Button } from '@engenox/design-system/primitives';
import { ArrowRight, Chrome, Github, Gitlab, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-brand font-bold text-heading-xl">
            <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" role="img" aria-label="Engenox logo">
              <title>Engenox logo</title>
              <rect width="32" height="32" rx="8" fill="currentColor"/>
              <path d="M8 16h16M16 8v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Engenox
          </a>
          <p className="text-body-sm text-text-muted mt-2">AI Visibility Operating System</p>
        </div>

        {/* Sign in card */}
        <div className="bg-surface-elevated rounded-xl border border-border p-8">
          <h1 className="text-heading-lg font-bold text-text text-center mb-2">Welcome back</h1>
          <p className="text-body-sm text-text-muted text-center mb-8">Sign in to continue to your dashboard</p>

          {/* WorkOS AuthKit - Primary */}
          <div className="space-y-4">
            <Button variant="primary" className="w-full justify-center gap-2" size="lg" onClick={() => window.location.href = '/api/auth/login'}>
              <Mail className="h-5 w-5" />Continue with Email
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-body-xs text-text-muted">
                <span className="bg-surface-elevated px-2">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button variant="secondary" size="lg" className="gap-2" onClick={() => window.location.href = '/api/auth/login?provider=github'}>
                <Github className="h-5 w-5" />
              </Button>
              <Button variant="secondary" size="lg" className="gap-2" onClick={() => window.location.href = '/api/auth/login?provider=google'}>
                <Chrome className="h-5 w-5" />
              </Button>
              <Button variant="secondary" size="lg" className="gap-2" onClick={() => window.location.href = '/api/auth/login?provider=gitlab'}>
                <Gitlab className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Demo / Trial link */}
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-body-xs text-text-muted text-center mb-4">
              Don't have an account?{' '}
              <a href="/onboarding" className="text-brand hover:underline font-medium">Start your trial</a>
            </p>
            <p className="text-body-xs text-text-muted text-center">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-brand hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" className="text-brand hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 text-center">
          <p className="text-body-xs text-text-muted mb-3">Trusted by forward-thinking teams</p>
          <div className="flex items-center justify-center gap-8 text-text-muted/50">
            <span className="text-body-xs font-medium">Pixenox Solutions</span>
            <span className="text-body-xs font-medium">Engenox Founding Team</span>
          </div>
        </div>
      </div>
    </div>
  );
}

