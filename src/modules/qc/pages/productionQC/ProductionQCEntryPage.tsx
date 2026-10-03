import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  Plus,
  Save,
  X,
  XCircle,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useCreateProductionQCEntry,
  useProductionParameters,
  useProductionParameterType,
  useProductionParameterTypeDefault,
  useProductionQCEntry,
  useProductionQCSubmissionEntries,
  useUpdateProductionQCEntry,
} from '../../api/productionQC/productionQC.queries';
import { PARAMETER_TYPE_LABELS } from '../../constants';
import type {
  DecimalValue,
  ProductionQCEntry,
  ProductionQCReading,
} from '../../types/productionQC.types';
import type { ParameterType } from '../../types/qc.types';
import { specWithDefault } from '../../utils/productionQCDefaults';
import { formatDateTime } from '../../utils/productionQCFormat';
import { describeSpec, judgeReading } from '../../utils/productionQCSpec';
import { ProductionQCStatusBadge, SentBackBanner } from './ProductionQCStatusBadge';

const LIST_PATH = '/qc/qa-reports';

/** One parameter to read, from the type's master (new) or the entry's snapshot (edit). */
interface ReadingRow {
  parameterId: number;
  code: string;
  name: string;
  standard_value: string;
  value_type: ParameterType;
  min_value: DecimalValue | null;
  max_value: DecimalValue | null;
  uom: string;
  is_mandatory: boolean;
  sequence: number;
}

interface ReadingState {
  value: string;
  /** The hand-set verdict, for a reading the spec cannot judge on its own. */
  withinSpec: boolean;
  remarks: string;
}

interface EntryHeader {
  typeName: string;
  typeCode: string;
  /** The default the entry is made with, if any. */
  defaultName?: string;
  /** Edits: where the entry stands. */
  entry?: ProductionQCEntry;
}

type FieldErrors = Record<string, string>;

const EMPTY_READING: ReadingState = { value: '', withinSpec: true, remarks: '' };

/** The verdict the backend will record: the spec's own where it has one, else the hand-set one. */
function verdictOf(row: ReadingRow, reading: ReadingState): boolean | null {
  const value = reading.value.trim();
  if (!value) return null;
  const judged = judgeReading(row, value);
  if (judged !== null) return judged;
  return reading.withinSpec;
}

function toReading(row: ReadingRow, reading: ReadingState): ProductionQCReading {
  const value = reading.value.trim();
  const payload: ProductionQCReading = { parameter_id: row.parameterId, result_value: value };
  const remarks = reading.remarks.trim();
  if (remarks) payload.remarks = remarks;
  // Pass / Fail is its own verdict on the server; anything else carries ours, which
  // the server replaces with the spec's own wherever the spec is numeric.
  if (value && row.value_type !== 'BOOLEAN') payload.is_within_spec = verdictOf(row, reading);
  return payload;
}

function readApiErrors(error: unknown): FieldErrors {
  const apiError = error as ApiError;
  const next: FieldErrors = {};
  Object.entries(apiError?.errors ?? {}).forEach(([field, messages]) => {
    const message = messages.join(' ');
    const key = field.startsWith('results')
      ? 'results'
      : ['remarks', 'parameter_type_id', 'default_id'].includes(field)
        ? field
        : 'general';
    next[key] = next[key] ? `${next[key]} ${message}` : message;
  });
  if (Object.keys(next).length === 0) {
    next.general = apiError?.message || 'Could not save the entry. Please try again.';
  }
  return next;
}

// ==================== Page ====================

/**
 * The reading form: `/qc/qa-reports/new?type=[&default=]` for a new entry of a
 * report (with one of its defaults: its standards, its values filled in), and
 * `/qc/qa-reports/entries/:entryId/edit` to correct one pending or sent back.
 * Saving sends it for approval either way — there are no drafts.
 */
export default function ProductionQCEntryPage() {
  const { entryId } = useParams<{ entryId: string }>();
  if (entryId) return <EditEntry key={entryId} entryId={Number(entryId)} />;
  return <NewEntry />;
}

function NewEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeId = Number(searchParams.get('type')) || null;
  const defaultId = Number(searchParams.get('default')) || null;

  const {
    data: parameterType,
    isLoading: typeLoading,
    error: typeError,
  } = useProductionParameterType(typeId);
  const {
    data: parameters,
    isLoading: parametersLoading,
    error: parametersError,
  } = useProductionParameters(typeId);
  const {
    data: chosenDefault,
    isLoading: defaultLoading,
    error: defaultError,
  } = useProductionParameterTypeDefault(defaultId);
  const createEntry = useCreateProductionQCEntry();

  // The default's spec, where it sets one, is the one the entry is judged on —
  // the same rule the backend snapshots.
  const defaultValues = useMemo(
    () => new Map((chosenDefault?.values ?? []).map((value) => [value.parameter_id, value])),
    [chosenDefault],
  );
  const rows = useMemo<ReadingRow[]>(
    () =>
      (parameters ?? [])
        .filter((parameter) => parameter.is_active)
        .map((parameter) => ({
          parameterId: parameter.id,
          code: parameter.parameter_code,
          name: parameter.parameter_name,
          ...specWithDefault(parameter, defaultValues.get(parameter.id)),
          value_type: parameter.value_type,
          uom: parameter.uom,
          is_mandatory: parameter.is_mandatory,
          sequence: parameter.sequence,
        })),
    [parameters, defaultValues],
  );
  // Its values are filled in, and can still be changed.
  const prefilled = useMemo(() => {
    const readings: Record<number, ReadingState> = {};
    defaultValues.forEach((value, parameterId) => {
      if (value.value.trim()) readings[parameterId] = { ...EMPTY_READING, value: value.value };
    });
    return readings;
  }, [defaultValues]);

  const backToList = { label: 'Back to QA Reports', onClick: () => navigate(LIST_PATH) };

  if (!typeId) {
    return (
      <EntryProblem
        title="Pick a report first"
        message="Open New on the QA Reports page and choose the report to fill."
        action={backToList}
      />
    );
  }
  if (typeLoading || parametersLoading || (defaultId && defaultLoading)) return <EntryLoading />;
  if (defaultId && (defaultError || !chosenDefault || chosenDefault.parameter_type_id !== typeId)) {
    return (
      <EntryProblem
        title="That default is not available"
        message="It may have been removed. Pick the report and its default again."
        action={backToList}
      />
    );
  }
  if (typeError || parametersError) {
    return (
      <EntryProblem
        title="Could not open the entry form"
        message={
          ((typeError || parametersError) as ApiError | null)?.message ||
          'The report could not be loaded.'
        }
        action={backToList}
      />
    );
  }
  if (!parameterType || !parameterType.is_active) {
    return (
      <EntryProblem
        title="That report is not available"
        message="It may have been removed. Pick the report again."
        action={backToList}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EntryProblem
        title="This report has no parameters yet"
        message="Add its parameters under Report Types first."
        action={backToList}
      />
    );
  }

  return (
    <EntryForm
      mode="new"
      header={{
        typeName: parameterType.name,
        typeCode: parameterType.code,
        defaultName: chosenDefault?.name,
      }}
      rows={rows}
      initialSamples={[prefilled]}
      freshSample={() => ({ ...prefilled })}
      cancelTo={LIST_PATH}
      onSave={async ({ remarks, samples }) => {
        const created = await createEntry.mutateAsync({
          parameter_type_id: parameterType.id,
          default_id: chosenDefault?.id ?? null,
          remarks,
          // Several samples are one entry each, sent and decided together.
          ...(samples.length === 1
            ? { results: samples[0] }
            : { samples: samples.map((results) => ({ results })) }),
        });
        return created.id;
      }}
    />
  );
}

