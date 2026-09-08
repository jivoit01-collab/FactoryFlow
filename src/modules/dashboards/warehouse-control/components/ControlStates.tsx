import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';
import { getErrorMessage } from '@/shared/utils/error';

// ============================================================================
// Skeletons
// ============================================================================

/**
 * A grey bar standing in for text that has not arrived.
 *
 * Panels show their real shape while loading rather than a centred spinner, so
 * the board does not jump around as each feed lands at its own speed.
 */
export function ControlSkeletonBar({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />;
}

/** Placeholder rows matching the list a panel is about to render. */
export function ControlSkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-px overflow-hidden rounded-lg border">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 bg-card px-3 py-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <ControlSkeletonBar className="h-3.5 w-1/3" />
            <ControlSkeletonBar className="h-3 w-2/3" />
          </div>
          <ControlSkeletonBar className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty / error
// ============================================================================

export function ControlEmpty({ message }: { message: string }) {
  return (
    <div className="flex min-h-[96px] items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

interface ControlErrorProps {
  /** Whatever the query threw — the real message is dug out of it. */
  error: unknown;
  /** What the board was trying to do, used when the error carries no message. */
  fallback: string;
  onRetry?: () => void;
}

/**
 * Any failed read, shown with the server's own words.
 *
 * The board deliberately does not sort errors into "SAP is down" and "something
 * else": a panel that hides the reason behind a friendly sentence leaves the
 * reader with nothing to act on or report. Whatever the backend said — a SAP
 * connection failure, a missing procedure, a permission refusal — is printed as
 * it came, with the status code beside it so it can be quoted straight into a
 * ticket.
 */
export function ControlError({ error, fallback, onRetry }: ControlErrorProps) {
  const status = (error as { status?: number })?.status;
  const message = getErrorMessage(error, fallback);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {status ? `Could not load (HTTP ${status})` : 'Could not load'}
          </p>
          <p className="mt-0.5 break-words text-sm text-amber-800 dark:text-amber-300">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-7 shrink-0 border-amber-300 bg-transparent px-2 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
