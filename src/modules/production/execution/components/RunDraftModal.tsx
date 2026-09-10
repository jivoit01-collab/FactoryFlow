/**
 * Planning a production run — the three answers, in the order the floor gives
 * them.
 *
 * A supervisor planning tomorrow evening knows three things: which line, which
 * way that line is set up, and what it should make. So that is all this asks —
 * and it asks them one at a time: the dialog opens showing nothing but the
 * lines, and each answer reveals the next question. A step that cannot be
 * answered yet is not dimmed, it is absent, so there is never a screenful of
 * fields to read past to find the one that is actually next.
 *
 * The speed, the manpower and the supervisor names ride in on the
 * configuration. The material lines are the SKU's BOM scaled to the quantity —
 * worked out here, shown in full once there is a quantity to scale by, and
 * editable per component for the case where the plan really does draw
 * something other than the BOM figure.
 *
 * What it does NOT hide is a warning. The readiness check runs against SAP as
 * the form fills, and the two findings that matter — a component short in the
 * warehouse, and a clash with another plan on the same line — surface above the
 * buttons. The backend refuses a short plan without a written reason, so the
 * reason box appears exactly when that refusal is coming, rather than after a
 * failed save.
 *
 * The same dialog edits a draft. A draft is a plan, not a commitment, so its
 * line, day, product and quantity are all still changeable; once the run has
 * started the backend refuses those, which is why the dialog only opens for
 * drafts.
 */
import { AlertTriangle, Check, ChevronDown, Factory, Loader2, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  useBOMPreview,
  useCreateRun,
  useLineConfigs,
  useLines,
  useRunPlanCheck,
  useSearchSAPItems,
  useUpdateRun,
} from '../api';
import type {
  LineSkuConfig,
  MaterialInput,
  PlanCheckRequest,
  ProductionRun,
  SAPItem,
} from '../types';
import { formatClock, toLocalIso } from '../utils';
import { MaterialReadinessPanel, type ReadinessRow } from './MaterialReadinessPanel';

interface RunDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The draft being edited. Omit to plan a new run. */
  run?: ProductionRun | null;
}

/** Tomorrow, in the `YYYY-MM-DD` an `<input type="date">` wants. */
function tomorrowIsoDate() {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  return day.toISOString().split('T')[0];
}

/**
 * One colour per question, carried by its number, its heading, the spine down
 * its side and the chip you pick in it. The colours are wayfinding, not
 * decoration: three near-identical grey blocks make you read the headings to
 * know where you are, whereas "I am in the violet one" needs no reading at
 * all. Amber and red are deliberately not among them — on this screen those
 * two mean a shortfall and a clash, and a step that borrowed them would look
 * like a warning.
 */
type Accent = 'sky' | 'violet' | 'teal';

const ACCENT: Record<
  Accent,
  { badge: string; badgeDone: string; title: string; spine: string; chip: string }
> = {
  sky: {
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    badgeDone: 'bg-sky-600 text-white',
    title: 'text-sky-800 dark:text-sky-200',
    spine: 'border-sky-200 dark:border-sky-900',
    chip: 'border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-500 dark:bg-sky-950/60 dark:text-sky-100',
  },
  violet: {
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    badgeDone: 'bg-violet-600 text-white',
    title: 'text-violet-800 dark:text-violet-200',
    spine: 'border-violet-200 dark:border-violet-900',
    chip: 'border-violet-500 bg-violet-50 text-violet-900 ring-1 ring-violet-500 dark:bg-violet-950/60 dark:text-violet-100',
  },
  teal: {
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    badgeDone: 'bg-teal-600 text-white',
    title: 'text-teal-800 dark:text-teal-200',
    spine: 'border-teal-200 dark:border-teal-900',
    chip: 'border-teal-500 bg-teal-50 text-teal-900 ring-1 ring-teal-500 dark:bg-teal-950/60 dark:text-teal-100',
  },
};