function EditEntry({ entryId }: { entryId: number }) {
  const navigate = useNavigate();
  const { data: entry, isLoading, error } = useProductionQCEntry(entryId || null);
  // Entries sent together are corrected together, all on one form.
  const together = (entry?.submission_entry_ids.length ?? 0) > 1;
  const {
    data: siblings,
    isLoading: siblingsLoading,
    error: siblingsError,
  } = useProductionQCSubmissionEntries(together ? (entry?.submission_id ?? null) : null);
  const updateEntry = useUpdateProductionQCEntry();
  const detailPath = `/qc/qa-reports/entries/${entryId}`;

  const rows = useMemo<ReadingRow[]>(
    () =>
      [...(entry?.results ?? [])]
        .sort((a, b) => a.sequence - b.sequence || a.id - b.id)
        .map((result) => ({
          parameterId: result.parameter_id,
          code: result.parameter_code,
          name: result.parameter_name,
          standard_value: result.standard_value,
          value_type: result.parameter_type,
          min_value: result.min_value,
          max_value: result.max_value,
          uom: result.uom,
          is_mandatory: result.is_mandatory,
          sequence: result.sequence,
        })),
    [entry],
  );

  if (isLoading || (together && siblingsLoading)) return <EntryLoading />;
  if (error || !entry || (together && (siblingsError || !siblings?.length))) {
    return (
      <EntryProblem
        title="Could not load the entry"
        message={
          ((error || siblingsError) as ApiError | null)?.message || 'The entry could not be found.'
        }
        action={{ label: 'Back to QA Reports', onClick: () => navigate(LIST_PATH) }}
      />
    );
  }
  const entries = together ? [...siblings!].sort((a, b) => a.id - b.id) : [entry];
  if (entries.some((item) => item.status === 'APPROVED')) {
    return (
      <EntryProblem
        title="An approved entry cannot be changed"
        message={`Entry #${entry.id} was approved${
          entry.approved_by_name ? ` by ${entry.approved_by_name}` : ''
        }.`}
        action={{ label: 'View the entry', onClick: () => navigate(detailPath) }}
      />
    );
  }

  const initialSamples = entries.map((item) => {
    const readings: Record<number, ReadingState> = {};
    item.results.forEach((result) => {
      readings[result.parameter_id] = {
        value: result.result_value ?? '',
        withinSpec: result.is_within_spec ?? true,
        remarks: result.remarks ?? '',
      };
    });
    return readings;
  });

  return (
    <EntryForm
      mode="edit"
      header={{
        typeName: entry.parameter_type.name,
        typeCode: entry.parameter_type.code,
        defaultName: entry.default_name,
        entry,
      }}
      rows={rows}
      initialSamples={initialSamples}
      initialRemarks={entry.remarks}
      cancelTo={detailPath}
      onSave={async ({ remarks, samples }) => {
        await updateEntry.mutateAsync({
          id: entry.id,
          data: together
            ? {
                remarks,
                samples: entries.map((item, index) => ({
                  entry_id: item.id,
                  results: samples[index],
                })),
              }
            : { remarks, results: samples[0] },
        });
        return entry.id;
      }}
    />
  );
}

// ==================== The form ====================

