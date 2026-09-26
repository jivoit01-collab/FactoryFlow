import { History, Loader2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { COMPANY_CODE_LIST, COMPANY_LABELS } from '@/config/constants';
import { confirmDialog } from '@/shared/components';
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
  Textarea,
} from '@/shared/components/ui';

import {
  useCreateMeterSetup,
  useDeleteMeterSetup,
  useElectricityConsumers,
  useElectricityRunSources,
  useMeterSetups,
  useUpdateMeterSetup,
} from '../../api';
import type { AllocationBasis, MeterSetup, MeterSetupPayload, TreeMeter } from '../../types';
import { ALLOCATION_BASIS_LABELS } from '../../types';
import { fmtDate, indentedName, parentCandidates, todayISO, toNumber } from './electricityFormat';

interface ShareRow {
  party: string; // "company:JIVO_OIL" / "consumer:SIDLE"
  percent: string;
}

interface DriverRow {
  /** "LINE:8" / "BLOWING_MACHINE:2" for run hours; a meter id for a meter ratio. */
  source: string;
  company: string; // only a followed meter needs one
  weight: string;
}

interface SetupForm {
  effective_from: string;
  in_service: boolean;
  parent: string; // '' = a main meter
  basis: AllocationBasis;
  shares: ShareRow[];
  drivers: DriverRow[];
  note: string;
}

const BASIS_HELP: Record<AllocationBasis, string> = {
  UNASSIGNED: 'Its own units show as unassigned on the split until somebody decides.',
  FIXED: 'The same percentages every day.',
  RUN_HOURS:
    'Split each day by how long the chosen lines and machines ran. Oil 24 h and Beverages 12 h means two thirds to Oil.',
  METER_RATIO:
    'Split each day in the ratio of what other meters read — a chiller that follows the machines it cools.',
};

function formFromSetup(setup: MeterSetup | null): SetupForm {
  if (!setup) {
    return {
      effective_from: todayISO(),
      in_service: true,
      parent: '',
      basis: 'UNASSIGNED',
      shares: [],
      drivers: [],
      note: '',
    };
  }
  return {
    effective_from: setup.effective_from,
    in_service: setup.in_service,
    parent: setup.parent != null ? String(setup.parent) : '',
    basis: setup.basis,
    shares: setup.shares.map((share) => ({ party: share.party, percent: share.percent })),
    drivers: setup.drivers.map((driver) => ({
      source: driver.kind === 'METER' ? String(driver.id) : `${driver.kind}:${driver.id}`,
      company: driver.kind === 'METER' ? (driver.company ?? '') : '',
      weight: driver.weight,
    })),
    note: setup.note,
  };
}

function toPayload(form: SetupForm): MeterSetupPayload {
  const shares = form.shares
    .filter((row) => row.party && row.percent !== '')
    .map((row) => {
      const [kind, code] = row.party.split(':');
      return kind === 'company'
        ? { company: code, percent: row.percent }
        : { consumer: code, percent: row.percent };
    });
  let drivers: MeterSetupPayload['drivers'] = [];
  if (form.basis === 'RUN_HOURS') {
    drivers = form.drivers
      .filter((row) => row.source)
      .map((row) => {
        const [kind, id] = row.source.split(':');
        return kind === 'LINE'
          ? { production_line: Number(id), weight: row.weight || '1' }
          : { blowing_machine: Number(id), weight: row.weight || '1' };
      });
  } else if (form.basis === 'METER_RATIO') {
    drivers = form.drivers
      .filter((row) => row.source)
      .map((row) => ({ meter: Number(row.source), company: row.company || null, weight: row.weight || '1' }));
  }
  return {
    effective_from: form.effective_from,
    in_service: form.in_service,
    parent: form.in_service && form.parent ? Number(form.parent) : null,
    basis: form.in_service ? form.basis : 'UNASSIGNED',
    shares: form.in_service && form.basis !== 'UNASSIGNED' ? shares : [],
    drivers: form.in_service ? drivers : [],
    note: form.note,
  };
}

