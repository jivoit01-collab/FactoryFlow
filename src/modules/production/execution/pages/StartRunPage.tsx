import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, Loader2, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/components/ui';
import { useDebounce, useScrollToError } from '@/shared/hooks';

import {
  useAutoFillConfig,
  useBOMPreview,
  useCreateRun,
  useLineConfigs,
  useLines,
  useRunPlanCheck,
  useSearchSAPItems,
} from '../api';
import {
  MaterialReadinessPanel,
  PlanConflictsPanel,
  PlanTimingCard,
  type ReadinessRow,
} from '../components';
import { type CreateRunFormData, createRunSchema } from '../schemas';
import type { LineSkuConfig, PlanCheckRequest, SAPItem } from '../types';
import { toLocalIso } from '../utils';

// ============================================================================
// Plan Production Run
// ----------------------------------------------------------------------------
// Filled by the production supervisor the evening before, not at the line as
// the run starts. That is why the material picture, the clash check and the
// clock times are on this screen at all: the whole value of planning a day
// ahead is finding out tonight that the caps are short or that the second
// shift already claimed the same oil, while there is still time to do
// something about it.
// ============================================================================

/** Tomorrow, in the `YYYY-MM-DD` an `<input type="date">` wants. */
function tomorrowIsoDate() {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  return day.toISOString().split('T')[0];
}

