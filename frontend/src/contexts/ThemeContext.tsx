'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
export type ColorTheme = 'gold' | 'steel' | 'sage' | 'mauve';

export const COLOR_THEMES: Array<{
  id: ColorTheme;
  label: string;
  primary: string;
  secondary: string;
}> = [
  { id: 'gold', label: 'Warm Gold', primary: '#c9a96e', secondary: '#a88b7a' },
  { id: 'steel', label: 'Cool Steel', primary: '#7b9ab8', secondary: '#a8a0b8' },
  { id: 'sage', label: 'Deep Sage', primary: '#6b9e7a', secondary: '#a89478' },
  { id: 'mauve', label: 'Dusty Mauve', primary: '#b5838a', secondary: '#9a8578' },
];

interface ThemeContextType {
  theme: Theme;
  colorTheme: ColorTheme;
  toggleTheme: () => void;
  setColorTheme: (ct: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'theme';
const COLOR_THEME_KEY = 'color-theme';

function applyColorTheme(ct: ColorTheme) {
  const root = document.documentElement;
  COLOR_THEMES.forEach((t) => root.classList.remove(`theme-${t.id}`));
  if (ct !== 'gold') {
    root.classList.add(`theme-${ct}`);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('cyan');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = storedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');

    const storedColor = localStorage.getItem(COLOR_THEME_KEY) as ColorTheme | null;
    const initialColor = storedColor && COLOR_THEMES.some((t) => t.id === storedColor) ? storedColor : 'gold';
    setColorThemeState(initialColor);
    applyColorTheme(initialColor);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const setColorTheme = (ct: ColorTheme) => {
    setColorThemeState(ct);
    localStorage.setItem(COLOR_THEME_KEY, ct);
    applyColorTheme(ct);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, colorTheme, toggleTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    return {
      theme: 'light' as Theme,
      colorTheme: 'gold' as ColorTheme,
      toggleTheme: () => {},
      setColorTheme: (_ct: ColorTheme) => {},
    };
  }
  return ctx;
}

export function useThemeColors() {
  const { colorTheme } = useTheme();
  const [colors, setColors] = useState({ primary: '#c9a96e', secondary: '#a88b7a' });

  useEffect(() => {
    const root = document.documentElement;
    const s = getComputedStyle(root);
    setColors({
      primary: s.getPropertyValue('--color-primary-hex').trim() || '#06b6d4',
      secondary: s.getPropertyValue('--color-secondary-hex').trim() || '#8b5cf6',
    });
  }, [colorTheme]);

  return colors;
}
