import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Save, XCircle } from 'lucide-react';
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
  useProductionQCEntry,
  useProductionQCRunningLines,
  useUpdateProductionQCEntry,
} from '../../api/productionQC/productionQC.queries';
import { PARAMETER_TYPE_LABELS } from '../../constants';
import type {
  DecimalValue,
  ProductionQCEntry,
  ProductionQCReading,
  ProductionRunningLine,
} from '../../types/productionQC.types';
import type { ParameterType } from '../../types/qc.types';
import { formatDateTime } from '../../utils/productionQCFormat';
import { describeSpec, judgeReading } from '../../utils/productionQCSpec';
import {
  LineRunningBadge,
  ProductionQCStatusBadge,
  SentBackBanner,
} from './ProductionQCStatusBadge';

const LIST_PATH = '/qc/production';

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
  lineName: string;
  product: string;
  itemCode: string;
  runNumber: number;
  typeName: string;
  typeCode: string;
  /** New entries: the line as it is now. */
  runningLine?: ProductionRunningLine;
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
      : ['remarks', 'run_id', 'parameter_type_id'].includes(field)
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
 * The reading form: `/qc/production/new?run=&type=` for a new check, and
 * `/qc/production/entries/:entryId/edit` to correct one pending or sent back.
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
  const runId = Number(searchParams.get('run')) || null;
  const typeId = Number(searchParams.get('type')) || null;

  const {
    data: lines,
    isLoading: linesLoading,
    error: linesError,
  } = useProductionQCRunningLines(!!runId && !!typeId);
  const {
    data: parameterType,
    isLoading: typeLoading,
    error: typeError,
  } = useProductionParameterType(runId ? typeId : null);
  const {
    data: parameters,
    isLoading: parametersLoading,
    error: parametersError,
  } = useProductionParameters(runId ? typeId : null);
  const createEntry = useCreateProductionQCEntry();

  const rows = useMemo<ReadingRow[]>(
    () =>
      (parameters ?? [])
        .filter((parameter) => parameter.is_active)
        .map((parameter) => ({
          parameterId: parameter.id,
          code: parameter.parameter_code,
          name: parameter.parameter_name,
          standard_value: parameter.standard_value,
          value_type: parameter.value_type,
          min_value: parameter.min_value,
          max_value: parameter.max_value,
          uom: parameter.uom,
          is_mandatory: parameter.is_mandatory,
          sequence: parameter.sequence,
        })),
    [parameters],
  );

  const backToList = { label: 'Back to Production QC', onClick: () => navigate(LIST_PATH) };

  if (!runId || !typeId) {
    return (
      <EntryProblem
        title="Pick a line and a parameter type first"
        message="Open New on the Production QC page and choose the running line and the parameter type to check."
        action={backToList}
      />
    );
  }
  if (linesLoading || typeLoading || parametersLoading) return <EntryLoading />;
  if (linesError || typeError || parametersError) {
    return (
      <EntryProblem
        title="Could not open the entry form"
        message={
          ((linesError || typeError || parametersError) as ApiError | null)?.message ||
          'The line or the parameter type could not be loaded.'
        }
        action={backToList}
      />
    );
  }

  const line = (lines ?? []).find((candidate) => candidate.run_id === runId);
  if (!line) {
    return (
      <EntryProblem
        title="This line is not running any more"
        message="The run you picked is not on a running line now. Pick the line again."
        action={{ label: 'Pick the line again', onClick: () => navigate(LIST_PATH) }}
      />
    );
  }
  if (!parameterType || !parameterType.is_active) {
    return (
      <EntryProblem
        title="That parameter type is not available"
        message="It may have been removed. Pick the parameter type again."
        action={backToList}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EntryProblem
        title="This parameter type has no parameters yet"
        message="Add its parameters under Parameter Types first."
        action={backToList}
      />
    );
  }

  return (
    <EntryForm
      mode="new"
      header={{
        lineName: line.line_name,
        product: line.product,
        itemCode: line.item_code,
        runNumber: line.run_number,
        typeName: parameterType.name,
        typeCode: parameterType.code,
        runningLine: line,
      }}
      rows={rows}
      cancelTo={LIST_PATH}
      onSave={async (data) => {
        const created = await createEntry.mutateAsync({
          run_id: line.run_id,
          parameter_type_id: parameterType.id,
          ...data,
        });
        return created.id;
      }}
    />
  );
}

