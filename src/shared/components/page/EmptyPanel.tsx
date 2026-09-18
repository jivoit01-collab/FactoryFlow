import { Inbox, Loader2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/**
 * "Nothing here" for a list that is not a table — the card-shaped counterpart
 * to `TableEmpty`, for the pages built out of stacked cards (truck boards,
 * tracking rows). Several pages each had their own one-line version of this,
 * all slightly different heights and radii.
 */
export function EmptyPanel({
  message,
  hint,
  icon: Icon = Inbox,
  /** Shows the spinner instead of the icon, for "loading" rather than "empty". */
  loading,
  action,
  className,
}: {
  message: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  loading?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-12 text-center shadow-sm',
        className,
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-muted">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Icon className="h-5 w-5 text-muted-foreground" />
        )}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{message}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
