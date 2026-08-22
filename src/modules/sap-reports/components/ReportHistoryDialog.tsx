import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { formatDateTimeShort } from '@/shared/utils';

import { useSapReportRuns } from '../api';

interface Props {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Who ran this report, with which filters, and what came back.
 *
 * Fetched only while the dialog is open — a run history nobody asked for is not
 * worth a request on every report page view.
 */
export function ReportHistoryDialog({ slug, open, onOpenChange }: Props) {
  const query = useSapReportRuns(slug, open);
  const runs = query.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Recent runs</DialogTitle>
          <DialogDescription>
            The last 50 times this report was run, newest first.
          </DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <div className="h-24 animate-pulse rounded bg-muted/40" />
        ) : query.isError ? (
          <p className="text-sm text-muted-foreground">The run history could not be loaded.</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">This report has not been run yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1.5 pr-4 font-medium">When</th>
                  <th className="py-1.5 pr-4 font-medium">By</th>
                  <th className="py-1.5 pr-4 font-medium">Filters</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Rows</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Took</th>
                  <th className="py-1.5 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((record) => (
                  <tr key={record.id} className="border-t">
                    <td className="whitespace-nowrap py-1.5 pr-4">
                      {formatDateTimeShort(record.created_at)}
                    </td>
                    <td className="py-1.5 pr-4">{record.run_by_name || '—'}</td>
                    <td className="py-1.5 pr-4 text-muted-foreground">
                      {Object.values(record.parameters).join(', ') || '—'}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {record.row_count.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {(record.duration_ms / 1000).toFixed(1)}s
                    </td>
                    <td className="py-1.5">
                      {record.status === 'SUCCESS' ? (
                        <span className="text-muted-foreground">
                          {record.export_format ? record.export_format.toUpperCase() : 'On screen'}
                        </span>
                      ) : (
                        <span className="text-destructive">{record.error_message}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
