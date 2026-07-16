// ============================================================================
// Dashboard accent palette
// ============================================================================
//
// A shared visual vocabulary for the dashboard suite. Each accent is a full
// bundle of Tailwind classes kept as complete literal strings so the JIT can
// see them (never assemble class names dynamically from these fragments).

export interface Accent {
  /** icon foreground */
  icon: string;
  /** soft icon chip background */
  iconBg: string;
  /** gradient wash for the card face (pair with `bg-gradient-to-br … to-transparent`) */
  wash: string;
  /** coloured hover glow */
  glow: string;
  /** solid accent bar */
  bar: string;
  /** hex used for recharts stroke/fill on this accent */
  hex: string;
}

export const ACCENTS = {
  blue: {
    icon: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-500/15',
    wash: 'from-blue-50/80',
    glow: 'hover:shadow-blue-200/60 dark:hover:shadow-blue-500/10',
    bar: 'bg-blue-500',
    hex: '#2a78d6',
  },
  sky: {
    icon: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-100 dark:bg-sky-500/15',
    wash: 'from-sky-50/80',
    glow: 'hover:shadow-sky-200/60 dark:hover:shadow-sky-500/10',
    bar: 'bg-sky-500',
    hex: '#0ea5e9',
  },
  indigo: {
    icon: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/15',
    wash: 'from-indigo-50/80',
    glow: 'hover:shadow-indigo-200/60 dark:hover:shadow-indigo-500/10',
    bar: 'bg-indigo-500',
    hex: '#6366f1',
  },
  teal: {
    icon: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-500/15',
    wash: 'from-teal-50/80',
    glow: 'hover:shadow-teal-200/60 dark:hover:shadow-teal-500/10',
    bar: 'bg-teal-500',
    hex: '#14b8a6',
  },
  emerald: {
    icon: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    wash: 'from-emerald-50/80',
    glow: 'hover:shadow-emerald-200/60 dark:hover:shadow-emerald-500/10',
    bar: 'bg-emerald-500',
    hex: '#1baf7a',
  },
  cyan: {
    icon: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/15',
    wash: 'from-cyan-50/80',
    glow: 'hover:shadow-cyan-200/60 dark:hover:shadow-cyan-500/10',
    bar: 'bg-cyan-500',
    hex: '#06b6d4',
  },
  amber: {
    icon: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15',
    wash: 'from-amber-50/80',
    glow: 'hover:shadow-amber-200/60 dark:hover:shadow-amber-500/10',
    bar: 'bg-amber-500',
    hex: '#eda100',
  },
  orange: {
    icon: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-500/15',
    wash: 'from-orange-50/80',
    glow: 'hover:shadow-orange-200/60 dark:hover:shadow-orange-500/10',
    bar: 'bg-orange-500',
    hex: '#f97316',
  },
  violet: {
    icon: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-100 dark:bg-violet-500/15',
    wash: 'from-violet-50/80',
    glow: 'hover:shadow-violet-200/60 dark:hover:shadow-violet-500/10',
    bar: 'bg-violet-500',
    hex: '#8b5cf6',
  },
  pink: {
    icon: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-100 dark:bg-pink-500/15',
    wash: 'from-pink-50/80',
    glow: 'hover:shadow-pink-200/60 dark:hover:shadow-pink-500/10',
    bar: 'bg-pink-500',
    hex: '#ec4899',
  },
  rose: {
    icon: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-500/15',
    wash: 'from-rose-50/80',
    glow: 'hover:shadow-rose-200/60 dark:hover:shadow-rose-500/10',
    bar: 'bg-rose-500',
    hex: '#e11d48',
  },
  slate: {
    icon: 'text-slate-600 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-500/15',
    wash: 'from-slate-50/80',
    glow: 'hover:shadow-slate-200/60 dark:hover:shadow-slate-500/10',
    bar: 'bg-slate-500',
    hex: '#64748b',
  },
} satisfies Record<string, Accent>;

export type AccentKey = keyof typeof ACCENTS;

/** Group-separated integer for counts (Indian grouping). */
export function formatCount(n: number): string {
  return n.toLocaleString('en-IN');
}
