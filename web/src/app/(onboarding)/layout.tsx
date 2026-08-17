// web/src/app/(onboarding)/layout.tsx
// Onboarding root layout

import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Onboarding — Engenox',
  description: 'Set up your AI Visibility Operating System',
};

export default function OnboardingRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface antialiased">
        {children}
      </body>
    </html>
  );
}