import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2, Play, Plus, Send, Warehouse } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useAddBreakdown,
  useAddManualBreakdown,
  useAddManualSegment,
  useBreakdownCategories,
  useCompleteRun,
  useMachines,
  useResolveBreakdown,
  useRun,
  useStartProduction,
  useStopProduction,
  useSubmitPreformRequest,
} from '../api';
import { BlowingStatusBadge, BlowingTimeline } from '../components';
import {
  type AddBreakdownFormData,
  type AddBreakdownFormInput,
  addBreakdownSchema,
  type AddManualBreakdownFormData,
  type AddManualBreakdownFormInput,
  addManualBreakdownSchema,
  type AddManualSegmentFormData,
  type AddManualSegmentFormInput,
  addManualSegmentSchema,
  type CompleteRunFormData,
  type CompleteRunFormInput,
  completeRunSchema,
  type StopProductionFormData,
  type StopProductionFormInput,
  stopProductionSchema,
} from '../schemas';
import type { WarehouseApprovalStatus } from '../types';

const fmt = (v: string | number | null | undefined, digits = 2) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: digits }) : '—';
};

const WH_BADGE: Record<WarehouseApprovalStatus, string> = {
  NOT_REQUESTED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  PARTIALLY_APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
};
const WH_LABEL: Record<WarehouseApprovalStatus, string> = {
  NOT_REQUESTED: 'WH Not Requested',
  PENDING: 'WH Pending',
  APPROVED: 'WH Approved',
  PARTIALLY_APPROVED: 'WH Partial',
  REJECTED: 'WH Rejected',
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between border-b py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const num = (v: string | number | null | undefined) => Number(v ?? 0);

/** A single line inside a cost dropdown: name + how-it's-worked-out hint + amount. */
function CostLine({ label, hint, value }: { label: string; hint?: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1 text-sm">
      <span>
        <span className="text-muted-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground/70">{hint}</span>}
      </span>
      <span className="whitespace-nowrap font-medium">{value}</span>
    </div>
  );
}

