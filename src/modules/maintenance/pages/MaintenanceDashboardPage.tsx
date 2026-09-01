import {
  Activity,
  AlertTriangle,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Factory,
  Filter,
  MapPin,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  Truck,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { StatusOverviewGrid } from '@/shared/components/dashboard/StatusOverviewGrid';
import { SummaryCard } from '@/shared/components/dashboard/SummaryCard';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import { useMaintenanceDashboard, useMaintenanceOptions } from '../api';
import { AssetStatusBadge, WorkOrderStatusBadge } from '../components';
import type {
  AssetStatus,
  MaintenanceDashboardFilters,
  MaintenancePriority,
  MaintenanceWorkOrder,
} from '../types';

const STATUS_ORDER: AssetStatus[] = [
  'RUNNING',
  'IDLE',
  'BREAKDOWN',
  'UNDER_PM',
  'UNDER_REPAIR',
  'RETIRED',
];

const STATUS_CONFIG = {
  RUNNING: {
    label: 'Running',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
    icon: Activity,
    link: '/maintenance/assets?status=RUNNING',
  },
  IDLE: {
    label: 'Idle',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50 border-slate-200',
    icon: Clock,
    link: '/maintenance/assets?status=IDLE',
  },
  BREAKDOWN: {
    label: 'Breakdown',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50 border-rose-200',
    icon: AlertTriangle,
    link: '/maintenance/assets?status=BREAKDOWN',
  },
  UNDER_PM: {
    label: 'Under PM',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50 border-sky-200',
    icon: Wrench,
    link: '/maintenance/assets?status=UNDER_PM',
  },
  UNDER_REPAIR: {
    label: 'Repair',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: Wrench,
    link: '/maintenance/assets?status=UNDER_REPAIR',
  },
  RETIRED: {
    label: 'Retired',
    color: 'text-zinc-700',
    bgColor: 'bg-zinc-50 border-zinc-200',
    icon: Boxes,
    link: '/maintenance/assets?status=RETIRED',
  },
};

function formatDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '-';
}

function formatDateTime(value: string | null | undefined) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