/** A numbered step heading — the dialog's only structure. */
function Step({
  index,
  title,
  hint,
  done,
  accent,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  done?: boolean;
  accent: Accent;
  children: React.ReactNode;
}) {
  const tone = ACCENT[accent];
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
            done ? tone.badgeDone : tone.badge,
          )}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : index}
        </span>
        <h3
          className={cn(
            'text-xs font-bold uppercase tracking-wide',
            done ? tone.title : 'text-muted-foreground',
          )}
        >
          {title}
        </h3>
        {hint && (
          <span className={cn('text-xs font-medium', tone.title, 'opacity-90')}>{hint}</span>
        )}
      </div>
      <div className={cn('ml-3 border-l-2 pl-5', tone.spine)}>{children}</div>
    </section>
  );
}

/** A line or a configuration — same chip, so the two steps read alike. */
function Chip({
  selected,
  onClick,
  title,
  subtitle,
  accent,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  accent: Accent;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-4 py-2.5 text-left transition-colors',
        selected ? ACCENT[accent].chip : 'border-input hover:bg-muted/60',
      )}
    >
      <span className="block text-sm font-semibold leading-tight">{title}</span>
      {subtitle && (
        <span
          className={cn(
            'mt-0.5 block text-xs leading-tight',
            selected ? 'opacity-80' : 'text-muted-foreground',
          )}
        >
          {subtitle}
        </span>
      )}
    </button>
  );
}

function configSubtitle(cfg: LineSkuConfig) {
  const bits = [
    cfg.rated_speed ? `${cfg.rated_speed} bottles/hr` : null,
    cfg.labour_count ? `${cfg.labour_count} labour` : null,
    cfg.sku_code || null,
  ].filter(Boolean);
  return bits.join(' · ');
}

