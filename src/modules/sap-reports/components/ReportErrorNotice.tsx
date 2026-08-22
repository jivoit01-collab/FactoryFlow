import { AlertTriangle } from 'lucide-react';

import { Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

interface Props {
  error: unknown;
  onRetry?: () => void;
  fallback?: string;
}

/**
 * What went wrong with a report, in SAP's own words.
 *
 * These queries are authored in SAP by people outside this app, so a failure is
 * usually a fixable statement — an invalid column, a renamed procedure, a filter
 * SAP rejected. Hiding that behind "something went wrong" would leave the person
 * who can actually fix it with nothing to go on, so the server's detail is shown
 * verbatim.
 */
export function ReportErrorNotice({ error, onRetry, fallback }: Props) {
  const message = getErrorMessage(error, fallback ?? 'This report could not be run.');

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Report could not be run
        </p>
        <p className="mt-0.5 break-words text-sm text-amber-700 dark:text-amber-400">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          Retry
        </Button>
      )}
    </div>
  );
}
