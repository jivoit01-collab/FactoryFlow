import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  ListChecks,
  Play,
  Plus,
  RefreshCw,
  Search,
  SkipForward,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { promptDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  useCompletePMExecution,
  useCreatePMChecklistItem,
  useCreatePMPlan,
  useGenerateDuePM,
  useGeneratePMPlan,
  useMaintenanceAssets,
  useMaintenanceOptions,
  usePMChecklistItems,
  usePMExecutions,
  usePMPlans,
  useSkipPMExecution,
  useStartPMExecution,
} from '../api';
import type {
  ChecklistInputType,
  MaintenanceChecklistTemplateItem,
  MaintenancePriority,
  PMExecutionStatus,
  PMFrequency,
  PreventiveMaintenanceExecution,
  PreventiveMaintenancePlanPayload,
  WorkType,
} from '../types';

type PMWorkType = Extract<WorkType, 'PREVENTIVE' | 'INSPECTION' | 'CALIBRATION'>;

type PlanFormState = {
  title: string;
  asset: string;
  frequency: PMFrequency;
  work_type: PMWorkType;
  priority: MaintenancePriority;
  assigned_to: string;
  start_date: string;
  next_due_date: string;
  advance_days: string;
  auto_create_work_order: boolean;
  checklist_required: boolean;
  description: string;
};

type ChecklistFormState = {
  task: string;
  input_type: ChecklistInputType;
  is_required: boolean;
  expected_text: string;
  min_value: string;
  max_value: string;
  uom: string;
  safety_critical: boolean;
  sort_order: string;
};

type ResultDraft = {
  value_text: string;
  value_number: string;
  is_ok: boolean;
  remarks: string;
};

