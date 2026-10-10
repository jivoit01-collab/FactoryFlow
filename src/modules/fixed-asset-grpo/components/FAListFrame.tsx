import { AlertCircle, RefreshCw } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button, Card } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import type { PaginatedResponse } from '../types';
import { emptyPageFallback } from '../utils/faGrpo.utils';

/**
 * The card every Fixed Asset GRPO list sits in: loading, a refusal or SAP
 * error with a retry, the empty message, the table, and the pager.
 */
export function FAListFrame<T>({
  data,
  isLoading,
  error,
  onRetry,
  emptyText,
  pageSize,
  onPageChange,
  onPageSizeChange,
  children,
}: {
  data: PaginatedResponse<T> | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  emptyText: string;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  children: ReactNode;
}) {
  // An empty page past page 1 (its last row was just linked, posted or
  // closed) would show the empty message with no pager: step back instead.
  const fallbackPage = isLoading || error ? null : emptyPageFallback(data);
  useEffect(() => {
    if (fallbackPage !== null) onPageChange(fallbackPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackPage]);

  return (
    <Card className="overflow-hidden">
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="flex-1 text-sm text-muted-foreground">
            {getErrorMessage(error, 'Could not load this list.')}
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      ) : !data || data.results.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <>
          <div className="overflow-x-auto">{children}</div>
          <PaginationControls
            page={data.page}
            pageSize={pageSize}
            total={data.count}
            totalPages={data.total_pages}
            isLoading={isLoading}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </Card>
  );
}
