import { ChevronDown, ChevronRight, ReceiptText, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  Badge,
  Card,
  CardContent,
  Input,
  Label,
} from '@/shared/components/ui';
import { formatCurrency, formatDate, getErrorMessage } from '@/shared/utils';

import { useSapCashSales } from '../api/ar-invoice.queries';
import type { SapCashSaleInvoice } from '../types';
import { SapCashSalePrintButton } from './ARInvoicePrintButton';

/**
 * The window the list opens on, mirroring the backend's own default
 * (`ar_invoice.services.CASH_SALE_DEFAULT_DAYS`) so the screen and the API
 * agree on what "recent" means. The dates stay visible and editable: a list
 * whose range is hidden reads as "SAP has no such bill" when it only means
 * "not in this window".
 */
const DEFAULT_WINDOW_DAYS = 90;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

function defaultWindow() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - DEFAULT_WINDOW_DAYS);
  return { from: isoDay(from), to: isoDay(today) };
}

function InvoiceRow({ invoice }: { invoice: SapCashSaleInvoice }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className={invoice.is_cancelled ? 'opacity-60' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {invoice.doc_num ?? invoice.doc_entry}
                <span className="ml-2 font-normal text-muted-foreground">
                  {invoice.customer_name || invoice.customer_code}
                </span>
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {invoice.doc_date ? formatDate(invoice.doc_date) : '-'}
                {invoice.comments ? ` · ${invoice.comments}` : ''}
                {invoice.customer_ref ? ` · Ref ${invoice.customer_ref}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(invoice.doc_total)}
              </span>
              {invoice.is_cancelled ? <Badge variant="destructive">Cancelled</Badge> : null}
              {/* Which book the bill came from — the whole point of the SAP view. */}
              {invoice.app_posting_id ? (
                <Badge variant="secondary">Raised here</Badge>
              ) : (
                <Badge variant="outline">{invoice.sap_user || 'SAP'}</Badge>
              )}
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
          {/* Reprint the bill itself — SAP's own TAX INVOICE, for the counter's
              invoices as much as ours. A cancelled one is left out: that layout
              carries nothing to say the bill was voided, so a reprint of it
              reads as live. */}
          {invoice.is_cancelled ? null : <SapCashSalePrintButton invoice={invoice} />}
        </div>

        {open ? (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <p>
                <span className="text-muted-foreground">Branch: </span>
                {invoice.branch_name || invoice.branch_id || '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Tax: </span>
                {formatCurrency(invoice.tax_total)}
              </p>
              <p>
                <span className="text-muted-foreground">Received against it: </span>
                {formatCurrency(invoice.paid_to_date)}
              </p>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Warehouse</th>
                    <th className="px-3 py-2 text-right font-medium">Price</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="px-3 py-2 font-medium">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.line_num} className="border-t">
                      <td className="px-3 py-2">
                        <span className="font-medium">{line.item_code}</span>
                        {line.description ? (
                          <span className="block text-xs text-muted-foreground">
                            {line.description}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {line.quantity} {line.uom}
                      </td>
                      <td className="px-3 py-2">{line.warehouse_code || '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(line.price)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(line.line_total)}
                      </td>
                      <td className="px-3 py-2">{line.tax_code || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Cash sales as SAP holds them.
 *
 * This app raises cash sales, but the counter has always raised them in SAP
 * directly too, so its own History is only part of the day's book. These rows
 * are read live from SAP — they are SAP's documents, not ours, and the ones we
 * did raise are marked so it stays clear which is which.
 */
export function SapCashSaleList() {
  const [initialWindow] = useState(defaultWindow);
  const [dateFrom, setDateFrom] = useState(initialWindow.from);
  const [dateTo, setDateTo] = useState(initialWindow.to);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // SAP is queried per keystroke otherwise, and each query is a HANA read.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useMemo(
    () => ({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: debouncedSearch || undefined,
    }),
    [dateFrom, dateTo, debouncedSearch],
  );

  // A backwards window is refused by the API; don't ask it.
  const validWindow = !dateFrom || !dateTo || dateFrom <= dateTo;
  const { data, isLoading, isError, error } = useSapCashSales(query, validWindow);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <Label htmlFor="sap-cash-from">From</Label>
          <Input
            id="sap-cash-from"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sap-cash-to">To</Label>
          <Input
            id="sap-cash-to"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Label htmlFor="sap-cash-search">Search</Label>
          <Search className="absolute left-2.5 top-[2.1rem] h-4 w-4 text-muted-foreground" />
          <Input
            id="sap-cash-search"
            className="pl-8"
            placeholder="Invoice no., customer, remark, item…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {!validWindow ? (
        <p className="py-8 text-center text-sm text-red-600">
          The &quot;from&quot; date is after the &quot;to&quot; date.
        </p>
      ) : isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Reading cash sales from SAP…
        </p>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-red-600">
          {getErrorMessage(error, 'Could not read cash sales from SAP.')}
        </p>
      ) : !data || data.invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <ReceiptText className="h-8 w-8" />
          <p className="text-sm">
            No cash sales in SAP between {formatDate(data?.date_from ?? dateFrom)} and{' '}
            {formatDate(data?.date_to ?? dateTo)}.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data.count} cash sale{data.count === 1 ? '' : 's'} in SAP ·{' '}
            {formatDate(data.date_from)} to {formatDate(data.date_to)}
            {data.truncated ? ' · only the newest are shown — narrow the dates' : ''}
          </p>
          <div className="space-y-2">
            {data.invoices.map((invoice) => (
              <InvoiceRow key={invoice.doc_entry} invoice={invoice} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
