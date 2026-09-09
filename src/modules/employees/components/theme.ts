/**
 * The module's visual vocabulary, in one place.
 *
 * Three things are encoded with colour, and each is encoded differently on
 * purpose.
 *
 * **Employment status** is categorical and semantic: active reads as go, an
 * exit reads as stopped, and the two states that are neither (probation, leave)
 * read as caution rather than as failure. Every status also carries a *dot*, so
 * the state survives being printed, being read by somebody with colour-vision
 * deficiency, and being seen at a glance in a dense list — the chip text says
 * it too, and the colour is never the only signal.
 *
 * **Hierarchy level** is ordered, not categorical, so it gets an ordered ramp:
 * a cool progression from indigo at the top of the company down through blue,
 * sky, cyan and teal, flattening to slate below the sixth level. It borrows the
 * app's shared dashboard accents rather than inventing colours, so an org chart
 * sits beside a dashboard without clashing. The level number is always printed
 * next to it — the ramp is there to make depth *scannable*, never to be decoded.
 *
 * **Salary record status** is about trust in a number: in force is solid,
 * waiting is amber, scheduled is a promise, superseded is quiet, rejected is
 * struck through. These matter because a page showing three salary figures has
 * to make it obvious which one is being paid today.
 *
 * Every entry carries a dark-mode counterpart. Class strings are complete
 * literals so Tailwind's JIT can see them — never assembled from fragments.
 */
import { type Accent, type AccentKey,ACCENTS } from '@/shared/components/dashboard';

import type { EmploymentStatus, RevisionType, SalaryStatus } from '../types';

export interface StatusStyle {
  /** Chip: background, text, border. */
  chip: string;
  /** The dot in front of it, and in dense rows on its own. */
  dot: string;
  /** Ring around an avatar, for the org chart node. */
  ring: string;
  /** Whether this status means the person has gone. */
  gone?: boolean;
}

export const STATUS_STYLE: Record<EmploymentStatus, StatusStyle> = {
  ACTIVE: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-400/60 dark:ring-emerald-500/40',
  },
  PROBATION: {
    chip: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    ring: 'ring-amber-400/60 dark:ring-amber-500/40',
  },
  ON_LEAVE: {
    chip: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
    dot: 'bg-sky-500',
    ring: 'ring-sky-400/60 dark:ring-sky-500/40',
  },
  SUSPENDED: {
    chip: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30',
    dot: 'bg-orange-500',
    ring: 'ring-orange-400/60 dark:ring-orange-500/40',
  },
  INACTIVE: {
    chip: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30',
    dot: 'bg-slate-400',
    ring: 'ring-slate-300/60 dark:ring-slate-500/40',
    gone: true,
  },
  RESIGNED: {
    chip: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-300 dark:border-zinc-500/30',
    dot: 'bg-zinc-400',
    ring: 'ring-zinc-300/60 dark:ring-zinc-500/40',
    gone: true,
  },
  TERMINATED: {
    chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
    dot: 'bg-rose-500',
    ring: 'ring-rose-400/60 dark:ring-rose-500/40',
    gone: true,
  },
  RETIRED: {
    chip: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30',
    dot: 'bg-violet-500',
    ring: 'ring-violet-400/60 dark:ring-violet-500/40',
    gone: true,
  },
};

export const DEFAULT_STATUS_STYLE = STATUS_STYLE.ACTIVE;

export function statusStyle(status: EmploymentStatus | undefined): StatusStyle {
  return (status && STATUS_STYLE[status]) || DEFAULT_STATUS_STYLE;
}

/** The level ramp, top of the company first. Beyond it, everything is slate. */
export const LEVEL_ACCENTS: readonly AccentKey[] = [
  'indigo',
  'blue',
  'sky',
  'cyan',
  'teal',
  'emerald',
];

export function levelAccent(level: number): Accent {
  const key = LEVEL_ACCENTS[Math.max(0, Math.min(level - 1, LEVEL_ACCENTS.length - 1))];
  return ACCENTS[level > LEVEL_ACCENTS.length ? 'slate' : key];
}

/** Ordinal for the level chip: "L1" reads better than "Level 1" in a dense card. */
export function levelLabel(level: number): string {
  return `L${level}`;
}

export interface SalaryStatusStyle {
  chip: string;
  label: string;
  /** Struck through: the figure is not one anybody is being paid. */
  muted?: boolean;
}

export const SALARY_STATUS_STYLE: Record<SalaryStatus, SalaryStatusStyle> = {
  ACTIVE: {
    chip: 'bg-emerald-600 text-white dark:bg-emerald-600',
    label: 'In force',
  },
  SCHEDULED: {
    chip: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30',
    label: 'Starts later',
  },
  PENDING: {
    chip: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
    label: 'Awaiting approval',
  },
  DRAFT: {
    chip: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30',
    label: 'Draft',
  },
  SUPERSEDED: {
    chip: 'bg-muted text-muted-foreground border',
    label: 'Superseded',
    muted: true,
  },
  REJECTED: {
    chip: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
    label: 'Rejected',
    muted: true,
  },
};

/**
 * Revision types, tinted by what they say about the company.
 *
 * A promotion and a market correction are both raises but they are not the same
 * news, and the revision-history report is much easier to read when the reason
 * is visible before the amount.
 */
export const REVISION_STYLE: Record<RevisionType, string> = {
  ANNUAL_INCREMENT:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
  PROMOTION:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30',
  PERFORMANCE:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  ROLE_CHANGE:
    'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30',
  DEPARTMENT_TRANSFER:
    'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30',
  MARKET_ADJUSTMENT:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  BONUS:
    'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/30',
  INITIAL:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30',
  OTHER:
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30',
};

/**
 * The connector colour used by the org chart's elbows.
 *
 * A single token so the lines never fight the cards: they are structure, not
 * content, and at the density of a real chart anything stronger reads as noise.
 */
export const TREE_LINE = 'bg-border';
