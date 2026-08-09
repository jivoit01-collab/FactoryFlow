import { ChevronRight, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ENTRY_STATUS, ENTRY_TYPES } from '@/config/constants';
import { useGlobalDateRange } from '@/core/store/hooks';
import {
  useEmptyVehicleEligibleEntries,
  useEmptyVehicleGateOutEntries,
} from '@/modules/gate/api';
import { EmptyVehicleOutButton, GateStatusBadge } from '@/modules/gate/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import type { VehicleEntry } from '../api/vehicle/vehicleEntry.api';
import {
  useDeleteRawMaterialEntry,
  useVehicleEntries,
} from '../api/vehicle/vehicleEntry.queries';
import { DateRangePicker } from '../components/DateRangePicker';

// Gate-phase statuses — an entry is still "in progress" and safe to delete
// before it reaches QC. The backend enforces the same guard.
const DELETABLE_STATUSES = new Set<string>([
  ENTRY_STATUS.DRAFT,
  ENTRY_STATUS.SECURITY_CHECK_DONE,
  ENTRY_STATUS.ARRIVAL_SLIP_SUBMITTED,
  ENTRY_STATUS.ARRIVAL_SLIP_REJECTED,
  ENTRY_STATUS.IN_PROGRESS,
]);

export default function RawMaterialsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();

  // Get status filter from URL
  const statusFilter = searchParams.get('status') || undefined;

  // Convert date range to API params
  const apiParams = useMemo(() => {
    return {
      from_date: dateRange.from,
      to_date: dateRange.to,
      entry_type: ENTRY_TYPES.RAW_MATERIAL,
      status: statusFilter,
    };
  }, [dateRange, statusFilter]);

  const { data: entries = [], isLoading } = useVehicleEntries(apiParams);

  // Empty-vehicle-out overlay: which RM vehicles can still leave empty (by vehicle-entry
  // id), and the exit date/time for those already marked out.
  const { data: eligibleEntries = [] } = useEmptyVehicleEligibleEntries({
    entry_type: ENTRY_TYPES.RAW_MATERIAL,
  });
  const { data: emptyOuts = [] } = useEmptyVehicleGateOutEntries({
    entry_type: ENTRY_TYPES.RAW_MATERIAL,
    from_date: dateRange.from,
    to_date: dateRange.to,
  });
  const eligibleByEntryId = useMemo(
    () => new Map(eligibleEntries.map((eligible) => [eligible.id, eligible])),
    [eligibleEntries],
  );
  const outByEntryId = useMemo(
    () => new Map(emptyOuts.map((out) => [out.vehicle_entry, out])),
    [emptyOuts],
  );

  const deleteEntry = useDeleteRawMaterialEntry();
  const [deleteTarget, setDeleteTarget] = useState<VehicleEntry | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEntry.mutateAsync(deleteTarget.id);
      toast.success(`Gate entry ${deleteTarget.entry_no} deleted`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete the gate entry'));
    }
  };

  // Filter entries based on search query only (date filtering is done by API)
  const filteredData = useMemo(() => {
    let filtered = entries;

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.entry_no?.toLowerCase().includes(searchLower) ||
          entry.status?.toLowerCase().includes(searchLower) ||
          entry.qc_final_status?.display?.toLowerCase().includes(searchLower) ||
          entry.remarks?.toLowerCase().includes(searchLower) ||
          entry.vehicle?.vehicle_number?.toLowerCase().includes(searchLower) ||
          entry.driver?.name?.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [entries, search]);

  // Format date/time for display
  const formatDateTime = (dateTime?: string) => {
    if (!dateTime) return '-';
    try {
      const date = new Date(dateTime);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateTime;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Raw Materials (RM/PM/Assets)</h2>
          <p className="text-muted-foreground">
            Manage raw materials, packing materials, and assets gate entries
          </p>
        </div>
        <Button onClick={() => navigate('/gate/raw-materials/new')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by entry number, status, or remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-auto">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => {
              // Handle the DateRange type (not single Date)
              if (date && 'from' in date) {
                setDateRange(date);
              } else {
                setDateRange(undefined);
              }
            }}
            mode="range"
          />
        </div>
      </div>

      {/* Status Filter Badge */}
      {/* {statusFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by status:</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${getEntryStatusClasses(statusFilter)}`}
          >
            {STATUS_LABELS[statusFilter] || statusFilter}
            <button
              onClick={clearStatusFilter}
              className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )} */}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
          <p className="text-lg">No entries present</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full min-w-[1080px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Entry No.</th>
                  <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                  <th className="p-3 text-left text-sm font-medium">Supplier(s)</th>
                  <th className="p-3 text-left text-sm font-medium">Driver</th>
                  <th className="p-3 text-left text-sm font-medium">Entry Time</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-left text-sm font-medium">Empty Out</th>
                  <th className="p-3 text-left text-sm font-medium">Remarks</th>
                  <th className="p-3 w-8" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {filteredData.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      const isCompleted = entry.status === ENTRY_STATUS.COMPLETED || entry.status === ENTRY_STATUS.QC_COMPLETED;
                      navigate(`/gate/raw-materials/edit/${entry.id}/${isCompleted ? 'review' : 'step1'}`);
                    }}
                  >
                    <td className="p-3 text-sm font-medium whitespace-nowrap">
                      {entry.entry_no || '-'}
                    </td>
                    <td className="p-3 text-sm whitespace-nowrap">
                      {entry.vehicle?.vehicle_number || '-'}
                    </td>
                    <td className="p-3 text-sm">
                      {entry.suppliers?.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {entry.suppliers.map(
                            (s: { supplier_name: string; supplier_code: string }) => (
                              <span key={s.supplier_code} className="truncate">
                                <span className="font-medium">{s.supplier_name}</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({s.supplier_code})
                                </span>
                              </span>
                            ),
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-sm whitespace-nowrap">{entry.driver?.name || '-'}</td>
                    <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(entry.entry_time)}
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex flex-col items-start gap-1">
                        <GateStatusBadge status={entry.status} />
                        {entry.qc_final_status ? (
                          <GateStatusBadge
                            status={entry.qc_final_status.code}
                            label={entry.qc_final_status.display}
                            size="xs"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3 text-sm whitespace-nowrap">
                      {eligibleByEntryId.has(entry.id) ? (
                        <EmptyVehicleOutButton entry={eligibleByEntryId.get(entry.id)!} />
                      ) : outByEntryId.has(entry.id) ? (
                        <span className="text-muted-foreground">
                          Out ·{' '}
                          {formatDateTime(
                            `${outByEntryId.get(entry.id)!.gate_out_date}T${outByEntryId.get(entry.id)!.out_time}`,
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{entry.remarks || '-'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {DELETABLE_STATUSES.has(entry.status) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete entry"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(entry);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteEntry.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete gate entry?</DialogTitle>
            <DialogDescription>
              This permanently deletes gate entry{' '}
              <span className="font-medium">{deleteTarget?.entry_no}</span> and everything entered
              for it — PO receipts, arrival slips, security check, weighment and attachments. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteEntry.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteEntry.isPending}
            >
              {deleteEntry.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
