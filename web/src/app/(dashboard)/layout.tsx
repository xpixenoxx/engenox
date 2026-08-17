// web/src/app/(dashboard)/layout.tsx
// Dashboard layout with sidebar navigation and auth protection

'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { clsx } from 'clsx';
import { AlertTriangle, BarChart2, FileText, GitBranch, HelpCircle, LayoutDashboard, Menu, Scale, Search, Settings, Shield, Users, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Perception', href: '/dashboard/perception', icon: Search },
  { name: 'Conflicts', href: '/dashboard/conflicts', icon: AlertTriangle },
  { name: 'Interventions', href: '/dashboard/interventions', icon: Zap },
  { name: 'Consent', href: '/dashboard/consent', icon: Scale },
  { name: 'Brand Card', href: '/dashboard/brand-card', icon: FileText },
  { name: 'Report', href: '/dashboard/report', icon: BarChart2 },
  { name: 'Competitors', href: '/dashboard/competitors', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
    }
  }, [user, loading, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-surface-raised border-r border-border transform transition-transform duration-fast lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border lg:justify-start lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-brand">
            <span aria-hidden="true">🧭</span>
            <span>Engenox</span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1" aria-label="Dashboard navigation">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const testIdMap: Record<string, string> = {
              Conflicts: 'nav-conflicts',
              Consent: 'nav-consent',
              Interventions: 'nav-interventions',
            };
            return (
              <Link
                key={item.name}
                href={item.href}
                data-testid={testIdMap[item.name] || undefined}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand/10 text-brand border border-brand/20'
                    : 'text-text-muted hover:bg-surface-muted hover:text-text'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border lg:static">
          <Link
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm font-medium text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
            Documentation
          </Link>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyUp={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:pl-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-text-muted hover:bg-surface-muted hover:text-text transition-colors lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 lg:flex-lg-none" />

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-body-sm text-text-muted">
              {user.email}
            </div>
            <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-medium text-body-sm">
              {user.name?.charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 pt-4 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}