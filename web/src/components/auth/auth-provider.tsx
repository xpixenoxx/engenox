// web/src/components/auth/auth-provider.tsx
// WorkOS auth provider with session management

'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  organizationId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (redirectTo?: string) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    // Check for session on mount
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function login(redirectTo?: string) {
    const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
    const redirect = redirectTo ?? pathname + currentSearch;
    window.location.href = `/api/auth/login?redirect=${encodeURIComponent(redirect)}`;
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}