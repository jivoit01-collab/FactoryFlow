import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import { useCreateTreeMeter, useUpdateTreeMeter } from '../../api';
import type { SupplySource, TreeMeter, TreeMeterPayload } from '../../types';
import { SUPPLY_SOURCE_LABELS, SUPPLY_SOURCE_LIST } from '../../types';
import { indentedName, parentCandidates, todayISO, trimFactor } from './electricityFormat';

export interface MeterFormTarget {
  /** The meter being edited; null to add one. */
  meter: TreeMeter | null;
  /** On add: the meter the new one is a sub-meter of. */
  parentId?: number | null;
}

interface MeterFormDialogProps {
  target: MeterFormTarget | null;
  meters: TreeMeter[];
  onClose: () => void;
  /** Called with a meter just added, so the page can ask who pays for it. */
  onCreated?: (meter: TreeMeter) => void;
}

const EMPTY = {
  name: '',
  meter_number: '',
  location: '',
  multiplying_factor: '',
  supply_source: 'GRID' as SupplySource,
  // Placement, on add only.
  kind: 'SUB' as 'MAIN' | 'SUB' | 'REGISTER',
  parent: '',
  register_of: '',
  effective_from: todayISO(),
  is_active: true,
};

/**
 * A meter's hardware facts, and — when it is new — where it goes in the tree.
 * Who pays for it is a setup version (MeterSetupDialog), which needs its own
 * right; placing a meter under its parent does not.
 */
