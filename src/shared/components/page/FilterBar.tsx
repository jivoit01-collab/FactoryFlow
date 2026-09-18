import { Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

/**
 * The filter toolbar every list page in the module wears: a quiet "Filters"
 * strip naming what is being narrowed, the controls in a wrapping row beneath
 * it, and Reset plus the loading tick pinned to the right of the strip rather
 * than floating among the fields — where, on the old bars, they moved as soon
 * as a field was added.
 */
export interface FilterBarProps {
  children: ReactNode;
  /** Shows the spinner in the strip while a refetch is in flight. */
  isFetching?: boolean;
  /** Renders the Reset button. Omit for a bar with nothing to restore. */
  onReset?: () => void;
  /** How many filters are away from their default — shown beside the label. */
  activeCount?: number;
  /** Extra controls for the strip, left of Reset. */
  actions?: ReactNode;
  label?: string;
  className?: string;
}

export function FilterBar({
  children,
  isFetching,
  onReset,
  activeCount,
  actions,
  label = 'Filters',
  className,
}: FilterBarProps) {
  return (
    <div className={cn('rounded-xl border bg-card shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          {label}
          {!!activeCount && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
              {activeCount}
            </span>
          )}
          {isFetching && (
            <span className="flex items-center gap-1.5 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {onReset && (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-3 p-4">{children}</div>
    </div>
  );
}

/**
 * One labelled control in a filter bar. The label is the same size and weight
 * on every field, so a row of a date, a search box and a select reads as one
 * control strip instead of three.
 */
export function FilterField({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  /** Small note under the control, e.g. why the dates are being ignored. */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-1.5 sm:w-auto', className)}>
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * A control that carries its own label (a toggle, a button) sitting in the same
 * row as labelled fields — nudged down so its baseline lines up with theirs.
 */
export function FilterAction({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex w-full items-center sm:w-auto', className)}>{children}</div>;
}
