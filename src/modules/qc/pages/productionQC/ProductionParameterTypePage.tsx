import { AlertCircle, ArrowLeft, Edit, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import {
  useCreateProductionParameter,
  useDeleteProductionParameter,
  useProductionParameters,
  useProductionParameterType,
  useUpdateProductionParameter,
} from '../../api/productionQC/productionQC.queries';
import { PARAMETER_TYPE_LABELS } from '../../constants';
import type {
  ProductionParameter,
  ProductionParameterRequest,
  ProductionParameterType,
} from '../../types/productionQC.types';
import type { ParameterType } from '../../types/qc.types';
import {
  type Errors,
  hasBounds,
  readApiErrors,
  upperCode,
  withoutKey,
} from '../../utils/productionQCMaster';
import { describeSpec, formatDecimal } from '../../utils/productionQCSpec';
import { Field } from './MasterField';

/** One report type and its parameters. The list of types is its own page. */
export default function ProductionParameterTypePage() {
  const navigate = useNavigate();
  const { typeId } = useParams<{ typeId: string }>();
  const id = Number(typeId) || null;
  const { data: type, isLoading, error } = useProductionParameterType(id);

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => navigate('/qc/qa-reports/types')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Report Types
        </Button>
        {type && (
          <div className="space-y-1">
            <h2 className="flex flex-wrap items-baseline gap-x-3 text-3xl font-bold tracking-tight">
              {type.code}{' '}
              <span className="text-lg font-normal text-muted-foreground">{type.name}</span>
            </h2>
            {type.description && <p className="text-muted-foreground">{type.description}</p>}
            {type.print_document_id && (
              <p className="font-mono text-sm text-muted-foreground">
                {type.print_document_id}
                {type.revision && ` · Rev. ${type.revision}`}
                {type.revision_date && ` · ${type.revision_date.split('-').reverse().join('-')}`}
              </p>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error || !type ? (
        <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          This report type could not be found. It may have been removed.
        </div>
      ) : (
        <ParametersCard type={type} />
      )}
    </div>
  );
}

// ==================== Parameters ====================

interface ParameterForm {
  parameter_code: string;
  parameter_name: string;
  standard_value: string;
  value_type: ParameterType;
  min_value: string;
  max_value: string;
  uom: string;
  sequence: string;
  is_mandatory: boolean;
}

const emptyParameterForm = (sequence: number): ParameterForm => ({
  parameter_code: '',
  parameter_name: '',
  standard_value: '',
  value_type: 'NUMERIC',
  min_value: '',
  max_value: '',
  uom: '',
  sequence: String(sequence),
  is_mandatory: true,
});

function ParametersCard({ type }: { type: ProductionParameterType }) {
  const { data: parameters = [], isLoading } = useProductionParameters(type.id);
  const createParameter = useCreateProductionParameter();
  const updateParameter = useUpdateProductionParameter();
  const deleteParameter = useDeleteProductionParameter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionParameter | null>(null);
  const [form, setForm] = useState<ParameterForm>(emptyParameterForm(1));
  const [errors, setErrors] = useState<Errors>({});

  const openDialog = (parameter?: ProductionParameter) => {
    setEditing(parameter ?? null);
    if (parameter) {
      setForm({
        parameter_code: parameter.parameter_code,
        parameter_name: parameter.parameter_name,
        standard_value: parameter.standard_value === '-' ? '' : parameter.standard_value,
        value_type: parameter.value_type,
        min_value: formatDecimal(parameter.min_value),
        max_value: formatDecimal(parameter.max_value),
        uom: parameter.uom,
        sequence: String(parameter.sequence),
        is_mandatory: parameter.is_mandatory,
      });
    } else {
      const next = parameters.length ? Math.max(...parameters.map((p) => p.sequence)) + 1 : 1;
      setForm(emptyParameterForm(next));
    }
    setErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setErrors({});
  };

  const set = <K extends keyof ParameterForm>(key: K, value: ParameterForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => withoutKey(prev, key));
  };

  const handleSave = async () => {
    const next: Errors = {};
    if (!form.parameter_code.trim()) next.parameter_code = 'Code is required';
    if (!form.parameter_name.trim()) next.parameter_name = 'Name is required';
    const sequence = Number(form.sequence);
    if (!Number.isInteger(sequence) || sequence < 0) next.sequence = 'A whole number, 0 or more';
    const bounded = hasBounds(form.value_type);
    const min = bounded && form.min_value.trim() !== '' ? Number(form.min_value) : null;
    const max = bounded && form.max_value.trim() !== '' ? Number(form.max_value) : null;
    if (min !== null && Number.isNaN(min)) next.min_value = 'Enter a number';
    if (max !== null && Number.isNaN(max)) next.max_value = 'Enter a number';
    if (min !== null && max !== null && min > max) next.max_value = 'Max must not be below min.';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const data: ProductionParameterRequest = {
      parameter_code: form.parameter_code.trim(),
      parameter_name: form.parameter_name.trim(),
      // The backend needs a spec; a parameter with no written spec reads as "-".
      standard_value: form.standard_value.trim() || '-',
      value_type: form.value_type,
      min_value: min,
      max_value: max,
      uom: form.uom.trim(),
      sequence,
      is_mandatory: form.is_mandatory,
    };
    try {
      if (editing) await updateParameter.mutateAsync({ id: editing.id, data });
      else await createParameter.mutateAsync({ typeId: type.id, data });
      toast.success(`${data.parameter_name} saved`);
      closeDialog();
    } catch (err) {
      setErrors(readApiErrors(err, 'Failed to save the parameter'));
    }
  };

  const handleDelete = async (parameter: ProductionParameter) => {
    const confirmed = await confirmDialog({
      title: `Remove ${parameter.parameter_name}?`,
      description: 'New entries stop asking for it. Entries already saved keep their reading.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteParameter.mutateAsync(parameter.id);
      toast.success(`${parameter.parameter_name} removed`);
    } catch {
      // The api client already toasts the reason.
    }
  };

  const isSaving = createParameter.isPending || updateParameter.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardDescription>
          {parameters.length} parameter{parameters.length === 1 ? '' : 's'} — what an entry of this
          report records, in this order.
        </CardDescription>
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Parameter
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : parameters.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No parameters yet — this report cannot be filled until it has some.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 p-3 text-left font-medium">#</th>
                  <th className="p-3 text-left font-medium">Parameter</th>
                  <th className="p-3 text-left font-medium">Spec</th>
                  <th className="p-3 text-left font-medium">Type</th>
                  <th className="p-3 text-center font-medium">Mandatory</th>
                  <th className="p-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((parameter) => (
                  <tr key={parameter.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-muted-foreground">{parameter.sequence}</td>
                    <td className="p-3">
                      <div className="font-medium">{parameter.parameter_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {parameter.parameter_code}
                      </div>
                    </td>
                    <td className="p-3">{describeSpec(parameter)}</td>
                    <td className="p-3 text-muted-foreground">
                      {PARAMETER_TYPE_LABELS[parameter.value_type] ?? parameter.value_type}
                    </td>
                    <td className="p-3 text-center">{parameter.is_mandatory ? 'Yes' : 'No'}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Edit ${parameter.parameter_name}`}
                          onClick={() => openDialog(parameter)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Remove ${parameter.parameter_name}`}
                          disabled={deleteParameter.isPending}
                          onClick={() => handleDelete(parameter)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Parameter' : `Add Parameter to ${type.code}`}
            </DialogTitle>
          </DialogHeader>
          {errors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {errors.general}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Code"
                required
                error={errors.parameter_code}
                htmlFor="production-parameter-code"
              >
                <Input
                  id="production-parameter-code"
                  value={form.parameter_code}
                  onChange={(event) => set('parameter_code', upperCode(event.target.value))}
                  placeholder="e.g., NET_WT"
                  disabled={isSaving}
                />
              </Field>
              <Field
                label="Sequence"
                error={errors.sequence}
                htmlFor="production-parameter-sequence"
              >
                <Input
                  id="production-parameter-sequence"
                  type="number"
                  min={0}
                  value={form.sequence}
                  onChange={(event) => set('sequence', event.target.value)}
                  disabled={isSaving}
                />
              </Field>
            </div>
            <Field
              label="Name"
              required
              error={errors.parameter_name}
              htmlFor="production-parameter-name"
            >
              <Input
                id="production-parameter-name"
                value={form.parameter_name}
                onChange={(event) => set('parameter_name', event.target.value)}
                placeholder="e.g., Net Weight"
                disabled={isSaving}
              />
            </Field>
            <Field
              label="Standard Value"
              error={errors.standard_value}
              htmlFor="production-parameter-standard"
              hint="As written on the spec, e.g. 910±5, NLT 20, Proper. A numeric spec is judged automatically."
            >
              <Input
                id="production-parameter-standard"
                value={form.standard_value}
                onChange={(event) => set('standard_value', event.target.value)}
                placeholder="e.g., 910±5"
                disabled={isSaving}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Value Type"
                error={errors.value_type}
                htmlFor="production-parameter-kind"
              >
                <select
                  id="production-parameter-kind"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.value_type}
                  onChange={(event) => set('value_type', event.target.value as ParameterType)}
                  disabled={isSaving}
                >
                  {Object.entries(PARAMETER_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="UOM" error={errors.uom} htmlFor="production-parameter-uom">
                <Input
                  id="production-parameter-uom"
                  value={form.uom}
                  onChange={(event) => set('uom', event.target.value)}
                  placeholder="e.g., g, mm, ml"
                  disabled={isSaving}
                />
              </Field>
            </div>
            {hasBounds(form.value_type) && (
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Min Value"
                  error={errors.min_value}
                  htmlFor="production-parameter-min"
                >
                  <Input
                    id="production-parameter-min"
                    type="number"
                    step="any"
                    value={form.min_value}
                    onChange={(event) => set('min_value', event.target.value)}
                    disabled={isSaving}
                  />
                </Field>
                <Field
                  label="Max Value"
                  error={errors.max_value}
                  htmlFor="production-parameter-max"
                >
                  <Input
                    id="production-parameter-max"
                    type="number"
                    step="any"
                    value={form.max_value}
                    onChange={(event) => set('max_value', event.target.value)}
                    disabled={isSaving}
                  />
                </Field>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="production-parameter-mandatory"
                checked={form.is_mandatory}
                onCheckedChange={(checked) => set('is_mandatory', checked === true)}
                disabled={isSaving}
              />
              <Label
                htmlFor="production-parameter-mandatory"
                className="cursor-pointer font-normal"
              >
                Mandatory — an entry cannot be saved without it
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
