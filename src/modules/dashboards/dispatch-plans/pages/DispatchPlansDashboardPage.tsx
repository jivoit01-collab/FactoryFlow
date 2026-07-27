import { RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

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

  const bills = billsQuery.data?.data ?? [];

  // Drop the selection whenever a new data set arrives (filter change or refetch)
  // so stale doc entries never carry over — mirrors the table's page reset.
  const [prevBills, setPrevBills] = useState(bills);
  if (prevBills !== bills) {
    setPrevBills(bills);
    if (selected.size > 0) setSelected(new Set());
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