function EditEntry({ entryId }: { entryId: number }) {
  const navigate = useNavigate();
  const { data: entry, isLoading, error } = useProductionQCEntry(entryId || null);
  const updateEntry = useUpdateProductionQCEntry();
  const detailPath = `/qc/production/entries/${entryId}`;

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

  if (isLoading) return <EntryLoading />;
  if (error || !entry) {
    return (
      <EntryProblem
        title="Could not load the entry"
        message={(error as ApiError | null)?.message || 'The entry could not be found.'}
        action={{ label: 'Back to Production QC', onClick: () => navigate(LIST_PATH) }}
      />
    );
  }
  if (entry.status === 'APPROVED') {
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

  const initialReadings: Record<number, ReadingState> = {};
  entry.results.forEach((result) => {
    initialReadings[result.parameter_id] = {
      value: result.result_value ?? '',
      withinSpec: result.is_within_spec ?? true,
      remarks: result.remarks ?? '',
    };
  });

  return (
    <EntryForm
      mode="edit"
      header={{
        lineName: entry.line_name,
        product: entry.product,
        itemCode: entry.item_code,
        runNumber: entry.run_number,
        typeName: entry.parameter_type.name,
        typeCode: entry.parameter_type.code,
        entry,
      }}
      rows={rows}
      initialReadings={initialReadings}
      initialRemarks={entry.remarks}
      cancelTo={detailPath}
      onSave={async (data) => {
        await updateEntry.mutateAsync({ id: entry.id, data });
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
  initialReadings,
  initialRemarks = '',
  cancelTo,
  onSave,
}: {
  mode: 'new' | 'edit';
  header: EntryHeader;
  rows: ReadingRow[];
  initialReadings?: Record<number, ReadingState>;
  initialRemarks?: string;
  cancelTo: string;
  /** Saves and returns the entry's id. */
  onSave: (data: { remarks: string; results: ProductionQCReading[] }) => Promise<number>;
}) {
  const navigate = useNavigate();
  const [readings, setReadings] = useState<Record<number, ReadingState>>(
    () => initialReadings ?? {},
  );
  const [remarks, setRemarks] = useState(initialRemarks);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const readingOf = (row: ReadingRow) => readings[row.parameterId] ?? EMPTY_READING;

  const outOfSpec = rows.filter((row) => verdictOf(row, readingOf(row)) === false);

  const clearError = (key: string) => {
    if (!errors[key]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const change = (row: ReadingRow, patch: Partial<ReadingState>) => {
    setReadings((prev) => ({
      ...prev,
      [row.parameterId]: { ...(prev[row.parameterId] ?? EMPTY_READING), ...patch },
    }));
    if (patch.value !== undefined) {
      clearError(`param_${row.parameterId}`);
      clearError('results');
    }
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
    const missing = rows.filter((row) => row.is_mandatory && !readingOf(row).value.trim());
    missing.forEach((row) => {
      next[`param_${row.parameterId}`] = 'Enter a value — this parameter is mandatory.';
    });
    if (missing.length > 0) {
      next.results = `Enter a value for every mandatory parameter: ${missing
        .map((row) => row.name)
        .join(', ')}.`;
    }
    if (outOfSpec.length > 0 && !remarks.trim()) {
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
        results: rows.map((row) => toReading(row, readingOf(row))),
      });
      toast.success(`Entry #${id} saved and sent for approval`);
      navigate(`/qc/production/entries/${id}`, { replace: true });
    } catch (error) {
      showErrors(readApiErrors(error));
    } finally {
      setSaving(false);
    }
  };

  const entry = header.entry;
  const title = mode === 'new' ? 'New Production QC Entry' : `Correct Entry #${entry?.id}`;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(cancelTo)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
            <p className="text-sm text-muted-foreground">
              Saving sends the entry to a QC lead for approval.
            </p>
          </div>
        </div>
        {entry && <ProductionQCStatusBadge status={entry.status} label={entry.status_label} />}
      </div>

      {(errors.general || errors.run_id || errors.parameter_type_id) && (
        <div
          data-error="true"
          className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            {[errors.run_id, errors.parameter_type_id, errors.general]
              .filter(Boolean)
              .map((message) => (
                <p key={message}>{message}</p>
              ))}
          </div>
          {(errors.run_id || errors.parameter_type_id) && (
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

      {/* What is being checked */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-5">
          <InfoItem label="Line">
            <div className="flex flex-wrap items-center gap-2">
              {header.lineName}
              {header.runningLine && <LineRunningBadge line={header.runningLine} />}
            </div>
          </InfoItem>
          <InfoItem label="Product">{header.product || '-'}</InfoItem>
          <InfoItem label="Item Code">
            <span className="font-mono">{header.itemCode || '-'}</span>
          </InfoItem>
          <InfoItem label="Run No.">#{header.runNumber}</InfoItem>
          <InfoItem label="Parameter Type">
            {header.typeName}
            <div className="font-mono text-xs text-muted-foreground">{header.typeCode}</div>
          </InfoItem>
          {entry && <InfoItem label="Checked At">{formatDateTime(entry.checked_at)}</InfoItem>}
        </CardContent>
      </Card>

      {/* Readings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Parameters ({rows.length})</CardTitle>
          <span className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> mandatory
          </span>
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
          {rows.map((row) => (
            <ReadingRowInput
              key={row.parameterId}
              row={row}
              reading={readingOf(row)}
              error={errors[`param_${row.parameterId}`]}
              disabled={saving}
              onChange={(patch) => change(row, patch)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card>
        <CardContent className="space-y-2 pt-6">
          <Label htmlFor="production-qc-remarks">
            Remarks
            {outOfSpec.length > 0 && <span className="text-destructive"> *</span>}
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
                outOfSpec.length > 0 ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {outOfSpec.length > 0
                ? `${outOfSpec.length} parameter${outOfSpec.length === 1 ? ' is' : 's are'} out of spec — a remark is required.`
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
