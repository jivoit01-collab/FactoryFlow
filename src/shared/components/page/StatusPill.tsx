import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/**
 * A status chip with one tone vocabulary for the whole module, so "posted" is
 * the same green on the GRPO history as on the invoice queue, and a reader can
 * tell a blocked row from a done one without reading the word.
 *
 * Tones are what the row *means*, not a colour: pick `done` for a finished
 * step, `blocked` for one that failed, `progress` for one under way.
 */
export type StatusTone = 'neutral' | 'info' | 'progress' | 'done' | 'warn' | 'blocked';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral:
    'border-slate-300 bg-slate-50 text-slate-700 dark:border-border dark:bg-muted/40 dark:text-muted-foreground',
  info: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300',
  progress:
    'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300',
  done: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  warn: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300',
  blocked:
    'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300',
};

const DOT_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-slate-400',
  info: 'bg-sky-500',
  progress: 'bg-indigo-500',
  done: 'bg-emerald-500',
  warn: 'bg-amber-500',
  blocked: 'bg-rose-500',
};

export function StatusPill({
  tone = 'neutral',
  icon: Icon,
  /** Leading dot instead of an icon — reads better in a dense table column. */
  dot,
  children,
  className,
}: {
  tone?: StatusTone;
  icon?: LucideIcon;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOT_CLASSES[tone])} />}
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}
