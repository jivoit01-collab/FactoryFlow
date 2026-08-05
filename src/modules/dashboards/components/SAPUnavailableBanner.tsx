import { AlertTriangle } from 'lucide-react';

import type { ApiError } from '@/core/api';
import { Button } from '@/shared/components/ui';

interface SAPUnavailableBannerProps {
  error: ApiError;
  onRetry?: () => void;
}

export function SAPUnavailableBanner({ error, onRetry }: SAPUnavailableBannerProps) {
  const is503 = error.status === 503;

  const message = is503
    ? 'SAP is temporarily unavailable. Please try again later.'
    : 'Failed to load data from SAP. The SAP system returned an unexpected response.';

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          {is503 ? 'SAP System Unavailable' : 'SAP Data Error'}
        </p>
        <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">{message}</p>
      </div>
      {is503 && onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          Retry
        </Button>
      )}
    </div>
  );
}
