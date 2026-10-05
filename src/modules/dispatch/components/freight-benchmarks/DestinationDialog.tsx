/**
 * Add or edit one destination and its benchmark per slab.
 *
 * Every slab is a box; an empty box is no rate. Saving sends the whole list, so
 * clearing a box removes that slab's rate. Two filled boxes whose bands overlap
 * are refused here and again by the server, which has the last word: a vehicle
 * has to fall in exactly one slab for "its benchmark" to mean anything.
 */
import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
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

import {
  useDeleteFreightDestination,
  useSaveFreightDestination,
} from '../../api/freightBenchmark.api';
import type {
  FreightDestination,
  FreightRateBasis,
  FreightSlab,
} from '../../types/freightBenchmark.types';
import { slabBandHint, slabsOverlap } from './freightBenchmark';

type Field = 'state' | 'name' | 'pin_code' | 'distance_km' | 'rates';

interface RateDraft {
  amount: string;
  basis: FreightRateBasis;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-rose-600">{message}</p> : null;
}

export function DestinationDialog({
  open,
  onOpenChange,
  destination,
  slabs,
  states,
  stateSlabs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` adds a new one. */
  destination: FreightDestination | null;
  slabs: FreightSlab[];
  /** The states already listed, offered as suggestions. */
  states: string[];
  /** Per state, the slabs its destinations carry rates on. */
  stateSlabs: Record<string, number[]>;
}) {
  const save = useSaveFreightDestination();
  const remove = useDeleteFreightDestination();

  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [name, setName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [distance, setDistance] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [rates, setRates] = useState<Record<number, RateDraft>>({});
  const [showAll, setShowAll] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState('');

  // Reset on the way in, during render, so the fields never flash the last one.
  const [wasOpen, setWasOpen] = useState(open);
  const [wasFor, setWasFor] = useState(destination?.id ?? null);
  if (open !== wasOpen || (open && (destination?.id ?? null) !== wasFor)) {
    setWasOpen(open);
    setWasFor(destination?.id ?? null);
    if (open) {
      setState(destination?.state ?? '');
      setDistrict(destination?.district ?? '');
      setName(destination?.name ?? '');
      setPinCode(destination?.pin_code ?? '');
      setDistance(destination?.distance_km != null ? String(destination.distance_km) : '');
      setRemarks(destination?.remarks ?? '');
      setIsActive(destination?.is_active ?? true);
      setRates(
        Object.fromEntries(
          (destination?.rates ?? []).map((r) => [
            r.slab,
            { amount: String(r.amount), basis: r.basis },
          ]),
        ),
      );
      setShowAll(false);
      setErrors({});
      setServerError('');
    }
  }

  // The active slabs, plus any inactive one this destination still has a rate
  // on — so an old rate can be seen and cleared rather than silently kept.
  const rows = useMemo(
    () => slabs.filter((s) => s.is_active || destination?.rates.some((r) => r.slab === s.id)),
    [slabs, destination],
  );

  // Punjab is quoted in tonnes and Delhi NCR in kg bands, so a destination is
  // first shown the slabs its state uses — plus any it already has a rate on or
  // has just been given one. A state nobody has rated yet shows every slab.
  const suggested = useMemo(() => {
    const ids = new Set(stateSlabs[state.trim().toUpperCase()] ?? []);
    for (const [id, draft] of Object.entries(rates)) {
      if (draft.amount.trim()) ids.add(Number(id));
    }
    return ids;
  }, [stateSlabs, state, rates]);
  const narrowed = !showAll && suggested.size > 0;
  const shown = narrowed ? rows.filter((s) => suggested.has(s.id)) : rows;
  const hidden = rows.length - shown.length;

  function setRate(slabId: number, patch: Partial<RateDraft>) {
    setRates((current) => ({
      ...current,
      [slabId]: { ...(current[slabId] ?? { amount: '', basis: 'PER_TRIP' }), ...patch },
    }));
    setErrors({});
  }

  function check(): Partial<Record<Field, string>> {
    const problems: Partial<Record<Field, string>> = {};
    if (!state.trim()) problems.state = 'Which state, or DELHI NCR.';
    if (!name.trim()) problems.name = 'Name the place.';
    if (pinCode.trim() && !/^\d{6}$/.test(pinCode.trim())) {
      problems.pin_code = 'A PIN code is six digits.';
    }
    if (distance.trim() && !(Number(distance) >= 0 && Number.isInteger(Number(distance)))) {
      problems.distance_km = 'Whole kilometres.';
    }
    const filled = rows.filter((s) => rates[s.id]?.amount.trim());
    const bad = filled.find((s) => !(Number(rates[s.id].amount) > 0));
    if (bad) {
      problems.rates = `${bad.label}: a benchmark is an amount above zero.`;
    } else {
      for (const a of filled) {
        const b = filled.find((other) => other.id !== a.id && slabsOverlap(a, other));
        if (b) {
          problems.rates = `${a.label} and ${b.label} overlap, so a vehicle could fall into both. Keep a rate on one of them.`;
          break;
        }
      }
    }
    return problems;
  }

  async function onSave() {
    const problems = check();
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      return;
    }
    setErrors({});
    setServerError('');
    try {
      const saved = await save.mutateAsync({
        id: destination?.id ?? null,
        data: {
          state: state.trim(),
          district: district.trim(),
          name: name.trim(),
          pin_code: pinCode.trim(),
          distance_km: distance.trim() ? Number(distance) : null,
          remarks: remarks.trim(),
          is_active: isActive,
          rates: rows
            .filter((s) => rates[s.id]?.amount.trim())
            .map((s) => ({
              slab: s.id,
              basis: rates[s.id].basis,
              amount: rates[s.id].amount.trim(),
            })),
        },
      });
      toast.success(destination ? `${saved.name} saved` : `${saved.name} added`);
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not save the destination.'));
    }
  }

  async function onDelete() {
    if (!destination) return;
    const confirmed = await confirmDialog({
      title: `Delete ${destination.name}?`,
      description:
        'It comes off the table with every benchmark on it. To stop using it but keep its rates, mark it out of use instead.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(destination.id);
      toast.success(`${destination.name} deleted`);
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not delete the destination.'));
    }
  }

  const busy = save.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{destination ? destination.name : 'Add a destination'}</DialogTitle>
          <DialogDescription>
            {destination?.updated_by_name
              ? `Last changed ${formatDateTimeShort(destination.updated_at)} by ${destination.updated_by_name}.`
              : 'The benchmark freight for each vehicle size. Leave a slab empty if there is no benchmark for it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fb-state">State</Label>
            <Input
              id="fb-state"
              list="fb-states"
              value={state}
              onChange={(event) => {
                setState(event.target.value);
                setErrors({});
              }}
              placeholder="e.g. PUNJAB, or DELHI NCR"
              autoFocus={!destination}
            />
            <datalist id="fb-states">
              {states.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <FieldError message={errors.state} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-district">District (optional)</Label>
            <Input
              id="fb-district"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fb-name">Destination</Label>
            <Input
              id="fb-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setErrors({});
              }}
              placeholder="Town or area"
            />
            <FieldError message={errors.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-pin">PIN code (optional)</Label>
            <Input
              id="fb-pin"
              inputMode="numeric"
              maxLength={6}
              value={pinCode}
              onChange={(event) => {
                setPinCode(event.target.value);
                setErrors({});
              }}
              placeholder="Six digits"
            />
            <FieldError message={errors.pin_code} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-km">Distance from the plant, km (optional)</Label>
            <Input
              id="fb-km"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={distance}
              onChange={(event) => {
                setDistance(event.target.value);
                setErrors({});
              }}
            />
            <FieldError message={errors.distance_km} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Benchmark freight</Label>
          <div className="overflow-hidden rounded-lg border">
            {rows.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                There are no slabs yet. Add them under Slabs first.
              </p>
            ) : (
              shown.map((slab) => {
                const draft = rates[slab.id];
                return (
                  <div
                    key={slab.id}
                    className="grid grid-cols-[minmax(0,1fr)_8.5rem_7.5rem] items-center gap-2 border-b px-3 py-2 last:border-0"
                  >
                    <label htmlFor={`fb-rate-${slab.id}`} className="min-w-0 text-sm">
                      <span className="font-medium">{slab.label}</span>
                      {(slabBandHint(slab) || !slab.is_active) && (
                        <span className="block text-xs text-muted-foreground">
                          {[slabBandHint(slab), !slab.is_active && 'slab out of use']
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </label>
                    <Input
                      id={`fb-rate-${slab.id}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={draft?.amount ?? ''}
                      onChange={(event) => setRate(slab.id, { amount: event.target.value })}
                      placeholder="—"
                      className="h-9 text-right"
                    />
                    <NativeSelect
                      value={draft?.basis ?? 'PER_TRIP'}
                      onChange={(event) =>
                        setRate(slab.id, { basis: event.target.value as FreightRateBasis })
                      }
                      aria-label={`${slab.label}: flat or per kg`}
                      className="h-9"
                    >
                      <SelectOption value="PER_TRIP">₹ per trip</SelectOption>
                      <SelectOption value="PER_KG">₹ per kg</SelectOption>
                    </NativeSelect>
                  </div>
                );
              })
            )}
          </div>
          {(hidden > 0 || showAll) && suggested.size > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll
                ? `Show only the slabs ${state.trim().toUpperCase() || 'this state'} uses`
                : `Show every slab (${hidden} more)`}
            </button>
          )}
          <FieldError message={errors.rates} />
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="fb-remarks">Remarks (optional)</Label>
            <Input
              id="fb-remarks"
              value={remarks}
              maxLength={255}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Switch id="fb-active" checked={isActive} onChange={setIsActive} />
            In use
          </label>
        </div>

        {serverError && <p className="text-sm text-rose-600">{serverError}</p>}

        <DialogFooter className="gap-2 sm:justify-between">
          {destination ? (
            <Button
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10"
              onClick={onDelete}
              disabled={busy}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={busy}>
              {save.isPending ? 'Saving…' : destination ? 'Save' : 'Add destination'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