/** Why the form cannot be saved yet, or null. The server checks all of it again. */
function problem(form: SetupForm): string | null {
  if (!form.effective_from) return 'Say from which day this applies.';
  if (!form.in_service) return null;
  const shares = form.shares.filter((row) => row.party && row.percent !== '');
  const total = shares.reduce((sum, row) => sum + toNumber(row.percent), 0);
  if (form.basis === 'FIXED' && shares.length === 0) return 'Add at least one share.';
  if (shares.length > 0 && Math.abs(total - 100) > 0.01) {
    return `Shares must add up to 100% — these add up to ${total}%.`;
  }
  const parties = shares.map((row) => row.party);
  if (new Set(parties).size !== parties.length) return 'Each company can appear only once.';
  if (form.basis === 'RUN_HOURS' && !form.drivers.some((row) => row.source)) {
    return 'Pick the lines or machines whose run hours this meter follows.';
  }
  if (form.basis === 'METER_RATIO') {
    const rows = form.drivers.filter((row) => row.source);
    if (rows.length === 0) return 'Pick the meters this meter follows.';
    if (rows.some((row) => !row.company)) return 'Say which company each followed meter stands for.';
  }
  return null;
}

interface MeterSetupDialogProps {
  meter: TreeMeter | null;
  meters: TreeMeter[];
  canEdit: boolean;
  onClose: () => void;
}

/**
 * Where a meter sits and who pays for its own units — every dated version of
 * it, and the form to correct one or add the next.
 */
