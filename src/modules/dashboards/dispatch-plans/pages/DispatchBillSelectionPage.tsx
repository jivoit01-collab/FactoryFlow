import { CheckSquare, FileCheck2, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api';
import {
  PageHeader,
  ROW_CLASSES,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Checkbox } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

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

const COLUMN_COUNT = 8;

/**
 * Bill Selection — the step BEFORE the Dispatch Plan page. Planners tick the
 * bills that should enter dispatch planning; on Submit only those appear on the
 * Plan page for vehicle linking. Selection is company-wide (shared) and Submit
 * reconciles only the bills currently shown.
 */
export default function DispatchBillSelectionPage() {
  const [filters, setFilters] = useState<DispatchPlanFiltersType>(createDefaultDispatchPlanFilters);
  const billsQuery = useDispatchBills(filters);

  // Show only bills NOT yet selected — once a bill is selected + submitted it
  // moves to the Plan page and leaves this "bills to add" queue.
  const bills = useMemo<DispatchBill[]>(
    () => (billsQuery.data?.data ?? []).filter((b) => !b.is_selected),
    [billsQuery.data],
  );
  // Remount the board when the shown set of bills changes (e.g. after a submit
  // removes the just-selected bills) — avoids seeding state inside an effect.
  const boardKey = useMemo(() => bills.map((b) => b.doc_entry).join(','), [bills]);

  const sapApiError = isSAPError(billsQuery.error) ? billsQuery.error : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bill Selection"
        description="Pick bills to add to dispatch planning. Submitted bills move to the Plan page and leave this list."
        icon={FileCheck2}
        accent="blue"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => billsQuery.refetch()}
          disabled={billsQuery.isFetching}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', billsQuery.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

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

  // What the planner is about to send over, totalled — the same figures the
  // Plan page will show, so the size of the hand-off is visible before Submit.
  const selectedTotals = useMemo(() => {
    return bills.reduce(
      (acc, b) => {
        if (!selected.has(b.doc_entry)) return acc;
        acc.litres += Number(b.total_litres ?? 0);
        acc.boxes += Number(b.total_boxes ?? 0);
        return acc;
      },
      { litres: 0, boxes: 0 },
    );
  }, [bills, selected]);

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
    <TableCard
      summary={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-foreground tabular-nums">{selected.size}</span>
          of
          <span className="tabular-nums">{bills.length}</span>
          bill(s) selected
          {selected.size > 0 && (
            <span className="text-muted-foreground">
              · {fmtNum(selectedTotals.litres)} L · {fmtNum(selectedTotals.boxes)} boxes
            </span>
          )}
        </span>
      }
      actions={
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={submit.isPending || bills.length === 0}
        >
          <CheckSquare className="mr-2 h-4 w-4" />
          {submit.isPending ? 'Submitting…' : 'Submit selection'}
        </Button>
      }
    >
      <table className={cn(TABLE_CLASSES, 'min-w-[860px]')}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <Th className="w-10">
              <Checkbox
                checked={allChecked}
                onCheckedChange={toggleAll}
                aria-label="Select all bills"
                disabled={bills.length === 0}
              />
            </Th>
            <Th>Invoice</Th>
            <Th>Date</Th>
            <Th>Party</Th>
            <Th>Location</Th>
            <Th align="right">Litres</Th>
            <Th align="right">Boxes</Th>
            <Th align="right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableLoading colSpan={COLUMN_COUNT} message="Loading bills…" />
          ) : bills.length === 0 ? (
            <TableEmpty
              colSpan={COLUMN_COUNT}
              icon={FileCheck2}
              message="No bills left to select"
              hint="Every bill in this window is already added to planning."
            />
          ) : (
            bills.map((b) => {
              const checked = selected.has(b.doc_entry);
              return (
                <tr
                  key={b.doc_entry}
                  className={cn(ROW_CLASSES, 'cursor-pointer', checked && 'bg-primary/5')}
                  onClick={() => toggle(b.doc_entry)}
                >
                  <Td onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(b.doc_entry)}
                      aria-label={`Select bill ${b.doc_num}`}
                    />
                  </Td>
                  <Td className="font-mono font-medium">{b.doc_num}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{b.doc_date ?? '—'}</Td>
                  <Td className="font-medium">{b.card_name || b.card_code}</Td>
                  <Td className="text-muted-foreground">
                    {[b.city, b.state].filter(Boolean).join(', ') || '—'}
                  </Td>
                  <Td numeric>{fmtNum(b.total_litres)}</Td>
                  <Td numeric>{fmtNum(b.total_boxes)}</Td>
                  <Td numeric className="font-medium">
                    {fmtNum(b.doc_total)}
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </TableCard>
  );
}
