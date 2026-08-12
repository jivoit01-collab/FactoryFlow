import { ArrowUpDown, Download, Droplets, FileText, RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, NativeSelect, SelectOption } from '@/shared/components/ui';

type SortKey =
  | 'default'
  | 'customer_asc'
  | 'customer_desc'
  | 'city_asc'
  | 'litres_desc'
  | 'litres_asc'
  | 'date_desc'
  | 'date_asc'
  | 'docnum_asc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default order' },
  { key: 'customer_asc', label: 'Customer (A → Z)' },
  { key: 'customer_desc', label: 'Customer (Z → A)' },
  { key: 'city_asc', label: 'City (A → Z)' },
  { key: 'litres_desc', label: 'Litres (high → low)' },
  { key: 'litres_asc', label: 'Litres (low → high)' },
  { key: 'date_desc', label: 'Invoice date (newest)' },
  { key: 'date_asc', label: 'Invoice date (oldest)' },
  { key: 'docnum_asc', label: 'Invoice no. (A → Z)' },
];

import { SAPUnavailableBanner } from '../../components/SAPUnavailableBanner';
import { useDispatchBills, useRemoveFromPlan, useUpdateDispatchPlan } from '../api';
import {
  DispatchPlanBulkDateBar,
  DispatchPlanEditSheet,
  DispatchPlanFilters,
  DispatchPlanMetaCards,
  DispatchPlanTable,
} from '../components';
import { createDefaultDispatchPlanFilters } from '../constants';
import type {
  DispatchBill,
  DispatchPlanFilters as DispatchPlanFiltersType,
  DispatchPlanUpdatePayload,
} from '../types';

function isSAPError(error: unknown): error is ApiError {
  const status = (error as ApiError)?.status;
  return status === 502 || status === 503;
}

