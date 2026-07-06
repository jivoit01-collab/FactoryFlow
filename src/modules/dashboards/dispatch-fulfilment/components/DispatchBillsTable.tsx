import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useDebounce } from '@/shared/hooks';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui';
import { cn, formatCurrency, formatDate, formatNumber } from '@/shared/utils';

import { useDispatchBills } from '../api';
import { BILL_PAGE_SIZE, BILL_STATUS_TABS, STATUS_COLORS } from '../constants';
import type { BillRow } from '../types';

function StatusPill({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const color = STATUS_COLORS[value] ?? '#898781';
  return (
    <Badge variant="outline" style={{ borderColor: color, color }}>
      {value}
    </Badge>
  );
}

function pct(rate: number | null): string {
  return rate === null || rate === undefined ? '—' : `${(rate * 100).toFixed(0)}%`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium break-words">{value || '—'}</div>
    </div>
  );
}

interface Props {
  from: string;
  to: string;
}

export function DispatchBillsTable({ from, to }: Props) {
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<BillRow | null>(null);

  // reset to the first page whenever the query changes
  useEffect(() => {
    setOffset(0);
  }, [status, search, from, to]);

  const query = useDispatchBills({
    from,
    to,
    status: status || undefined,
    search: search || undefined,
    limit: BILL_PAGE_SIZE,
    offset,
  });

  const data = query.data;
  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const counts = data?.status_counts ?? {};
  const shownFrom = count === 0 ? 0 : offset + 1;
  const shownTo = Math.min(offset + BILL_PAGE_SIZE, count);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Bills</CardTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoice / customer…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-[240px] pl-8"
            />
          </div>
        </div>
        {/* status tabs */}
        <div className="flex flex-wrap gap-2">
          {BILL_STATUS_TABS.map((tab) => {
            const n = counts[tab.countKey];
            return (
              <Button
                key={tab.key || 'all'}
                size="sm"
                variant={status === tab.key ? 'default' : 'outline'}
                onClick={() => setStatus(tab.key)}
              >
                {tab.label}
                {typeof n === 'number' && (
                  <span className="ml-1.5 text-xs opacity-70">{n}</span>
                )}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Invoice #</th>
                <th className="py-2 px-2 font-medium">Customer</th>
                <th className="py-2 px-2 font-medium">Date</th>
                <th className="py-2 px-2 font-medium">Bill status</th>
                <th className="py-2 px-2 text-right font-medium">Billed</th>
                <th className="py-2 px-2 text-right font-medium">Dispatched</th>
                <th className="py-2 px-2 font-medium">Stage</th>
                <th className="py-2 pl-2 text-right font-medium">Fulfil</th>
              </tr>
            </thead>
            <tbody className={cn(query.isFetching && 'opacity-60')}>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    {query.isLoading ? 'Loading…' : 'No bills match this filter.'}
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-2 pr-2 font-medium">{b.invoice_number}</td>
                    <td className="max-w-[180px] truncate py-2 px-2" title={b.customer_name}>
                      {b.customer_name || b.customer_code || '—'}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      {b.dispatch_date ? formatDate(b.dispatch_date) : '—'}
                    </td>
                    <td className="py-2 px-2">
                      <StatusPill value={b.booking_status} />
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {formatCurrency(b.billed_amount)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {formatCurrency(b.dispatched_amount)}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      {b.gatepass_no ? (
                        <span className="text-xs">{b.gatepass_no}</span>
                      ) : (
                        <StatusPill value={b.dispatch_stage} />
                      )}
                    </td>
                    <td
                      className={cn(
                        'py-2 pl-2 text-right tabular-nums',
                        b.fulfillment_rate !== null &&
                          b.fulfillment_rate < 0.5 &&
                          'text-destructive',
                      )}
                    >
                      {pct(b.fulfillment_rate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {shownFrom}–{shownTo} of {count}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - BILL_PAGE_SIZE))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={offset + BILL_PAGE_SIZE >= count}
              onClick={() => setOffset((o) => o + BILL_PAGE_SIZE)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* bill detail */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Invoice {selected.invoice_number}
                  <StatusPill value={selected.booking_status} />
                </SheetTitle>
                <SheetDescription>
                  {selected.customer_name || selected.customer_code || 'Unknown customer'}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 grid grid-cols-2 gap-4 px-1">
                <Field label="Billed amount" value={formatCurrency(selected.billed_amount)} />
                <Field
                  label="Dispatched amount"
                  value={formatCurrency(selected.dispatched_amount)}
                />
                <Field
                  label="Planned weight"
                  value={`${formatNumber(selected.planned_weight, 0)} kg`}
                />
                <Field
                  label="Dispatched weight"
                  value={`${formatNumber(selected.dispatched_weight, 0)} kg`}
                />
                <Field
                  label="Planned litres"
                  value={`${formatNumber(selected.planned_litres, 0)} L`}
                />
                <Field label="Dispatched boxes" value={formatNumber(selected.dispatched_boxes, 0)} />
                <Field label="Fulfilment" value={pct(selected.fulfillment_rate)} />
                <Field label="Dispatch stage" value={<StatusPill value={selected.dispatch_stage} />} />
                <Field
                  label="Dispatch date"
                  value={selected.dispatch_date ? formatDate(selected.dispatch_date) : '—'}
                />
                <Field label="Gatepass #" value={selected.gatepass_no} />
                <Field label="SAP DocEntry / Num" value={`${selected.sap_doc_entry} / ${selected.sap_doc_num || '—'}`} />
                <Field label="Place of supply" value={selected.place_of_supply} />
                <Field label="Transporter" value={selected.transporter_name} />
                <Field label="Vehicle" value={selected.vehicle_no} />
                <Field label="E-way bill" value={selected.eway_bill} />
                <Field label="Product variety" value={selected.product_variety} />
              </div>

              <div className="mt-6 px-1">
                <div className="mb-2 text-sm font-semibold">
                  Dispatches ({selected.dispatches.length})
                </div>
                {selected.dispatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Not yet dispatched — no gate-out records.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selected.dispatches.map((d, i) => (
                      <div key={i} className="rounded-md border p-3 text-sm">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-medium">{d.gatepass_no || d.sap_doc_num || '—'}</span>
                          <StatusPill value={d.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Amount: {formatCurrency(d.amount)}</span>
                          <span>Weight: {formatNumber(d.weight, 0)} kg</span>
                          <span>Boxes: {formatNumber(d.boxes, 0)}</span>
                          <span>Vehicle: {d.vehicle_no || '—'}</span>
                          <span className="col-span-2">
                            Gate out: {d.gate_out_date ? formatDate(d.gate_out_date) : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