const pmWorkTypes: Array<{ value: PMWorkType; label: string }> = [
  { value: 'PREVENTIVE', label: 'Preventive' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'CALIBRATION', label: 'Calibration' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultPlanForm(): PlanFormState {
  const today = todayIso();
  return {
    title: '',
    asset: '',
    frequency: 'MONTHLY',
    work_type: 'PREVENTIVE',
    priority: 'NORMAL',
    assigned_to: '',
    start_date: today,
    next_due_date: today,
    advance_days: '0',
    auto_create_work_order: true,
    checklist_required: true,
    description: '',
  };
}

function defaultChecklistForm(nextSortOrder = 1): ChecklistFormState {
  return {
    task: '',
    input_type: 'CHECKBOX',
    is_required: true,
    expected_text: '',
    min_value: '',
    max_value: '',
    uom: '',
    safety_critical: false,
    sort_order: String(nextSortOrder),
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return value;
}

function statusClass(status: PMExecutionStatus) {
  if (status === 'COMPLETED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'IN_PROGRESS') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'SKIPPED') return 'border-slate-200 bg-slate-50 text-slate-700';
  if (status === 'OVERDUE') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function priorityClass(priority: MaintenancePriority) {
  if (priority === 'CRITICAL') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (priority === 'HIGH') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function buildPlanPayload(form: PlanFormState): PreventiveMaintenancePlanPayload {
  return {
    title: form.title.trim(),
    asset: Number(form.asset),
    frequency: form.frequency,
    work_type: form.work_type,
    priority: form.priority,
    assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
    start_date: form.start_date,
    next_due_date: form.next_due_date || form.start_date,
    advance_days: Number(form.advance_days || 0),
    auto_create_work_order: form.auto_create_work_order,
    checklist_required: form.checklist_required,
    description: form.description.trim(),
  };
}

function resultDraftForItem(
  item: MaintenanceChecklistTemplateItem,
  drafts: Record<number, ResultDraft>,
) {
  return (
    drafts[item.id] ?? {
      value_text: item.expected_text,
      value_number: '',
      is_ok: true,
      remarks: '',
    }
  );
}

export default function MaintenancePMPage() {
  const { hasAnyPermission } = usePermission();
  const canManagePM = hasAnyPermission([MAINTENANCE_PERMISSIONS.MANAGE_PM]);
  const [search, setSearch] = useState('');
  const [frequency, setFrequency] = useState<PMFrequency | 'ALL'>('ALL');
  const [executionStatus, setExecutionStatus] = useState<PMExecutionStatus | 'ALL'>('ALL');
  const [dueOnly, setDueOnly] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [dueUntil, setDueUntil] = useState(todayIso());
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [planForm, setPlanForm] = useState<PlanFormState>(() => defaultPlanForm());
  const [checklistForm, setChecklistForm] = useState<ChecklistFormState>(() =>
    defaultChecklistForm(),
  );
  const [completingExecution, setCompletingExecution] =
    useState<PreventiveMaintenanceExecution | null>(null);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [resultDrafts, setResultDrafts] = useState<Record<number, ResultDraft>>({});

  const planFilters = useMemo(
    () => ({
      search,
      frequency,
      due_only: dueOnly,
      is_active: true,
    }),
    [dueOnly, frequency, search],
  );
  const plansQuery = usePMPlans(planFilters);
  const assetsQuery = useMaintenanceAssets({ is_active: true });
  const optionsQuery = useMaintenanceOptions();
  const plans = plansQuery.data ?? [];
  const effectiveSelectedPlanId =
    plans.find((plan) => plan.id === selectedPlanId)?.id ?? plans[0]?.id ?? null;
  const executionFilters = useMemo(
    () => ({
      status: executionStatus,
      pm_plan: effectiveSelectedPlanId ?? 'ALL',
    }),
    [effectiveSelectedPlanId, executionStatus],
  );
  const checklistQuery = usePMChecklistItems(
    { pm_plan: effectiveSelectedPlanId ?? 'ALL', is_active: true },
    effectiveSelectedPlanId !== null,
  );
  const executionsQuery = usePMExecutions(executionFilters);
  const completionChecklistQuery = usePMChecklistItems(
    { pm_plan: completingExecution?.pm_plan ?? 'ALL', is_active: true },
    completingExecution !== null,
  );
  const createPlanMutation = useCreatePMPlan();
  const createChecklistMutation = useCreatePMChecklistItem();
  const generatePlanMutation = useGeneratePMPlan();
  const generateDueMutation = useGenerateDuePM();
  const startExecutionMutation = useStartPMExecution();
  const completeExecutionMutation = useCompletePMExecution();
  const skipExecutionMutation = useSkipPMExecution();

  const checklistItems = checklistQuery.data ?? [];
  const executions = executionsQuery.data ?? [];
  const selectedPlan = plans.find((plan) => plan.id === effectiveSelectedPlanId) ?? null;
  const nextSortOrder = checklistItems.length + 1;

  const openPlanDialog = () => {
    setPlanForm(defaultPlanForm());
    setPlanDialogOpen(true);
  };

  const openChecklistDialog = () => {
    setChecklistForm(defaultChecklistForm(nextSortOrder));
    setChecklistDialogOpen(true);
  };

  const refreshAll = () => {
    void plansQuery.refetch();
    void checklistQuery.refetch();
    void executionsQuery.refetch();
  };

  const handleCreatePlan = async () => {
    if (!planForm.title.trim() || !planForm.asset) return;
    await createPlanMutation.mutateAsync(buildPlanPayload(planForm));
    toast.success('PM plan created');
    setPlanDialogOpen(false);
  };

  const handleCreateChecklistItem = async () => {
    if (!effectiveSelectedPlanId || !checklistForm.task.trim()) return;
    await createChecklistMutation.mutateAsync({
      pm_plan: effectiveSelectedPlanId,
      task: checklistForm.task.trim(),
      input_type: checklistForm.input_type,
      is_required: checklistForm.is_required,
      expected_text: checklistForm.expected_text.trim(),
      min_value: checklistForm.min_value || null,
      max_value: checklistForm.max_value || null,
      uom: checklistForm.uom.trim(),
      safety_critical: checklistForm.safety_critical,
      sort_order: Number(checklistForm.sort_order || nextSortOrder),
      is_active: true,
    });
    toast.success('Checklist item added');
    setChecklistDialogOpen(false);
  };

  const handleGenerateSelectedPlan = async () => {
    if (!effectiveSelectedPlanId) return;
    const response = await generatePlanMutation.mutateAsync({
      planId: effectiveSelectedPlanId,
      payload: { due_until: dueUntil },
    });
    toast.success(`${response.generated_count} PM execution(s) generated`);
  };

  const handleGenerateAllDue = async () => {
    const response = await generateDueMutation.mutateAsync({ due_until: dueUntil });
    toast.success(`${response.generated_count} due PM execution(s) generated`);
  };

  const handleStartExecution = async (executionId: number) => {
    await startExecutionMutation.mutateAsync(executionId);
    toast.success('PM execution started');
  };

  const openCompleteDialog = (execution: PreventiveMaintenanceExecution) => {
    setCompletingExecution(execution);
    setCompletionRemarks(execution.remarks || '');
    setResultDrafts(
      Object.fromEntries(
        execution.results.map((result) => [
          result.template_item,
          {
            value_text: result.value_text,
            value_number: String(result.value_number ?? ''),
            is_ok: result.is_ok,
            remarks: result.remarks,
          },
        ]),
      ),
    );
    setCompleteDialogOpen(true);
  };

  const updateResultDraft = (itemId: number, draft: Partial<ResultDraft>) => {
    setResultDrafts((current) => ({
      ...current,
      [itemId]: {
        value_text: current[itemId]?.value_text ?? '',
        value_number: current[itemId]?.value_number ?? '',
        is_ok: current[itemId]?.is_ok ?? true,
        remarks: current[itemId]?.remarks ?? '',
        ...draft,
      },
    }));
  };

  const handleCompleteExecution = async () => {
    if (!completingExecution) return;
    const items = completionChecklistQuery.data ?? [];
    await completeExecutionMutation.mutateAsync({
      executionId: completingExecution.id,
      payload: {
        remarks: completionRemarks.trim(),
        completion_remarks: completionRemarks.trim(),
        checklist_results: items.map((item) => {
          const draft = resultDraftForItem(item, resultDrafts);
          return {
            template_item: item.id,
            value_text: item.input_type === 'NUMBER' ? '' : draft.value_text,
            value_number:
              item.input_type === 'NUMBER' && draft.value_number ? draft.value_number : null,
            is_ok: draft.is_ok,
            remarks: draft.remarks,
          };
        }),
      },
    });
    toast.success('PM execution completed');
    setCompleteDialogOpen(false);
    setCompletingExecution(null);
  };

  const handleSkipExecution = async (execution: PreventiveMaintenanceExecution) => {
    const reason = await promptDialog({
      title: `Skip ${execution.pm_plan_code}?`,
      label: 'Reason',
      confirmLabel: 'Skip',
    });
    if (!reason) return;
    await skipExecutionMutation.mutateAsync({
      executionId: execution.id,
      payload: { skip_reason: reason.trim() },
    });
    toast.success('PM execution skipped');
  };

  const renderResultInput = (item: MaintenanceChecklistTemplateItem) => {
    const draft = resultDraftForItem(item, resultDrafts);
    if (item.input_type === 'NUMBER') {
      return (
        <Input
          type="number"
          value={draft.value_number}
          onChange={(event) => updateResultDraft(item.id, { value_number: event.target.value })}
          placeholder={item.uom || 'Value'}
        />
      );
    }
    if (item.input_type === 'TEXT') {
      return (
        <Input
          value={draft.value_text}
          onChange={(event) => updateResultDraft(item.id, { value_text: event.target.value })}
          placeholder={item.expected_text || 'Result'}
        />
      );
    }
    return (
      <NativeSelect
        value={draft.is_ok ? 'true' : 'false'}
        onChange={(event) => updateResultDraft(item.id, { is_ok: event.target.value === 'true' })}
      >
        <SelectOption value="true">
          {item.input_type === 'PASS_FAIL' ? 'Pass' : 'Done'}
        </SelectOption>
        <SelectOption value="false">
          {item.input_type === 'PASS_FAIL' ? 'Fail' : 'Not Done'}
        </SelectOption>
      </NativeSelect>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="PM / Checklist"
        description="Preventive maintenance plans, checklist templates, and due executions"
      >
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw
            className={`h-4 w-4 ${
              plansQuery.isFetching || checklistQuery.isFetching || executionsQuery.isFetching
                ? 'animate-spin'
                : ''
            }`}
          />
          Refresh
        </Button>
        <Button size="sm" onClick={openPlanDialog} disabled={!canManagePM}>
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm text-muted-foreground">Active Plans</div>
              <div className="text-2xl font-semibold">{plans.length}</div>
            </div>
            <CalendarCheck className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm text-muted-foreground">Due Plans</div>
              <div className="text-2xl font-semibold">
                {plans.filter((plan) => plan.is_due).length}
              </div>
            </div>
            <Clock className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm text-muted-foreground">Open Executions</div>
              <div className="text-2xl font-semibold">
                {
                  executions.filter((execution) =>
                    ['PENDING', 'IN_PROGRESS', 'OVERDUE'].includes(execution.effective_status),
                  ).length
                }
              </div>
            </div>
            <ListChecks className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm text-muted-foreground">Checklist Items</div>
              <div className="text-2xl font-semibold">{checklistItems.length}</div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_180px_160px_140px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search plan, asset, or code"
              className="pl-9"
            />
          </div>
          <NativeSelect
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as PMFrequency | 'ALL')}
          >
            <SelectOption value="ALL">All Frequencies</SelectOption>
            {(optionsQuery.data?.pm_frequencies ?? []).map((choice) => (
              <SelectOption key={choice.value} value={choice.value}>
                {choice.label}
              </SelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={executionStatus}
            onChange={(event) =>
              setExecutionStatus(event.target.value as PMExecutionStatus | 'ALL')
            }
          >
            <SelectOption value="ALL">All Executions</SelectOption>
            {(optionsQuery.data?.pm_execution_statuses ?? []).map((choice) => (
              <SelectOption key={choice.value} value={choice.value}>
                {choice.label}
              </SelectOption>
            ))}
          </NativeSelect>
          <Button
            variant={dueOnly ? 'default' : 'outline'}
            onClick={() => setDueOnly((value) => !value)}
          >
            Due Only
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Plans</CardTitle>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dueUntil}
                onChange={(event) => setDueUntil(event.target.value)}
                className="w-[150px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateAllDue}
                disabled={!canManagePM || generateDueMutation.isPending}
              >
                Generate Due
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Frequency
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Next Due
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="h-24 px-4 text-center text-muted-foreground">
                        No PM plans found.
                      </td>
                    </tr>
                  ) : (
                    plans.map((plan) => (
                      <tr
                        key={plan.id}
                        className={`cursor-pointer border-b last:border-b-0 ${
                          effectiveSelectedPlanId === plan.id ? 'bg-muted/50' : ''
                        }`}
                        onClick={() => setSelectedPlanId(plan.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{plan.plan_code}</div>
                          <div className="text-muted-foreground">{plan.title}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{plan.asset_code}</div>
                          <div className="text-muted-foreground">{plan.asset_name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{plan.frequency}</Badge>
                            <Badge variant="outline" className={priorityClass(plan.priority)}>
                              {plan.priority}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{formatDate(plan.next_due_date)}</div>
                          {plan.is_due && (
                            <div className="text-xs font-medium text-amber-700">Due</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {plan.open_execution_count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Selected Plan</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateSelectedPlan}
                disabled={!effectiveSelectedPlanId || !canManagePM || generatePlanMutation.isPending}
              >
                Generate
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedPlan ? (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground">Plan</div>
                    <div className="text-lg font-semibold">{selectedPlan.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedPlan.plan_code} / {selectedPlan.asset_code} -{' '}
                      {selectedPlan.asset_name}
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <div className="text-muted-foreground">Department</div>
                      <div>{selectedPlan.department_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Assigned To</div>
                      <div>{selectedPlan.assigned_to_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Checklist Required</div>
                      <div>{selectedPlan.checklist_required ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Work Orders</div>
                      <div>{selectedPlan.auto_create_work_order ? 'Auto create' : 'Manual'}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  Select or create a PM plan.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Checklist Template</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={openChecklistDialog}
                disabled={!effectiveSelectedPlanId || !canManagePM}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklistItems.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  No checklist items for this PM plan.
                </div>
              ) : (
                checklistItems.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {item.sort_order}. {item.task}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.input_type}
                          {item.uom ? ` / ${item.uom}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {item.is_required && <Badge variant="outline">Required</Badge>}
                        {item.safety_critical && (
                          <Badge
                            variant="outline"
                            className="border-rose-200 bg-rose-50 text-rose-700"
                          >
                            Safety
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">PM Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Execution
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-24 px-4 text-center text-muted-foreground">
                      No PM executions found.
                    </td>
                  </tr>
                ) : (
                  executions.map((execution) => (
                    <tr key={execution.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{execution.pm_plan_code}</div>
                        <div className="text-muted-foreground">{execution.pm_plan_title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{execution.asset_code}</div>
                        <div className="text-muted-foreground">{execution.asset_name}</div>
                      </td>
                      <td className="px-4 py-3">{formatDate(execution.due_date)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={statusClass(execution.effective_status)}
                        >
                          {execution.effective_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartExecution(execution.id)}
                            disabled={
                              !canManagePM ||
                              !['PENDING', 'OVERDUE'].includes(execution.effective_status) ||
                              startExecutionMutation.isPending
                            }
                          >
                            <Play className="h-4 w-4" />
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCompleteDialog(execution)}
                            disabled={
                              !canManagePM ||
                              ['COMPLETED', 'SKIPPED'].includes(execution.status) ||
                              completeExecutionMutation.isPending
                            }
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSkipExecution(execution)}
                            disabled={
                              !canManagePM ||
                              ['COMPLETED', 'SKIPPED'].includes(execution.status) ||
                              skipExecutionMutation.isPending
                            }
                          >
                            <SkipForward className="h-4 w-4" />
                            Skip
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New PM Plan</DialogTitle>
            <DialogDescription>
              Create a preventive maintenance schedule for an asset.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pm-plan-title">Title</Label>
              <Input
                id="pm-plan-title"
                value={planForm.title}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-plan-asset">Asset</Label>
              <NativeSelect
                id="pm-plan-asset"
                value={planForm.asset}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, asset: event.target.value }))
                }
              >
                <SelectOption value="">Select Asset</SelectOption>
                {(assetsQuery.data ?? []).map((asset) => (
                  <SelectOption key={asset.id} value={String(asset.id)}>
                    {asset.asset_code} - {asset.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-plan-assigned">Assigned To</Label>
              <NativeSelect
                id="pm-plan-assigned"
                value={planForm.assigned_to}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, assigned_to: event.target.value }))
                }
              >
                <SelectOption value="">Unassigned</SelectOption>
                {(optionsQuery.data?.users ?? []).map((user) => (
                  <SelectOption key={user.id} value={String(user.id)}>
                    {user.label || user.full_name || user.email}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-plan-frequency">Frequency</Label>
              <NativeSelect
                id="pm-plan-frequency"
                value={planForm.frequency}
                onChange={(event) =>
                  setPlanForm((current) => ({
                    ...current,
                    frequency: event.target.value as PMFrequency,
                  }))
                }
              >
                {(optionsQuery.data?.pm_frequencies ?? []).map((choice) => (
                  <SelectOption key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-plan-work-type">Work Type</Label>
              <NativeSelect
                id="pm-plan-work-type"
                value={planForm.work_type}
                onChange={(event) =>
                  setPlanForm((current) => ({
                    ...current,
                    work_type: event.target.value as PMWorkType,
                  }))
                }
              >
                {pmWorkTypes.map((choice) => (
                  <SelectOption key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-plan-priority">Priority</Label>
              <NativeSelect
                id="pm-plan-priority"
                value={planForm.priority}
                onChange={(event) =>
                  setPlanForm((current) => ({
                    ...current,
                    priority: event.target.value as MaintenancePriority,
                  }))
                }
              >
                {(optionsQuery.data?.priorities ?? []).map((choice) => (
                  <SelectOption key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-plan-start">Start Date</Label>
              <Input
                id="pm-plan-start"
                type="date"
                value={planForm.start_date}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, start_date: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-plan-next">Next Due</Label>
              <Input
                id="pm-plan-next"
                type="date"
                value={planForm.next_due_date}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, next_due_date: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-plan-advance">Advance Days</Label>
              <Input
                id="pm-plan-advance"
                type="number"
                min="0"
                value={planForm.advance_days}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, advance_days: event.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-6 pt-7">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={planForm.auto_create_work_order}
                  onCheckedChange={(checked) =>
                    setPlanForm((current) => ({ ...current, auto_create_work_order: checked }))
                  }
                />
                Auto work order
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={planForm.checklist_required}
                  onCheckedChange={(checked) =>
                    setPlanForm((current) => ({ ...current, checklist_required: checked }))
                  }
                />
                Checklist required
              </label>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pm-plan-description">Description</Label>
              <Textarea
                id="pm-plan-description"
                value={planForm.description}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlan}
              disabled={createPlanMutation.isPending || !planForm.title.trim() || !planForm.asset}
            >
              Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Checklist Item</DialogTitle>
            <DialogDescription>Add a template item to the selected PM plan.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pm-check-task">Task</Label>
              <Input
                id="pm-check-task"
                value={checklistForm.task}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, task: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-check-input">Input Type</Label>
              <NativeSelect
                id="pm-check-input"
                value={checklistForm.input_type}
                onChange={(event) =>
                  setChecklistForm((current) => ({
                    ...current,
                    input_type: event.target.value as ChecklistInputType,
                  }))
                }
              >
                {(optionsQuery.data?.checklist_input_types ?? []).map((choice) => (
                  <SelectOption key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-check-order">Sort Order</Label>
              <Input
                id="pm-check-order"
                type="number"
                min="1"
                value={checklistForm.sort_order}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, sort_order: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-check-expected">Expected Text</Label>
              <Input
                id="pm-check-expected"
                value={checklistForm.expected_text}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, expected_text: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-check-uom">UOM</Label>
              <Input
                id="pm-check-uom"
                value={checklistForm.uom}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, uom: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-check-min">Min Value</Label>
              <Input
                id="pm-check-min"
                type="number"
                value={checklistForm.min_value}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, min_value: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-check-max">Max Value</Label>
              <Input
                id="pm-check-max"
                type="number"
                value={checklistForm.max_value}
                onChange={(event) =>
                  setChecklistForm((current) => ({ ...current, max_value: event.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-6 md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checklistForm.is_required}
                  onCheckedChange={(checked) =>
                    setChecklistForm((current) => ({ ...current, is_required: checked }))
                  }
                />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checklistForm.safety_critical}
                  onCheckedChange={(checked) =>
                    setChecklistForm((current) => ({ ...current, safety_critical: checked }))
                  }
                />
                Safety critical
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateChecklistItem}
              disabled={createChecklistMutation.isPending || !checklistForm.task.trim()}
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complete PM Execution</DialogTitle>
            <DialogDescription>
              {completingExecution
                ? `${completingExecution.pm_plan_code} due ${completingExecution.due_date}`
                : 'Record checklist results and completion remarks.'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {(completionChecklistQuery.data ?? []).map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_200px]"
              >
                <div>
                  <div className="font-medium">
                    {item.sort_order}. {item.task}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.input_type}
                    {item.is_required ? ' / Required' : ''}
                    {item.safety_critical ? ' / Safety' : ''}
                  </div>
                </div>
                {renderResultInput(item)}
                <Input
                  value={resultDraftForItem(item, resultDrafts).remarks}
                  onChange={(event) => updateResultDraft(item.id, { remarks: event.target.value })}
                  placeholder="Remarks"
                  className="md:col-span-2"
                />
              </div>
            ))}
            {completionChecklistQuery.data?.length === 0 && (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                This execution has no checklist template items.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="pm-complete-remarks">Completion Remarks</Label>
              <Textarea
                id="pm-complete-remarks"
                value={completionRemarks}
                onChange={(event) => setCompletionRemarks(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCompleteDialogOpen(false);
                setCompletingExecution(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteExecution}
              disabled={completeExecutionMutation.isPending}
            >
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
