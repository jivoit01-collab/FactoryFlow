import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Edit,
  Loader2,
  Package,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useClosePlan,
  useCreateDailyEntry,
  useCreateWeeklyPlan,
  useDailyEntries,
  useDeleteMaterial,
  useDeletePlan,
  useDeleteWeeklyPlan,
  usePlanDetail,
  usePostToSAP,
  useUpdateDailyEntry,
  useUpdateWeeklyPlan,
} from '../api';
import { PlanStatusBadge } from '../components/PlanStatusBadge';
import { SAPPostingBadge } from '../components/SAPPostingBadge';
import {
  SHIFT_LABELS,
  WEEKLY_STATUS_COLORS,
  WEEKLY_STATUS_LABELS,
} from '../constants';
import type {
  CreateDailyEntryRequest,
  CreateWeeklyPlanRequest,
  DailyProductionEntry,
  PlanStatus,
  UpdateDailyEntryRequest,
  UpdateWeeklyPlanRequest,
  WeeklyPlan,
} from '../types';
import type { CreateDailyEntryFormData } from '../schemas';
import type { CreateWeeklyPlanFormData } from '../schemas';
import { DailyEntryForm } from '../components/DailyEntryForm';
import { WeeklyPlanForm } from '../components/WeeklyPlanForm';

// ============================================================================
// Helper: format number
// ============================================================================

function fmt(val: string | number): string {
  return Number(val).toLocaleString();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// Confirmation dialog helpers
// ============================================================================

type ConfirmAction = 'delete' | 'postSap' | 'close' | 'deleteMaterial' | 'deleteWeek' | null;

interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'destructive' | 'default';
}

const CONFIRM_CONFIGS: Record<Exclude<ConfirmAction, null>, ConfirmConfig> = {
  delete: {
    title: 'Delete Production Plan',
    description: 'This will permanently delete this plan and all its weekly plans, daily entries, and materials. This action cannot be undone.',
    confirmLabel: 'Delete Plan',
    variant: 'destructive',
  },
  postSap: {
    title: 'Post to SAP',
    description: 'This will post this production plan to SAP B1. Once posted, the plan cannot be edited. Continue?',
    confirmLabel: 'Post to SAP',
    variant: 'default',
  },
  close: {
    title: 'Close Plan',
    description: 'This will close the production plan. No more daily entries can be added after closing. Continue?',
    confirmLabel: 'Close Plan',
    variant: 'default',
  },
  deleteMaterial: {
    title: 'Delete Material',
    description: 'Remove this material from the bill of materials?',
    confirmLabel: 'Delete',
    variant: 'destructive',
  },
  deleteWeek: {
    title: 'Delete Weekly Plan',
    description: 'This will delete the weekly plan and all its daily entries. This cannot be undone.',
    confirmLabel: 'Delete Week',
    variant: 'destructive',
  },
};

// ============================================================================
// Status helpers
// ============================================================================

const EDITABLE_STATUSES: PlanStatus[] = ['DRAFT'];
const POSTABLE_STATUSES: PlanStatus[] = ['DRAFT', 'OPEN'];
const CLOSEABLE_STATUSES: PlanStatus[] = ['DRAFT', 'OPEN', 'IN_PROGRESS'];
const ACTIVE_STATUSES: PlanStatus[] = ['OPEN', 'IN_PROGRESS'];
const ENTRY_ALLOWED_STATUSES: PlanStatus[] = ['OPEN', 'IN_PROGRESS'];

// ============================================================================
// DailyEntriesTable (sub-component)
// ============================================================================

