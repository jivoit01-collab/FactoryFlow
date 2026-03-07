import { format } from 'date-fns';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  ShieldX,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { DashboardLoading } from '@/shared/components/dashboard/DashboardLoading';

import { useDeletePlan, usePlans, usePlanSummary } from '../api';
import { PlanStatusBadge } from '../components/PlanStatusBadge';
import { PlanSummaryCards } from '../components/PlanSummaryCards';
import { SAPPostingBadge } from '../components/SAPPostingBadge';
import { PLAN_STATUS_LABELS } from '../constants';
import type { PlanStatus, ProductionPlan } from '../types';

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function formatQty(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    return `${format(s, 'dd MMM')} - ${format(e, 'dd MMM yyyy')}`;
  } catch {
    return `${start} - ${end}`;
  }
}

export default function PlanningDashboardPage() {
  const navigate = useNavigate();

  // Month navigation
  const [monthDate, setMonthDate] = useState(() => new Date());
  const monthParam = useMemo(
    () => format(monthDate, 'yyyy-MM'),
    [monthDate],
  );
  const monthLabel = format(monthDate, 'MMMM yyyy');

  const prevMonth = () =>
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Status filter
  const [statusFilter, setStatusFilter] = useState('');

  // Data
  const {
    data: plans = [],
    isLoading,
    error,
    refetch,
  } = usePlans(statusFilter || undefined, monthParam);

  const { data: summary } = usePlanSummary(monthParam);

  // Delete plan
  const deleteMutation = useDeletePlan();
  const [planToDelete, setPlanToDelete] = useState<ProductionPlan | null>(null);

  const handleDelete = () => {
    if (!planToDelete) return;
    deleteMutation.mutate(planToDelete.id, {
      onSuccess: () => {
        setPlanToDelete(null);
      },
    });
  };

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Production Planning"
        description="Create and manage monthly production plans"
        primaryAction={{
          label: 'Create Plan',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => navigate('/production/planning/create'),
        }}
      />

      {isLoading ? (
        <DashboardLoading />
      ) : (
        <>
          {/* Permission Error */}
          {isPermissionError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
              <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-destructive">Permission Denied</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'You do not have permission to view production plans.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* General API Error */}
          {error && !isPermissionError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-yellow-800 dark:text-yellow-400">
                  Failed to Load
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'An error occurred while loading plans.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Summary Cards */}
          {summary && <PlanSummaryCards summary={summary} />}

          {/* Filters: Month + Status */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Month navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-36 text-center">{monthLabel}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Status filter */}
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status breakdown badges */}
          {summary && (
            <div className="flex flex-wrap gap-2">
              {(Object.entries(summary.status_breakdown) as [PlanStatus, number][])
                .filter(([, count]) => count > 0)
                .map(([status, count]) => (
                  <Badge
                    key={status}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setStatusFilter(status)}
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full mr-1.5 ${
                        status === 'DRAFT'
                          ? 'bg-gray-400'
                          : status === 'OPEN'
                            ? 'bg-blue-500'
                            : status === 'IN_PROGRESS'
                              ? 'bg-amber-500'
                              : status === 'COMPLETED'
                                ? 'bg-green-500'
                                : status === 'CLOSED'
                                  ? 'bg-slate-500'
                                  : 'bg-red-500'
                      }`}
                    />
                    {PLAN_STATUS_LABELS[status]}: {count}
                  </Badge>
                ))}
            </div>
          )}

          {/* Plans Table */}
          {plans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-sm">
                  No production plans for {monthLabel}.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/production/planning/create')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left font-medium px-4 py-3">Item Code</th>
                      <th className="text-left font-medium px-4 py-3">Item Name</th>
                      <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">
                        Warehouse
                      </th>
                      <th className="text-right font-medium px-4 py-3">Planned</th>
                      <th className="text-right font-medium px-4 py-3 hidden sm:table-cell">
                        Produced
                      </th>
                      <th className="text-left font-medium px-4 py-3 hidden md:table-cell">
                        Progress
                      </th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                      <th className="text-left font-medium px-4 py-3 hidden md:table-cell">SAP</th>
                      <th className="text-left font-medium px-4 py-3 hidden xl:table-cell">
                        Dates
                      </th>
                      <th className="text-right font-medium px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr
                        key={plan.id}
                        className={`border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${
                          plan.sap_posting_status === 'FAILED'
                            ? 'bg-destructive/5 hover:bg-destructive/10'
                            : ''
                        }`}
                        onClick={() => navigate(`/production/planning/${plan.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{plan.item_code}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate">{plan.item_name}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                          {plan.warehouse_code || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatQty(plan.planned_qty)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                          {formatQty(plan.completed_qty)}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  plan.progress_percent >= 100
                                    ? 'bg-green-500'
                                    : plan.progress_percent > 0
                                      ? 'bg-blue-500'
                                      : 'bg-gray-300'
                                }`}
                                style={{
                                  width: `${Math.min(plan.progress_percent, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {Math.round(plan.progress_percent)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <PlanStatusBadge status={plan.status} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <SAPPostingBadge
                            status={plan.sap_posting_status}
                            sapDocNum={plan.sap_doc_num}
                            errorMessage={plan.sap_error_message}
                          />
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateRange(plan.target_start_date, plan.due_date)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/production/planning/${plan.id}`)}
                              title="View plan"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {plan.status === 'DRAFT' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => navigate(`/production/planning/${plan.id}`)}
                                  title="Edit plan"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setPlanToDelete(plan)}
                                  title="Delete plan"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Production Plan?</DialogTitle>
            <DialogDescription>
              This will permanently delete the draft plan for &ldquo;
              {planToDelete?.item_name}&rdquo;. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
