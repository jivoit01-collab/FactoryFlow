import { Download, RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button } from '@/shared/components/ui';

import { SAPUnavailableBanner } from '../../sap-plan/components/SAPUnavailableBanner';
import { useDispatchBills, useUpdateDispatchPlan } from '../api';
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

  // Export the currently filtered bill set (every fetched row, not just the
  // visible page) to an .xlsx workbook. Column order mirrors the on-screen table,
  // then adds the full planning/transport detail that the compact cells collapse.
  const handleExportExcel = useCallback(() => {
    if (bills.length === 0) {
      toast.info('No dispatch bills to export');
      return;
    }
    const rows = bills.map((bill) => ({
      'Created Date': bill.create_date ?? '',
      'Created Time': bill.create_time ?? '',
      'Invoice Date': bill.doc_date ?? '',
      Company: bill.company_code ?? '',
      Branch: bill.branch_name ?? '',
      Bill: bill.doc_num ?? '',
      'Base Refs': bill.base_refs ?? '',
      'Party Code': bill.card_code ?? '',
      'Party Name': bill.card_name ?? '',
      'BP GSTIN': bill.bp_gstin ?? '',
      'Item Summary': bill.item_summary ?? '',
      'Ship To Code': bill.ship_to_code ?? '',
      'Ship To Address': bill.ship_to_address ?? '',
      City: bill.city ?? '',
      State: bill.state ?? '',
      Warehouses: bill.warehouses ?? '',
      'Doc Total': bill.doc_total ?? 0,
      'Gross Amount': bill.total_gross_amount ?? 0,
      'Line Amount': bill.total_line_amount ?? 0,
      'Line Count': bill.line_count ?? 0,
      Quantity: bill.total_quantity ?? 0,
      'Total Litres': bill.total_litres ?? 0,
      'Total Boxes': bill.total_boxes ?? 0,
      'Total Weight (kg)': bill.total_weight ?? 0,
      'SAP Transporter': bill.sap_transporter_name ?? '',
      'SAP Vehicle No': bill.sap_vehicle_no ?? '',
      'SAP Bilty No': bill.sap_bilty_no ?? '',
      'SAP LR No': bill.sap_lr_number ?? '',
      'SAP Eway Bill': bill.sap_eway_bill ?? '',
      'SAP Dispatch Date': bill.sap_dispatch_date ?? '',
      Status: bill.plan.booking_status ?? '',
      'Dispatch Date': bill.plan.dispatch_date ?? '',
      Priority: bill.plan.priority ?? '',
      Location: bill.plan.location ?? '',
      'Plan Vehicle No': bill.plan.vehicle_no ?? '',
      'Plan Driver Name': bill.plan.driver_name ?? '',
      'Plan Driver Mobile': bill.plan.driver_mobile_no ?? '',
      'Plan Transporter': bill.plan.transporter_name ?? '',
      'Plan Bilty No': bill.plan.bilty_no ?? '',
      'Plan Bilty Date': bill.plan.bilty_date ?? '',
      'Eway Bill': bill.plan.eway_bill ?? '',
      Freight: bill.plan.freight ?? '',
      Remarks: bill.plan.remarks ?? '',
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
          {canEdit && selectedDocEntries.length > 0 && (
            <DispatchPlanBulkDateBar
              selectedDocEntries={selectedDocEntries}
              overwriteCount={overwriteCount}
              onClear={clearSelection}
            />
          )}
          <DispatchPlanTable
            bills={bills}
            isLoading={billsQuery.isLoading || billsQuery.isFetching}
            canEdit={canEdit}
            onEdit={handleEdit}
            selected={canEdit ? selected : undefined}
            onToggle={canEdit ? toggleSelect : undefined}
            onToggleAll={canEdit ? toggleSelectAll : undefined}
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
