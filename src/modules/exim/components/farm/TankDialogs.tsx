/**
 * Put a tank or tote in the farm, and record a dip.
 *
 * A level is entered, never worked out: the store dips the tank and types what
 * it read, as it did in EXIM. The rules only keep a level honest — never more
 * than the tank holds, an oil only with a level, a level only with an oil —
 * and are checked here and again by the server, which has the last word.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Switch,
} from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useCreateTank, useOils, useUpdateTank } from '../../api';
import type { Oil, Tank, TankKind } from '../../types';
import { fmtLitres } from '../../utils';
import { checkLevel } from './farm';
import { OilDot } from './FarmBits';

type Field = 'capacity' | 'level' | 'oil';

/** The oils a tank may be given: the active ones, and whatever it holds now. */
function OilSelect({
  id,
  value,
  onChange,
  oils,
  current,
  loading,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  oils: Oil[];
  current?: { id: number; code: string | null; name: string | null } | null;
  loading: boolean;
}) {
  const listed = current && !oils.some((o) => o.id === current.id);
  const picked = oils.find((o) => String(o.id) === value);
  return (
    <div className="flex items-center gap-2">
      {picked && <OilDot color={picked.color} />}
      <NativeSelect id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <SelectOption value="">{loading ? 'Loading the oils…' : 'No oil — empty'}</SelectOption>
        {listed && current && (
          <SelectOption value={String(current.id)}>
            {current.code} · {current.name} (inactive)
          </SelectOption>
        )}
        {oils.map((oil) => (
          <SelectOption key={oil.id} value={String(oil.id)}>
            {oil.code} · {oil.name}
          </SelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-rose-600">{message}</p> : null;
}

// --- add -------------------------------------------------------------------------

export function TankCreateDialog({
  open,
  onOpenChange,
  kind: initialKind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: TankKind;
}) {
  const create = useCreateTank();
  const { data: oils = [], isLoading: oilsLoading } = useOils(true, open);

  const [kind, setKind] = useState<TankKind>(initialKind);
  const [capacity, setCapacity] = useState('');
  const [oil, setOil] = useState('');
  const [level, setLevel] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState('');

  // Reset on the way in, during render, so the fields never flash the last one.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setKind(initialKind);
      setCapacity('');
      setOil('');
      setLevel('');
      setErrors({});
      setServerError('');
    }
  }

  const noun = kind === 'TOTES' ? 'tote' : 'tank';

  async function save() {
    const problem = checkLevel(capacity, level, !!oil);
    if (problem) {
      setErrors({ [problem.field]: problem.message });
      return;
    }
    setErrors({});
    setServerError('');
    try {
      const created = await create.mutateAsync({
        kind,
        capacity_l: capacity,
        item: oil ? Number(oil) : null,
        level_l: level || '0',
      });
      toast.success(`${created.code} is in the farm`);
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, `Could not add the ${noun}.`));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a {noun}</DialogTitle>
          <DialogDescription>
            Its number is given when it is saved: TNK0001 for a tank, TOT001 for a tote.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tank-kind">Kind</Label>
            <NativeSelect
              id="tank-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as TankKind)}
            >
              <SelectOption value="TANK">Tank — part of the farm</SelectOption>
              <SelectOption value="TOTES">Tote — an IBC container</SelectOption>
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tank-capacity">Capacity (litres)</Label>
            <Input
              id="tank-capacity"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={capacity}
              onChange={(event) => {
                setCapacity(event.target.value);
                setErrors({});
              }}
              placeholder={kind === 'TOTES' ? '1000' : '100000'}
              autoFocus
            />
            <FieldError message={errors.capacity} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tank-oil">Oil in it (optional)</Label>
            <OilSelect
              id="tank-oil"
              value={oil}
              onChange={(value) => {
                setOil(value);
                setErrors({});
              }}
              oils={oils}
              loading={oilsLoading}
            />
            <FieldError message={errors.oil} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tank-level">Level (litres)</Label>
            <Input
              id="tank-level"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={level}
              onChange={(event) => {
                setLevel(event.target.value);
                setErrors({});
              }}
              placeholder="0"
            />
            {errors.level ? (
              <FieldError message={errors.level} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Leave empty for an empty {noun}; a level needs an oil.
              </p>
            )}
          </div>
        </div>

        {serverError && <p className="text-sm text-rose-600">{serverError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={create.isPending}>
            {create.isPending ? 'Adding…' : `Add ${noun}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- dip --------------------------------------------------------------------------

export function TankDipDialog({
  tank,
  onOpenChange,
}: {
  /** The tank to dip. Null keeps the dialog shut. */
  tank: Tank | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!tank;
  const update = useUpdateTank();
  const { data: oils = [], isLoading: oilsLoading } = useOils(true, open);

  const [oil, setOil] = useState('');
  const [level, setLevel] = useState('');
  const [capacity, setCapacity] = useState('');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState('');

  const [shownFor, setShownFor] = useState<number | null>(null);
  const tankId = tank?.id ?? null;
  if (tankId !== shownFor) {
    setShownFor(tankId);
    if (tank) {
      setOil(tank.item ? String(tank.item) : '');
      setLevel(Number(tank.level_l) > 0 ? String(Number(tank.level_l)) : '');
      setCapacity(String(Number(tank.capacity_l)));
      setActive(tank.is_active);
      setErrors({});
      setServerError('');
    }
  }

  if (!tank) return null;
  const noun = tank.kind === 'TOTES' ? 'tote' : 'tank';

  async function save() {
    if (!tank) return;
    const problem = checkLevel(capacity, level, !!oil);
    if (problem) {
      setErrors({ [problem.field]: problem.message });
      return;
    }
    setErrors({});
    setServerError('');
    try {
      await update.mutateAsync({
        id: tank.id,
        payload: {
          item: oil ? Number(oil) : null,
          level_l: level || '0',
          capacity_l: capacity,
          is_active: active,
        },
      });
      toast.success(`${tank.code}: dip recorded`);
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, `Could not save the dip for ${tank.code}.`));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a dip on {tank.code}</DialogTitle>
          <DialogDescription>
            Holds {fmtLitres(tank.capacity_l)} L. Last dipped {formatDateTimeShort(tank.updated_at)}
            {tank.updated_by_name ? ` by ${tank.updated_by_name}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dip-oil">Oil in it</Label>
            <OilSelect
              id="dip-oil"
              value={oil}
              onChange={(value) => {
                setOil(value);
                setErrors({});
              }}
              oils={oils}
              current={
                tank.item ? { id: tank.item, code: tank.item_code, name: tank.item_name } : null
              }
              loading={oilsLoading}
            />
            <FieldError message={errors.oil} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dip-level">Level (litres)</Label>
            <Input
              id="dip-level"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={level}
              onChange={(event) => {
                setLevel(event.target.value);
                setErrors({});
              }}
              placeholder="0"
              autoFocus
            />
            {errors.level ? (
              <FieldError message={errors.level} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Up to {fmtLitres(capacity)} L. To empty the {noun}, clear the oil and the level.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              The {noun} itself
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="dip-capacity">Capacity (litres)</Label>
              <Input
                id="dip-capacity"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={capacity}
                onChange={(event) => {
                  setCapacity(event.target.value);
                  setErrors({});
                }}
              />
              <FieldError message={errors.capacity} />
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                In use
                <span className="block text-xs text-muted-foreground">
                  A {noun} out of use is left out of the farm's totals.
                </span>
              </span>
              <Switch id="dip-active" checked={active} onChange={setActive} />
            </label>
          </div>
        </div>

        {serverError && <p className="text-sm text-rose-600">{serverError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save dip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
