import { Info } from 'lucide-react';

import { cn } from '@/shared/utils';

export interface NotTrackedNoticeProps {
  /** `team` states the limits more strongly — a supervisor can act on a wrong reading. */
  audience: 'me' | 'team';
  className?: string;
}

/**
 * The honesty block. This sheet is derived from records other modules write, and a
 * third of those records do not store who acted — so "not yet" genuinely does not
 * mean "not done". Saying so plainly, above the fold and never behind a tooltip, is
 * what keeps the page from being read as a score.
 *
 * Do not move this into a collapsible or a tooltip.
 */
export function NotTrackedNotice({ audience, className }: NotTrackedNoticeProps) {
  const isTeam = audience === 'team';

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border p-3 text-sm',
        isTeam
          ? 'border-l-4 border-l-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200'
          : 'bg-muted/40 text-muted-foreground',
        className,
      )}
    >
      <Info
        className={cn('mt-0.5 h-4 w-4 shrink-0', isTeam && 'text-amber-600 dark:text-amber-400')}
      />
      {isTeam ? (
        <p>
          This board shows what the system <strong>recorded</strong>, not what people did. There is
          no attendance data, so everyone appears here every day whether or not they were working.
          Many jobs cannot record who did them, so real work is often invisible here. Use this to
          find where to ask a question — never as a performance measure.
        </p>
      ) : (
        <p>
          This sheet is built from records in the system. It can only see a job as done when the
          record stores who did it. The rest are listed as open items so you can check them yourself
          — <strong>a job showing as open does not mean it was not done.</strong>
        </p>
      )}
    </div>
  );
}
