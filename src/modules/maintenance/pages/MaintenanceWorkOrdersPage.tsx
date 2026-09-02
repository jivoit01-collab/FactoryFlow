import { Edit, Eye, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';

import {
  useCreateMaintenanceWorkOrder,
  useMaintenanceAssets,
  useMaintenanceOptions,
  useMaintenanceWorkOrders,
  useUpdateMaintenanceWorkOrder,
  useUploadWorkOrderAttachments,
} from '../api';
import { WorkOrderFormDialog, WorkOrderStatusBadge } from '../components';
import type {
  MaintenanceChoice,
  MaintenancePriority,
  MaintenanceWorkOrder,
  MaintenanceWorkOrderFilters,
  MaintenanceWorkOrderPayload,
  StagedWorkOrderAttachment,
  WorkOrderStatus,
  WorkType,
} from '../types';

/**
 * When the request was raised, split into date + clock.
 *
 * Built from local date parts rather than slicing the ISO string: `created_at`
 * comes back UTC, and anything logged after 18:30 UTC is already the next day
 * in IST — slicing would show it a day early. The YYYY-MM-DD shape matches the
 * Target column so the two dates line up.
 */
function raisedOn(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '-', time: '' };
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  return { date, time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
}

function useInitialWorkStatus(): WorkOrderStatus | 'ALL' {
  const searchParams = new URLSearchParams(useLocation().search);
  const status = searchParams.get('status');
  const validStatuses: WorkOrderStatus[] = [
    'DRAFT',
    'OPEN',
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING_SPARE',
    'WAITING_VENDOR',
    'ON_HOLD',
    'COMPLETED',
    'APPROVED',
    'CLOSED',
  ];
  return validStatuses.includes(status as WorkOrderStatus) ? (status as WorkOrderStatus) : 'ALL';
}

function useInitialPriority(): MaintenancePriority | 'ALL' {
  const searchParams = new URLSearchParams(useLocation().search);
  const priority = searchParams.get('priority');
  return priority === 'NORMAL' || priority === 'HIGH' || priority === 'CRITICAL' ? priority : 'ALL';
}

function choiceLabel<TValue extends string>(
  choices: MaintenanceChoice<TValue>[] | undefined,
  value: TValue,
) {
  return choices?.find((item) => item.value === value)?.label ?? value.replaceAll('_', ' ');
}

function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const classes: Record<MaintenancePriority, string> = {
    NORMAL: 'border-slate-200 bg-slate-50 text-slate-700',
    HIGH: 'border-amber-200 bg-amber-50 text-amber-700',
    CRITICAL: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return (
    <Badge variant="outline" className={classes[priority]}>
      {priority}
    </Badge>
  );
}

export default function MaintenanceWorkOrdersPage() {
  const navigate = useNavigate();
  const initialStatus = useInitialWorkStatus();
  const initialPriority = useInitialPriority();
  const { hasPermission } = usePermission();
  const canManage = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_WORK_ORDER);
  const canCreate =
    canManage ||
    hasPermission(MAINTENANCE_PERMISSIONS.CREATE_WORK_ORDER) ||
    hasPermission(MAINTENANCE_PERMISSIONS.CREATE_MAINTENANCE_WORK_ORDER);
  const canEdit = canManage || hasPermission(MAINTENANCE_PERMISSIONS.EDIT_MAINTENANCE_WORK_ORDER);
  // The raise form uploads the staged files itself, so anyone who may raise or
  // edit an order may attach to it.
  const canAttachFiles =
    canCreate || canEdit || hasPermission(MAINTENANCE_PERMISSIONS.CREATE_WORK_ORDER_ATTACHMENT);

  const [filters, setFilters] = useState<MaintenanceWorkOrderFilters>({
    search: '',
    status: initialStatus,
    work_type: 'ALL',
    priority: initialPriority,
    department: 'ALL',
    line: '',
    is_active: true,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<MaintenanceWorkOrder | null>(null);

  const optionsQuery = useMaintenanceOptions();
  const assetsQuery = useMaintenanceAssets({ is_active: true });
  const workOrdersQuery = useMaintenanceWorkOrders(filters);
  const createWorkOrder = useCreateMaintenanceWorkOrder();
  const updateWorkOrder = useUpdateMaintenanceWorkOrder();
  const uploadAttachments = useUploadWorkOrderAttachments();

  const workOrders = useMemo(() => workOrdersQuery.data ?? [], [workOrdersQuery.data]);
  const lineOptions = useMemo(
    () =>
      Array.from(new Set(workOrders.map((workOrder) => workOrder.line).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [workOrders],
  );

  const openCreate = () => {
    setEditingWorkOrder(null);
    setDialogOpen(true);
  };

  const openEdit = (workOrder: MaintenanceWorkOrder) => {
    setEditingWorkOrder(workOrder);
    setDialogOpen(true);
  };

  const handleSubmit = async (
    payload: MaintenanceWorkOrderPayload,
    attachments: StagedWorkOrderAttachment[],
  ) => {
    const saved = editingWorkOrder
      ? await updateWorkOrder.mutateAsync({ workOrderId: editingWorkOrder.id, payload })
      : await createWorkOrder.mutateAsync(payload);
    toast.success(editingWorkOrder ? 'Work order updated' : 'Work order created');

    // Files need the work order id, so they upload after the save. The order is
    // already stored — a failed upload is a warning, not a rollback.
    if (attachments.length) {
      try {
        await uploadAttachments.mutateAsync({ workOrderId: saved.id, staged: attachments });
        toast.success(
          attachments.length === 1
            ? 'Attachment uploaded'
            : `${attachments.length} attachments uploaded`,
        );
      } catch {
        toast.warning(
          `${saved.work_order_no} was saved, but some attachments failed to upload. Add them again from the work order.`,
        );
      }
    }

    if (!editingWorkOrder) navigate(`/maintenance/work-orders/${saved.id}`);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Work Orders"
        description="Complaints, breakdowns, and maintenance jobs"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void workOrdersQuery.refetch()}
          disabled={workOrdersQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" onClick={openCreate} disabled={!canCreate}>
          <Plus className="h-4 w-4" />
          New Work
        </Button>
      </DashboardHeader>

      <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2 xl:col-span-2">
          <Label htmlFor="work_search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="work_search"
              value={filters.search ?? ''}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="work_status">Status</Label>
          <NativeSelect
            id="work_status"
            value={filters.status ?? 'ALL'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as WorkOrderStatus | 'ALL',
              }))
            }
          >
            <SelectOption value="ALL">All</SelectOption>
            {optionsQuery.data?.work_statuses.map((item) => (
              <SelectOption key={item.value} value={item.value}>
                {item.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="work_type">Type</Label>
          <NativeSelect
            id="work_type"
            value={filters.work_type ?? 'ALL'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                work_type: event.target.value as WorkType | 'ALL',
              }))
            }
          >
            <SelectOption value="ALL">All</SelectOption>
            {optionsQuery.data?.work_types.map((item) => (
              <SelectOption key={item.value} value={item.value}>
                {item.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="work_priority">Priority</Label>
          <NativeSelect
            id="work_priority"
            value={filters.priority ?? 'ALL'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                priority: event.target.value as MaintenancePriority | 'ALL',
              }))
            }
          >
            <SelectOption value="ALL">All</SelectOption>
            {optionsQuery.data?.priorities.map((item) => (
              <SelectOption key={item.value} value={item.value}>
                {item.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="work_department">Department</Label>
          <NativeSelect
            id="work_department"
            value={filters.department ?? 'ALL'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                department: event.target.value === 'ALL' ? 'ALL' : Number(event.target.value),
              }))
            }
          >
            <SelectOption value="ALL">All</SelectOption>
            {optionsQuery.data?.departments.map((department) => (
              <SelectOption key={department.id} value={String(department.id)}>
                {department.name}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="work_line">Line</Label>
          <NativeSelect
            id="work_line"
            value={filters.line ?? ''}
            onChange={(event) =>
              setFilters((current) => ({ ...current, line: event.target.value }))
            }
          >
            <SelectOption value="">All</SelectOption>
            {lineOptions.map((line) => (
              <SelectOption key={line} value={line}>
                {line}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1300px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Work</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assignee</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Production</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Raised</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workOrdersQuery.isLoading ? (
              <tr>
                <td colSpan={10} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  Loading work orders...
                </td>
              </tr>
            ) : workOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <SlidersHorizontal className="mx-auto mb-2 h-5 w-5" />
                  No work orders found.
                </td>
              </tr>
            ) : (
              workOrders.map((workOrder) => (
                <tr key={workOrder.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left font-semibold text-primary hover:underline"
                      onClick={() => navigate(`/maintenance/work-orders/${workOrder.id}`)}
                    >
                      {workOrder.work_order_no}
                    </button>
                    <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                      {workOrder.title}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{workOrder.asset_code || workOrder.asset_text || '-'}</div>
                    <div className="text-xs text-muted-foreground">
                      {workOrder.asset_code ? workOrder.asset_name : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {choiceLabel(optionsQuery.data?.work_types, workOrder.work_type)}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={workOrder.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <WorkOrderStatusBadge status={workOrder.status} />
                  </td>
                  <td className="px-4 py-3">{workOrder.assigned_to_display || '-'}</td>
                  <td className="px-4 py-3">
                    {workOrder.production_run ? (
                      <button
                        type="button"
                        className="text-left text-primary hover:underline"
                        onClick={() =>
                          navigate(`/production/execution/runs/${workOrder.production_run}`)
                        }
                      >
                        Run #{workOrder.production_run_number}
                        <div className="text-xs text-muted-foreground">
                          {workOrder.production_line_name || workOrder.production_product || '-'}
                        </div>
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const raised = raisedOn(workOrder.created_at);
                      return (
                        <>
                          <div className="whitespace-nowrap">{raised.date}</div>
                          {raised.time && (
                            <div className="text-xs text-muted-foreground">{raised.time}</div>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">{workOrder.target_date || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/maintenance/work-orders/${workOrder.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(workOrder)}
                        disabled={!canEdit || workOrder.status === 'CLOSED'}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <WorkOrderFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          workOrder={editingWorkOrder}
          options={optionsQuery.data}
          assets={assetsQuery.data ?? []}
          isSubmitting={
            createWorkOrder.isPending || updateWorkOrder.isPending || uploadAttachments.isPending
          }
          canAttachFiles={canAttachFiles}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