export function MeterSetupDialog({ meter, meters, canEdit, onClose }: MeterSetupDialogProps) {
  const open = meter != null;
  const { data: versions = [], isLoading } = useMeterSetups(meter?.id ?? null);
  const { data: consumers = [] } = useElectricityConsumers(open);
  const { data: runSources = [] } = useElectricityRunSources(open);
  const createSetup = useCreateMeterSetup();
  const updateSetup = useUpdateMeterSetup();
  const deleteSetup = useDeleteMeterSetup();

  // 'new' = a change from a date; a version id = correcting that version.
  const [target, setTarget] = useState<'new' | number>('new');
  const [form, setForm] = useState<SetupForm>(formFromSetup(null));

  const current = useMemo(() => {
    const inForce = meter?.tree?.setup?.id;
    return versions.find((version) => version.id === inForce) ?? versions[0] ?? null;
  }, [versions, meter]);

  // Opening a meter starts from what is in force, as a change from today: the
  // safe default. Correcting a version is one click away. Reset while
  // rendering whenever the dialog opens on a meter or its versions arrive —
  // keyed on ids, so a background refetch of the same versions keeps the form.
  const resetKey = open ? `${meter?.id}:${current?.id ?? ''}` : '';
  const [formKey, setFormKey] = useState('');
  if (resetKey !== formKey) {
    setFormKey(resetKey);
    if (open) {
      setTarget('new');
      setForm({ ...formFromSetup(current), effective_from: todayISO(), note: '' });
    }
  }

  const selectVersion = (version: MeterSetup) => {
    setTarget(version.id);
    setForm(formFromSetup(version));
  };
  const startChange = () => {
    setTarget('new');
    setForm({ ...formFromSetup(current), effective_from: todayISO(), note: '' });
  };

  const partyOptions = useMemo(
    () => [
      ...COMPANY_CODE_LIST.map((code) => ({ value: `company:${code}`, label: COMPANY_LABELS[code] })),
      ...consumers.map((consumer) => ({ value: `consumer:${consumer.code}`, label: consumer.name })),
    ],
    [consumers],
  );
  const parents = useMemo(() => (meter ? parentCandidates(meters, meter.id) : []), [meters, meter]);
  const followable = useMemo(
    () => meters.filter((m) => m.id !== meter?.id && m.register_of == null),
    [meters, meter],
  );

  const shareTotal = form.shares.reduce((sum, row) => sum + toNumber(row.percent), 0);
  const blocker = problem(form);
  const saving = createSetup.isPending || updateSetup.isPending;
  const readOnly = !canEdit;

  const setShares = (shares: ShareRow[]) => setForm((f) => ({ ...f, shares }));
  const preset = (pairs: [string, number][]) =>
    setShares(pairs.map(([party, percent]) => ({ party, percent: String(percent) })));

  const save = async () => {
    if (!meter || blocker) {
      if (blocker) toast.error(blocker);
      return;
    }
    const payload = toPayload(form);
    try {
      if (target === 'new') {
        await createSetup.mutateAsync({ ...payload, meter: meter.id });
        toast.success(`${meter.name}: change saved from ${fmtDate(form.effective_from)}`);
      } else {
        await updateSetup.mutateAsync({ setupId: target, payload });
        toast.success(`${meter.name}: version corrected — the days it covers are split again`);
      }
      onClose();
    } catch {
      // The API client has already said why.
    }
  };

  const remove = async (version: MeterSetup) => {
    const ok = await confirmDialog({
      title: 'Delete this version?',
      description: `The version from ${fmtDate(version.effective_from)} goes, and the one before it covers its days instead.`,
      confirmLabel: 'Delete version',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteSetup.mutateAsync(version.id);
      toast.success('Version deleted');
      startChange();
    } catch {
      // The API client has already said why.
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="grid max-h-[90vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{meter ? `${meter.name} — where it sits and who pays` : 'Meter setup'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {/* ---- history ---- */}
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4" /> Versions
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not placed in the tree yet — its readings count as a main meter nobody pays for.
              </p>
            ) : (
              <ul className="divide-y rounded-md border text-sm">
                {versions.map((version) => (
                  <li
                    key={version.id}
                    className={`flex items-start justify-between gap-3 px-3 py-2 ${
                      target === version.id ? 'bg-sky-50 dark:bg-sky-950/30' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium">
                        From {fmtDate(version.effective_from)}
                        {version.id === meter?.tree?.setup?.id && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                            in force today
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {version.in_service
                          ? `${version.parent_name ? `Under ${version.parent_name}` : 'Main meter'} · ${version.summary}`
                          : 'Out of service'}
                      </div>
                      {version.note && <div className="text-xs text-muted-foreground">{version.note}</div>}
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="sm" onClick={() => selectVersion(version)}>
                          Correct
                        </Button>
                        {versions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete the version from ${version.effective_from}`}
                            onClick={() => remove(version)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---- the form ---- */}
          {canEdit || versions.length === 0 ? null : (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Deciding who pays for a meter needs the "set who pays for each electricity meter" right.
            </p>
          )}
          {canEdit && (
            <section className="space-y-4 rounded-md border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {target === 'new'
                    ? 'A change from a date — earlier days keep the old split'
                    : `Correcting the version from ${fmtDate(versions.find((v) => v.id === target)?.effective_from)} — every day it covers is split again`}
                </p>
                {target !== 'new' && (
                  <Button variant="outline" size="sm" onClick={startChange}>
                    Make a change from a date instead
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="setup-from">From</Label>
                  <Input
                    id="setup-from"
                    type="date"
                    value={form.effective_from}
                    disabled={readOnly}
                    onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                  />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <Checkbox
                    checked={form.in_service}
                    disabled={readOnly}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, in_service: checked === true }))}
                  />
                  In service — off takes the meter out of the tree from this date
                </label>
              </div>

              {form.in_service && (
                <>
                  <div>
                    <Label htmlFor="setup-parent">Sub-meter of</Label>
                    <NativeSelect
                      id="setup-parent"
                      value={form.parent}
                      disabled={readOnly}
                      onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
                    >
                      <SelectOption value="">Nothing — a main meter (a supply comes in on it)</SelectOption>
                      {parents.map((candidate) => (
                        <SelectOption key={candidate.id} value={String(candidate.id)}>
                          {indentedName(candidate)}
                        </SelectOption>
                      ))}
                    </NativeSelect>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Its own units are its reading less whatever its sub-meters read — that is what gets split below.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="setup-basis">Who pays for its own units</Label>
                    <NativeSelect
                      id="setup-basis"
                      value={form.basis}
                      disabled={readOnly}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, basis: e.target.value as AllocationBasis, drivers: [] }))
                      }
                    >
                      {(Object.keys(ALLOCATION_BASIS_LABELS) as AllocationBasis[]).map((basis) => (
                        <SelectOption key={basis} value={basis}>
                          {ALLOCATION_BASIS_LABELS[basis]}
                        </SelectOption>
                      ))}
                    </NativeSelect>
                    <p className="mt-1 text-xs text-muted-foreground">{BASIS_HELP[form.basis]}</p>
                  </div>

                  {/* ---- what a proportional split follows ---- */}
                  {form.basis === 'RUN_HOURS' && (
                    <div className="space-y-2">
                      <Label>Lines and machines it serves</Label>
                      {form.drivers.map((row, index) => (
                        <div key={index} className="flex gap-2">
                          <NativeSelect
                            aria-label="Line or machine"
                            value={row.source}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                drivers: f.drivers.map((d, i) => (i === index ? { ...d, source: e.target.value } : d)),
                              }))
                            }
                          >
                            <SelectOption value="">Pick a line or machine</SelectOption>
                            {runSources.map((source) => (
                              <SelectOption key={`${source.kind}:${source.id}`} value={`${source.kind}:${source.id}`}>
                                {source.name} · {source.company_name}
                                {source.kind === 'BLOWING_MACHINE' ? ' (blowing)' : ''}
                                {source.is_active ? '' : ' — inactive'}
                              </SelectOption>
                            ))}
                          </NativeSelect>
                          <Input
                            aria-label="Weight"
                            className="w-24"
                            inputMode="decimal"
                            value={row.weight}
                            title="How heavy a load this line is, against the others — 1 when they draw about the same"
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                drivers: f.drivers.map((d, i) => (i === index ? { ...d, weight: e.target.value } : d)),
                              }))
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Remove"
                            onClick={() => setForm((f) => ({ ...f, drivers: f.drivers.filter((_, i) => i !== index) }))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setForm((f) => ({ ...f, drivers: [...f.drivers, { source: '', company: '', weight: '1' }] }))}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add a line or machine
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Hours come from the production and blowing runs' start and stop times. Each line counts its own hours; a weight above 1 makes a heavier line count for more.
                      </p>
                    </div>
                  )}
                  {form.basis === 'METER_RATIO' && (
                    <div className="space-y-2">
                      <Label>Meters it follows, and who each stands for</Label>
                      {form.drivers.map((row, index) => (
                        <div key={index} className="flex gap-2">
                          <NativeSelect
                            aria-label="Meter"
                            value={row.source}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                drivers: f.drivers.map((d, i) => (i === index ? { ...d, source: e.target.value } : d)),
                              }))
                            }
                          >
                            <SelectOption value="">Pick a meter</SelectOption>
                            {followable.map((candidate) => (
                              <SelectOption key={candidate.id} value={String(candidate.id)}>
                                {candidate.name}
                              </SelectOption>
                            ))}
                          </NativeSelect>
                          <NativeSelect
                            aria-label="Stands for"
                            value={row.company}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                drivers: f.drivers.map((d, i) => (i === index ? { ...d, company: e.target.value } : d)),
                              }))
                            }
                          >
                            <SelectOption value="">Stands for…</SelectOption>
                            {COMPANY_CODE_LIST.map((code) => (
                              <SelectOption key={code} value={code}>
                                {COMPANY_LABELS[code]}
                              </SelectOption>
                            ))}
                          </NativeSelect>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Remove"
                            onClick={() => setForm((f) => ({ ...f, drivers: f.drivers.filter((_, i) => i !== index) }))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setForm((f) => ({ ...f, drivers: [...f.drivers, { source: '', company: '', weight: '1' }] }))}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add a meter
                      </Button>
                    </div>
                  )}

                  {/* ---- the fixed shares, or the fallback ---- */}
                  {form.basis !== 'UNASSIGNED' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>
                          {form.basis === 'FIXED'
                            ? 'Shares'
                            : 'Fixed split for a day with nothing to go on (optional)'}
                        </Label>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => preset([['company:JIVO_OIL', 100]])}>
                            All Oil
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => preset([['company:JIVO_BEVERAGES', 100]])}>
                            All Beverages
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => preset([['company:JIVO_OIL', 50], ['company:JIVO_BEVERAGES', 50]])}
                          >
                            Half each
                          </Button>
                        </div>
                      </div>
                      {form.shares.map((row, index) => (
                        <div key={index} className="flex gap-2">
                          <NativeSelect
                            aria-label="Who"
                            value={row.party}
                            onChange={(e) =>
                              setShares(form.shares.map((s, i) => (i === index ? { ...s, party: e.target.value } : s)))
                            }
                          >
                            <SelectOption value="">Who…</SelectOption>
                            {partyOptions.map((option) => (
                              <SelectOption key={option.value} value={option.value}>
                                {option.label}
                              </SelectOption>
                            ))}
                          </NativeSelect>
                          <div className="flex items-center gap-1">
                            <Input
                              aria-label="Percent"
                              className="w-24"
                              inputMode="decimal"
                              value={row.percent}
                              onChange={(e) =>
                                setShares(form.shares.map((s, i) => (i === index ? { ...s, percent: e.target.value } : s)))
                              }
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Remove share"
                            onClick={() => setShares(form.shares.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShares([...form.shares, { party: '', percent: '' }])}
                        >
                          <Plus className="mr-1 h-4 w-4" /> Add a share
                        </Button>
                        {form.shares.length > 0 && (
                          <span
                            className={`text-sm ${
                              Math.abs(shareTotal - 100) > 0.01 ? 'font-medium text-red-600' : 'text-muted-foreground'
                            }`}
                          >
                            Total {shareTotal}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <Label htmlFor="setup-note">Why</Label>
                <Textarea
                  id="setup-note"
                  rows={2}
                  placeholder="What changed on the floor, or what was corrected"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>
              {blocker && <p className="text-sm text-amber-700 dark:text-amber-300">{blocker}</p>}
            </section>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canEdit && (
            <Button onClick={save} disabled={saving || Boolean(blocker)}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {target === 'new' ? 'Save the change' : 'Save the correction'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
