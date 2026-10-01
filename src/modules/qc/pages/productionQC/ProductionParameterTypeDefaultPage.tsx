import { AlertCircle, ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useCreateProductionParameterTypeDefault,
  useDeleteProductionParameterTypeDefault,
  useProductionParameters,
  useProductionParameterType,
  useProductionParameterTypeDefault,
  useUpdateProductionParameterTypeDefault,
} from '../../api/productionQC/productionQC.queries';
import { PARAMETER_TYPE_LABELS } from '../../constants';
import type {
  ProductionParameter,
  ProductionParameterTypeDefault,
  ProductionParameterTypeDefaultRequest,
} from '../../types/productionQC.types';
import { type Errors, hasBounds, readApiErrors } from '../../utils/productionQCMaster';
import { describeSpec, formatDecimal } from '../../utils/productionQCSpec';
import { Field } from './MasterField';

interface RowState {
  standard: string;
  min: string;
  max: string;
  value: string;
}

const EMPTY_ROW: RowState = { standard: '', min: '', max: '', value: '' };

function initialRows(item: ProductionParameterTypeDefault | undefined): Record<number, RowState> {
  const rows: Record<number, RowState> = {};
  item?.values.forEach((value) => {
    rows[value.parameter_id] = {
      standard: value.standard_value,
      min: formatDecimal(value.min_value),
      max: formatDecimal(value.max_value),
      value: value.value,
    };
  });
  return rows;
}

/**
 * One default of a report — `/qc/qa-reports/types/:typeId/defaults/new` or
 * `/:defaultId`: its name, and per parameter the standard it sets and the value
 * it pre-fills. A row left blank keeps the report's own standard and pre-fills
 * nothing.
 */
export default function ProductionParameterTypeDefaultPage() {
  const { typeId, defaultId } = useParams<{ typeId: string; defaultId?: string }>();
  const typeKey = Number(typeId) || null;
  const editingId = defaultId && defaultId !== 'new' ? Number(defaultId) || null : null;

  const type = useProductionParameterType(defaultId ? typeKey : null);
  const parameters = useProductionParameters(defaultId ? typeKey : null);
  const existing = useProductionParameterTypeDefault(editingId);

  // `/defaults` itself (the breadcrumb's link) is the type page's Defaults tab.
  if (!defaultId) return <Navigate to={`/qc/qa-reports/types/${typeId}?view=defaults`} replace />;

  const loading = type.isLoading || parameters.isLoading || (!!editingId && existing.isLoading);
  const failed = type.error || parameters.error || (editingId && existing.error) || !type.data;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (failed || (editingId && existing.data?.parameter_type_id !== typeKey)) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        This default could not be found. It may have been removed.
      </div>
    );
  }

  return (
    <DefaultForm
      key={editingId ?? 'new'}
      typeId={type.data!.id}
      typeCode={type.data!.code}
      typeName={type.data!.name}
      parameters={(parameters.data ?? []).filter((parameter) => parameter.is_active)}
      existing={editingId ? existing.data : undefined}
    />
  );
}

