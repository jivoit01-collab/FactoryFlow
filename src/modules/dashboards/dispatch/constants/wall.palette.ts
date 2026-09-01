import { useMemo } from 'react';

import { useTheme } from '@/shared/contexts';

/**
 * Accent hues, re-stepped per theme.
 *
 * These are drawn as raw hex -- SVG strokes, recharts props, inline styles --
 * so a Tailwind `dark:` variant cannot reach them and they have to be resolved
 * in JS. They are not the same colours twice at different opacities either: a
 * hue chosen to glow against near-black is washed out on white, so the light set
 * is a genuinely darker, more saturated step rather than a tint of the dark one.
 */
export type WallHueKey =
  | 'value'
  | 'trucks'
  | 'invoices'
  | 'boxes'
  | 'volume'
  | 'weight'
  | 'backlog'
  | 'neutral'
  // Production wall. Named for what they measure rather than reused from the
  // dispatch set: "cases" and "boxes" happen to share a hue today, and a future
  // re-step of one must not silently move the other.
  | 'cases'
  | 'litres'
  | 'runs'
  | 'cost'
  | 'waste'
  | 'match'
  | 'material';

const DARK: Record<WallHueKey, string> = {
  value: '#60a5fa',
  trucks: '#34d399',
  invoices: '#22d3ee',
  boxes: '#a78bfa',
  volume: '#fbbf24',
  weight: '#f472b6',
  backlog: '#fb923c',
  neutral: '#e2e8f0',
  cases: '#a78bfa',
  litres: '#fbbf24',
  runs: '#34d399',
  cost: '#60a5fa',
  waste: '#fb7185',
  match: '#22d3ee',
  material: '#f472b6',
};

const LIGHT: Record<WallHueKey, string> = {
  value: '#2563eb',
  trucks: '#059669',
  invoices: '#0891b2',
  boxes: '#7c3aed',
  volume: '#b45309',
  weight: '#db2777',
  backlog: '#ea580c',
  neutral: '#334155',
  cases: '#7c3aed',
  litres: '#b45309',
  runs: '#059669',
  cost: '#2563eb',
  waste: '#e11d48',
  match: '#0891b2',
  material: '#db2777',
};

/** Company blocks, in rank order. Same reasoning as the accents above. */
const COMPANY_DARK = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#22d3ee'];
const COMPANY_LIGHT = ['#059669', '#2563eb', '#b45309', '#db2777', '#0891b2'];

export interface WallPalette {
  isDark: boolean;
  /** One accent hue, resolved for the active theme. */
  hue: (key: WallHueKey) => string;
  /** Nth company block colour, wrapping past the end of the list. */
  company: (index: number) => string;
  /** Chart furniture: grid, axis labels, the best-day step, tooltip surface. */
  chart: {
    grid: string;
    gridOpacity: number;
    axis: string;
    baseline: string;
    tooltipBg: string;
    tooltipBorder: string;
    /** Painted inside the hollow "today" marker, so it must match the surface. */
    surface: string;
  };
}

export function useWallPalette(): WallPalette {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return useMemo(() => {
    const hues = isDark ? DARK : LIGHT;
    const companies = isDark ? COMPANY_DARK : COMPANY_LIGHT;
    return {
      isDark,
      hue: (key: WallHueKey) => hues[key],
      company: (index: number) => companies[index % companies.length],
      chart: {
        grid: isDark ? '#ffffff' : '#0f172a',
        gridOpacity: isDark ? 0.06 : 0.08,
        axis: isDark ? '#64748b' : '#64748b',
        baseline: isDark ? '#94a3b8' : '#475569',
        tooltipBg: isDark ? '#0d1424' : '#ffffff',
        tooltipBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)',
        surface: isDark ? '#020817' : '#ffffff',
      },
    };
  }, [isDark]);
}