function StartRunPage() {
  const navigate = useNavigate();
  const { data: lines } = useLines(true);
  const createRun = useCreateRun();

  // SKU (SAP item) search — server-side, min 2 chars, restricted to producible finished goods
  const [skuSearch, setSkuSearch] = useState('');
  const { data: skuItems = [], isLoading: loadingSKU } = useSearchSAPItems(skuSearch, true);

  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const { data: bomData, isLoading: loadingBOM } = useBOMPreview(selectedItemCode);

  // Fetch all configs for the selected line
  const { data: lineConfigs = [] } = useLineConfigs(selectedLineId ?? undefined);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  // Store raw per-unit BOM for scaling
  const [rawBOM, setRawBOM] = useState<
    { code: string; name: string; perCase: number; uom: string }[]
  >([]);

  const form = useForm<CreateRunFormData>({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      // A plan is for the next day by default — that is what this screen is for.
      date: tomorrowIsoDate(),
      product: '',
      item_code: '',
      required_qty: '',
      rated_speed: '',
      machine_ids: [],
      labour_count: 0 as number,
      other_manpower_count: 0 as number,
      supervisor: '',
      operators: '',
      materials: [],
      planned_start_time: '',
      planned_end_time: '',
      planned_end_is_manual: false,
      planning_remark: '',
    },
  });

  useScrollToError(form.formState.errors);

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'materials',
  });

  const watchedRequiredQty = form.watch('required_qty');
  const watchedRatedSpeed = form.watch('rated_speed');
  const watchedDate = form.watch('date');
  const watchedStartTime = form.watch('planned_start_time');
  const watchedEndTime = form.watch('planned_end_time');
  const watchedEndIsManual = form.watch('planned_end_is_manual');
  const watchedMaterials = form.watch('materials');
  const watchedRemark = form.watch('planning_remark');

  // Keep the BOM snapshot in step with the selected SKU.
  const lastPopulatedItemCode = useRef<string | null>(null);
  useEffect(() => {
    if (!bomData?.components || !selectedItemCode) return;
    if (lastPopulatedItemCode.current === selectedItemCode) return;
    lastPopulatedItemCode.current = selectedItemCode;
    setRawBOM(
      bomData.components.map((c) => ({
        code: c.ItemCode,
        name: c.ItemName,
        // `PlannedQty` is SAP's `ITT1."Quantity"` untouched, and on this data
        // that is the quantity for ONE box — 20 litres of oil and one carton on
        // a 1 LTR x 20 PCS SKU. So it multiplies straight by the case count.
        perCase: c.PlannedQty,
        uom: c.UomCode ?? '',
      })),
    );
  }, [bomData, selectedItemCode]);

  // Scale the material lines from the BOM and the case count — ONE effect over
  // both inputs. Two effects (one per input, guarded by a ref) could settle
  // with the requirement scaled to a single case, which then showed 20.000
  // where 4,000 was meant.
  useEffect(() => {
    if (rawBOM.length === 0) {
      replace([]);
      return;
    }
    const qty = parseFloat(watchedRequiredQty || '0') || 1;
    replace(
      rawBOM.map((c) => ({
        material_code: c.code,
        material_name: c.name,
        opening_qty: (c.perCase * qty).toFixed(3),
        issued_qty: '0',
        uom: c.uom,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawBOM, watchedRequiredQty]);

  // Reset the config selection when the line changes
  useEffect(() => {
    setSelectedConfigId('');
  }, [selectedLineId]);

  // Write a config preset's values into the form fields
  const applyConfigValues = useCallback(
    (cfg: LineSkuConfig) => {
      form.setValue('rated_speed', cfg.rated_speed || '');
      form.setValue('labour_count', cfg.labour_count);
      form.setValue('other_manpower_count', cfg.other_manpower_count);
      form.setValue('supervisor', cfg.supervisor || '');
      form.setValue('operators', cfg.operators || '');
      if (cfg.sku_code) {
        form.setValue('product', cfg.sku_name || cfg.sku_code, { shouldValidate: true });
        form.setValue('item_code', cfg.sku_code);
        setSelectedItemCode(cfg.sku_code);
      }
    },
    [form],
  );

  // Manual preset selection from the dropdown
  const applyConfig = (configId: string) => {
    setSelectedConfigId(configId);
    if (!configId) return;

    const cfg = lineConfigs.find((c) => String(c.id) === configId);
    if (!cfg) return;

    applyConfigValues(cfg);
    toast.success(`Applied config: ${cfg.config_name}`);
  };

  // Auto-fill the best-matching config for the selected line + SKU
  // (exact SKU match > line-level default). Applies once per line/SKU combo so
  // it never clobbers a preset the user picked or fields they edited afterwards.
  const { data: autoFillData } = useAutoFillConfig(selectedLineId, selectedItemCode ?? undefined);
  const autoFilledKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const cfg = autoFillData?.config;
    if (!cfg || !selectedLineId) return;
    const key = `${selectedLineId}:${selectedItemCode ?? ''}`;
    if (autoFilledKeyRef.current === key) return;
    autoFilledKeyRef.current = key;
    applyConfigValues(cfg);
    setSelectedConfigId(String(cfg.id));
    toast.success(`Auto-filled config: ${cfg.config_name}`);
  }, [autoFillData, selectedLineId, selectedItemCode, applyConfigValues]);

  const selectedConfig = lineConfigs.find((c) => String(c.id) === selectedConfigId);

  // A line that has presets requires one to be selected; lines without presets
  // keep the fully manual flow.
  const configRequired = !!selectedLineId && lineConfigs.length > 0;

  // Fields the selected preset defines are locked; anything the preset leaves
  // blank stays editable on the run form.
  const locked = {
    sku: !!selectedConfig?.sku_code,
    rated_speed: !!selectedConfig?.rated_speed,
    labour_count: (selectedConfig?.labour_count ?? 0) > 0,
    other_manpower_count: (selectedConfig?.other_manpower_count ?? 0) > 0,
    supervisor: !!selectedConfig?.supervisor?.trim(),
    operators: !!selectedConfig?.operators?.trim(),
  };
  const lockedInputProps = { readOnly: true, className: 'bg-muted/50 cursor-not-allowed' };

  // ------------------------------------------------------------------------
  // Readiness check
  // ------------------------------------------------------------------------
  // Debounced through a JSON string so a keystroke in the quantity field does
  // not fire a HANA round trip, and so the array of material lines compares by
  // value instead of by identity.
  const checkPayload: PlanCheckRequest = useMemo(
    () => ({
      line_id: selectedLineId,
      item_code: selectedItemCode ?? '',
      required_qty: parseFloat(watchedRequiredQty || '0') || null,
      date: watchedDate,
      planned_start_at: toLocalIso(watchedDate, watchedStartTime || ''),
      planned_end_at: watchedEndIsManual
        ? toLocalIso(watchedDate, watchedEndTime || '')
        : null,
      planned_end_is_manual: !!watchedEndIsManual,
      rated_speed: watchedRatedSpeed || null,
      pieces_per_case: selectedConfig?.pieces_per_case ?? null,
      materials: (watchedMaterials ?? [])
        .filter((m) => m.material_code)
        .map((m) => ({ material_code: m.material_code, opening_qty: m.opening_qty })),
    }),
    [
      selectedLineId,
      selectedItemCode,
      watchedRequiredQty,
      watchedDate,
      watchedStartTime,
      watchedEndTime,
      watchedEndIsManual,
      watchedRatedSpeed,
      watchedMaterials,
      selectedConfig?.pieces_per_case,
    ],
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
  } = useRunPlanCheck(debouncedPayload);

  const checkByCode = useMemo(() => {
    const map = new Map<string, NonNullable<typeof planCheck>['materials']['rows'][number]>();
    planCheck?.materials.rows.forEach((row) => map.set(row.item_code, row));
    return map;
  }, [planCheck]);

  const readinessRows: ReadinessRow[] = fields.map((field, index) => ({
    id: field.id,
    material_code: field.material_code,
    material_name: field.material_name,
    uom: field.uom,
    per_case: rawBOM[index]?.perCase,
    check: checkByCode.get(field.material_code),
  }));

  // The screen asks for a written reason when it found a shortfall or a
  // contested component, and for an explicit acknowledgement when it found a
  // clash. Neither refuses the plan — both make the override deliberate.
  const [acknowledged, setAcknowledged] = useState(false);
  const needsRemark =
    !!planCheck?.blocking.has_shortage || !!planCheck?.blocking.has_contention;
  const hasConflicts = !!planCheck?.blocking.has_conflicts;
  const remarkGiven = (watchedRemark ?? '').trim().length > 0;
  const blockedBySafeguard = (needsRemark && !remarkGiven) || (hasConflicts && !acknowledged);

  // Clear the acknowledgement whenever the findings change, so a tick never
  // silently carries over to a different set of clashes.
  const conflictSignature = JSON.stringify(planCheck?.conflicts?.map((c) => c.message) ?? []);
  useEffect(() => {
    setAcknowledged(false);
  }, [conflictSignature]);

  const onSubmit = async (data: CreateRunFormData) => {
    if (configRequired && !selectedConfig) {
      toast.error('Select a line configuration for this line');
      return;
    }
    if (needsRemark && !remarkGiven) {
      toast.error('Give a reason for planning against a material shortfall');
      return;
    }
    if (hasConflicts && !acknowledged) {
      toast.error('Confirm you have reviewed the clashes with other plans');
      return;
    }

    // The two time fields are form-only — the API takes full datetimes, which
    // the date and the clock time are combined into here.
    const {
      planned_start_time,
      planned_end_time,
      planned_end_is_manual,
      planning_remark,
      ...runFields
    } = data;

    try {
      const run = await createRun.mutateAsync({
        ...runFields,
        planned_start_at: toLocalIso(data.date, planned_start_time || ''),
        planned_end_at: planned_end_is_manual
          ? toLocalIso(data.date, planned_end_time || '')
          : null,
        planned_end_is_manual: !!planned_end_is_manual,
        planning_remark: planning_remark ?? '',
        acknowledged_warnings: acknowledged || !hasConflicts,
      });
      toast.success('Production run planned');
      navigate(`/production/execution/runs/${run.id}`);
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      toast.error(detail || 'Failed to create production run');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Plan Production Run"
        description="Plan tomorrow's run — check RM/PM availability, clashes with other plans, and the start time"
      />

      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Product SKU Card */}
        <Card>
          <CardHeader>
            <CardTitle>Product SKU</CardTitle>
          </CardHeader>
          <CardContent>
            {locked.sku ? (
              <div>
                <Label>Product SKU</Label>
                <Input
                  value={[selectedConfig?.sku_code, selectedConfig?.sku_name]
                    .filter(Boolean)
                    .join(' - ')}
                  {...lockedInputProps}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Set by the selected line configuration
                </p>
              </div>
            ) : (
              <SearchableSelect<SAPItem>
                items={skuItems}
                isLoading={loadingSKU && skuSearch.length >= 2}
                getItemKey={(item) => item.ItemCode}
                getItemLabel={(item) => `${item.ItemCode} - ${item.ItemName}`}
                filterFn={() => true}
                renderItem={(item) => (
                  <div className="flex items-center justify-between w-full gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-xs">{item.ItemCode}</span>
                      <span className="ml-2">{item.ItemName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{item.UomCode}</span>
                  </div>
                )}
                placeholder="Search product by SKU code or name..."
                label="Product SKU"
                required
                inputId="sku-item"
                loadingText="Searching..."
                emptyText="Type at least 2 characters to search"
                notFoundText="No products found"
                onSearchChange={(s) => setSkuSearch(s)}
                onItemSelect={(item) => {
                  form.setValue('product', item.ItemName, { shouldValidate: true });
                  form.setValue('item_code', item.ItemCode);
                  form.setValue('sap_doc_entry', undefined);
                  setSelectedItemCode(item.ItemCode);
                }}
                onClear={() => {
                  form.setValue('product', '');
                  form.setValue('item_code', '');
                  setSelectedItemCode(null);
                  lastPopulatedItemCode.current = null;
                  setRawBOM([]);
                  replace([]);
                }}
              />
            )}
            {form.formState.errors.product && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.product.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Run Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Run Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>
                  Production Line <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(v) => {
                    const id = Number(v);
                    form.setValue('line_id', id);
                    setSelectedLineId(id);
                    form.setValue('rated_speed', '');
                    form.setValue('labour_count', 0);
                    form.setValue('other_manpower_count', 0);
                    form.setValue('supervisor', '');
                    form.setValue('operators', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select line" />
                  </SelectTrigger>
                  <SelectContent>
                    {lines?.map((line) => (
                      <SelectItem key={line.id} value={String(line.id)}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.line_id && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.line_id.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Product</Label>
                <Input
                  {...form.register('product')}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed"
                  placeholder="Auto-filled from selected SKU"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Required FG Quantity (cases/boxes)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('required_qty')}
                  placeholder="e.g., 500"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  BOM materials scale from this finished-good case/box quantity
                </p>
              </div>
              <div>
                <Label>Rated Speed (bottles/hr)</Label>
                <Input
                  {...form.register('rated_speed')}
                  placeholder="e.g., 3000"
                  {...(locked.rated_speed ? lockedInputProps : {})}
                />
                {locked.rated_speed ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Set by the selected line configuration
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    The expected finish time is worked out from this
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <PlanTimingCard
          date={watchedDate}
          startTime={watchedStartTime ?? ''}
          endTime={watchedEndTime ?? ''}
          endIsManual={!!watchedEndIsManual}
          timing={planCheck?.timing}
          onDateChange={(value) => form.setValue('date', value, { shouldValidate: true })}
          onStartTimeChange={(value) => form.setValue('planned_start_time', value)}
          onEndTimeChange={(value) => form.setValue('planned_end_time', value)}
          onEndIsManualChange={(value) => form.setValue('planned_end_is_manual', value)}
          dateError={form.formState.errors.date?.message}
          endTimeError={form.formState.errors.planned_end_time?.message}
        />

        {/* Line Configuration Card — only visible when a line is selected and has configs */}
        {selectedLineId && lineConfigs.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-blue-600" />
                Line Configuration
                <Badge variant="secondary" className="text-xs font-normal">
                  {lineConfigs.length} preset{lineConfigs.length > 1 ? 's' : ''} available
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>
                  Line configuration <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedConfigId} onValueChange={applyConfig}>
                  <SelectTrigger className="mt-1.5 bg-background">
                    <SelectValue placeholder="Choose a line configuration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lineConfigs.map((cfg) => (
                      <SelectItem key={cfg.id} value={String(cfg.id)}>
                        <span className="font-medium">{cfg.config_name}</span>
                        <span className="text-muted-foreground ml-2">
                          — {cfg.rated_speed || '?'} bottles/hr, {cfg.labour_count} labour
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {configRequired && !selectedConfig ? (
                  <p className="text-sm text-red-500 mt-1">
                    This line has configurations — selecting one is required.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Fields defined by the configuration are locked; the rest stay editable.
                  </p>
                )}
              </div>

              {/* Show selected config summary */}
              {selectedConfig && (
                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 pt-1">
                  {[
                    { label: 'Speed', value: `${selectedConfig.rated_speed || '-'} bottles/hr` },
                    { label: 'Labour', value: selectedConfig.labour_count },
                    { label: 'Other', value: selectedConfig.other_manpower_count },
                    { label: 'Supervisor', value: selectedConfig.supervisor || '-' },
                    { label: 'Operators', value: selectedConfig.operators || '-' },
                  ].map((item) => (
                    <div key={item.label} className="bg-background rounded px-3 py-2 border">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedLineId && lineConfigs.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
            <Settings2 className="h-4 w-4" />
            No presets for this line.{' '}
            <button
              type="button"
              className="text-blue-600 hover:underline"
              onClick={() => navigate('/production/execution/line-management')}
            >
              Configure in Line Management
            </button>
          </div>
        )}

        {/* Material readiness — the point of planning a day ahead */}
        <MaterialReadinessPanel
          rows={readinessRows}
          summary={planCheck?.materials.summary}
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
          hasSku={!!selectedItemCode}
          requiredQtyEntered={parseFloat(watchedRequiredQty || '0') > 0}
          renderRequiredInput={(index) => (
            <Input
              className="h-8 w-28"
              type="number"
              step="any"
              min="0"
              {...form.register(`materials.${index}.opening_qty`)}
            />
          )}
        />

        {/* Clashes with other plans */}
        <PlanConflictsPanel conflicts={planCheck?.conflicts ?? []} checked={!!planCheck} />

        {/* Override — a reason for planning past a warning */}
        {(needsRemark || hasConflicts) && (
          <Card className="border-amber-300 dark:border-amber-900">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Plan this anyway?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {needsRemark && (
                <div>
                  <Label htmlFor="planning-remark">
                    Reason <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="planning-remark"
                    {...form.register('planning_remark')}
                    placeholder="e.g. GRN for 40,000 caps arriving 05:00, confirmed with stores"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Kept on the run, so tomorrow morning everyone can see why it was planned short.
                  </p>
                  {!remarkGiven && (
                    <p className="text-sm text-red-500 mt-1">
                      A reason is required while a component is short or contested.
                    </p>
                  )}
                </div>
              )}
              {hasConflicts && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="ack-conflicts"
                    checked={acknowledged}
                    onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  />
                  <Label htmlFor="ack-conflicts" className="text-sm font-normal cursor-pointer">
                    I have reviewed the {planCheck?.conflicts.length} clash
                    {(planCheck?.conflicts.length ?? 0) > 1 ? 'es' : ''} with other plans and want
                    to go ahead.
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manpower Card */}
        <Card>
          <CardHeader>
            <CardTitle>Manpower</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Labour</Label>
                <Input
                  type="number"
                  min={0}
                  {...form.register('labour_count', { valueAsNumber: true })}
                  {...(locked.labour_count ? lockedInputProps : {})}
                />
                {form.formState.errors.labour_count && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.labour_count.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Other Manpower</Label>
                <Input
                  type="number"
                  min={0}
                  {...form.register('other_manpower_count', { valueAsNumber: true })}
                  {...(locked.other_manpower_count ? lockedInputProps : {})}
                />
                {form.formState.errors.other_manpower_count && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.other_manpower_count.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Supervisor Name</Label>
                <Input
                  {...form.register('supervisor')}
                  placeholder="Enter supervisor name"
                  {...(locked.supervisor ? lockedInputProps : {})}
                />
              </div>
              <div>
                <Label>Engineer/Operators</Label>
                <Input
                  {...form.register('operators')}
                  placeholder="Enter engineer/operators"
                  {...(locked.operators ? lockedInputProps : {})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-4">
          {blockedBySafeguard && (
            <p className="text-sm text-amber-600 mr-auto">
              {needsRemark && !remarkGiven
                ? 'Give a reason above to save a plan with a shortfall.'
                : 'Confirm you have reviewed the clashes above.'}
            </p>
          )}
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createRun.isPending || blockedBySafeguard}>
            {createRun.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving plan...
              </>
            ) : (
              'Save plan'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default StartRunPage;
