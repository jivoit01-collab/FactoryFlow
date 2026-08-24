import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { URGENCY_CLASS, URGENCY_META } from '../constants';
import type { Urgency } from '../types';

/** The one-word answer to "does this need me today?". */
export function UrgencyPill({ urgency, className }: { urgency: Urgency; className?: string }) {
  const meta = URGENCY_META[urgency];
  return (
    <Badge
      variant="outline"
      className={cn('whitespace-nowrap font-medium', URGENCY_CLASS[urgency], className)}
    >
      {meta?.label ?? urgency}
    </Badge>
  );
}

/**
 * Marks a figure the app derived rather than read.
 *
 * SAP holds the plan as one monthly number. A daily or weekly figure is this
 * module's arithmetic, and it must never be mistaken for a target somebody set —
 * so the distinction is on the cell, not buried in a tooltip.
 */
export function DerivedMark({ className }: { className?: string }) {
  return (
    <span
      title="Derived — SAP states only the monthly total; this figure was spread across working days."
      className={cn('ml-1 cursor-help align-super text-[10px] text-muted-foreground', className)}
    >
      ~
    </span>
  );
}
