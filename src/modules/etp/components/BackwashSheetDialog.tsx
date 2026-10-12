/**
 * "Log back washing" — the whole day's steps in one form.
 *
 * Picking the plant lays out one row per back-wash step configured for it
 * (sand filter backwash, sand rinse, carbon backwash, carbon rinse …), each
 * with its own start and stop time. The step's usual chemical is prefilled and
 * its usual duration fills the stop time once a start is typed. Rows left
 * without a start time are steps not done that day and are not filed. Plant,
 * date, operator and chemist are entered once for the whole sheet.
 */

import { ShowerHead } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api';
import {
  Button,
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
import { cn } from '@/shared/utils';

import { useCreateEtpBackwashSheet, useEtpBackwashEntries } from '../api';
import type { BackwashEquipment, PlantChemical, PlantStaff, TreatmentPlant } from '../types';
import { addMinutes, todayISO } from '../utils';
import { PlantSelect, StaffSelect } from './EtpControls';

interface StepRow {
  start_time: string;
  stop_time: string;
  chemical: string;
  chemical_quantity: string;
  remarks: string;
}

/** Equipment name, start, stop, chemical, quantity, remarks. */
const ROW_GRID = 'sm:grid-cols-[minmax(0,1.3fr)_7rem_7rem_minmax(0,1.2fr)_5.5rem_minmax(0,1.2fr)]';

function blankRow(step: BackwashEquipment): StepRow {
  return {
    start_time: '',
    stop_time: '',
    chemical: step.default_chemical ? String(step.default_chemical) : '',
    chemical_quantity: '',
    remarks: '',
  };
}

export function BackwashSheetDialog({
  open,
  onOpenChange,
  initialPlant,
  plants,
  equipment,
  chemicals,
  staff,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The register's plant filter, so the steps are laid out straight away. */
  initialPlant: string;
  plants: TreatmentPlant[];
  equipment: BackwashEquipment[];
  chemicals: PlantChemical[];
  staff: PlantStaff[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Title and buttons stay put; only the steps scroll. */}
      <DialogContent className="max-h-[90vh] max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        {/* Mounted per opening, so every sheet starts blank. */}
        {open && (
          <SheetForm
            initialPlant={initialPlant}
            plants={plants}
            equipment={equipment}
            chemicals={chemicals}
            staff={staff}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SheetForm({
  initialPlant,
  plants,
  equipment,
  chemicals,
  staff,
  onDone,
}: {
  initialPlant: string;
  plants: TreatmentPlant[];
  equipment: BackwashEquipment[];
  chemicals: PlantChemical[];
  staff: PlantStaff[];
  onDone: () => void;
}) {
  const [plant, setPlant] = useState(initialPlant);
  const [date, setDate] = useState(todayISO());
  const [operator, setOperator] = useState('');
  const [chemist, setChemist] = useState('');
  const [rows, setRows] = useState<Record<number, StepRow>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const createSheet = useCreateEtpBackwashSheet();

  const steps = useMemo(
    () => (plant ? equipment.filter((step) => step.plant === Number(plant)) : []),
    [equipment, plant],
  );

  // What is already on the register for this plant and day, so a step is not
  // filed twice by someone who logged it earlier from another screen.
  const { data: dayEntries = [] } = useEtpBackwashEntries(
    { plant: Number(plant), date },
    Boolean(plant && date),
  );
  const loggedTimes = useMemo(() => {
    const byStep = new Map<number, string[]>();
    for (const entry of dayEntries) {
      const span = [entry.start_time?.slice(0, 5), entry.stop_time?.slice(0, 5)]
        .filter(Boolean)
        .join('–');
      byStep.set(entry.equipment, [...(byStep.get(entry.equipment) ?? []), span]);
    }
    return byStep;
  }, [dayEntries]);

  const rowOf = (step: BackwashEquipment) => rows[step.id] ?? blankRow(step);

  const setRow = (step: BackwashEquipment, changes: Partial<StepRow>) => {
    setRows((current) => ({
      ...current,
      [step.id]: { ...(current[step.id] ?? blankRow(step)), ...changes },
    }));
    setRowErrors((current) => {
      if (!(step.id in current)) return current;
      const next = { ...current };
      delete next[step.id];
      return next;
    });
  };

  const onStartPicked = (step: BackwashEquipment, value: string) =>
    setRow(step, {
      start_time: value,
      ...(step.default_duration_minutes && value
        ? { stop_time: addMinutes(value, step.default_duration_minutes) }
        : {}),
    });

  const onPlantPicked = (value: string) => {
    setPlant(value);
    // Another plant has other steps; nothing typed carries over.
    setRows({});
    setRowErrors({});
  };

  const filled = steps.filter((step) => rowOf(step).start_time);

  const submit = async () => {
    if (!plant || !date) {
      toast.error('Plant and date are needed');
      return;
    }
    const startless = steps.filter((step) => {
      const row = rowOf(step);
      return !row.start_time && Boolean(row.stop_time || row.chemical_quantity || row.remarks);
    });
    if (startless.length > 0) {
      setRowErrors(
        Object.fromEntries(
          startless.map((step) => [step.id, 'Fill the start time, or clear this row.']),
        ),
      );
      toast.error(`${startless[0].name}: fill the start time, or clear the row`);
      return;
    }
    if (filled.length === 0) {
      toast.error('Fill the start time of at least one step');
      return;
    }
    try {
      await createSheet.mutateAsync({
        plant: Number(plant),
        date,
        operator: operator ? Number(operator) : null,
        chemist: chemist ? Number(chemist) : null,
        steps: filled.map((step) => {
          const row = rowOf(step);
          return {
            equipment: step.id,
            start_time: row.start_time,
            stop_time: row.stop_time || null,
            chemical: row.chemical ? Number(row.chemical) : null,
            chemical_quantity: row.chemical_quantity === '' ? null : row.chemical_quantity,
            remarks: row.remarks,
          };
        }),
      });
      toast.success(filled.length === 1 ? '1 step logged' : `${filled.length} steps logged`);
      onDone();
    } catch (error) {
      // The toast is the interceptor's; here the failing rows are marked. The
      // backend keys each step's errors as "<step name>.<field>".
      const fieldErrors = (error as ApiError | undefined)?.errors ?? {};
      const marked: Record<number, string> = {};
      for (const step of filled) {
        const messages = Object.entries(fieldErrors)
          .filter(([key]) => key.startsWith(`${step.name}.`))
          .flatMap(([, list]) => list);
        if (messages.length > 0) marked[step.id] = messages.join(' ');
      }
      setRowErrors(marked);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log back washing</DialogTitle>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="bws-plant">Plant</Label>
            <PlantSelect id="bws-plant" plants={plants} value={plant} onChange={onPlantPicked} />
          </div>
          <div>
            <Label htmlFor="bws-date">Date</Label>
            <Input
              id="bws-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bws-operator">Operator</Label>
            <StaffSelect
              id="bws-operator"
              staff={staff}
              role="OPERATOR"
              value={operator}
              onChange={setOperator}
            />
          </div>
          <div>
            <Label htmlFor="bws-chemist">Chemist</Label>
            <StaffSelect
              id="bws-chemist"
              staff={staff}
              role="CHEMIST"
              value={chemist}
              onChange={setChemist}
            />
          </div>
        </div>

        {!plant ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Pick the plant to lay out its back-wash steps.
          </p>
        ) : steps.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No back-wash steps are configured for this plant — add them in Settings.
          </p>
        ) : (
          <div className="space-y-2">
            <div
              className={cn(
                'hidden gap-2 px-3 text-xs font-medium text-muted-foreground sm:grid',
                ROW_GRID,
              )}
            >
              <span>Name of equipment</span>
              <span>Start</span>
              <span>Stop</span>
              <span>Type of chemical</span>
              <span>Quantity</span>
              <span>Remarks</span>
            </div>
            {steps.map((step) => {
              const row = rowOf(step);
              const logged = loggedTimes.get(step.id);
              const error = rowErrors[step.id];
              const fieldId = (field: string) => `bws-${step.id}-${field}`;
              return (
                <div
                  key={step.id}
                  className={cn(
                    'relative grid grid-cols-2 gap-2 rounded-md border p-3 sm:items-center',
                    ROW_GRID,
                    error && 'border-destructive',
                  )}
                >
                  <div className="col-span-2 sm:col-span-1">
                    <p className="font-medium">{step.name}</p>
                    {step.default_duration_minutes ? (
                      <p className="text-xs text-muted-foreground">
                        Usually {step.default_duration_minutes} min
                      </p>
                    ) : null}
                    {logged && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Already logged: {logged.join(', ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={fieldId('start')} className="text-xs sm:sr-only">
                      Start
                    </Label>
                    <Input
                      id={fieldId('start')}
                      type="time"
                      value={row.start_time}
                      onChange={(event) => onStartPicked(step, event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={fieldId('stop')} className="text-xs sm:sr-only">
                      Stop
                    </Label>
                    <Input
                      id={fieldId('stop')}
                      type="time"
                      value={row.stop_time}
                      onChange={(event) => setRow(step, { stop_time: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={fieldId('chemical')} className="text-xs sm:sr-only">
                      Type of chemical
                    </Label>
                    <NativeSelect
                      id={fieldId('chemical')}
                      value={row.chemical}
                      onChange={(event) => setRow(step, { chemical: event.target.value })}
                    >
                      <SelectOption value="">None</SelectOption>
                      {chemicals.map((chemical) => (
                        <SelectOption key={chemical.id} value={String(chemical.id)}>
                          {chemical.name}
                        </SelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor={fieldId('qty')} className="text-xs sm:sr-only">
                      Quantity
                    </Label>
                    <Input
                      id={fieldId('qty')}
                      type="number"
                      step="0.001"
                      value={row.chemical_quantity}
                      onChange={(event) => setRow(step, { chemical_quantity: event.target.value })}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor={fieldId('remarks')} className="text-xs sm:sr-only">
                      Remarks
                    </Label>
                    <Input
                      id={fieldId('remarks')}
                      value={row.remarks}
                      onChange={(event) => setRow(step, { remarks: event.target.value })}
                    />
                  </div>
                  {error && <p className="col-span-full text-xs text-destructive">{error}</p>}
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Leave the start time empty for a step not done that day; it is not filed.
            </p>
          </div>
        )}
      </DialogBody>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={createSheet.isPending}>
          <ShowerHead className="mr-1 h-4 w-4" />
          {filled.length > 1 ? `Log ${filled.length} steps` : 'Log step'}
        </Button>
      </DialogFooter>
    </>
  );
}
