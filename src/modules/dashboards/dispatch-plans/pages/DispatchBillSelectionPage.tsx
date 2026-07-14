import { CheckSquare, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Checkbox } from '@/shared/components/ui';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
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

  const bills = useMemo<DispatchBill[]>(() => billsQuery.data?.data ?? [], [billsQuery.data]);
  // Remount the board (reseeding checkboxes from is_selected) when the shown set
  // of bills changes — avoids seeding state inside an effect.
  const boardKey = useMemo(() => bills.map((b) => b.doc_entry).join(','), [bills]);

  const sapApiError = isSAPError(billsQuery.error) ? billsQuery.error : null;

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Bill Selection"
        description="Choose which bills enter dispatch planning. Only selected bills appear on the Plan page."
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

function SelectionBoard({ bills, isLoading }: { bills: DispatchBill[]; isLoading: boolean }) {
  const submit = useSubmitBillSelection();
  // Seeded once on mount from the server's is_selected (the board remounts via
  // `key` when the shown bills change, so this stays in sync per window).
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(bills.filter((b) => b.is_selected).map((b) => b.doc_entry)),
  );

  const allChecked = bills.length > 0 && bills.every((b) => selected.has(b.doc_entry));

  function toggle(docEntry: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(docEntry)) next.delete(docEntry);
      else next.add(docEntry);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(bills.map((b) => b.doc_entry)));
  }

  function handleSubmit() {
    submit.mutate(
      {
        shown_doc_entries: bills.map((b) => b.doc_entry),
        selected_doc_entries: [...selected],
      },
      {
        onSuccess: (r) =>
          toast.success(`Selection saved · ${r.selected} selected, ${r.deselected} removed`),
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
          <table className="w-full min-w-[860px] text-sm">
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
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    Loading bills…
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    No bills in this window.
                  </td>
                </tr>
              ) : (
                bills.map((b) => {
                  const checked = selected.has(b.doc_entry);
                  return (
                    <tr
                      key={b.doc_entry}
                      className={`border-b last:border-0 hover:bg-muted/40 ${checked ? 'bg-primary/5' : ''}`}
                      onClick={() => toggle(b.doc_entry)}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(b.doc_entry)}
                          aria-label={`Select bill ${b.doc_num}`}
                        />
                      </td>
                      <td className="p-3 font-mono font-medium">{b.doc_num}</td>
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