function formatMinutes(value: number | null | undefined) {
  const minutes = value ?? 0;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatQty(value: string | number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return numericValue.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function workTypeLabel(value: string) {
  return value.replaceAll('_', ' ');
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

interface WorkOrderTableProps {
  title: string;
  workOrders: MaintenanceWorkOrder[];
  emptyText: string;
  onOpen: (workOrderId: number) => void;
}

function WorkOrderTable({ title, workOrders, emptyText, onOpen }: WorkOrderTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Work</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 px-4 py-3 text-center text-muted-foreground">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                workOrders.map((workOrder) => (
                  <tr
                    key={workOrder.id}
                    className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                    onClick={() => onOpen(workOrder.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{workOrder.work_order_no}</div>
                      <div className="max-w-[280px] truncate text-xs text-muted-foreground">
                        {workOrder.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{workOrder.asset_code || workOrder.asset_text || '-'}</div>
                      <div className="text-xs text-muted-foreground">
                        {workOrder.asset_code ? workOrder.asset_name : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">{workTypeLabel(workOrder.work_type)}</td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={workOrder.priority} />
                    </td>
                    <td className="px-4 py-3">{formatDate(workOrder.target_date)}</td>
                    <td className="px-4 py-3">
                      <WorkOrderStatusBadge status={workOrder.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MaintenanceDashboardPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<MaintenanceDashboardFilters>({
    department: 'ALL',
    line: '',
    priority: 'ALL',
    date_from: '',
    date_to: '',
  });
  const { data, isLoading, isFetching, refetch } = useMaintenanceDashboard(filters);
  const optionsQuery = useMaintenanceOptions();

  const lineOptions = useMemo(() => {
    const lines = new Set<string>();
    optionsQuery.data?.locations.forEach((location) => {
      if (location.line) lines.add(location.line);
    });
    return Array.from(lines).sort();
  }, [optionsQuery.data?.locations]);

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== '' && value !== 'ALL',
  ).length;

  const clearFilters = () =>
    setFilters({
      department: 'ALL',
      line: '',
      priority: 'ALL',
      date_from: '',
      date_to: '',
    });

  const openWorkOrder = (workOrderId: number) => navigate(`/maintenance/work-orders/${workOrderId}`);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Maintenance" description="Asset health and maintenance control">
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2">
          <Label htmlFor="dashboard_department">Department</Label>
          <NativeSelect
            id="dashboard_department"
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
          <Label htmlFor="dashboard_line">Line</Label>
          <NativeSelect
            id="dashboard_line"
            value={filters.line ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, line: event.target.value }))}
          >
            <SelectOption value="">All</SelectOption>
            {lineOptions.map((line) => (
              <SelectOption key={line} value={line}>
                {line}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dashboard_priority">Priority</Label>
          <NativeSelect
            id="dashboard_priority"
            value={filters.priority ?? 'ALL'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                priority: event.target.value as MaintenancePriority | 'ALL',
              }))
            }
          >
            <SelectOption value="ALL">All</SelectOption>
            {optionsQuery.data?.priorities.map((priority) => (
              <SelectOption key={priority.value} value={priority.value}>
                {priority.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dashboard_date_from">From</Label>
          <Input
            id="dashboard_date_from"
            type="date"
            value={filters.date_from ?? ''}
            onChange={(event) =>
              setFilters((current) => ({ ...current, date_from: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dashboard_date_to">To</Label>
          <Input
            id="dashboard_date_to"
            type="date"
            value={filters.date_to ?? ''}
            onChange={(event) =>
              setFilters((current) => ({ ...current, date_to: event.target.value }))
            }
          />
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" className="w-full" onClick={clearFilters}>
            <Filter className="h-4 w-4" />
            Clear {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-md border text-sm text-muted-foreground">
          Loading maintenance data...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Active Assets"
              value={data?.assets.active ?? 0}
              icon={Factory}
              onClick={() => navigate('/maintenance/assets')}
              details={[
                { label: 'Total', value: data?.assets.total ?? 0 },
                { label: 'Breakdown', value: data?.assets.breakdown ?? 0 },
              ]}
            />
            <SummaryCard
              title="Open Breakdowns"
              value={data?.breakdowns.open ?? 0}
              icon={AlertTriangle}
              onClick={() => navigate('/maintenance/work-orders?priority=CRITICAL')}
              details={[
                { label: 'Critical', value: data?.breakdowns.critical ?? 0 },
                { label: 'Stoppage', value: data?.breakdowns.stoppage ?? 0 },
              ]}
            />
            <SummaryCard
              title="PM Due"
              value={(data?.pm.due_today ?? 0) + (data?.pm.overdue ?? 0)}
              icon={CalendarDays}
              onClick={() => navigate('/maintenance/work-orders')}
              details={[
                { label: 'Today', value: data?.pm.due_today ?? 0 },
                { label: 'Overdue', value: data?.pm.overdue ?? 0 },
              ]}
            />
            <SummaryCard
              title="Today Tasks"
              value={data?.today_tasks.total ?? 0}
              icon={ClipboardList}
              onClick={() => navigate('/maintenance/work-orders')}
              details={[
                { label: 'High', value: data?.today_tasks.high_priority ?? 0 },
                { label: 'Overdue', value: data?.today_tasks.overdue ?? 0 },
              ]}
            />
            <SummaryCard
              title="Downtime"
              value={formatMinutes(data?.production_downtime.total_minutes)}
              icon={TimerReset}
              details={[
                { label: 'Runs', value: data?.production_downtime.impacted_runs ?? 0 },
                { label: 'Active', value: data?.production_downtime.active_breakdowns ?? 0 },
              ]}
            />
            <SummaryCard
              title="Critical Spares"
              value={data?.spare_risk.critical_shortage ?? 0}
              icon={PackageSearch}
              onClick={() => navigate('/maintenance/spares')}
              details={[
                { label: 'Low', value: data?.spare_risk.low_stock ?? 0 },
                { label: 'Min', value: data?.spare_risk.below_minimum ?? 0 },
              ]}
            />
            <SummaryCard
              title="Vendor / AMC"
              value={(data?.vendor_amc.due_visits ?? 0) + (data?.vendor_amc.amc_due ?? 0)}
              icon={Truck}
              details={[
                { label: 'Visits', value: data?.vendor_amc.due_visits ?? 0 },
                { label: 'AMC', value: data?.vendor_amc.amc_due ?? 0 },
              ]}
            />
            <SummaryCard
              title="PM Compliance"
              value={
                data?.pm.compliance_percent === null || data?.pm.compliance_percent === undefined
                  ? '-'
                  : `${data.pm.compliance_percent}%`
              }
              icon={CheckCircle2}
              details={[
                { label: 'Done', value: data?.pm.completed_due ?? 0 },
                { label: 'Due', value: data?.pm.due_total ?? 0 },
              ]}
            />
          </div>

          <StatusOverviewGrid
            statusConfig={STATUS_CONFIG}
            statusOrder={STATUS_ORDER}
            counts={data?.assets.by_status ?? {}}
            className="lg:grid-cols-6"
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <WorkOrderTable
              title="Open Breakdowns"
              workOrders={data?.open_breakdowns ?? []}
              emptyText="No open breakdowns found."
              onOpen={openWorkOrder}
            />
            <WorkOrderTable
              title="Today Tasks"
              workOrders={data?.today_tasks.items ?? []}
              emptyText="No tasks due today."
              onOpen={openWorkOrder}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <WorkOrderTable
              title="PM Due / Overdue"
              workOrders={data?.pm_due_work_orders ?? []}
              emptyText="No PM work is due."
              onOpen={openWorkOrder}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Critical Spare Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Spare</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stock</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Minimum</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Shortage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.spare_risk.items ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="h-24 px-4 py-3 text-center text-muted-foreground">
                            No spare alerts found.
                          </td>
                        </tr>
                      ) : (
                        data?.spare_risk.items.map((spare) => (
                          <tr
                            key={spare.id}
                            className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                            onClick={() => navigate('/maintenance/spares')}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{spare.part_number}</div>
                              <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                                {spare.name}
                              </div>
                            </td>
                            <td className="px-4 py-3">{formatQty(spare.current_stock)}</td>
                            <td className="px-4 py-3">{formatQty(spare.minimum_stock)}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                                {formatQty(spare.reorder_shortage_qty)}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendor / AMC Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visit</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Planned</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.vendor_amc.visits ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="h-24 px-4 py-3 text-center text-muted-foreground">
                            No vendor visits due.
                          </td>
                        </tr>
                      ) : (
                        data?.vendor_amc.visits.map((visit) => (
                          <tr
                            key={visit.id}
                            className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                            onClick={() => openWorkOrder(visit.work_order)}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{visit.vendor_name}</div>
                              <div className="text-xs text-muted-foreground">{visit.work_order_no}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div>{visit.asset_code}</div>
                              <div className="text-xs text-muted-foreground">{visit.asset_name}</div>
                            </td>
                            <td className="px-4 py-3">{formatDateTime(visit.planned_start)}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{visit.status.replaceAll('_', ' ')}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vendor</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">AMC End</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.vendor_amc.amc_assets ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="h-24 px-4 py-3 text-center text-muted-foreground">
                            No AMC renewals due.
                          </td>
                        </tr>
                      ) : (
                        data?.vendor_amc.amc_assets.map((asset) => (
                          <tr
                            key={asset.id}
                            className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                            onClick={() => navigate(`/maintenance/assets/${asset.id}`)}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{asset.asset_code}</div>
                              <div className="text-xs text-muted-foreground">{asset.name}</div>
                            </td>
                            <td className="px-4 py-3">{asset.amc_vendor || '-'}</td>
                            <td className="px-4 py-3">{formatDate(asset.amc_end_date)}</td>
                            <td className="px-4 py-3">
                              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Work</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assignee</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recent_work_orders ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="h-24 px-4 py-3 text-center text-muted-foreground">
                          No work orders found.
                        </td>
                      </tr>
                    ) : (
                      data?.recent_work_orders.map((workOrder) => (
                        <tr
                          key={workOrder.id}
                          className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                          onClick={() => openWorkOrder(workOrder.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{workOrder.work_order_no}</div>
                            <div className="max-w-[280px] truncate text-xs text-muted-foreground">
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
                            <PriorityBadge priority={workOrder.priority} />
                          </td>
                          <td className="px-4 py-3">{workOrder.assigned_to_display || '-'}</td>
                          <td className="px-4 py-3">
                            <WorkOrderStatusBadge status={workOrder.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recent_assets ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="h-24 px-4 py-3 text-center text-muted-foreground">
                          No assets found.
                        </td>
                      </tr>
                    ) : (
                      data?.recent_assets.map((asset) => (
                        <tr
                          key={asset.id}
                          className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                          onClick={() => navigate(`/maintenance/assets/${asset.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{asset.asset_code}</div>
                            <div className="text-xs text-muted-foreground">{asset.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {asset.location_name || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">{asset.department_name || '-'}</td>
                          <td className="px-4 py-3">
                            <AssetStatusBadge status={asset.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