function DailyEntriesTable({
  weekId,
  planId,
  weekStartDate,
  weekEndDate,
  planStatus,
}: {
  weekId: number;
  planId: number;
  weekStartDate: string;
  weekEndDate: string;
  planStatus: PlanStatus;
}) {
  const { data: entries = [], isLoading } = useDailyEntries(weekId);
  const createEntry = useCreateDailyEntry(weekId, planId);
  const updateEntry = useUpdateDailyEntry(weekId, planId);
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<DailyProductionEntry | null>(null);

  const canAddEntry = ENTRY_ALLOWED_STATUSES.includes(planStatus);

  const handleSubmit = async (data: CreateDailyEntryFormData) => {
    if (editEntry) {
      const updateData: UpdateDailyEntryRequest = {
        produced_qty: data.produced_qty,
        remarks: data.remarks,
      };
      await updateEntry.mutateAsync({ entryId: editEntry.id, data: updateData });
    } else {
      const createData: CreateDailyEntryRequest = {
        production_date: data.production_date,
        produced_qty: data.produced_qty,
        shift: data.shift,
        remarks: data.remarks,
      };
      await createEntry.mutateAsync(createData);
    }
    setEditEntry(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading entries...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Daily Entries ({entries.length})
        </span>
        {canAddEntry && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditEntry(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Entry
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">No daily entries yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Produced Qty</th>
                <th className="pb-2 pr-4">Shift</th>
                <th className="pb-2 pr-4">Remarks</th>
                {canAddEntry && <th className="pb-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{formatDate(entry.production_date)}</td>
                  <td className="py-2 pr-4 font-medium">{fmt(entry.produced_qty)}</td>
                  <td className="py-2 pr-4">
                    {entry.shift ? SHIFT_LABELS[entry.shift] : '—'}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{entry.remarks || '—'}</td>
                  {canAddEntry && (
                    <td className="py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditEntry(entry);
                          setFormOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DailyEntryForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditEntry(null);
        }}
        onSubmit={handleSubmit}
        isPending={createEntry.isPending || updateEntry.isPending}
        weekStartDate={weekStartDate}
        weekEndDate={weekEndDate}
        editData={editEntry}
      />
    </div>
  );
}

// ============================================================================
// Main PlanDetailPage
// ============================================================================

export default function PlanDetailPage() {
  const { planId: planIdParam } = useParams<{ planId: string }>();
  const planId = Number(planIdParam);
  const navigate = useNavigate();

  const { data: plan, isLoading, isError } = usePlanDetail(planId || null);

  // Mutations
  const deletePlan = useDeletePlan();
  const postToSap = usePostToSAP(planId);
  const closePlan = useClosePlan(planId);
  const deleteMaterial = useDeleteMaterial(planId);
  const createWeekly = useCreateWeeklyPlan(planId);
  const updateWeekly = useUpdateWeeklyPlan(planId);
  const deleteWeekly = useDeleteWeeklyPlan(planId);

  // UI state
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmPayload, setConfirmPayload] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [weekFormOpen, setWeekFormOpen] = useState(false);
  const [editWeek, setEditWeek] = useState<WeeklyPlan | null>(null);

  // Loading / error states
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">Plan not found</p>
        <Button variant="outline" onClick={() => navigate('/production/planning')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isDraft = plan.status === 'DRAFT';
  const canEdit = EDITABLE_STATUSES.includes(plan.status);
  const canPostSap = POSTABLE_STATUSES.includes(plan.status) && plan.sap_posting_status !== 'POSTED';
  const canClose = CLOSEABLE_STATUSES.includes(plan.status);
  const canAddWeek = ACTIVE_STATUSES.includes(plan.status) || isDraft;
  const canAddMaterial = ACTIVE_STATUSES.includes(plan.status) || isDraft;

  // Toggle week expand
  const toggleWeek = (weekId: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
  };

  // Confirm action handler
  const handleConfirm = async () => {
    setActionError(null);
    try {
      switch (confirmAction) {
        case 'delete':
          await deletePlan.mutateAsync(planId);
          navigate('/production/planning');
          return;
        case 'postSap':
          await postToSap.mutateAsync();
          break;
        case 'close':
          await closePlan.mutateAsync();
          break;
        case 'deleteMaterial':
          if (confirmPayload) await deleteMaterial.mutateAsync(confirmPayload);
          break;
        case 'deleteWeek':
          if (confirmPayload) await deleteWeekly.mutateAsync(confirmPayload);
          break;
      }
    } catch (error) {
      const err = error as ApiError;
      setActionError(err.message || 'Action failed');
      return;
    }
    setConfirmAction(null);
    setConfirmPayload(null);
  };

  const isConfirmPending =
    deletePlan.isPending ||
    postToSap.isPending ||
    closePlan.isPending ||
    deleteMaterial.isPending ||
    deleteWeekly.isPending;

  // Weekly plan form handlers
  const handleWeekSubmit = async (data: CreateWeeklyPlanFormData) => {
    if (editWeek) {
      const updateData: UpdateWeeklyPlanRequest = {
        week_label: data.week_label,
        target_qty: data.target_qty,
      };
      await updateWeekly.mutateAsync({ weekId: editWeek.id, data: updateData });
    } else {
      const createData: CreateWeeklyPlanRequest = {
        week_number: data.week_number,
        week_label: data.week_label,
        start_date: data.start_date,
        end_date: data.end_date,
        target_qty: data.target_qty,
      };
      await createWeekly.mutateAsync(createData);
    }
    setEditWeek(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 flex-shrink-0"
            onClick={() => navigate('/production/planning')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold font-mono">{plan.item_code}</h1>
              <PlanStatusBadge status={plan.status} />
              <SAPPostingBadge
                status={plan.sap_posting_status}
                sapDocNum={plan.sap_doc_num}
                errorMessage={plan.sap_error_message}
              />
            </div>
            <p className="text-lg text-muted-foreground mt-1">{plan.item_name}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/production/planning/${planId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {canPostSap && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction('postSap')}
            >
              <Send className="h-4 w-4 mr-1" />
              Post to SAP
            </Button>
          )}
          {canClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction('close')}
            >
              <X className="h-4 w-4 mr-1" />
              Close Plan
            </Button>
          )}
          {canEdit && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmAction('delete')}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* SAP Error Banner */}
      {plan.sap_posting_status === 'FAILED' && plan.sap_error_message && (
        <div className="rounded-md bg-destructive/15 border border-destructive/30 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">SAP Posting Failed</p>
            <p className="text-sm text-destructive/80">{plan.sap_error_message}</p>
          </div>
        </div>
      )}

      {actionError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{actionError}</div>
      )}

      {/* Plan Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Planned Qty</p>
            <p className="text-xl font-bold">{fmt(plan.planned_qty)}</p>
            <p className="text-xs text-muted-foreground">{plan.uom}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Produced Qty</p>
            <p className="text-xl font-bold">{fmt(plan.completed_qty)}</p>
            <p className="text-xs text-muted-foreground">{plan.uom}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-xl font-bold">{plan.progress_percent}%</p>
            <div className="mt-1 h-2 w-full rounded-full bg-secondary">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  plan.progress_percent >= 100 ? 'bg-green-500' : 'bg-primary',
                )}
                style={{ width: `${Math.min(plan.progress_percent, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Date Range</p>
            <div className="flex items-center gap-1.5 mt-1">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatDate(plan.target_start_date)} — {formatDate(plan.due_date)}
              </span>
            </div>
            {plan.warehouse_code && (
              <div className="flex items-center gap-1.5 mt-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{plan.warehouse_code}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Remarks */}
      {plan.remarks && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Remarks</p>
            <p className="text-sm">{plan.remarks}</p>
          </CardContent>
        </Card>
      )}

      {/* Materials (BOM) Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Bill of Materials ({plan.materials.length})</CardTitle>
          {canAddMaterial && (
            <Button variant="outline" size="sm" disabled>
              <Plus className="h-4 w-4 mr-1" />
              Add Material
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {plan.materials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No materials added</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Component Code</th>
                    <th className="pb-2 pr-4">Component Name</th>
                    <th className="pb-2 pr-4">Required Qty</th>
                    <th className="pb-2 pr-4">UoM</th>
                    <th className="pb-2 pr-4">Warehouse</th>
                    {isDraft && <th className="pb-2">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {plan.materials.map((mat) => (
                    <tr key={mat.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{mat.component_code}</td>
                      <td className="py-2 pr-4">{mat.component_name}</td>
                      <td className="py-2 pr-4 font-medium">{fmt(mat.required_qty)}</td>
                      <td className="py-2 pr-4">{mat.uom || '—'}</td>
                      <td className="py-2 pr-4">{mat.warehouse_code || '—'}</td>
                      {isDraft && (
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              setConfirmPayload(mat.id);
                              setConfirmAction('deleteMaterial');
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Plans Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Weekly Plans ({plan.weekly_plans.length})
          </CardTitle>
          {canAddWeek && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditWeek(null);
                setWeekFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Week
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {plan.weekly_plans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">
              No weekly plans created yet
            </p>
          ) : (
            <div className="space-y-3">
              {plan.weekly_plans
                .sort((a, b) => a.week_number - b.week_number)
                .map((week) => {
                  const isExpanded = expandedWeeks.has(week.id);
                  const weekColors = WEEKLY_STATUS_COLORS[week.status];
                  return (
                    <div key={week.id} className="rounded-lg border">
                      {/* Week header */}
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => toggleWeek(week.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {week.week_label || `Week ${week.week_number}`}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                                weekColors.bg,
                                weekColors.text,
                                weekColors.darkBg,
                                weekColors.darkText,
                              )}
                            >
                              {WEEKLY_STATUS_LABELS[week.status]}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(week.start_date)} — {formatDate(week.end_date)}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-sm flex-shrink-0">
                          <div className="text-right">
                            <span className="font-medium">{fmt(week.produced_qty)}</span>
                            <span className="text-muted-foreground"> / {fmt(week.target_qty)}</span>
                          </div>
                          <div className="w-20">
                            <div className="h-2 w-full rounded-full bg-secondary">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  week.progress_percent >= 100 ? 'bg-green-500' : 'bg-primary',
                                )}
                                style={{ width: `${Math.min(week.progress_percent, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground text-right mt-0.5">
                              {week.progress_percent}%
                            </p>
                          </div>
                        </div>

                        {/* Week actions */}
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {canAddWeek && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditWeek(week);
                                setWeekFormOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {isDraft && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                setConfirmPayload(week.id);
                                setConfirmAction('deleteWeek');
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expanded daily entries */}
                      {isExpanded && (
                        <>
                          <Separator />
                          <div className="p-3 bg-muted/30">
                            <DailyEntriesTable
                              weekId={week.id}
                              planId={planId}
                              weekStartDate={week.start_date}
                              weekEndDate={week.end_date}
                              planStatus={plan.status}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <Dialog open={!!confirmAction} onOpenChange={() => { setConfirmAction(null); setConfirmPayload(null); setActionError(null); }}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{CONFIRM_CONFIGS[confirmAction].title}</DialogTitle>
              <DialogDescription>{CONFIRM_CONFIGS[confirmAction].description}</DialogDescription>
            </DialogHeader>
            {actionError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{actionError}</div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setConfirmAction(null); setConfirmPayload(null); setActionError(null); }}
                disabled={isConfirmPending}
              >
                Cancel
              </Button>
              <Button
                variant={CONFIRM_CONFIGS[confirmAction].variant}
                onClick={handleConfirm}
                disabled={isConfirmPending}
              >
                {isConfirmPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {CONFIRM_CONFIGS[confirmAction].confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Weekly Plan Form Dialog */}
      <WeeklyPlanForm
        open={weekFormOpen}
        onOpenChange={(v) => {
          setWeekFormOpen(v);
          if (!v) setEditWeek(null);
        }}
        onSubmit={handleWeekSubmit}
        isPending={createWeekly.isPending || updateWeekly.isPending}
        existingWeeks={plan.weekly_plans}
        planStartDate={plan.target_start_date}
        planDueDate={plan.due_date}
        editData={editWeek}
      />
    </div>
  );
}
