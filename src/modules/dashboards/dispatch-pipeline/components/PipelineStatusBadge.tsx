import { cn } from '@/shared/utils';

import { PIPELINE_STAGE_BADGE_CLASSES } from '../constants';
import type { PipelineStatus } from '../types';

/** One shared "<status> at <module>" badge (e.g. "docked at dock"), colored by
 * stage. Renders "-" when there is no status (e.g. a non-dispatch gate-in). */
export function PipelineStatusBadge({
  status,
  className,
}: {
  status?: PipelineStatus | null;
  className?: string;
}) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }
  const classes = PIPELINE_STAGE_BADGE_CLASSES[status.stage] ?? PIPELINE_STAGE_BADGE_CLASSES.BOOKED;
  const rejected = status.counts?.rejected ?? 0;
  return (
    <span
      title={status.stage_label}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        classes,
        className,
      )}
    >
      {status.module_label}
      {rejected > 0 ? ` · ${rejected} cancelled` : ''}
    </span>
  );
}
