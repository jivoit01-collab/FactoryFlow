import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn, formatCurrency } from '@/shared/utils';

import type { ARInvoicePosting } from '../types';
import {
  AR_INVOICE_COLUMNS,
  invoiceAmount,
  sapReference,
} from '../utils/arInvoiceExport';
import { ARInvoiceStatusBadge } from './ARInvoiceStatusBadge';
import { ARPaymentCell } from './ARPaymentControls';

/**
 * The cells that are more than their text.
 *
 * Keyed on the column's own label so the header, the body, the clipboard and
 * the sheet all walk one list: a column added to `AR_INVOICE_COLUMNS` shows up
 * here as plain text rather than silently going missing from the table.
 */
const RICH_CELLS: Record<string, (posting: ARInvoicePosting) => ReactNode> = {
  Amount: (posting) => {
    const amount = invoiceAmount(posting);
    return amount === null ? '-' : formatCurrency(amount);
  },
  'SAP invoice': (posting) => sapReference(posting) || '-',
  Status: (posting) => <ARInvoiceStatusBadge status={posting.status} />,
  // Money in, as against document state — a POSTED bill is not a paid one,
  // which is the whole point of tracking it.
  Payment: (posting) => (
    <ARPaymentCell
      docEntry={posting.sap_doc_entry}
      docNum={posting.sap_doc_num}
      docTotal={posting.sap_doc_total ? Number(posting.sap_doc_total) : null}
      customerName={posting.customer_name || posting.customer_code}
      payment={posting.payment}
      disabledReason={
        posting.sap_doc_entry
          ? undefined
          : 'Not posted to SAP yet — there is no bill to collect against.'
      }
    />
  ),
};

/** Whether a cell's own value should read as a number would. */
const isNumeric = (label: string) => label === 'Amount' || label === 'SAP invoice';

/**
 * The invoices this app raised, one row each.
 *
 * A row is still a button onto the detail sheet — the table only changes how
 * the same records are laid out, so a day's bills can be read down a column
 * instead of down a stack of cards.
 */
export function ARInvoiceHistoryTable({
  rows,
  onSelect,
}: {
  rows: ARInvoicePosting[];
  onSelect: (posting: ARInvoicePosting) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {AR_INVOICE_COLUMNS.map((column) => (
              <th
                key={column.label}
                className={cn('px-3 py-2 font-medium', column.align === 'right' && 'text-right')}
              >
                {column.label}
              </th>
            ))}
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((posting) => (
            <tr
              key={posting.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(posting)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(posting);
                }
              }}
              className="cursor-pointer border-t transition-colors hover:bg-muted/50"
            >
              {AR_INVOICE_COLUMNS.map((column) => {
                const rich = RICH_CELLS[column.label];
                const text = column.value(posting);
                return (
                  <td
                    key={column.label}
                    className={cn(
                      'px-3 py-2',
                      column.align === 'right' && 'text-right',
                      isNumeric(column.label) && 'tabular-nums',
                      column.label === 'Customer' && 'max-w-[22rem] truncate font-medium',
                    )}
                    title={column.label === 'Customer' ? String(text) : undefined}
                  >
                    {rich ? rich(posting) : text === '' || text === null ? '-' : text}
                  </td>
                );
              })}
              <td className="px-3 py-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
