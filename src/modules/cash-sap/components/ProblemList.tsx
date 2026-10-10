import { AlertTriangle, Info } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { DateWarning, SapProblem } from '../types';

/**
 * A plan's problems: the blocking ones in red, the rest (warnings and notes)
 * in amber. Renders nothing when there is nothing to say.
 */
export function ProblemList({
  problems,
  className,
  compact = false,
}: {
  problems: SapProblem[];
  className?: string;
  compact?: boolean;
}) {
  if (problems.length === 0) return null;
  const blocking = problems.filter((p) => p.blocking);
  const other = problems.filter((p) => !p.blocking);
  return (
    <div className={cn('space-y-2', className)}>
      {blocking.length > 0 && (
        <ul
          className={cn(
            'space-y-1 rounded-md border border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300',
            compact ? 'p-2 text-xs' : 'p-3 text-sm',
          )}
        >
          {blocking.map((p, i) => (
            <li key={`${p.code}-${i}`} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {!compact && <span className="font-mono text-[10px] opacity-70">{p.code} · </span>}
                {p.message}
              </span>
            </li>
          ))}
        </ul>
      )}
      {other.length > 0 && (
        <ul
          className={cn(
            'space-y-1 rounded-md border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
            compact ? 'p-2 text-xs' : 'p-3 text-sm',
          )}
        >
          {other.map((p, i) => (
            <li key={`${p.code}-${i}`} className="flex gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{p.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Date warnings, amber, one line each. */
export function DateWarningList({
  warnings,
  className,
}: {
  warnings: DateWarning[];
  className?: string;
}) {
  if (warnings.length === 0) return null;
  return (
    <ul
      className={cn(
        'space-y-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
        className,
      )}
    >
      {warnings.map((w, i) => (
        <li key={`${w.code}-${w.field}-${i}`} className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  );
}
