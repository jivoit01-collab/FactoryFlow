import { Loader2 } from 'lucide-react';

import { StatusPill } from '@/shared/components/page';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useItemDocuments } from '../hooks';
import type { ReportItem, ReportSettings } from '../types';
import { dayLabel, fmtPallet, fmtWhole, measure, rangeLabel, type ReportRange } from '../utils';

/**
 * One SKU's documents over the range, or on one day -- the workbook's Data
 * sheet, filtered to it. Group companies' lines are listed so the total can be checked against
 * SAP, but marked, because the report does not count them.
 */
export function ItemDocumentsDialog({
  range,
  item,
  settings,
  onClose,
}: {
  range: ReportRange;
  item: ReportItem | null;
  settings: ReportSettings;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useItemDocuments(range, item?.item_code ?? null);
  const lines = data?.lines ?? [];
  const counted = (kind: 'PRODUCTION' | 'DISPATCH') =>
    lines
      .filter((line) => line.kind === kind && !line.is_group)
      .reduce((sum, line) => sum + line.quantity, 0);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {item?.item_code} · {item?.item_name}
          </DialogTitle>
          <DialogDescription>
            Production and dispatch documents, {rangeLabel(range)}.
            {item && data
              ? ` Counted: ${fmtWhole(counted('PRODUCTION'))} produced, ${fmtWhole(counted('DISPATCH'))} dispatched.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Reading SAP…
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">
            {getErrorMessage(error, 'The documents could not be read.')}
          </p>
        ) : lines.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No documents in this range.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  {[
                    'Date',
                    'Type',
                    'Doc No.',
                    'Customer',
                    'Warehouse',
                    'Qty',
                    'Box',
                    'Liter',
                    'PALLET',
                  ].map((header, index) => (
                    <th
                      key={header}
                      scope="col"
                      className={cn(
                        'whitespace-nowrap px-3 py-2 font-medium',
                        index >= 5 ? 'text-right' : 'text-left',
                      )}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const figures = item ? measure(line.quantity, item, settings) : null;
                  return (
                    <tr
                      key={`${line.doc_type}-${line.doc_num}-${index}`}
                      className={cn('border-t', line.is_group && 'text-muted-foreground')}
                    >
                      <td className="whitespace-nowrap px-3 py-1.5">{dayLabel(line.date)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5">{line.doc_type}</td>
                      <td className="px-3 py-1.5 font-mono text-xs">{line.doc_num}</td>
                      <td
                        className="max-w-[240px] truncate px-3 py-1.5"
                        title={line.card_name ?? undefined}
                      >
                        {line.card_name ?? '—'}
                        {line.is_group && (
                          <StatusPill tone="neutral" className="ml-2">
                            Group — not counted
                          </StatusPill>
                        )}
                      </td>
                      <td className="px-3 py-1.5">{line.warehouse}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {fmtWhole(line.quantity)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {figures ? fmtWhole(figures.box) : ''}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {figures ? fmtWhole(figures.litres) : ''}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {figures ? fmtPallet(figures.pallet) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
