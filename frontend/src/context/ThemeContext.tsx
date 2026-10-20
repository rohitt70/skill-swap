
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

type Theme = 'LIGHT' | 'DARK' | 'SYSTEM';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemIsDark(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>('SYSTEM');
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load the saved preference once on the client.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('skillswap_theme');

      if (
        saved === 'LIGHT' ||
        saved === 'DARK' ||
        saved === 'SYSTEM'
      ) {
        setThemeState(saved);
      }
    } catch {
      // Storage may be unavailable; keep the default.
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia(
      '(prefers-color-scheme: dark)',
    );

    const applyTheme = () => {
      const dark =
        theme === 'DARK' ||
        (theme === 'SYSTEM' && mediaQuery.matches);

      setIsDark(dark);

      document.documentElement.classList.toggle('dark', dark);

      document.documentElement.style.colorScheme = dark
        ? 'dark'
        : 'light';
    };

    applyTheme();

    if (theme === 'SYSTEM') {
      mediaQuery.addEventListener('change', applyTheme);
    }

    try {
      localStorage.setItem('skillswap_theme', theme);
    } catch {
      // Theme still works for this session without storage.
    }

    return () => {
      mediaQuery.removeEventListener('change', applyTheme);
    };
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
