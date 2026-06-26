/**
 * Block (location) property editor (Step 4).
 *
 * A right-side drawer that edits the full property set of one location, or
 * applies changes across a bulk selection. Properties are grouped into Identity,
 * Capacity, Material rules, Replenishment, and Flags; validation runs inline and
 * blocks saving while there are errors. In bulk mode only the fields the user
 * actually changes are applied, and the unique Identity fields are hidden.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  Button,
  Input,
  Label,
  NativeSelect,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  Textarea,
} from '@/shared/components/ui';

import { TagInput } from './TagInput';
import {
  HAZMAT_CLASS_SUGGESTIONS,
  MATERIAL_TYPE_SUGGESTIONS,
  draftFromLocations,
  validateLocationDraft,
} from '../services';
import type { LocationDraft, LocationDraftField } from '../services';
import type { TemperatureClass, WarehouseLocation, Zone } from '../types';

const LOCATION_TYPE_SUGGESTIONS = ['RACK', 'FLOOR', 'BIN', 'SHELF', 'BULK', 'DOCK'];

interface LocationPropertiesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: WarehouseLocation[];
  zones: Zone[];
  onSave: (draft: LocationDraft, touched: Set<LocationDraftField>) => void | Promise<void>;
}

export function LocationPropertiesPanel({
  open,
  onOpenChange,
  locations,
  zones,
  onSave,
}: LocationPropertiesPanelProps) {
  const isBulk = locations.length > 1;
  const signature = locations.map((location) => location.id).join(',');

  const [draft, setDraft] = useState<LocationDraft>(() => draftFromLocations(locations));
  const [touched, setTouched] = useState<Set<LocationDraftField>>(new Set());

  // Re-seed the form whenever the drawer opens for a different target set.
  useEffect(() => {
    if (open && locations.length) {
      setDraft(draftFromLocations(locations));
      setTouched(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, signature]);

  const errors = useMemo(() => validateLocationDraft(draft), [draft]);
  const hasErrors = Object.keys(errors).length > 0;

  function set<K extends LocationDraftField>(field: K, value: LocationDraft[K]) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setTouched((previous) => new Set(previous).add(field));
  }

  function handleSave() {
    if (hasErrors || touched.size === 0) return;
    void onSave(draft, touched);
  }

  if (!locations.length) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isBulk ? `Edit ${locations.length} locations` : `Edit ${locations[0]!.code}`}</SheetTitle>
          <SheetDescription>
            {isBulk
              ? 'Only the fields you change are applied to all selected locations.'
              : 'Set this block’s properties. Changes are saved when you click Save.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-4">
          {/* Identity */}
          <Section title="Identity">
            {!isBulk ? (
              <>
                <Field label="Code">
                  <Input value={draft.code} onChange={(event) => set('code', event.target.value)} />
                </Field>
                <Field label="Barcode">
                  <div className="flex gap-2">
                    <Input value={draft.barcode} onChange={(event) => set('barcode', event.target.value)} />
                    <Button type="button" variant="outline" onClick={() => set('barcode', draft.code)}>
                      Auto
                    </Button>
                  </div>
                </Field>
              </>
            ) : null}
            <Field label="Zone">
              <NativeSelect
                value={draft.zoneId ?? ''}
                onChange={(event) => set('zoneId', event.target.value || null)}
              >
                <option value="">No zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Type">
              <Input
                list="location-type-suggestions"
                value={draft.type}
                onChange={(event) => set('type', event.target.value)}
              />
              <datalist id="location-type-suggestions">
                {LOCATION_TYPE_SUGGESTIONS.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </Field>
          </Section>

          <Separator />

          {/* Capacity */}
          <Section title="Capacity">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Max pallets" value={draft.maxPallets} error={errors.maxPallets} onChange={(v) => set('maxPallets', v)} />
              <NumberField label="Max units" value={draft.maxUnits} error={errors.maxUnits} onChange={(v) => set('maxUnits', v)} />
              <NumberField label="Max weight (kg)" value={draft.maxWeight} error={errors.maxWeight} onChange={(v) => set('maxWeight', v)} />
              <NumberField label="Max volume (m³)" value={draft.maxVolume} error={errors.maxVolume} onChange={(v) => set('maxVolume', v)} />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <NumberField label="Length (m)" value={draft.dimLength} error={errors.dimLength} onChange={(v) => set('dimLength', v)} />
              <NumberField label="Width (m)" value={draft.dimWidth} error={errors.dimWidth} onChange={(v) => set('dimWidth', v)} />
              <NumberField label="Height (m)" value={draft.dimHeight} error={errors.dimHeight} onChange={(v) => set('dimHeight', v)} />
            </div>
          </Section>

          <Separator />

          {/* Material rules */}
          <Section title="Material rules">
            <Field label="Allowed material types" error={errors.allowedMaterialTypes}>
              <TagInput
                id="allowed-types"
                values={draft.allowedMaterialTypes}
                suggestions={MATERIAL_TYPE_SUGGESTIONS}
                onChange={(values) => set('allowedMaterialTypes', values)}
              />
            </Field>
            <Field label="Restricted material types" error={errors.restrictedMaterialTypes}>
              <TagInput
                id="restricted-types"
                values={draft.restrictedMaterialTypes}
                suggestions={MATERIAL_TYPE_SUGGESTIONS}
                onChange={(values) => set('restrictedMaterialTypes', values)}
              />
            </Field>
            <ToggleField label="Allow mixing different items" checked={draft.allowMixedItems} onChange={(v) => set('allowMixedItems', v)} />
            <ToggleField label="Single lot only" checked={draft.singleLotOnly} onChange={(v) => set('singleLotOnly', v)} />
            <ToggleField label="Hazardous materials allowed" checked={draft.hazmatAllowed} onChange={(v) => set('hazmatAllowed', v)} />
            {draft.hazmatAllowed ? (
              <Field label="Hazmat classes">
                <TagInput
                  id="hazmat-classes"
                  values={draft.hazmatClasses}
                  suggestions={HAZMAT_CLASS_SUGGESTIONS}
                  uppercase={false}
                  onChange={(values) => set('hazmatClasses', values)}
                />
              </Field>
            ) : null}
            <Field label="Temperature classification">
              <NativeSelect
                value={draft.temperatureClass ?? ''}
                onChange={(event) => set('temperatureClass', (event.target.value || null) as TemperatureClass | null)}
              >
                <option value="">None</option>
                <option value="AMBIENT">Ambient</option>
                <option value="CHILLED">Chilled</option>
                <option value="FROZEN">Frozen</option>
                <option value="CONTROLLED">Controlled</option>
              </NativeSelect>
            </Field>
          </Section>

          <Separator />

          {/* Replenishment */}
          <Section title="Replenishment">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Min stock" value={draft.minStock} error={errors.minStock} onChange={(v) => set('minStock', v)} />
              <NumberField label="Max stock" value={draft.maxStock} error={errors.maxStock} onChange={(v) => set('maxStock', v)} />
            </div>
          </Section>

          <Separator />

          {/* Flags */}
          <Section title="Flags">
            <ToggleField label="Enabled" checked={draft.enabled} onChange={(v) => set('enabled', v)} />
            <ToggleField label="Reserved" checked={draft.isReserved} onChange={(v) => set('isReserved', v)} />
            {draft.isReserved ? (
              <Field label="Reserved for (reference)">
                <Input
                  value={draft.reservationReference}
                  onChange={(event) => set('reservationReference', event.target.value)}
                />
              </Field>
            ) : null}
            <Field label="Notes">
              <Textarea value={draft.notes} rows={3} onChange={(event) => set('notes', event.target.value)} />
            </Field>
          </Section>
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={hasErrors || touched.size === 0} onClick={handleSave}>
            {isBulk ? `Apply to ${locations.length}` : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: number | null;
  error?: string;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value ?? ''}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}
