import { format } from 'date-fns';
import { RefreshCw, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { VEHICLE_MANAGEMENT_PERMISSIONS } from '@/config/permissions';
import { useAuth } from '@/core/auth/hooks/useAuth';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';
import { getErrorMessage } from '@/shared/utils/error';

import {
  useDispatchLinkingPlans,
  useLinkDispatchVehicle,
  useUnlinkDispatchVehicle,
} from '../api';
import { DispatchLinkingSheet, DispatchLinkingTable } from '../components';
import type {
  DispatchLinkingBucket,
  DispatchLinkingFilters,
  DispatchVehicleLinkPayload,
} from '../types';

const BUCKET_OPTIONS: Array<{ value: DispatchLinkingBucket; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'all', label: 'All Dated' },
];

function todayInputValue() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function DispatchVehicleLinkingPage() {
  const navigate = useNavigate();
  const { currentCompany } = useAuth();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission(VEHICLE_MANAGEMENT_PERMISSIONS.DISPATCH_VEHICLE_LINKING);

  const [filters, setFilters] = useState<DispatchLinkingFilters>({
    bucket: 'today',
    date: todayInputValue(),
    booking_status: 'all',
    limit: 2000,
  });
  const [searchDraft, setSearchDraft] = useState('');
  const [selectedBill, setSelectedBill] = useState<DispatchBill | null>(null);
  const [selectedDocEntries, setSelectedDocEntries] = useState<Set<number>>(() => new Set());
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      search: searchDraft.trim() || undefined,
    }),
    [filters, searchDraft],
  );

  const plansQuery = useDispatchLinkingPlans(effectiveFilters, currentCompany?.company_id);
  const linkMutation = useLinkDispatchVehicle();
  const unlinkMutation = useUnlinkDispatchVehicle();

  const handleLink = (bill: DispatchBill) => {
    setSelectedBill(bill);
    setSelectedDocEntries((current) => {
      if (current.size > 0 && current.has(bill.doc_entry)) return current;
      return new Set([bill.doc_entry]);
    });
    setIsSheetOpen(true);
  };

  const handleToggleSelection = (bill: DispatchBill) => {
    setSelectedDocEntries((current) => {
      const next = new Set(current);
      if (next.has(bill.doc_entry)) {
        next.delete(bill.doc_entry);
      } else {
        next.add(bill.doc_entry);
      }
      return next;
    });
  };

  const handleSave = async (docEntry: number, payload: DispatchVehicleLinkPayload) => {
    try {
      await linkMutation.mutateAsync({ docEntry, payload });
      toast.success('Vehicle linked to dispatch plan');
      setIsSheetOpen(false);
      setSelectedBill(null);
      setSelectedDocEntries(new Set());
    } catch (error) {
      // Surface backend guard messages (e.g. "vehicle is already inside — add
      // bills from the 'Add Bills to Inside Vehicle' page") instead of a generic
      // failure, so the gate/planning user knows the correct next step.
      toast.error(getErrorMessage(error, 'Failed to link vehicle'));
    }
  };

  const handleUnlink = async (docEntry: number) => {
    try {
      await unlinkMutation.mutateAsync({ docEntry });
      toast.success('Vehicle unlinked. The booking is back to Pending.');
      setIsSheetOpen(false);
      setSelectedBill(null);
      setSelectedDocEntries(new Set());
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to unlink vehicle'));
    }
  };

  const meta = plansQuery.data?.meta;
  const bucketCounts: Record<DispatchLinkingBucket, number> = {
    today: meta?.today ?? 0,
    overdue: meta?.overdue ?? 0,
    upcoming: meta?.upcoming ?? 0,
    all: meta?.total ?? 0,
  };
  const selectedBills = useMemo(() => {
    const bills = plansQuery.data?.data ?? [];
    if (!selectedBill) return [];
    const selected = bills.filter((bill) => selectedDocEntries.has(bill.doc_entry));
    return selected.some((bill) => bill.doc_entry === selectedBill.doc_entry)
      ? selected
      : [selectedBill];
  }, [plansQuery.data?.data, selectedBill, selectedDocEntries]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Dispatch Vehicle Linking"
        description="Link transport to dispatch plans released by planning"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate('/dispatch/vehicle-linking/previously-registered')}
        >
          <Truck className="mr-2 h-4 w-4" />
          Previously Registered Vehicle
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => plansQuery.refetch()}
          disabled={plansQuery.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="dispatch-linking-search" className="text-xs">
              Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="dispatch-linking-search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Bill, customer, city, vehicle"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dispatch-linking-date" className="text-xs font-semibold">
                Dispatch Date
              </Label>
              <Input
                id="dispatch-linking-date"
                type="date"
                value={filters.date}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, date: event.target.value }))
                }
                className="w-full lg:w-40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dispatch-linking-status" className="text-xs">
                Status
              </Label>
              <NativeSelect
                id="dispatch-linking-status"
                value={filters.booking_status ?? 'all'}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    booking_status: event.target.value as DispatchLinkingFilters['booking_status'],
                  }))
                }
                className="w-full lg:w-36"
              >
                <SelectOption value="all">All</SelectOption>
                <SelectOption value="PENDING">Pending</SelectOption>
                <SelectOption value="BOOKED">Booked</SelectOption>
                <SelectOption value="DISPATCHED">Dispatched</SelectOption>
                <SelectOption value="CANCELLED">Cancelled</SelectOption>
              </NativeSelect>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {BUCKET_OPTIONS.map((option) => {
            const count = bucketCounts[option.value];
            const isActive = filters.bucket === option.value;
            const hasOverdueVehicles = option.value === 'overdue' && count > 0;

            return (
              <Button
                key={option.value}
                type="button"
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'gap-2',
                  hasOverdueVehicles &&
                    !isActive &&
                    'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800',
                  hasOverdueVehicles && isActive && 'bg-red-600 text-white hover:bg-red-700',
                )}
                onClick={() => setFilters((current) => ({ ...current, bucket: option.value }))}
              >
                <span>{option.label}</span>
                <span
                  className={cn(
                    'inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-foreground',
                    hasOverdueVehicles && !isActive && 'bg-red-100 text-red-700',
                    hasOverdueVehicles && isActive && 'bg-white/20 text-white',
                  )}
                >
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {plansQuery.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load dispatch plans.
        </div>
      ) : (
        <DispatchLinkingTable
          bills={plansQuery.data?.data ?? []}
          isLoading={plansQuery.isLoading || plansQuery.isFetching}
          canEdit={canEdit}
          selectedDocEntries={selectedDocEntries}
          onToggleSelection={handleToggleSelection}
          onLink={handleLink}
        />
      )}

      <DispatchLinkingSheet
        key={selectedBill?.doc_entry ?? 'empty'}
        bill={selectedBill}
        selectedBills={selectedBills}
        open={isSheetOpen}
        isSaving={linkMutation.isPending}
        isUnlinking={unlinkMutation.isPending}
        onOpenChange={setIsSheetOpen}
        onSave={handleSave}
        onUnlink={handleUnlink}
      />
    </div>
  );
}
