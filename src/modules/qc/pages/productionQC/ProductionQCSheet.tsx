import { Printer } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { ProductionQCEntry, ProductionQCStatus } from '../../types/productionQC.types';
import {
  formDate,
  sheetColumns,
  sheetRows,
  sheetTime as time,
} from '../../utils/productionQCSheet';
import { useProductionQCSheetPrint } from './useProductionQCSheetPrint';

/**
 * A day's checks of one parameter type, laid out as the paper record QA keeps
 * (e.g. QA-FRM-14-01-05-02, the on-line monitoring record): one column per check,
 * headed by its time; the product, SKU and line on top, then each parameter with
 * its unit; remarks and the chemist / QAM at the foot.
 */

const STATUS_TEXT: Record<ProductionQCStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'text-blue-700 dark:text-blue-400' },
  SENT_BACK: { label: 'Sent back', className: 'text-amber-700 dark:text-amber-400' },
  APPROVED: { label: 'Approved', className: 'text-green-700 dark:text-green-400' },
};

// Every cell is boxed, as on the sheet. The first three columns stay put while
// the time columns scroll under them.
const cell = 'border border-border px-2 py-1.5 align-top';
const stickySr = 'sticky left-0 z-10 w-12 min-w-12 bg-card text-center';
const stickyName = 'sticky left-12 z-10 w-48 min-w-48 bg-card';
const stickyUom = 'sticky left-60 z-10 w-24 min-w-24 bg-card';
const valueCell = 'min-w-[8.5rem] max-w-[12rem] whitespace-normal break-words';

export function ProductionQCSheet({
  title,
  description,
  documentCode = '',
  revision = '',
  revisionDate = null,
  day,
  entries,
}: {
  /** The parameter type's name — the form's title. */
  title: string;
  description?: string;
  /** The paper form's controlled-document code and revision, for the print. */
  documentCode?: string;
  revision?: string;
  revisionDate?: string | null;
  /** YYYY-MM-DD. */
  day: string;
  entries: ProductionQCEntry[];
}) {
  const { print, printPortal } = useProductionQCSheetPrint();
  const columns = sheetColumns(entries);
  const rows = sheetRows(columns);

  const footRow = (label: string, value: (entry: ProductionQCEntry) => React.ReactNode) => (
    <tr key={label}>
      <td className={cn(cell, stickySr)} />
      <td className={cn(cell, stickyName, 'font-medium')}>{label}</td>
      <td className={cn(cell, stickyUom)} />
      {columns.map((entry) => (
        <td key={entry.id} className={cn(cell, valueCell)}>
          {value(entry)}
        </td>
      ))}
    </tr>
  );

  return (
    <section
      aria-label={`${title} record`}
      className="overflow-hidden rounded-md border bg-card text-card-foreground"
    >
      <header className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-bold uppercase tracking-wide">{title}</h3>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium">Date: {formDate(day)}</p>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Print the ${title} sheet`}
            onClick={() =>
              print({ title, documentCode, revision, revisionDate, day, entries: columns })
            }
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted">
              <th className={cn(cell, stickySr, 'bg-muted font-semibold')}>Sr No.</th>
              <th className={cn(cell, stickyName, 'bg-muted text-left font-semibold')}>
                Parameters
              </th>
              <th className={cn(cell, stickyUom, 'bg-muted text-left font-semibold')}>UOM</th>
              {columns.map((entry) => (
                <th key={entry.id} className={cn(cell, valueCell, 'text-left font-semibold')}>
                  <Link
                    to={`/qc/qa-reports/entries/${entry.id}`}
                    className="hover:underline"
                    aria-label={`Entry #${entry.id} at ${time(entry.checked_at)}`}
                  >
                    Time {time(entry.checked_at)}
                  </Link>
                  <span
                    className={cn('block text-xs font-normal', STATUS_TEXT[entry.status].className)}
                  >
                    #{entry.id} · {STATUS_TEXT[entry.status].label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key}>
                <td className={cn(cell, stickySr)}>{index + 1}</td>
                <td className={cn(cell, stickyName)}>{row.name}</td>
                <td className={cn(cell, stickyUom, 'text-muted-foreground')}>{row.uom || '-'}</td>
                {columns.map((entry) => {
                  const result = row.byEntry.get(entry.id);
                  const out = result?.is_within_spec === false;
                  return (
                    <td
                      key={entry.id}
                      className={cn(
                        cell,
                        valueCell,
                        out &&
                          'bg-red-50 font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-400',
                      )}
                      title={out ? `Out of spec (${result?.standard_value})` : undefined}
                    >
                      {result?.result_value || (result ? '-' : '')}
                    </td>
                  );
                })}
              </tr>
            ))}
            {footRow('Remarks', (entry) => entry.remarks || '')}
            {footRow('Q.A Chemist', (entry) => entry.submitted_by_name ?? '')}
            {footRow('Q.A.M', (entry) =>
              entry.status === 'APPROVED' ? (
                (entry.approved_by_name ?? '')
              ) : (
                <span className={STATUS_TEXT[entry.status].className}>
                  {STATUS_TEXT[entry.status].label}
                </span>
              ),
            )}
          </tbody>
        </table>
      </div>

      {(documentCode || description) && (
        <footer className="flex flex-wrap justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
          <span>{description}</span>
          {documentCode && (
            <span className="font-mono">
              {documentCode}
              {revision && ` · Rev. ${revision}`}
              {revisionDate && ` · ${formDate(revisionDate)}`}
            </span>
          )}
        </footer>
      )}
      {printPortal}
    </section>
  );
}