function EntryForm({
  mode,
  header,
  rows,
  initialSamples,
  initialRemarks = '',
  freshSample,
  cancelTo,
  onSave,
}: {
  mode: 'new' | 'edit';
  header: EntryHeader;
  rows: ReadingRow[];
  /** One map of readings per sample: one entry each, sent and decided together. */
  initialSamples?: Record<number, ReadingState>[];
  initialRemarks?: string;
  /** New entries: what a sample added with Add sample starts with (the default's values). */
  freshSample?: () => Record<number, ReadingState>;
  cancelTo: string;
  /** Saves and returns the (first) entry's id. */
  onSave: (data: { remarks: string; samples: ProductionQCReading[][] }) => Promise<number>;
}) {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Record<number, ReadingState>[]>(() =>
    initialSamples && initialSamples.length > 0 ? initialSamples : [{}],
  );
  const [remarks, setRemarks] = useState(initialRemarks);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const many = samples.length > 1;
  const canAddSamples = mode === 'new';
  const readingOf = (sample: number, row: ReadingRow) =>
    samples[sample]?.[row.parameterId] ?? EMPTY_READING;

  const outOfSpecCount = samples.reduce(
    (total, _, sample) =>
      total + rows.filter((row) => verdictOf(row, readingOf(sample, row)) === false).length,
    0,
  );

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const change = (sample: number, row: ReadingRow, patch: Partial<ReadingState>) => {
    setSamples((prev) =>
      prev.map((readings, index) =>
        index === sample
          ? {
              ...readings,
              [row.parameterId]: { ...(readings[row.parameterId] ?? EMPTY_READING), ...patch },
            }
          : readings,
      ),
    );
    if (patch.value !== undefined) {
      clearError(`param_${sample}_${row.parameterId}`);
      clearError('results');
    }
  };

  // Sample 1's value, in every other sample — for what is the same across them (the SKU, say).
  const copyAcross = (row: ReadingRow) => {
    const first = readingOf(0, row);
    setSamples((prev) =>
      prev.map((readings, index) =>
        index === 0 ? readings : { ...readings, [row.parameterId]: { ...first, remarks: '' } },
      ),
    );
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next)
        .filter((key) => key.endsWith(`_${row.parameterId}`) || key === 'results')
        .forEach((key) => delete next[key]);
      return next;
    });
  };

  const addSample = () => setSamples((prev) => [...prev, freshSample ? freshSample() : {}]);
  const removeSample = (sample: number) => {
    setSamples((prev) => prev.filter((_, index) => index !== sample));
    setErrors({});
  };

  const showErrors = (next: FieldErrors) => {
    setErrors(next);
    requestAnimationFrame(() => {
      document
        .querySelector('[data-error="true"]')
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleSave = async () => {
    const next: FieldErrors = {};
    const short: string[] = [];
    samples.forEach((_, sample) => {
      const missing = rows.filter(
        (row) => row.is_mandatory && !readingOf(sample, row).value.trim(),
      );
      missing.forEach((row) => {
        next[`param_${sample}_${row.parameterId}`] = 'Enter a value — this parameter is mandatory.';
      });
      if (missing.length > 0) {
        const names = missing.map((row) => row.name).join(', ');
        short.push(many ? `Sample ${sample + 1}: ${names}` : names);
      }
    });
    if (short.length > 0) {
      next.results = `Enter a value for every mandatory parameter: ${short.join('; ')}.`;
    }
    if (outOfSpecCount > 0 && !remarks.trim()) {
      next.remarks = 'A remark is required when any parameter is out of spec.';
    }
    if (Object.keys(next).length > 0) {
      showErrors(next);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const id = await onSave({
        remarks: remarks.trim(),
        samples: samples.map((_, sample) =>
          rows.map((row) => toReading(row, readingOf(sample, row))),
        ),
      });
      toast.success(
        `Entry #${id}${many ? ` (${samples.length} samples)` : ''} saved and sent for approval`,
      );
      navigate(`/qc/qa-reports/entries/${id}`, { replace: true });
    } catch (error) {
      showErrors(readApiErrors(error));
    } finally {
      setSaving(false);
    }
  };

  const entry = header.entry;
  // Several samples are still one entry: one number, one approval.
  const title = mode === 'new' ? 'New Entry' : `Correct Entry #${entry?.id}`;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(cancelTo)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
              {many && ' '}
              {many && (
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  · {samples.length} samples
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              Saving sends the entry to a QC lead for approval.
            </p>
          </div>
        </div>
        {entry && <ProductionQCStatusBadge status={entry.status} label={entry.status_label} />}
      </div>

      {(errors.general || errors.parameter_type_id || errors.default_id || errors.samples) && (
        <div
          data-error="true"
          className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            {[errors.parameter_type_id, errors.default_id, errors.samples, errors.general]
              .filter(Boolean)
              .map((message) => (
                <p key={message}>{message}</p>
              ))}
          </div>
          {(errors.parameter_type_id || errors.default_id) && (
            <Button variant="outline" size="sm" onClick={() => navigate(LIST_PATH)}>
              Pick again
            </Button>
          )}
        </div>
      )}

      {entry?.status === 'SENT_BACK' && (
        <SentBackBanner
          by={entry.sent_back_by_name}
          at={entry.sent_back_at}
          remarks={entry.send_back_remarks}
        />
      )}

      {/* The report being filled */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <InfoItem label="Report">
            {header.typeName}
            <div className="font-mono text-xs text-muted-foreground">{header.typeCode}</div>
          </InfoItem>
          {header.defaultName && <InfoItem label="Default">{header.defaultName}</InfoItem>}
          {entry && <InfoItem label="Checked At">{formatDateTime(entry.checked_at)}</InfoItem>}
        </CardContent>
      </Card>

      {/* Readings */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Parameters ({rows.length})</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              <span className="text-destructive">*</span> mandatory
            </span>
            {canAddSamples && (
              <Button size="sm" variant="outline" onClick={addSample} disabled={saving}>
                <Plus className="mr-2 h-4 w-4" />
                Add sample
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {errors.results && (
            <div
              data-error="true"
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {errors.results}
            </div>
          )}
          {many ? (
            <SampleGrid
              rows={rows}
              sampleCount={samples.length}
              readingOf={readingOf}
              errors={errors}
              disabled={saving}
              onChange={change}
              onCopyAcross={copyAcross}
              onRemoveSample={canAddSamples ? removeSample : undefined}
            />
          ) : (
            rows.map((row) => (
              <ReadingRowInput
                key={row.parameterId}
                row={row}
                reading={readingOf(0, row)}
                error={errors[`param_0_${row.parameterId}`]}
                disabled={saving}
                onChange={(patch) => change(0, row, patch)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card>
        <CardContent className="space-y-2 pt-6">
          <Label htmlFor="production-qc-remarks">
            Remarks
            {outOfSpecCount > 0 && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id="production-qc-remarks"
            value={remarks}
            onChange={(event) => {
              setRemarks(event.target.value);
              clearError('remarks');
            }}
            placeholder="What was seen, and what was done about anything out of spec"
            disabled={saving}
            className={cn(errors.remarks && 'border-destructive focus-visible:ring-destructive')}
            data-error={errors.remarks ? 'true' : undefined}
          />
          {errors.remarks ? (
            <p className="text-sm text-destructive">{errors.remarks}</p>
          ) : (
            <p
              className={cn(
                'text-xs',
                outOfSpecCount > 0 ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {outOfSpecCount > 0
                ? `${outOfSpecCount} reading${outOfSpecCount === 1 ? ' is' : 's are'} out of spec — a remark is required.`
                : many
                  ? 'One remark for every sample; required when any reading is out of spec.'
                  : 'Required when any parameter is out of spec.'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => navigate(cancelTo)} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? 'Saving…' : 'Save & Send for Approval'}
        </Button>
      </div>
    </div>
  );
}

/** Several samples at once, as on the paper: a row per parameter, a column per sample. */
function SampleGrid({
  rows,
  sampleCount,
  readingOf,
  errors,
  disabled,
  onChange,
  onCopyAcross,
  onRemoveSample,
}: {
  rows: ReadingRow[];
  sampleCount: number;
  readingOf: (sample: number, row: ReadingRow) => ReadingState;
  errors: FieldErrors;
  disabled: boolean;
  onChange: (sample: number, row: ReadingRow, patch: Partial<ReadingState>) => void;
  onCopyAcross: (row: ReadingRow) => void;
  onRemoveSample?: (sample: number) => void;
}) {
  const sampleIndexes = Array.from({ length: sampleCount }, (_, index) => index);
  return (
    <div className="max-w-full overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="sticky left-0 z-10 min-w-[220px] bg-muted p-3 text-left font-medium">
              Parameter
            </th>
            {sampleIndexes.map((sample) => (
              <th key={sample} className="min-w-[190px] p-3 text-left font-medium">
                <div className="flex items-center justify-between gap-2">
                  <span>Sample {sample + 1}</span>
                  {onRemoveSample && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      aria-label={`Remove sample ${sample + 1}`}
                      onClick={() => onRemoveSample(sample)}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.parameterId} className="border-t align-top">
              <td className="sticky left-0 z-10 bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {row.name}
                      {row.is_mandatory && <span className="text-destructive"> *</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">Spec: {describeSpec(row)}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0 p-0 text-muted-foreground"
                    title="Copy Sample 1's value to every sample"
                    aria-label={`Copy ${row.name} from Sample 1 to every sample`}
                    onClick={() => onCopyAcross(row)}
                    disabled={disabled}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
              {sampleIndexes.map((sample) => (
                <td key={sample} className="p-2">
                  <GridCell
                    row={row}
                    sample={sample}
                    reading={readingOf(sample, row)}
                    error={errors[`param_${sample}_${row.parameterId}`]}
                    disabled={disabled}
                    onChange={(patch) => onChange(sample, row, patch)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GridCell({
  row,
  sample,
  reading,
  error,
  disabled,
  onChange,
}: {
  row: ReadingRow;
  sample: number;
  reading: ReadingState;
  error?: string;
  disabled: boolean;
  onChange: (patch: Partial<ReadingState>) => void;
}) {
  const value = reading.value;
  const hasValue = value.trim() !== '';
  const judged = hasValue ? judgeReading(row, value) : null;
  const verdict = verdictOf(row, reading);
  const isNumeric = row.value_type === 'NUMERIC' || row.value_type === 'RANGE';
  const judgedByHand = hasValue && judged === null && row.value_type !== 'BOOLEAN';
  const label = `${row.name}, sample ${sample + 1}`;

  return (
    <div
      data-error={error ? 'true' : undefined}
      className={cn(
        'space-y-1 rounded-md p-1',
        verdict === false && 'bg-destructive/5',
        error && 'ring-1 ring-destructive',
      )}
    >
      {row.value_type === 'BOOLEAN' ? (
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange({ value: event.target.value })}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm',
            error && 'border-destructive',
          )}
        >
          <option value="">—</option>
          <option value="Pass">Pass</option>
          <option value="Fail">Fail</option>
        </select>
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            aria-label={label}
            type={isNumeric ? 'number' : 'text'}
            step={isNumeric ? 'any' : undefined}
            inputMode={isNumeric ? 'decimal' : undefined}
            value={value}
            onChange={(event) => onChange({ value: event.target.value })}
            disabled={disabled}
            className={cn('h-9', error && 'border-destructive')}
          />
          {row.uom && <span className="text-xs text-muted-foreground">{row.uom}</span>}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-xs">
        {verdict === true && !judgedByHand && (
          <span className="flex items-center gap-1 font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Within spec
          </span>
        )}
        {verdict === false && !judgedByHand && (
          <span className="flex items-center gap-1 font-medium text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            Out of spec
          </span>
        )}
        {judgedByHand && (
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={reading.withinSpec}
              onChange={(event) => onChange({ withinSpec: event.target.checked })}
              disabled={disabled}
              aria-label={`${label} within spec`}
              className="h-3.5 w-3.5 rounded border-gray-300 dark:border-border"
            />
            <span className={cn(!reading.withinSpec && 'font-medium text-destructive')}>
              Within spec
            </span>
          </label>
        )}
      </div>
      <Input
        aria-label={`${label} remark`}
        value={reading.remarks}
        onChange={(event) => onChange({ remarks: event.target.value })}
        disabled={disabled}
        placeholder="Remark"
        className="h-7 text-xs"
      />
    </div>
  );
}

function ReadingRowInput({
  row,
  reading,
  error,
  disabled,
  onChange,
}: {
  row: ReadingRow;
  reading: ReadingState;
  error?: string;
  disabled: boolean;
  onChange: (patch: Partial<ReadingState>) => void;
}) {
  const value = reading.value;
  const hasValue = value.trim() !== '';
  const judged = hasValue ? judgeReading(row, value) : null;
  const verdict = verdictOf(row, reading);
  const isNumeric = row.value_type === 'NUMERIC' || row.value_type === 'RANGE';
  // A reading the spec cannot judge (text, or a spec without numbers) is judged by hand.
  const judgedByHand = hasValue && judged === null && row.value_type !== 'BOOLEAN';
  const inputId = `production-qc-reading-${row.parameterId}`;

  return (
    <div
      data-error={error ? 'true' : undefined}
      className={cn(
        'grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start',
        verdict === false && 'border-destructive/60 bg-destructive/5',
        error && 'border-destructive',
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <label htmlFor={inputId} className="block font-medium">
          {row.name}
          {row.is_mandatory && <span className="text-destructive"> *</span>}
        </label>
        <div className="font-mono text-xs text-muted-foreground">
          {row.code} · {PARAMETER_TYPE_LABELS[row.value_type] ?? row.value_type}
        </div>
        <div className="text-sm text-muted-foreground">Spec: {describeSpec(row)}</div>
      </div>

      <div className="space-y-1.5">
        {row.value_type === 'BOOLEAN' ? (
          <select
            id={inputId}
            value={value}
            onChange={(event) => onChange({ value: event.target.value })}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              error && 'border-destructive',
            )}
          >
            <option value="">Select Pass or Fail</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              id={inputId}
              type={isNumeric ? 'number' : 'text'}
              step={isNumeric ? 'any' : undefined}
              inputMode={isNumeric ? 'decimal' : undefined}
              value={value}
              onChange={(event) => onChange({ value: event.target.value })}
              disabled={disabled}
              placeholder={isNumeric ? 'Enter reading' : 'Enter observation'}
              className={cn(error && 'border-destructive')}
            />
            {row.uom && <span className="text-sm text-muted-foreground">{row.uom}</span>}
          </div>
        )}

        {verdict === true && !judgedByHand && (
          <p className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Within spec
          </p>
        )}
        {verdict === false && !judgedByHand && (
          <p className="flex items-center gap-1 text-xs font-medium text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            Out of spec
          </p>
        )}
        {judgedByHand && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reading.withinSpec}
              onChange={(event) => onChange({ withinSpec: event.target.checked })}
              disabled={disabled}
              className="h-4 w-4 rounded border-gray-300 dark:border-border"
            />
            <span className={cn(!reading.withinSpec && 'font-medium text-destructive')}>
              Within spec
            </span>
          </label>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Input
        aria-label={`${row.name} remark`}
        value={reading.remarks}
        onChange={(event) => onChange({ remarks: event.target.value })}
        disabled={disabled}
        placeholder="Remark (optional)"
      />
    </div>
  );
}

// ==================== Bits ====================

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  );
}

function EntryLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function EntryProblem({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" onClick={action.onClick}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      </CardContent>
    </Card>
  );
}