export function RunDraftModal({ open, onOpenChange, run }: RunDraftModalProps) {
  const isEdit = !!run;

  const { data: lines = [] } = useLines(true);
  const createRun = useCreateRun();
  const updateRun = useUpdateRun(run?.id ?? 0);

  // The dialog is mounted only while it is open (see the dashboard), so the
  // draft being edited seeds the state once and a cancelled edit cannot leak
  // into the next one.
  const [lineId, setLineId] = useState<number | null>(run?.line ?? null);
  const [configId, setConfigId] = useState<number | null>(run?.line_config ?? null);
  const [typedItemCode, setTypedItemCode] = useState(run?.item_code ?? '');
  const [typedProduct, setTypedProduct] = useState(run?.product ?? '');
  const [requiredQty, setRequiredQty] = useState(run?.required_qty ?? '');
  const [date, setDate] = useState(run?.date ?? tomorrowIsoDate());
  const [startTime, setStartTime] = useState(formatClock(run?.planned_start_at) ?? '');
  const [labour, setLabour] = useState(run?.labour_count ? String(run.labour_count) : '');
  const [remark, setRemark] = useState(run?.planning_remark ?? '');

  const { data: lineConfigs = [], isLoading: loadingConfigs } = useLineConfigs(lineId ?? undefined);

  // A run records the preset it was planned from, so an edit opens on the same
  // answer. Runs planned before that was recorded fall back to matching the SKU
  // the draft carries. Derived rather than written into state, so a preset list
  // arriving late cannot fight with a choice already made.
  const autoConfig = useMemo(() => {
    if (run?.line_config) return null;
    const matching = lineConfigs.find((c) => c.sku_code && c.sku_code === run?.item_code);
    if (matching) return matching;
    // A new plan on a line with a single preset has no choice to make, so it is
    // made for them. A draft being edited gets no such help: applying a preset
    // it was never planned from would rewrite what the run is for the moment
    // the dialog opened, and the SKU would change under the supervisor.
    if (!isEdit && lineConfigs.length === 1) return lineConfigs[0];
    return null;
  }, [lineConfigs, run?.item_code, run?.line_config, isEdit]);

  const config = lineConfigs.find((c) => c.id === configId) ?? autoConfig;

  // A preset named after what the line makes carries the SKU, and then it — not
  // the search box — is what the run is for.
  const skuLocked = !!config?.sku_code;
  const itemCode = config?.sku_code || typedItemCode;
  const product = config?.sku_code ? config.sku_name || config.sku_code : typedProduct;

  // A preset that states a head count answers the manpower question; only a
  // preset that leaves it at zero — or a line with no preset at all — leaves it
  // to be asked, and then it is asked right where the quantity is, because how
  // many people it takes is part of saying what the line will make.
  const labourFromConfig = (config?.labour_count ?? 0) > 0;
  const labourCount = labourFromConfig ? config!.labour_count : parseInt(labour || '0', 10) || 0;

  // ---------------------------------------------------------------- product
  const [skuSearch, setSkuSearch] = useState('');
  const { data: skuItems = [], isLoading: loadingSKU } = useSearchSAPItems(skuSearch, true);

  // ------------------------------------------------------- material lines
  // The BOM is per box on this data, so the requirement is each component
  // multiplied by the case count. A supervisor who knows the plan really draws
  // something else can type over a line; the override is keyed by component and
  // dropped whenever the SKU or the case count moves, because then every figure
  // on the panel has been recomputed and a leftover edit would be a lie.
  const { data: bomData, isLoading: loadingBOM } = useBOMPreview(itemCode || null);
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, string>>({});

  const components = useMemo(() => bomData?.components ?? [], [bomData]);
  const qtyNumber = parseFloat(requiredQty || '0');
  const qtyValid = qtyNumber > 0;

  const materials: MaterialInput[] = useMemo(() => {
    if (!qtyValid) return [];
    return components.map((c) => ({
      material_code: c.ItemCode,
      material_name: c.ItemName,
      opening_qty: qtyOverrides[c.ItemCode] ?? (c.PlannedQty * qtyNumber).toFixed(3),
      issued_qty: '0',
      uom: c.UomCode ?? '',
    }));
  }, [components, qtyNumber, qtyValid, qtyOverrides]);

  // ------------------------------------------------------ readiness check
  const checkPayload: PlanCheckRequest = useMemo(
    () => ({
      line_id: lineId,
      item_code: itemCode,
      required_qty: qtyValid ? qtyNumber : null,
      date,
      planned_start_at: toLocalIso(date, startTime),
      planned_end_at: null,
      planned_end_is_manual: false,
      rated_speed: config?.rated_speed || run?.rated_speed || null,
      pieces_per_case: config?.pieces_per_case ?? run?.pieces_per_case ?? null,
      materials: materials.map((m) => ({
        material_code: m.material_code,
        opening_qty: m.opening_qty,
      })),
      // A draft being edited must not be reported as clashing with itself.
      exclude_run_id: run?.id ?? null,
    }),
    [lineId, itemCode, qtyNumber, qtyValid, date, startTime, config, run, materials],
  );

  const debouncedPayloadJson = useDebounce(JSON.stringify(checkPayload), 600);
  const debouncedPayload = useMemo(
    () => JSON.parse(debouncedPayloadJson) as PlanCheckRequest,
    [debouncedPayloadJson],
  );
  const {
    data: planCheck,
    isFetching: checking,
    error: checkError,
  } = useRunPlanCheck(debouncedPayload, open);

  const checkByCode = useMemo(() => {
    const map = new Map<string, NonNullable<typeof planCheck>['materials']['rows'][number]>();
    planCheck?.materials.rows.forEach((row) => map.set(row.item_code, row));
    return map;
  }, [planCheck]);

  const readinessRows: ReadinessRow[] = materials.map((m, index) => ({
    id: m.material_code || String(index),
    material_code: m.material_code,
    material_name: m.material_name,
    uom: m.uom,
    per_case: components[index]?.PlannedQty,
    check: checkByCode.get(m.material_code),
  }));

  const conflicts = planCheck?.conflicts ?? [];
  const shortLines = planCheck?.materials.summary?.short_lines ?? 0;
  const contestedLines = planCheck?.materials.summary?.contested_lines ?? 0;
  const needsRemark = !!planCheck?.blocking.has_shortage || !!planCheck?.blocking.has_contention;
  const hasConflicts = !!planCheck?.blocking.has_conflicts;
  const remarkGiven = remark.trim().length > 0;

  // A tick is against a particular set of clashes, so it is stored as the set
  // it was given for. A different set of clashes is simply not acknowledged —
  // no clearing, and no window where a stale tick still counts.
  const conflictSignature = JSON.stringify(conflicts.map((c) => c.message));
  const [ackSignature, setAckSignature] = useState<string | null>(null);
  const acknowledged = ackSignature === conflictSignature;

  // What the check found, as a count first and the sentences behind a toggle.
  const [findingsOpen, setFindingsOpen] = useState(false);
  const findingsSummary = [
    shortLines > 0 ? `${shortLines} component${shortLines > 1 ? 's' : ''} short` : null,
    contestedLines > 0 ? `${contestedLines} claimed by another plan` : null,
    conflicts.length > 0
      ? `${conflicts.length} clash${conflicts.length > 1 ? 'es' : ''} with other plans`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  // Only the clash sentences need hiding — which components are short is
  // already spelled out, per line, in the BOM table underneath.
  const findingDetails = conflicts.map((c) => c.message);

  // ------------------------------------------------------ what is revealed
  // Each answer opens the next question, and nothing further exists on screen
  // until it has been given.
  const showConfigStep = !!lineId && !loadingConfigs;
  // A draft opened for editing has already answered the product question, so it
  // is shown whatever the preset situation. Hiding it because no preset could
  // be inferred would open the dialog on a draft whose product and quantity are
  // nowhere on screen — which is exactly what a supervisor came to change.
  const draftKeepsItsProduct = isEdit && !!run?.item_code && lineId === run?.line;
  // A line with no presets has no second question to ask, so the product step
  // follows straight on from the line.
  const showProductStep =
    showConfigStep && (lineConfigs.length === 0 || !!config || draftKeepsItsProduct);
  const showBom = showProductStep && !!itemCode && qtyValid;

  // -------------------------------------------------------------- saving
  const saving = createRun.isPending || updateRun.isPending;
  const incomplete = !showProductStep || !itemCode || !qtyValid || !date;
  const blocked =
    incomplete || (needsRemark && !remarkGiven) || (hasConflicts && !acknowledged) || saving;

  // Why the Save button is off. Ordered as the form asks its questions, so the
  // message always points at the first thing still outstanding.
  const blockedReason = saving
    ? ''
    : !lineId
      ? 'Pick a line.'
      : !showProductStep
        ? 'Pick a configuration.'
        : !itemCode
          ? 'Choose the finished good.'
          : !qtyValid
            ? 'Enter a quantity.'
            : !date
              ? 'Give the run a date.'
              : needsRemark && !remarkGiven
                ? 'Give a reason for planning against the shortfall above.'
                : hasConflicts && !acknowledged
                  ? 'Confirm you have reviewed the clashes above.'
                  : '';

  function pickLine(id: number) {
    if (lineId === id) return;
    setLineId(id);
    setConfigId(null);
    setQtyOverrides({});
  }

  function pickConfig(cfg: LineSkuConfig) {
    setConfigId(cfg.id);
    setQtyOverrides({});
  }

  async function submit() {
    if (blocked) return;

    // A blank speed is left out rather than sent as an empty string, which the
    // API reads as "not a number" and refuses.
    const ratedSpeed = config?.rated_speed || run?.rated_speed || '';

    const payload = {
      line_id: lineId!,
      line_config_id: config?.id ?? null,
      date,
      product,
      item_code: itemCode,
      required_qty: qtyNumber,
      ...(ratedSpeed ? { rated_speed: ratedSpeed } : {}),
      pieces_per_case: config?.pieces_per_case ?? undefined,
      labour_count: labourCount,
      other_manpower_count: config?.other_manpower_count ?? run?.other_manpower_count ?? 0,
      supervisor: config?.supervisor ?? run?.supervisor ?? '',
      operators: config?.operators ?? run?.operators ?? '',
      materials,
      planned_start_at: toLocalIso(date, startTime),
      planned_end_at: null,
      planned_end_is_manual: false,
      planning_remark: remark.trim(),
    };

    try {
      if (isEdit) {
        await updateRun.mutateAsync(payload);
        toast.success(`Run #${run!.run_number} updated`);
      } else {
        await createRun.mutateAsync({ ...payload, acknowledged_warnings: true });
        toast.success('Draft saved');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        getErrorMessage(error, isEdit ? 'The draft was not updated.' : 'The draft was not saved.'),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* A fixed height, not one that hugs the content: the steps reveal
          themselves one at a time, and a dialog that grew with each answer
          would jump the buttons out from under the cursor. It also leaves the
          SKU dropdown room to open downwards instead of being clipped by the
          scroll box. */}
      <DialogContent className="grid h-[85vh] w-[96vw] max-w-[1600px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-violet-500 to-teal-500 text-white shadow-sm">
            <Factory className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle>
              {isEdit ? `Edit draft — Run #${run!.run_number}` : 'Plan a production run'}
            </DialogTitle>
            <DialogDescription>
              Pick the line and how it is set up, then say what it should make.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* The questions, each one revealing the next. Capped in width even
              though the dialog is not: a search box and three small fields
              stretched across a 1600px row are harder to read, not easier —
              the width is there for the BOM table below. */}
          <div className="max-w-4xl space-y-6">
            {/* 1 — Line */}
            <Step index={1} title="Line" accent="sky" done={!!lineId}>
              <div className="flex flex-wrap gap-2">
                {lines.map((line) => (
                  <Chip
                    key={line.id}
                    accent="sky"
                    selected={lineId === line.id}
                    title={line.name}
                    onClick={() => pickLine(line.id)}
                  />
                ))}
                {lines.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active production lines.</p>
                )}
              </div>
            </Step>

            {/* 2 — Configuration */}
            {showConfigStep && (
              <Step
                index={2}
                title="Configuration"
                accent="violet"
                hint={config ? configSubtitle(config) : undefined}
                done={!!config}
              >
                {lineConfigs.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {lineConfigs.map((cfg) => (
                        <Chip
                          key={cfg.id}
                          accent="violet"
                          selected={config?.id === cfg.id}
                          title={cfg.config_name}
                          subtitle={configSubtitle(cfg)}
                          onClick={() => pickConfig(cfg)}
                        />
                      ))}
                    </div>
                    {/* Nothing ticked on an edit means the draft was planned
                        without a preset, or from one that has since changed.
                        Say so, rather than leaving an unticked step that looks
                        like something went wrong. */}
                    {draftKeepsItsProduct && !config && (
                      <p className="text-xs text-muted-foreground">
                        This draft was not planned from any of these presets. Pick one to apply its
                        speed and manpower, or leave it as it is.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                    <Settings2 className="h-4 w-4 shrink-0" />
                    This line has no presets — speed and manpower stay as they are.
                  </p>
                )}
              </Step>
            )}

            {/* 3 — Product */}
            {showProductStep && (
              <Step index={3} title="Product" accent="teal" done={!!itemCode && qtyValid}>
                <div className="space-y-3">
                  {skuLocked ? (
                    <div>
                      <Label>Finished good</Label>
                      <Input
                        value={[config?.sku_code, config?.sku_name].filter(Boolean).join(' — ')}
                        readOnly
                        className="cursor-not-allowed border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/30"
                      />
                      <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
                        Set by the {config?.config_name} configuration
                      </p>
                    </div>
                  ) : (
                    <SearchableSelect<SAPItem>
                      items={skuItems}
                      isLoading={loadingSKU && skuSearch.length >= 2}
                      getItemKey={(item) => item.ItemCode}
                      getItemLabel={(item) => `${item.ItemCode} - ${item.ItemName}`}
                      filterFn={() => true}
                      defaultDisplayText={
                        itemCode ? [itemCode, product].filter(Boolean).join(' - ') : undefined
                      }
                      placeholder="Search the finished good by code or name..."
                      label="Finished good"
                      required
                      inputId="run-draft-sku"
                      loadingText="Searching..."
                      emptyText="Type at least 2 characters to search"
                      notFoundText="No products found"
                      onSearchChange={setSkuSearch}
                      onItemSelect={(item) => {
                        setTypedItemCode(item.ItemCode);
                        setTypedProduct(item.ItemName);
                        setQtyOverrides({});
                      }}
                      onClear={() => {
                        setTypedItemCode('');
                        setTypedProduct('');
                        setQtyOverrides({});
                      }}
                    />
                  )}

                  <div
                    className={cn(
                      'grid grid-cols-2 gap-3',
                      labourFromConfig ? 'sm:grid-cols-3' : 'sm:grid-cols-4',
                    )}
                  >
                    <div>
                      <Label htmlFor="run-draft-qty">
                        Quantity <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="run-draft-qty"
                        type="number"
                        step="0.01"
                        min="0"
                        value={requiredQty}
                        onChange={(e) => {
                          setRequiredQty(e.target.value);
                          setQtyOverrides({});
                        }}
                        placeholder="cases"
                      />
                    </div>
                    {!labourFromConfig && (
                      <div>
                        <Label htmlFor="run-draft-labour">Labour</Label>
                        <Input
                          id="run-draft-labour"
                          type="number"
                          min="0"
                          step="1"
                          value={labour}
                          onChange={(e) => setLabour(e.target.value)}
                          placeholder="people"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="run-draft-date">
                        Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="run-draft-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="run-draft-start">Start time</Label>
                      <Input
                        id="run-draft-start"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </Step>
            )}
          </div>

          {/* Findings — only when the check has something to say */}
          {(needsRemark || hasConflicts) && (
            <div className="space-y-2.5 rounded-md border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              {/* A count and a toggle, not a wall of text. Nine sentences about
                  runs left open since April are true but not read; what has to
                  be read is that something is short, and what has to be done is
                  the reason box below. The detail stays one click away. */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="font-medium">{findingsSummary}</span>
                {findingDetails.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFindingsOpen((open) => !open)}
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
                  >
                    {findingsOpen ? 'Hide' : `Show ${findingDetails.length}`} detail
                    {findingDetails.length > 1 ? 's' : ''}
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform',
                        findingsOpen && 'rotate-180',
                      )}
                    />
                  </button>
                )}
              </div>

              {findingsOpen && (
                <ul className="space-y-1 border-l-2 border-amber-300 pl-3 text-xs text-muted-foreground dark:border-amber-900">
                  {findingDetails.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}

              {needsRemark && (
                <div>
                  <Label htmlFor="run-draft-remark">
                    Reason <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="run-draft-remark"
                    rows={2}
                    className="min-h-0"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="e.g. GRN for 40,000 caps arriving 05:00, confirmed with stores"
                  />
                </div>
              )}

              {hasConflicts && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="run-draft-ack"
                    checked={acknowledged}
                    onCheckedChange={(checked) =>
                      setAckSignature(checked === true ? conflictSignature : null)
                    }
                  />
                  <Label htmlFor="run-draft-ack" className="cursor-pointer text-sm font-normal">
                    I have reviewed the clash{conflicts.length > 1 ? 'es' : ''} and want to go
                    ahead.
                  </Label>
                </div>
              )}
            </div>
          )}

          {/* The BOM in full, below the answers that produced it, once there is
              a quantity to scale it by */}
          {showBom && (
            <MaterialReadinessPanel
              rows={readinessRows}
              summary={planCheck?.materials.summary}
              warehouses={planCheck?.materials.warehouses}
              warehouseScope={planCheck?.materials.warehouse_scope}
              unusable={planCheck?.materials.unusable}
              resourceLines={planCheck?.materials.resource_lines}
              isChecking={checking}
              stockError={
                planCheck && !planCheck.materials.available
                  ? planCheck.materials.error
                  : checkError
                    ? 'The readiness check could not be reached.'
                    : undefined
              }
              bomLoading={loadingBOM}
              hasSku={!!itemCode}
              requiredQtyEntered={qtyValid}
              renderRequiredInput={(index) => (
                <Input
                  className="h-8 w-28"
                  type="number"
                  step="any"
                  min="0"
                  value={materials[index]?.opening_qty ?? ''}
                  onChange={(e) =>
                    setQtyOverrides((current) => ({
                      ...current,
                      [materials[index].material_code]: e.target.value,
                    }))
                  }
                />
              )}
            />
          )}
        </DialogBody>

        <DialogFooter className="items-center gap-2 pt-2 sm:justify-between">
          {/* A disabled Save with no explanation is the worst of both worlds —
              say which answer is still missing, in the order they are asked. */}
          <p className="text-sm text-amber-700 dark:text-amber-400 sm:mr-auto">{blockedReason}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={blocked} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Save draft'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RunDraftModal;
