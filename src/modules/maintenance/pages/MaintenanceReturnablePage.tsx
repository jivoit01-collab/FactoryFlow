import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileText,
  PackageOpen,
  Plus,
  Search,
  Send,
  ThumbsUp,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { RETURNABLE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader, SummaryCard } from '@/shared/components/dashboard';
import {
  Button,
  Card,
  CardContent,
  Input,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import { useReturnableGatePasses } from '../api/returnableGatePass.queries';
import { ReturnableFormDialog, ReturnableStatusBadge } from '../components/returnable';
import {
  RETURNABLE_PURPOSE_OPTIONS,
  RETURNABLE_STATUS_OPTIONS,
} from '../constants/returnable.constants';
import type { ReturnableFilters } from '../types';

export default function MaintenanceReturnablePage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canManage = hasPermission(RETURNABLE_PERMISSIONS.MANAGE_GATEPASS);

  const [filters, setFilters] = useState<ReturnableFilters>({ status: 'ALL', purpose: 'ALL' });
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const queryFilters = useMemo<ReturnableFilters>(
    () => ({ ...filters, overdue: showOverdueOnly ? true : undefined }),
    [filters, showOverdueOnly],
  );

  const { data: passes, isLoading } = useReturnableGatePasses(queryFilters);

  // The list is already server-filtered; these tiles summarise what came back.
  const counts = useMemo(() => {
    const rows = passes ?? [];
    return {
      draft: rows.filter((row) => row.status === 'DRAFT').length,
      pendingApproval: rows.filter((row) => row.status === 'PENDING_APPROVAL').length,
      pendingGateOut: rows.filter((row) => row.status === 'PENDING_GATE_OUT').length,
      out: rows.filter((row) => row.status === 'OUT' || row.status === 'PARTIALLY_RETURNED').length,
      returned: rows.filter((row) => row.status === 'RETURNED').length,
      overdue: rows.filter((row) => row.is_overdue).length,
    };
  }, [passes]);

  const updateFilter = <K extends keyof ReturnableFilters>(key: K, value: ReturnableFilters[K]) =>
    setFilters((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <DashboardHeader
        title="Returnable / Non-returnable"
        description="Material sent out of the gate for repair, exchange or job work — and tracked until it comes back."
        primaryAction={
          canManage
            ? {
                label: 'New Returnable Pass',
                icon: <Plus className="mr-2 h-4 w-4" />,
                onClick: () => setIsFormOpen(true),
              }
            : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <SummaryCard title="Draft" value={counts.draft} icon={FileText} />
        <SummaryCard title="Pending Approval" value={counts.pendingApproval} icon={ThumbsUp} />
        <SummaryCard title="Pending Gate Out" value={counts.pendingGateOut} icon={Send} />
        <SummaryCard title="Out with Party" value={counts.out} icon={Truck} />
        <SummaryCard title="Back at Gate" value={counts.returned} icon={CheckCircle2} />
        <SummaryCard
          title="Overdue"
          value={counts.overdue}
          icon={AlertTriangle}
          className={counts.overdue > 0 ? 'border-rose-200' : undefined}
          onClick={() => setShowOverdueOnly((previous) => !previous)}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search pass no, party, item or serial number"
              value={filters.q ?? ''}
              onChange={(event) => updateFilter('q', event.target.value)}
            />
          </div>

          <NativeSelect
            className="sm:w-52"
            value={filters.status ?? 'ALL'}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            {RETURNABLE_STATUS_OPTIONS.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </NativeSelect>

          <NativeSelect
            className="sm:w-52"
            value={filters.purpose ?? 'ALL'}
            onChange={(event) =>
              updateFilter('purpose', event.target.value as ReturnableFilters['purpose'])
            }
          >
            <SelectOption value="ALL">All Purposes</SelectOption>
            {RETURNABLE_PURPOSE_OPTIONS.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </NativeSelect>

          <Button
            type="button"
            variant={showOverdueOnly ? 'default' : 'outline'}
            onClick={() => setShowOverdueOnly((previous) => !previous)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Overdue only
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Pass No</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Purpose</th>
              <th className="px-3 py-2 text-left font-medium">Party</th>
              <th className="px-3 py-2 text-left font-medium">Items</th>
              <th className="px-3 py-2 text-left font-medium">Pending Qty</th>
              <th className="px-3 py-2 text-left font-medium">Expected Back</th>
              <th className="px-3 py-2 text-left font-medium">Raised By</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Loading gate passes…
                </td>
              </tr>
            ) : !passes?.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  <PackageOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  No returnable gate passes match these filters.
                </td>
              </tr>
            ) : (
              passes.map((pass) => (
                <tr
                  key={pass.id}
                  className="cursor-pointer border-t hover:bg-muted/30"
                  onClick={() => navigate(`/maintenance/returnable/${pass.id}`)}
                >
                  <td className="px-3 py-2 font-medium">{pass.pass_no}</td>
                  <td className="px-3 py-2">
                    <ReturnableStatusBadge
                      status={pass.status}
                      isOverdue={pass.is_overdue}
                      daysOverdue={pass.days_overdue}
                    />
                  </td>
                  <td className="px-3 py-2">{pass.purpose_display}</td>
                  <td className="px-3 py-2">{pass.party_name}</td>
                  <td className="px-3 py-2">{pass.item_count}</td>
                  <td className="px-3 py-2">{pass.pending_return_qty}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(pass.expected_return_date).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{pass.created_by_name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ReturnableFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaved={(passId) => navigate(`/maintenance/returnable/${passId}`)}
      />
    </div>
  );
}