export function MeterFormDialog({ target, meters, onClose, onCreated }: MeterFormDialogProps) {
  const open = target != null;
  const editing = target?.meter ?? null;
  const [form, setForm] = useState(EMPTY);
  const createMeter = useCreateTreeMeter();
  const updateMeter = useUpdateTreeMeter();

  // Each opening starts from the meter being edited, or from a blank form
  // under the parent it was opened from — reset while rendering, not in an
  // effect, so the previous meter's values never flash up.
  const [formFor, setFormFor] = useState<MeterFormTarget | null>(null);
  if (target !== formFor) {
    setFormFor(target);
    if (target?.meter) {
      const meter = target.meter;
      setForm({
        ...EMPTY,
        name: meter.name,
        meter_number: meter.meter_number,
        location: meter.location,
        multiplying_factor: trimFactor(meter.multiplying_factor),
        supply_source: (meter.supply_source || 'GRID') as SupplySource,
        is_active: meter.is_active,
      });
    } else if (target) {
      setForm({
        ...EMPTY,
        effective_from: todayISO(),
        kind: target.parentId != null ? 'SUB' : 'MAIN',
        parent: target.parentId != null ? String(target.parentId) : '',
      });
    }
  }

  const parents = useMemo(() => parentCandidates(meters), [meters]);
  const principals = useMemo(
    () => meters.filter((m) => m.register_of == null && m.id !== editing?.id),
    [meters, editing],
  );
  const isMain = editing ? editing.is_main : form.kind === 'MAIN';
  const saving = createMeter.isPending || updateMeter.isPending;

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Give the meter a name');
      return;
    }
    const base: TreeMeterPayload = {
      name: form.name.trim(),
      meter_number: form.meter_number,
      location: form.location,
      multiplying_factor: form.multiplying_factor === '' ? undefined : form.multiplying_factor,
      supply_source: isMain ? form.supply_source : '',
    };
    try {
      if (editing) {
        await updateMeter.mutateAsync({
          meterId: editing.id,
          payload: { ...base, is_active: form.is_active },
        });
        toast.success('Meter updated');
        onClose();
        return;
      }
      if (form.kind === 'SUB' && !form.parent) {
        toast.error('Pick the meter this one is a sub-meter of');
        return;
      }
      if (form.kind === 'REGISTER' && !form.register_of) {
        toast.error('Pick the meter this is a second register of');
        return;
      }
      const payload: TreeMeterPayload =
        form.kind === 'REGISTER'
          ? { ...base, register_of: Number(form.register_of) }
          : {
              ...base,
              placement: {
                effective_from: form.effective_from,
                parent: form.kind === 'SUB' ? Number(form.parent) : null,
              },
            };
      const created = await createMeter.mutateAsync(payload);
      toast.success(`${created.name} added`);
      onClose();
      if (form.kind !== 'REGISTER') onCreated?.(created);
    } catch {
      // The API client has already said why.
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add a meter'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <Label htmlFor="meter-name">Name</Label>
            <Input
              id="meter-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="meter-number">Meter no.</Label>
              <Input
                id="meter-number"
                value={form.meter_number}
                onChange={(e) => setForm((f) => ({ ...f, meter_number: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="meter-location">Location</Label>
              <Input
                id="meter-location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="meter-mf">MF</Label>
              <Input
                id="meter-mf"
                inputMode="decimal"
                placeholder="1"
                title="Grid multiplying factor: the day's dial difference is multiplied by it"
                value={form.multiplying_factor}
                onChange={(e) => setForm((f) => ({ ...f, multiplying_factor: e.target.value }))}
              />
            </div>
          </div>

          {!editing && (
            <fieldset className="space-y-3 rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">Where it goes</legend>
              <NativeSelect
                aria-label="Kind of meter"
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as typeof f.kind }))}
              >
                <SelectOption value="SUB">A sub-meter of another meter</SelectOption>
                <SelectOption value="MAIN">A main meter — a supply comes in on it</SelectOption>
                <SelectOption value="REGISTER">A second register of a meter (KVAH on the KWH meter)</SelectOption>
              </NativeSelect>
              {form.kind === 'SUB' && (
                <div>
                  <Label htmlFor="meter-parent">Sub-meter of</Label>
                  <NativeSelect
                    id="meter-parent"
                    value={form.parent}
                    onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
                  >
                    <SelectOption value="">Pick a meter</SelectOption>
                    {parents.map((candidate) => (
                      <SelectOption key={candidate.id} value={String(candidate.id)}>
                        {indentedName(candidate)}
                      </SelectOption>
                    ))}
                  </NativeSelect>
                </div>
              )}
              {form.kind === 'REGISTER' && (
                <div>
                  <Label htmlFor="meter-register-of">Second register of</Label>
                  <NativeSelect
                    id="meter-register-of"
                    value={form.register_of}
                    onChange={(e) => setForm((f) => ({ ...f, register_of: e.target.value }))}
                  >
                    <SelectOption value="">Pick a meter</SelectOption>
                    {principals.map((candidate) => (
                      <SelectOption key={candidate.id} value={String(candidate.id)}>
                        {candidate.name}
                      </SelectOption>
                    ))}
                  </NativeSelect>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Read every day and shown beside that meter, never counted — it measures the same electricity a second way.
                  </p>
                </div>
              )}
              {form.kind !== 'REGISTER' && (
                <div>
                  <Label htmlFor="meter-from">In the register from</Label>
                  <Input
                    id="meter-from"
                    type="date"
                    value={form.effective_from}
                    onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Readings can be entered from this day on. Set an earlier date to enter older readings.
                  </p>
                </div>
              )}
            </fieldset>
          )}

          {isMain && (
            <div>
              <Label htmlFor="meter-supply">Supply it measures</Label>
              <NativeSelect
                id="meter-supply"
                value={form.supply_source}
                onChange={(e) => setForm((f) => ({ ...f, supply_source: e.target.value as SupplySource }))}
              >
                {SUPPLY_SOURCE_LIST.map((source) => (
                  <SelectOption key={source} value={source}>
                    {SUPPLY_SOURCE_LABELS[source]}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
          )}

          {editing && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
              />
              Active — an inactive meter is hidden from the pickers
            </label>
          )}

          <p className="text-xs text-muted-foreground">
            ₹/unit comes from the{' '}
            <Link to="/admin/cost-master" className="underline">
              Cost Master
            </Link>
            . Moving a meter to another parent, or deciding who pays for it, is done from "Who pays" on the meter tree.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {editing ? 'Save' : 'Add meter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
