import { ArrowLeft, Pencil, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { QC_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useOnlineMonitoringSpecs,
  useResetOnlineSpec,
  useUpdateOnlineSpec,
} from '../../api/onlineMonitoring';
import type { OnlineQualitySpec, SpecValidationType } from '../../types';

const VALIDATION_TYPES: Array<{ value: SpecValidationType; label: string }> = [
  { value: 'RANGE', label: 'Range (min–max)' },
  { value: 'MIN', label: 'Minimum only' },
  { value: 'MAX', label: 'Maximum only' },
  { value: 'NONE', label: 'Record only (no limit)' },
];

/** One row per parameter — a company override (if any) hides the global default. */
function effectiveSpecs(specs: OnlineQualitySpec[] | undefined): OnlineQualitySpec[] {
  const byKey = new Map<string, OnlineQualitySpec>();
  for (const s of specs ?? []) {
    const existing = byKey.get(s.parameter_key);
    if (!existing || s.scope === 'COMPANY') byKey.set(s.parameter_key, s);
  }
  return [...byKey.values()].sort((a, b) => a.sequence - b.sequence);
}

function limitText(spec: OnlineQualitySpec): string {
  const lo = spec.min_value != null ? Number(spec.min_value) : null;
  const hi = spec.max_value != null ? Number(spec.max_value) : null;
  if (spec.validation_type === 'NONE') return spec.specification_text || '—';
  if (spec.validation_type === 'MIN') return lo != null ? `≥ ${lo}` : '—';
  if (spec.validation_type === 'MAX') return hi != null ? `≤ ${hi}` : '—';
  if (lo != null && hi != null) return `${lo} – ${hi}`;
  return spec.specification_text || '—';
}

export default function SpecMasterPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canEdit = hasAnyPermission([QC_PERMISSIONS.ONLINE_MONITORING.APPROVE]);

  const { data: specs, isLoading } = useOnlineMonitoringSpecs();
  const rows = useMemo(() => effectiveSpecs(specs), [specs]);

  const update = useUpdateOnlineSpec();
  const reset = useResetOnlineSpec();

  const [editing, setEditing] = useState<OnlineQualitySpec | null>(null);
  const [form, setForm] = useState({
    min_value: '',
    max_value: '',
    validation_type: 'RANGE' as SpecValidationType,
    specification_text: '',
    unit: '',
  });

  const openEditor = (spec: OnlineQualitySpec) => {
    setForm({
      min_value: spec.min_value != null ? String(Number(spec.min_value)) : '',
      max_value: spec.max_value != null ? String(Number(spec.max_value)) : '',
      validation_type: spec.validation_type,
      specification_text: spec.specification_text ?? '',
      unit: spec.unit ?? '',
    });
    setEditing(spec);
  };

  const save = () => {
    if (!editing) return;
    const needsMin = form.validation_type === 'RANGE' || form.validation_type === 'MIN';
    const needsMax = form.validation_type === 'RANGE' || form.validation_type === 'MAX';
    const min = form.min_value.trim();
    const max = form.max_value.trim();
    if (needsMin && needsMax && min !== '' && max !== '' && Number(min) > Number(max)) {
      toast.error('Min value cannot exceed max value.');
      return;
    }
    update.mutate(
      {
        specId: editing.id,
        payload: {
          validation_type: form.validation_type,
          min_value: needsMin && min !== '' ? min : null,
          max_value: needsMax && max !== '' ? max : null,
          specification_text: form.specification_text,
          unit: form.unit,
        },
      },
      {
        onSuccess: () => {
          toast.success('Specification updated');
          setEditing(null);
        },
        onError: (e) => toast.error(getErrorMessage(e, 'Could not update specification')),
      },
    );
  };

  const doReset = (spec: OnlineQualitySpec) => {
    if (!window.confirm(`Reset “${spec.parameter_name}” to the default specification?`)) return;
    reset.mutate(spec.id, {
      onSuccess: () => toast.success('Reset to default'),
      onError: (e) => toast.error(getErrorMessage(e, 'Could not reset')),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => navigate('/qc/online-monitoring')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Water Quality Specifications</h2>
          <p className="text-sm text-muted-foreground">
            Acceptance limits used to flag online-monitoring readings.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Parameter</th>
                <th className="px-4 py-2.5 font-medium">Specification</th>
                <th className="px-4 py-2.5 font-medium">Unit</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                {canEdit && <th className="px-4 py-2.5 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((spec) => (
                <tr key={spec.parameter_key} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{spec.parameter_name}</td>
                  <td className="px-4 py-2.5 tabular-nums">{limitText(spec)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{spec.unit || '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{spec.validation_type}</td>
                  <td className="px-4 py-2.5">
                    {spec.scope === 'COMPANY' ? (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        Custom
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        Default
                      </Badge>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => openEditor(spec)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        {spec.scope === 'COMPANY' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => doReset(spec)}
                            disabled={reset.isPending}
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-6 text-center text-muted-foreground">
                    No specifications configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.parameter_name} specification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Validation type</Label>
              <NativeSelect
                value={form.validation_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, validation_type: e.target.value as SpecValidationType }))
                }
              >
                {VALIDATION_TYPES.map((t) => (
                  <SelectOption key={t.value} value={t.value}>
                    {t.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            {(form.validation_type === 'RANGE' || form.validation_type === 'MIN') && (
              <div>
                <Label>Minimum value</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.min_value}
                  onChange={(e) => setForm((f) => ({ ...f, min_value: e.target.value }))}
                />
              </div>
            )}
            {(form.validation_type === 'RANGE' || form.validation_type === 'MAX') && (
              <div>
                <Label>Maximum value</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.max_value}
                  onChange={(e) => setForm((f) => ({ ...f, max_value: e.target.value }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. ppm"
                />
              </div>
              <div>
                <Label>Display text</Label>
                <Input
                  value={form.specification_text}
                  onChange={(e) => setForm((f) => ({ ...f, specification_text: e.target.value }))}
                  placeholder="e.g. < 1 NTU"
                />
              </div>
            </div>
            {editing?.scope === 'GLOBAL' && (
              <p className="text-xs text-muted-foreground">
                Editing a default creates a company-specific override. The default stays available
                to reset back to.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={update.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