export default function DispatchPlansDashboardPage() {
  // Only bills chosen on the Bill Selection page enter planning here.
  const [filters, setFilters] = useState<DispatchPlanFiltersType>(() => ({
    ...createDefaultDispatchPlanFilters(),
    selected_only: true,
  }));
  const [selectedBill, setSelectedBill] = useState<DispatchBill | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // Doc entries ticked for the bulk dispatch-date action.
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const { hasPermission } = usePermission();
  const canEdit = hasPermission(DASHBOARDS_PERMISSIONS.EDIT_DISPATCH_PLANS);

  const billsQuery = useDispatchBills(filters);
  const updatePlanMutation = useUpdateDispatchPlan();
  const removeFromPlan = useRemoveFromPlan();

  /**
   * Take a bill back off the Plan page — for one added by mistake.
   *
   * Confirmed first because it changes what the whole planning team sees, and
   * the row simply disappears afterwards. It is not destructive: anything
   * already typed against the plan is kept, so re-selecting the bill in Bill
   * Selection brings it back as it was, which is what the prompt says.
   */
  const handleRemove = useCallback(
    (bill: DispatchBill) => {
      const confirmed = window.confirm(
        `Remove bill ${bill.doc_num} from dispatch planning?\n\n` +
          'It leaves this page and returns to Bill Selection. Anything already ' +
          'planned against it is kept, so you can add it back.',
      );
      if (!confirmed) return;

      removeFromPlan.mutate(bill.doc_entry, {
        onSuccess: (result) => {
          if (result.removed) toast.success(`Bill ${bill.doc_num} removed from planning`);
          else toast.info(result.detail);
        },
        // The server refuses once the plan has moved past PENDING; show its
        // reason rather than a generic failure.
        onError: (error) => {
          const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail;
          toast.error(detail || `Could not remove bill ${bill.doc_num}`);
        },
      });
    },
    [removeFromPlan],
  );

  // Memoized so the reference stays stable across renders (react-query keeps
  // `data` stable via structural sharing). A fresh `?? []` every render would
  // make the reset below setState on each pass → "too many re-renders".
  const bills = useMemo(() => billsQuery.data?.data ?? [], [billsQuery.data]);

  // Drop the selection whenever a new data set arrives (filter change or refetch)
  // so stale doc entries never carry over — mirrors the table's page reset.
  // Key off the stable query `data` (not the derived `bills`) and return the
  // same Set when already empty so React can bail out instead of looping.
  const [prevData, setPrevData] = useState(billsQuery.data);
  if (prevData !== billsQuery.data) {
    setPrevData(billsQuery.data);
    setSelected((prev) => (prev.size > 0 ? new Set() : prev));
  }

  const toggleSelect = useCallback((docEntry: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(docEntry)) next.delete(docEntry);
      else next.add(docEntry);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((selectableDocEntries: number[]) => {
    setSelected((prev) => {
      const allSelected =
        selectableDocEntries.length > 0 && selectableDocEntries.every((de) => prev.has(de));
      return allSelected ? new Set() : new Set(selectableDocEntries);
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectedDocEntries = [...selected];
  const overwriteCount = bills.filter(
    (bill) => selected.has(bill.doc_entry) && !!bill.plan.dispatch_date,
  ).length;

  // Arrange the shown bills (client-side) by the chosen order.
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const sortedBills = useMemo(() => {
    if (sortKey === 'default') return bills;
    const cmp = (a: string, b: string) => a.localeCompare(b);
    const arr = [...bills];
    switch (sortKey) {
      case 'customer_asc':
        arr.sort((a, b) => cmp(a.card_name ?? '', b.card_name ?? ''));
        break;
      case 'customer_desc':
        arr.sort((a, b) => cmp(b.card_name ?? '', a.card_name ?? ''));
        break;
      case 'city_asc':
        arr.sort((a, b) => cmp(a.city ?? '', b.city ?? ''));
        break;
      case 'litres_desc':
        arr.sort((a, b) => (b.total_litres ?? 0) - (a.total_litres ?? 0));
        break;
      case 'litres_asc':
        arr.sort((a, b) => (a.total_litres ?? 0) - (b.total_litres ?? 0));
        break;
      case 'date_desc':
        arr.sort((a, b) => cmp(b.doc_date ?? '', a.doc_date ?? ''));
        break;
      case 'date_asc':
        arr.sort((a, b) => cmp(a.doc_date ?? '', b.doc_date ?? ''));
        break;
      case 'docnum_asc':
        arr.sort((a, b) => cmp(a.doc_num ?? '', b.doc_num ?? ''));
        break;
    }
    return arr;
  }, [bills, sortKey]);

  // Totals for the currently ticked bills — shown to the planner.
  const selectionSummary = useMemo(() => {
    const sel = bills.filter((b) => selected.has(b.doc_entry));
    return {
      count: sel.length,
      litres: sel.reduce((sum, b) => sum + (b.total_litres ?? 0), 0),
    };
  }, [bills, selected]);

  // Export the currently filtered bill set (every fetched row, not just the
  // visible page) to an .xlsx workbook. Kept to the fields dispatch actually needs:
  // dispatch date, invoice date, party, ship-to, state, invoice no., litres, weight.
  const handleExportExcel = useCallback(() => {
    if (bills.length === 0) {
      toast.info('No dispatch bills to export');
      return;
    }
    const rows = bills.map((bill) => ({
      'Dispatch Date': bill.plan.dispatch_date ?? '',
      'Invoice Date': bill.doc_date ?? '',
      'Party Name': bill.card_name ?? '',
      'Ship To Address': bill.ship_to_address ?? '',
      State: bill.state ?? '',
      'Invoice No.': bill.doc_num ?? '',
      Litres: bill.total_litres ?? 0,
      'Weight (kg)': bill.total_weight ?? 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-size columns to their widest value, matching the QC/Gate exports.
    ws['!cols'] = Object.keys(rows[0]).map((key) => ({
      wch:
        Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] ?? '').length)) + 2,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dispatch Plans');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `dispatch_plans_${filters.date_from}_to_${filters.date_to}_${stamp}.xlsx`);
  }, [bills, filters.date_from, filters.date_to]);

  const handleEdit = useCallback((bill: DispatchBill) => {
    setSelectedBill(bill);
    setIsSheetOpen(true);
  }, []);

  const handleSave = useCallback(
    async (docEntry: number, payload: DispatchPlanUpdatePayload) => {
      try {
        await updatePlanMutation.mutateAsync({ docEntry, payload });
        toast.success('Dispatch plan saved');
        setIsSheetOpen(false);
        setSelectedBill(null);
      } catch {
        toast.error('Failed to save dispatch plan');
      }
    },
    [updatePlanMutation],
  );

  const sapError = billsQuery.error;
  const sapApiError = isSAPError(sapError) ? sapError : null;

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Dispatch Plans"
        description="SAP dispatch bills and planning handoff dates"
      >
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <NativeSelect
            aria-label="Sort bills"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-9 w-48"
          >
            {SORT_OPTIONS.map((o) => (
              <SelectOption key={o.key} value={o.key}>
                {o.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={billsQuery.isFetching || bills.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
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

      {sapApiError && <SAPUnavailableBanner error={sapApiError} onRetry={billsQuery.refetch} />}

      {!sapApiError && (
        <>
          <DispatchPlanMetaCards meta={billsQuery.data?.meta} />
          {canEdit && selectionSummary.count > 0 && (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <FileText className="h-4 w-4 text-primary" />
                {selectionSummary.count} bill{selectionSummary.count === 1 ? '' : 's'} selected
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Droplets className="h-4 w-4 text-primary" />
                {selectionSummary.litres.toLocaleString(undefined, { maximumFractionDigits: 2 })} L
                total
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear
              </button>
            </div>
          )}
          {canEdit && selectedDocEntries.length > 0 && (
            <DispatchPlanBulkDateBar
              selectedDocEntries={selectedDocEntries}
              overwriteCount={overwriteCount}
              onClear={clearSelection}
            />
          )}
          <DispatchPlanTable
            bills={sortedBills}
            isLoading={billsQuery.isLoading || billsQuery.isFetching}
            canEdit={canEdit}
            onEdit={handleEdit}
            selected={canEdit ? selected : undefined}
            onToggle={canEdit ? toggleSelect : undefined}
            onToggleAll={canEdit ? toggleSelectAll : undefined}
            onRemove={canEdit ? handleRemove : undefined}
            removingDocEntry={removeFromPlan.isPending ? removeFromPlan.variables : null}
          />
        </>
      )}

      <DispatchPlanEditSheet
        key={selectedBill?.doc_entry ?? 'empty'}
        bill={selectedBill}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSave={handleSave}
        isSaving={updatePlanMutation.isPending}
      />
    </div>
  );
}
