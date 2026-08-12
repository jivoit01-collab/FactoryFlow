import { CheckSquare, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Checkbox } from '@/shared/components/ui';

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import { useDispatchBills, useSubmitBillSelection } from '../api';
import { DispatchPlanFilters } from '../components';
import { createDefaultDispatchPlanFilters } from '../constants';
import type { DispatchBill, DispatchPlanFilters as DispatchPlanFiltersType } from '../types';

function isSAPError(error: unknown): error is ApiError {
  const status = (error as ApiError)?.status;
  return status === 502 || status === 503;
}

const fmtNum = (v?: number | null) =>
  v === undefined || v === null ? '—' : Number(v).toLocaleString('en-IN');

/**
 * Bill Selection — the step BEFORE the Dispatch Plan page. Planners tick the
 * bills that should enter dispatch planning; on Submit only those appear on the
 * Plan page for vehicle linking. Selection is company-wide (shared) and Submit
 * reconciles only the bills currently shown.
 */
export default function DispatchBillSelectionPage() {
  const [filters, setFilters] = useState<DispatchPlanFiltersType>(createDefaultDispatchPlanFilters);
  const billsQuery = useDispatchBills(filters);

  // Selected bills stay on this page. They used to be filtered out the moment
  // they were submitted, which meant a bill added by mistake could never be
  // taken back off — the only screen that can reverse a selection was the one
  // screen that refused to show it.
  const bills = useMemo<DispatchBill[]>(() => billsQuery.data?.data ?? [], [billsQuery.data]);
  // Remount the board when the shown set of bills changes (e.g. after a submit
  // removes the just-selected bills) — avoids seeding state inside an effect.
  const boardKey = useMemo(() => bills.map((b) => b.doc_entry).join(','), [bills]);

  const sapApiError = isSAPError(billsQuery.error) ? billsQuery.error : null;

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Bill Selection"
        description="Pick bills to add to dispatch planning. Submitted bills move to the Plan page and leave this list."
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => billsQuery.refetch()}
          disabled={billsQuery.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </DashboardHeader>

      <DispatchPlanFilters
        filters={filters}
        onFiltersChange={setFilters}
        isFetching={billsQuery.isFetching}
      />

      {sapApiError ? (
        <SAPUnavailableBanner error={sapApiError} onRetry={billsQuery.refetch} />
      ) : (
        <SelectionBoard
          key={boardKey}
          bills={bills}
          isLoading={billsQuery.isLoading || billsQuery.isFetching}
        />
      )}
    </div>
  );
}

/**
 * A selection may only be taken back while the plan behind it is untouched.
 * Once a vehicle is booked or the truck has gone, removing the bill here would
 * hide live work from the Plan page, so those rows are locked and say why.
 * The API enforces the same rule — this only keeps the operator from trying.
 */
function isReversible(bill: DispatchBill): boolean {
  return !bill.is_selected || (bill.plan?.booking_status ?? 'PENDING') === 'PENDING';
}

function SelectionStatus({ bill }: { bill: DispatchBill }) {
  if (!bill.is_selected) {
    return <span className="text-muted-foreground">Not added</span>;
  }
  const status = bill.plan?.booking_status ?? 'PENDING';
  if (status === 'PENDING') {
    return (
      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
        In planning
      </span>
    );
  }
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
      title={`Already ${label.toLowerCase()} — remove it from the Plan page instead`}
    >
      {label} · locked
    </span>
  );
}

function SelectionBoard({ bills, isLoading }: { bills: DispatchBill[]; isLoading: boolean }) {
  const submit = useSubmitBillSelection();
  // Seeded once on mount from the server's is_selected (the board remounts via
  // `key` when the shown bills change, so this stays in sync per window).
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(bills.filter((b) => b.is_selected).map((b) => b.doc_entry)),
  );

  // Locked rows are never toggled — not by a click, not by select-all — so a
  // bulk action can't quietly try to reverse something the API will refuse.
  const toggleable = useMemo(() => bills.filter(isReversible), [bills]);
  const allChecked = toggleable.length > 0 && toggleable.every((b) => selected.has(b.doc_entry));
  const removing = useMemo(
    () => bills.filter((b) => b.is_selected && isReversible(b) && !selected.has(b.doc_entry)),
    [bills, selected],
  );

  function toggle(docEntry: number) {
    const bill = bills.find((b) => b.doc_entry === docEntry);
    if (!bill || !isReversible(bill)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(docEntry)) next.delete(docEntry);
      else next.add(docEntry);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      // Keep the locked rows exactly as they were.
      const next = new Set(
        [...prev].filter((entry) => {
          const bill = bills.find((b) => b.doc_entry === entry);
          return bill ? !isReversible(bill) : false;
        }),
      );
      if (!allChecked) toggleable.forEach((b) => next.add(b.doc_entry));
      return next;
    });
  }

  function handleSubmit() {
    submit.mutate(
      {
        shown_doc_entries: bills.map((b) => b.doc_entry),
        selected_doc_entries: [...selected],
      },
      {
        onSuccess: (r) => {
          toast.success(`Selection saved · ${r.selected} selected, ${r.deselected} removed`);
          // The API refuses to reverse a bill whose plan has moved on. Say so
          // rather than letting the count quietly come up short.
          if (r.blocked?.length) {
            toast.warning(
              `${r.blocked.length} bill(s) could not be removed — already booked or dispatched.`,
            );
          }
        },
        onError: () => toast.error('Could not save the bill selection'),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {selected.size} of {bills.length} bill(s) selected
            {removing.length > 0 && (
              <span className="ml-2 font-medium text-amber-600">
                · {removing.length} will be removed from planning
              </span>
            )}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={submit.isPending || bills.length === 0}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            {submit.isPending ? 'Submitting…' : 'Submit selection'}
          </Button>
        </div>

        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={toggleAll}
                    aria-label="Select all bills"
                    disabled={bills.length === 0}
                  />
                </th>
                <th className="p-3">Invoice</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
                <th className="p-3">Party</th>
                <th className="p-3">Location</th>
                <th className="p-3 text-right">Litres</th>
                <th className="p-3 text-right">Boxes</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-foreground">
                    Loading bills…
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-foreground">
                    No bills in this window.
                  </td>
                </tr>
              ) : (
                bills.map((b) => {
                  const checked = selected.has(b.doc_entry);
                  const reversible = isReversible(b);
                  return (
                    <tr
                      key={b.doc_entry}
                      className={`border-b last:border-0 ${
                        reversible ? 'cursor-pointer hover:bg-muted/40' : 'opacity-60'
                      } ${checked ? 'bg-primary/5' : ''}`}
                      onClick={() => toggle(b.doc_entry)}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(b.doc_entry)}
                          disabled={!reversible}
                          aria-label={
                            reversible
                              ? `Select bill ${b.doc_num}`
                              : `Bill ${b.doc_num} cannot be removed — already ${(
                                  b.plan?.booking_status ?? ''
                                ).toLowerCase()}`
                          }
                        />
                      </td>
                      <td className="p-3 font-mono font-medium">{b.doc_num}</td>
                      <td className="p-3 text-xs">
                        <SelectionStatus bill={b} />
                      </td>
                      <td className="p-3 text-muted-foreground">{b.doc_date ?? '—'}</td>
                      <td className="p-3">{b.card_name || b.card_code}</td>
                      <td className="p-3 text-muted-foreground">
                        {[b.city, b.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums">{fmtNum(b.total_litres)}</td>
                      <td className="p-3 text-right tabular-nums">{fmtNum(b.total_boxes)}</td>
                      <td className="p-3 text-right tabular-nums">{fmtNum(b.doc_total)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