/** A collapsible cost bucket: click the header to reveal how the total was built up. */
function CostGroup({
  title,
  subtitle,
  total,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  total: string | number | null | undefined;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left text-sm">
        <span className="flex items-center gap-1.5">
          <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')} />
          <span>
            <span className="font-medium">{title}</span>
            {subtitle && <span className="block text-xs text-muted-foreground">{subtitle}</span>}
          </span>
        </span>
        <span className="font-semibold">₹ {fmt(total)}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-1 pl-6">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function RunDetailPage() {
  const navigate = useNavigate();
  const { runId } = useParams();
  const runIdNum = runId ? Number(runId) : 0;
  const { data: run, isLoading } = useRun(runIdNum);
  const { data: machines = [] } = useMachines(true);
  const { data: categories = [] } = useBreakdownCategories(true);

  const startProduction = useStartProduction(runIdNum);
  const stopProduction = useStopProduction(runIdNum);
  const addBreakdown = useAddBreakdown(runIdNum);
  const addManualSegment = useAddManualSegment(runIdNum);
  const addManualBreakdown = useAddManualBreakdown(runIdNum);
  const resolveBreakdown = useResolveBreakdown(runIdNum);
  const submitPreform = useSubmitPreformRequest(runIdNum);
  const completeRun = useCompleteRun();

  const [stopOpen, setStopOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [manualSegmentOpen, setManualSegmentOpen] = useState(false);
  const [manualBreakdownOpen, setManualBreakdownOpen] = useState(false);

  const stopForm = useForm<StopProductionFormInput, unknown, StopProductionFormData>({ resolver: zodResolver(stopProductionSchema) });
  const breakdownForm = useForm<AddBreakdownFormInput, unknown, AddBreakdownFormData>({ resolver: zodResolver(addBreakdownSchema) });
  const completeForm = useForm<CompleteRunFormInput, unknown, CompleteRunFormData>({ resolver: zodResolver(completeRunSchema) });
  const manualSegmentForm = useForm<AddManualSegmentFormInput, unknown, AddManualSegmentFormData>({ resolver: zodResolver(addManualSegmentSchema) });
  const manualBreakdownForm = useForm<AddManualBreakdownFormInput, unknown, AddManualBreakdownFormData>({ resolver: zodResolver(addManualBreakdownSchema) });

  if (isLoading || !run) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  const isCompleted = run.status === 'COMPLETED';
  const hasActiveSegment = run.segments.some((s) => s.is_active);
  const hasActiveBreakdown = run.breakdowns.some((b) => b.is_active);
  const canComplete = !isCompleted && !hasActiveSegment && !hasActiveBreakdown;
  const wh = run.warehouse_approval_status;

  const startBlockReason =
    wh === 'NOT_REQUESTED' ? 'Submit the preform request to warehouse first.'
    : wh === 'PENDING' ? 'Preform request is pending warehouse approval.'
    : wh === 'REJECTED' ? 'Preform request was rejected by warehouse.'
    : undefined;

  const act = async (p: Promise<unknown>, ok: string) => {
    try { await p; toast.success(ok); }
    catch (e) { toast.error((e as { message?: string })?.message ?? 'Action failed'); }
  };

  const onStop = stopForm.handleSubmit(async (d) => {
    await act(stopProduction.mutateAsync({ produced_pcs: String(d.produced_pcs), remarks: d.remarks }), 'Production stopped');
    setStopOpen(false); stopForm.reset();
  });
  const onBreakdown = breakdownForm.handleSubmit(async (d) => {
    await act(addBreakdown.mutateAsync({
      breakdown_category_id: d.breakdown_category_id ?? null,
      machine_id: d.machine_id ?? null,
      reason: d.reason,
      produced_pcs: String(d.produced_pcs ?? 0),
      remarks: d.remarks,
    }), 'Breakdown logged');
    setBreakdownOpen(false); breakdownForm.reset();
  });
  const onComplete = completeForm.handleSubmit(async (d) => {
    await act(completeRun.mutateAsync({ id: runIdNum, data: d }), 'Run completed');
    setCompleteOpen(false);
  });
  // datetime-local yields local wall-clock; convert to timezone-aware ISO.
  const toIso = (localValue: string) => new Date(localValue).toISOString();
  const onManualSegment = manualSegmentForm.handleSubmit(async (d) => {
    await act(addManualSegment.mutateAsync({
      start_time: toIso(d.start_time),
      end_time: toIso(d.end_time),
      produced_pcs: String(d.produced_pcs ?? 0),
      remarks: d.remarks,
    }), 'Running period added');
    setManualSegmentOpen(false); manualSegmentForm.reset();
  });
  const onManualBreakdown = manualBreakdownForm.handleSubmit(async (d) => {
    await act(addManualBreakdown.mutateAsync({
      start_time: toIso(d.start_time),
      end_time: toIso(d.end_time),
      breakdown_category_id: d.breakdown_category_id ?? null,
      machine_id: d.machine_id ?? null,
      reason: d.reason,
      remarks: d.remarks,
    }), 'Breakdown added');
    setManualBreakdownOpen(false); manualBreakdownForm.reset();
  });

  const cost = run.cost;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Run #${run.run_number} — ${run.date}`}
        description={`${run.machine_name} · ${run.preform_make} ${fmt(run.preform_gram, 0)}g`}
      >
        <Button variant="outline" onClick={() => navigate('/production/blowing')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {!isCompleted && wh === 'NOT_REQUESTED' && (
          <Button
            variant="outline"
            className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
            disabled={submitPreform.isPending}
            onClick={() => act(submitPreform.mutateAsync(undefined), 'Preform request submitted')}
          >
            {submitPreform.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            Request preform from WH
          </Button>
        )}
        {!isCompleted && !hasActiveSegment && !hasActiveBreakdown && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            disabled={startProduction.isPending || Boolean(startBlockReason)}
            title={startBlockReason}
            onClick={() => act(startProduction.mutateAsync(), 'Production started')}
          >
            <Play className="mr-1 h-4 w-4" /> Start Production
          </Button>
        )}
        {!isCompleted && !hasActiveSegment && !hasActiveBreakdown && (
          <>
            <Button
              variant="outline"
              onClick={() => { manualSegmentForm.reset(); setManualSegmentOpen(true); }}
              title="Log a completed running period with start & end time"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Running
            </Button>
            <Button
              variant="outline"
              onClick={() => { manualBreakdownForm.reset(); setManualBreakdownOpen(true); }}
              title="Log a past breakdown with start & end time"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Past Breakdown
            </Button>
          </>
        )}
        {!isCompleted && (
          <Button
            disabled={!canComplete}
            title={!canComplete ? 'Stop production / resolve breakdowns first' : undefined}
            onClick={() => setCompleteOpen(true)}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
          </Button>
        )}
      </DashboardHeader>

      <div className="flex flex-wrap items-center gap-2">
        <BlowingStatusBadge status={run.live_status} />
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${WH_BADGE[wh]}`}>
          <Warehouse className="h-3 w-3" /> {WH_LABEL[wh]}
        </span>
        {run.total_running_minutes > 0 && (
          <span className="text-xs text-muted-foreground">Running {run.total_running_minutes} min · Breakdown {run.total_breakdown_time} min</span>
        )}
      </div>

      {/* Preform gate — approval happens in the Warehouse module */}
      {!isCompleted && wh !== 'APPROVED' && wh !== 'PARTIALLY_APPROVED' && (
        <p className="text-sm text-muted-foreground">
          {wh === 'NOT_REQUESTED'
            ? 'Preform not requested yet — use "Request preform from WH" above. Production can’t start until the warehouse approves.'
            : wh === 'PENDING'
              ? 'Preform request is awaiting approval in Warehouse → BOM Requests.'
              : 'Preform request was rejected by the warehouse.'}
        </p>
      )}

      {/* Timeline */}
      <Card>
        <CardContent className="pt-6">
          <BlowingTimeline
            segments={run.segments}
            breakdowns={run.breakdowns}
            isCompleted={isCompleted}
            onStopProduction={() => setStopOpen(true)}
            onAddBreakdown={() => setBreakdownOpen(true)}
            onResolveBreakdown={(id, action) => act(resolveBreakdown.mutateAsync({ breakdownId: id, data: { action } }), 'Breakdown resolved')}
          />
        </CardContent>
      </Card>

      {/* Cost (after completion) */}
      {cost && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Production &amp; readings</CardTitle>
              <p className="text-xs text-muted-foreground">Exactly what the operator entered to finish this run.</p>
            </CardHeader>
            <CardContent>
              {/* Operator entries — mirrors the "Complete run" form, so it can be verified. */}
              <Row label="Total counter production" value={fmt(run.total_counter_production, 0)} />
              <Row label="Rejection" value={`${fmt(run.rejection_pcs, 0)} (${fmt(run.rejection_pct)}%)`} />
              <Row label="Operators" value={fmt(run.operator_count, 0)} />
              <Row label="Contract labour" value={fmt(run.contract_labour_count, 0)} />
              <Row label="Own labour" value={fmt(run.own_labour_count, 0)} />
              <Row label="Machine start reading" value={fmt(run.machine_start_reading, 4)} />
              <Row label="Machine stop reading" value={fmt(run.machine_stop_reading, 4)} />
              <Row label="Utility electricity (units)" value={fmt(run.utility_units, 2)} />
              <Row label="Carton scrap" value={`₹ ${fmt(run.scrap_carton_value, 2)}`} />
              {run.remarks && <Row label="Remarks" value={run.remarks} />}

              {/* Values worked out from the entries above. */}
              <div className="mt-3 mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Worked out from the above
              </div>
              <Row label="Machine units (stop − start)" value={fmt(run.machine_units, 4)} />
              <Row label="Total electricity units (machine + utility)" value={fmt(run.total_units, 2)} />
              <Row label="Good bottles" value={fmt(cost.good_bottles, 0)} />
            </CardContent>
          </Card>
          {(() => {
            const benchmark = num(cost.benchmark_blowing_per_bottle);
            const blowingPB = num(cost.blowing_cost_per_bottle);
            const hasBenchmark = benchmark > 0;
            const blowingBelow = hasBenchmark && blowingPB < benchmark;
            const marketPB = cost.market_price_per_bottle === null ? null : num(cost.market_price_per_bottle);
            const totalPB = num(cost.total_per_bottle_cost);
            const makeCheaper = marketPB !== null && totalPB <= marketPB;
            return (
              <Card className="border-primary/40">
                <CardHeader>
                  <CardTitle className="text-base">What it costs to make these bottles</CardTitle>
                  <p className="text-xs text-muted-foreground">Tap “Blowing cost” to see how it is worked out.</p>
                </CardHeader>
                <CardContent>
                  {/* Preform cost */}
                  <div className="flex items-start justify-between border-b py-2 text-sm">
                    <span>
                      <span className="font-medium">Preform cost</span>
                      <span className="block text-xs text-muted-foreground">
                        {fmt(run.total_counter_production, 0)} bottles × ₹{fmt(run.preform_rate_per_bottle, 2)}/bottle
                      </span>
                    </span>
                    <span className="font-semibold">₹ {fmt(cost.preform_cost)}</span>
                  </div>

                  {/* Blowing cost (expandable into its components) */}
                  <CostGroup
                    title="Blowing cost"
                    subtitle="Operator, labour, electricity, wastage, packing − scrap"
                    total={cost.blowing_cost}
                    defaultOpen
                  >
                    {(run.cost_lines ?? []).map((l) => (
                      <CostLine
                        key={l.category}
                        label={l.category_display}
                        hint={l.note}
                        value={`${l.is_credit ? '− ' : ''}₹ ${fmt(l.amount)}`}
                      />
                    ))}
                  </CostGroup>

                  {/* Blowing cost per bottle vs industry benchmark */}
                  <div
                    className={cn(
                      'mt-1 flex items-center justify-between rounded-md px-3 py-2',
                      !hasBenchmark ? 'bg-primary/5' : blowingBelow ? 'bg-green-500/10' : 'bg-amber-500/10',
                    )}
                  >
                    <span>
                      <span className="font-medium">Blowing cost / bottle</span>
                      <span className="block text-xs text-muted-foreground">
                        {hasBenchmark
                          ? `${blowingBelow ? 'below' : 'above'} industry benchmark ₹${fmt(benchmark, 2)}`
                          : 'set a benchmark in Cost Master to compare'}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'text-lg font-bold',
                        !hasBenchmark ? 'text-primary' : blowingBelow ? 'text-green-600' : 'text-amber-600',
                      )}
                    >
                      ₹ {fmt(cost.blowing_cost_per_bottle, 2)}
                    </span>
                  </div>

                  {/* Total per bottle = preform + blowing, vs market (buy) price */}
                  <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
                    <span className="font-medium">Total cost / bottle
                      <span className="block text-xs font-normal text-muted-foreground">preform + blowing</span>
                    </span>
                    <span className="text-lg font-bold text-primary">₹ {fmt(cost.total_per_bottle_cost, 2)}</span>
                  </div>
                  {marketPB !== null ? (
                    <div
                      className={cn(
                        'mt-1 flex items-center justify-between rounded-md px-3 py-2',
                        makeCheaper ? 'bg-green-500/10' : 'bg-amber-500/10',
                      )}
                    >
                      <span>
                        <span className={cn('font-medium', makeCheaper ? 'text-green-700' : 'text-amber-700')}>
                          {makeCheaper ? 'Making is cheaper' : 'Buying is cheaper'}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          vs market (buy) price ₹{fmt(marketPB, 2)}/bottle
                        </span>
                      </span>
                      <span className={cn('font-semibold', makeCheaper ? 'text-green-600' : 'text-amber-600')}>
                        {makeCheaper ? '−' : '+'}₹ {fmt(Math.abs(totalPB - marketPB), 2)}/bottle
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Set a Buy Price for this bottle to compare with the market.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Stop dialog */}
      <Dialog open={stopOpen} onOpenChange={setStopOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stop Production</DialogTitle></DialogHeader>
          <form onSubmit={onStop} className="space-y-4">
            <div>
              <Label>Bottles produced in this running period</Label>
              <Input type="number" step="1" {...stopForm.register('produced_pcs')} placeholder="0" />
              {stopForm.formState.errors.produced_pcs && <p className="text-sm text-red-500">{stopForm.formState.errors.produced_pcs.message}</p>}
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea {...stopForm.register('remarks')} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStopOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={stopProduction.isPending}>
                {stopProduction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Stop
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Breakdown dialog */}
      <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Breakdown</DialogTitle></DialogHeader>
          <form onSubmit={onBreakdown} className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select onValueChange={(v) => breakdownForm.setValue('breakdown_category_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Optional category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Machine (optional)</Label>
              <Select onValueChange={(v) => breakdownForm.setValue('machine_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Line-level breakdown" /></SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (<SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bottles produced before the breakdown</Label>
              <Input type="number" step="1" {...breakdownForm.register('produced_pcs')} placeholder="0" />
            </div>
            <div>
              <Label>Reason</Label>
              <Input {...breakdownForm.register('reason')} placeholder="e.g. mould jam" />
              {breakdownForm.formState.errors.reason && <p className="text-sm text-red-500">{breakdownForm.formState.errors.reason.message}</p>}
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea {...breakdownForm.register('remarks')} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBreakdownOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={addBreakdown.isPending}>
                {addBreakdown.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Log breakdown
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Running (manual backfill) dialog */}
      <Dialog open={manualSegmentOpen} onOpenChange={setManualSegmentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Running Period</DialogTitle></DialogHeader>
          <form onSubmit={onManualSegment} className="space-y-4">
            <p className="text-sm text-muted-foreground">Log a completed running period by entering its start and end time.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start time</Label>
                <Input type="datetime-local" {...manualSegmentForm.register('start_time')} />
                {manualSegmentForm.formState.errors.start_time && <p className="text-sm text-red-500">{manualSegmentForm.formState.errors.start_time.message}</p>}
              </div>
              <div>
                <Label>End time</Label>
                <Input type="datetime-local" {...manualSegmentForm.register('end_time')} />
                {manualSegmentForm.formState.errors.end_time && <p className="text-sm text-red-500">{manualSegmentForm.formState.errors.end_time.message}</p>}
              </div>
            </div>
            <div>
              <Label>Bottles produced in this running period</Label>
              <Input type="number" step="1" {...manualSegmentForm.register('produced_pcs')} placeholder="0" />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea {...manualSegmentForm.register('remarks')} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setManualSegmentOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addManualSegment.isPending}>
                {addManualSegment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Running
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Past Breakdown (manual backfill) dialog */}
      <Dialog open={manualBreakdownOpen} onOpenChange={setManualBreakdownOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Past Breakdown</DialogTitle></DialogHeader>
          <form onSubmit={onManualBreakdown} className="space-y-4">
            <p className="text-sm text-muted-foreground">Log a breakdown that already ended by entering its start and end time.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start time</Label>
                <Input type="datetime-local" {...manualBreakdownForm.register('start_time')} />
                {manualBreakdownForm.formState.errors.start_time && <p className="text-sm text-red-500">{manualBreakdownForm.formState.errors.start_time.message}</p>}
              </div>
              <div>
                <Label>End time</Label>
                <Input type="datetime-local" {...manualBreakdownForm.register('end_time')} />
                {manualBreakdownForm.formState.errors.end_time && <p className="text-sm text-red-500">{manualBreakdownForm.formState.errors.end_time.message}</p>}
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select onValueChange={(v) => manualBreakdownForm.setValue('breakdown_category_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Optional category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Machine (optional)</Label>
              <Select onValueChange={(v) => manualBreakdownForm.setValue('machine_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Line-level breakdown" /></SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (<SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Input {...manualBreakdownForm.register('reason')} placeholder="e.g. mould jam" />
              {manualBreakdownForm.formState.errors.reason && <p className="text-sm text-red-500">{manualBreakdownForm.formState.errors.reason.message}</p>}
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea {...manualBreakdownForm.register('remarks')} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setManualBreakdownOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={addManualBreakdown.isPending}>
                {addManualBreakdown.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Breakdown
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Run</DialogTitle></DialogHeader>
          <form onSubmit={onComplete} className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the end-of-run readings — costs compute from these.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total counter production</Label>
                <Input type="number" {...completeForm.register('total_counter_production')} />
                {completeForm.formState.errors.total_counter_production && <p className="text-sm text-red-500">{completeForm.formState.errors.total_counter_production.message}</p>}
              </div>
              <div><Label>Rejection (pcs)</Label><Input type="number" {...completeForm.register('rejection_pcs')} /></div>
              <div><Label>Operators</Label><Input type="number" {...completeForm.register('operator_count')} /></div>
              <div><Label>Contract labour</Label><Input type="number" {...completeForm.register('contract_labour_count')} /></div>
              <div><Label>Own labour</Label><Input type="number" {...completeForm.register('own_labour_count')} /></div>
              <div>
                <Label>Machine start reading *</Label>
                <Input type="number" step="0.0001" {...completeForm.register('machine_start_reading')} />
                {completeForm.formState.errors.machine_start_reading && <p className="text-sm text-red-500">{completeForm.formState.errors.machine_start_reading.message}</p>}
              </div>
              <div>
                <Label>Machine stop reading *</Label>
                <Input type="number" step="0.0001" {...completeForm.register('machine_stop_reading')} />
                {completeForm.formState.errors.machine_stop_reading && <p className="text-sm text-red-500">{completeForm.formState.errors.machine_stop_reading.message}</p>}
              </div>
              <div className="col-span-2">
                <Label>Utility electricity (units) *</Label>
                <Input type="number" step="0.01" {...completeForm.register('utility_units')} />
                {completeForm.formState.errors.utility_units && <p className="text-sm text-red-500">{completeForm.formState.errors.utility_units.message}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  Utility electricity units the operator reads for the day. Priced at ₹/unit (same rate as
                  machine electricity, which is metered from the start/stop readings above).
                </p>
              </div>
              <div><Label>Carton scrap (₹)</Label><Input type="number" step="0.01" {...completeForm.register('scrap_carton_value')} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCompleteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={completeRun.isPending}>
                {completeRun.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Complete run
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RunDetailPage;
