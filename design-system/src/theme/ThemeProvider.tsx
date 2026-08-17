// design-system/src/theme/ThemeProvider.tsx
// Theme provider for Storybook and app — manages light/dark mode via class strategy

import * as React from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark';
  enableSystem?: boolean;
  storageKey?: string;
}

const DEFAULT_STORGAGE_KEY = 'engenox-theme';

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  enableSystem = true,
  storageKey = DEFAULT_STORGAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return defaultTheme;

    const stored = localStorage.getItem(storageKey) as 'light' | 'dark' | null;
    if (stored) return stored;

    if (enableSystem && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = React.useState(theme);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem(storageKey, theme);
    setResolvedTheme(theme);
  }, [theme, storageKey]);

  React.useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enableSystem, storageKey]);

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

const ThemeContext = React.createContext<{
  theme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
} | null>(null);

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}