function DefaultForm({
  typeId,
  typeCode,
  typeName,
  parameters,
  existing,
}: {
  typeId: number;
  typeCode: string;
  typeName: string;
  parameters: ProductionParameter[];
  existing?: ProductionParameterTypeDefault;
}) {
  const navigate = useNavigate();
  const createDefault = useCreateProductionParameterTypeDefault();
  const updateDefault = useUpdateProductionParameterTypeDefault();
  const deleteDefault = useDeleteProductionParameterTypeDefault();
  const listPath = `/qc/qa-reports/types/${typeId}?view=defaults`;

  const [name, setName] = useState(existing?.name ?? '');
  const [rows, setRows] = useState<Record<number, RowState>>(() => initialRows(existing));
  const [errors, setErrors] = useState<Errors>({});

  const rowOf = (id: number) => rows[id] ?? EMPTY_ROW;
  const change = (id: number, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_ROW), ...patch } }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`row_${id}`];
      delete next.values;
      return next;
    });
  };

  const saving = createDefault.isPending || updateDefault.isPending;

  const handleSave = async () => {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Enter a name';
    const values: ProductionParameterTypeDefaultRequest['values'] = [];
    parameters.forEach((parameter) => {
      const row = rowOf(parameter.id);
      const bounded = hasBounds(parameter.value_type);
      const min = bounded && row.min.trim() !== '' ? Number(row.min) : null;
      const max = bounded && row.max.trim() !== '' ? Number(row.max) : null;
      if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) {
        next[`row_${parameter.id}`] = 'Min and max must be numbers.';
        return;
      }
      if (min !== null && max !== null && min > max) {
        next[`row_${parameter.id}`] = 'Max must not be below min.';
        return;
      }
      const standard = row.standard.trim();
      const value = row.value.trim();
      if (standard || value || min !== null || max !== null) {
        values.push({
          parameter_id: parameter.id,
          standard_value: standard,
          min_value: min,
          max_value: max,
          value,
        });
      }
    });
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const data = { name: name.trim(), values };
    try {
      if (existing) await updateDefault.mutateAsync({ id: existing.id, data });
      else await createDefault.mutateAsync({ typeId, data });
      toast.success(`${data.name} saved`);
      navigate(listPath);
    } catch (error) {
      setErrors(readApiErrors(error, 'Failed to save the default'));
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    const confirmed = await confirmDialog({
      title: `Remove ${existing.name}?`,
      description:
        'New entries can no longer pick it. Entries already made with it keep its name and the standards they were judged on.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteDefault.mutateAsync(existing.id);
      toast.success(`${existing.name} removed`);
      navigate(listPath);
    } catch {
      // The api client already toasts the reason.
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => navigate(listPath)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {typeCode} defaults
        </Button>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">
            {existing ? existing.name : 'New Default'}
          </h2>
          <p className="text-muted-foreground">{typeName}</p>
        </div>
      </div>

      {(errors.general || errors.values) && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errors.general || errors.values}
        </div>
      )}

      <Card>
        <CardContent className="max-w-md pt-6">
          <Field
            label="Name"
            required
            error={errors.name}
            htmlFor="qa-report-default-name"
            hint="What the person filling picks, e.g. the SKU: 1 L PET Canola."
          >
            <Input
              id="qa-report-default-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.name;
                  return next;
                });
              }}
              placeholder="e.g., 1 L PET Canola"
              disabled={saving}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Values</CardTitle>
          <CardDescription>
            A standard, min or max here replaces the report&apos;s spec for that parameter; leave
            all three blank to keep it. A pre-filled value appears in the entry, where it can still
            be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parameters.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              This report has no parameters yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-10 p-3 text-left font-medium">#</th>
                    <th className="p-3 text-left font-medium">Parameter</th>
                    <th className="p-3 text-left font-medium">Report&apos;s spec</th>
                    <th className="p-3 text-left font-medium">Standard</th>
                    <th className="w-28 p-3 text-left font-medium">Min</th>
                    <th className="w-28 p-3 text-left font-medium">Max</th>
                    <th className="p-3 text-left font-medium">Pre-filled value</th>
                  </tr>
                </thead>
                <tbody>
                  {parameters.map((parameter) => {
                    const row = rowOf(parameter.id);
                    const bounded = hasBounds(parameter.value_type);
                    const error = errors[`row_${parameter.id}`];
                    const label = parameter.parameter_name;
                    return (
                      <tr key={parameter.id} className="border-b align-top">
                        <td className="p-3 text-muted-foreground">{parameter.sequence}</td>
                        <td className="p-3">
                          <div className="font-medium">{label}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {parameter.parameter_code} ·{' '}
                            {PARAMETER_TYPE_LABELS[parameter.value_type] ?? parameter.value_type}
                          </div>
                          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                        </td>
                        <td className="p-3 text-muted-foreground">{describeSpec(parameter)}</td>
                        <td className="p-3">
                          <Input
                            aria-label={`${label} standard`}
                            value={row.standard}
                            onChange={(event) =>
                              change(parameter.id, { standard: event.target.value })
                            }
                            placeholder="As the report"
                            disabled={saving}
                          />
                        </td>
                        <td className="p-3">
                          {bounded ? (
                            <Input
                              aria-label={`${label} min`}
                              type="number"
                              step="any"
                              value={row.min}
                              onChange={(event) =>
                                change(parameter.id, { min: event.target.value })
                              }
                              className={cn(error && 'border-destructive')}
                              disabled={saving}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {bounded ? (
                            <Input
                              aria-label={`${label} max`}
                              type="number"
                              step="any"
                              value={row.max}
                              onChange={(event) =>
                                change(parameter.id, { max: event.target.value })
                              }
                              className={cn(error && 'border-destructive')}
                              disabled={saving}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {parameter.value_type === 'BOOLEAN' ? (
                            <select
                              aria-label={`${label} pre-filled value`}
                              value={row.value}
                              onChange={(event) =>
                                change(parameter.id, { value: event.target.value })
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              disabled={saving}
                            >
                              <option value="">—</option>
                              <option value="Pass">Pass</option>
                              <option value="Fail">Fail</option>
                            </select>
                          ) : (
                            <Input
                              aria-label={`${label} pre-filled value`}
                              value={row.value}
                              onChange={(event) =>
                                change(parameter.id, { value: event.target.value })
                              }
                              placeholder={parameter.uom ? `In ${parameter.uom}` : undefined}
                              disabled={saving}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <div>
          {existing && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={saving || deleteDefault.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => navigate(listPath)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Default
          </Button>
        </div>
      </div>
    </div>
  );
}
