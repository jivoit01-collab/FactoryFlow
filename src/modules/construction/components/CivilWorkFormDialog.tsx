/**
 * Add or change one row of the civil works sheet: a project, or a work under
 * one.
 *
 * The same fields either way, because the sheet gives every row the same
 * columns — a project with nothing under it carries its own area and dates.
 *
 * The days are worked out from the two dates once both are in, the way the
 * sheet counts them, and typed only before there are any ("60 days when it
 * starts"). The per-day figure under them is the sheet's AVG PER DAY: the area
 * a day has to get through to finish on time.
 */
import { LandPlot } from 'lucide-react';
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
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useCivilWorkMutation } from '../api';
import type { AreaUnit, CivilWork, CivilWorkPayload, CivilWorkStatus } from '../types';
import { AREA_UNIT_LABELS, CIVIL_STATUS_LABELS, daysBetween, formatArea } from '../utils';

type Form = {
  name: string;
  area: string;
  area_unit: AreaUnit;
  status: CivilWorkStatus;
  stage: string;
  start_date: string;
  end_date: string;
  days: string;
  contractor: string;
  remarks: string;
};

function formFrom(work: CivilWork | null): Form {
  return {
    name: work?.name ?? '',
    area: work?.area ?? '',
    area_unit: work?.area_unit ?? 'SQFT',
    status: work?.status ?? 'NOT_STARTED',
    stage: work?.stage ?? '',
    start_date: work?.start_date ?? '',
    end_date: work?.end_date ?? '',
    days: work?.days ? String(work.days) : '',
    contractor: work?.contractor ?? '',
    remarks: work?.remarks ?? '',
  };
}

export function CivilWorkFormDialog({
  open,
  onOpenChange,
  work,
  parent,
  contractors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being changed; null while adding one. */
  work: CivilWork | null;
  /** The project a new work goes under; null for a new project. Ignored when editing. */
  parent: { id: number; name: string } | null;
  /** Names already on the sheet, offered as suggestions. */
  contractors: string[];
}) {
  const mutation = useCivilWorkMutation();
  const [form, setForm] = useState<Form>(() => formFrom(work));

  // Load the row as the dialog opens. During render rather than in an effect,
  // so the form never shows the previous row's values for a frame.
  const openKey = open ? `${work?.id ?? 'new'}:${parent?.id ?? ''}` : null;
  const [seenKey, setSeenKey] = useState<string | null>(null);
  if (openKey !== seenKey) {
    setSeenKey(openKey);
    if (openKey) setForm(formFrom(work));
  }

  const isProject = work ? work.parent === null : parent === null;
  const noun = isProject ? 'project' : 'work';
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const datedDays = daysBetween(form.start_date, form.end_date);
  const days = datedDays ?? (Number(form.days) > 0 ? Number(form.days) : null);
  const perDay = days && Number(form.area) > 0 ? Number(form.area) / days : null;
  const endBeforeStart = Boolean(
    form.start_date && form.end_date && form.end_date < form.start_date,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || endBeforeStart) return;

    const payload: CivilWorkPayload = {
      name: form.name.trim(),
      area: form.area === '' ? null : form.area,
      area_unit: form.area_unit,
      status: form.status,
      stage: form.stage.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      // With both dates the server counts the days itself.
      days: datedDays ? null : Number(form.days) > 0 ? Math.round(Number(form.days)) : null,
      contractor: form.contractor.trim(),
      remarks: form.remarks.trim(),
    };

    try {
      if (work) {
        await mutation.mutateAsync({ action: 'update', id: work.id, payload });
        toast.success(`${payload.name} saved`);
      } else {
        await mutation.mutateAsync({
          action: 'create',
          payload: { ...payload, parent: parent?.id ?? null },
        });
        toast.success(parent ? `Added under ${parent.name}` : `${payload.name} added`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, `Could not save the ${noun}.`));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LandPlot className="h-5 w-5" />
              {work ? `Edit ${noun}` : `New ${noun}`}
            </DialogTitle>
            <DialogDescription>
              {!work && parent
                ? `A work under ${parent.name}.`
                : isProject
                  ? 'A project on the sheet. Add its works under it afterwards, or give it its own area and dates if it is one job.'
                  : 'One work inside a project.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="civil-name">{isProject ? 'Project' : 'Work'}</Label>
            <Input
              id="civil-name"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder={isProject ? '40K SHED WORK' : 'TRIMAX FLOORING'}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="civil-area">Area</Label>
            <div className="flex gap-2">
              <Input
                id="civil-area"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.area}
                onChange={(event) => set('area', event.target.value)}
                placeholder="40500"
                className="flex-1"
              />
              <NativeSelect
                value={form.area_unit}
                onChange={(event) => set('area_unit', event.target.value as AreaUnit)}
                className="w-32"
                aria-label="Area unit"
              >
                {(Object.keys(AREA_UNIT_LABELS) as AreaUnit[]).map((unit) => (
                  <SelectOption key={unit} value={unit}>
                    {AREA_UNIT_LABELS[unit]}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="civil-status">Status</Label>
              <NativeSelect
                id="civil-status"
                value={form.status}
                onChange={(event) => set('status', event.target.value as CivilWorkStatus)}
              >
                {(Object.keys(CIVIL_STATUS_LABELS) as CivilWorkStatus[]).map((status) => (
                  <SelectOption key={status} value={status}>
                    {CIVIL_STATUS_LABELS[status]}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="civil-stage">Where it stands</Label>
              <Input
                id="civil-stage"
                value={form.stage}
                onChange={(event) => set('stage', event.target.value)}
                placeholder="7th layer, WBM complete, material purchasing"
                maxLength={200}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="civil-start">Expected start</Label>
              <Input
                id="civil-start"
                type="date"
                value={form.start_date}
                onChange={(event) => set('start_date', event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="civil-end">Expected finish</Label>
              <Input
                id="civil-end"
                type="date"
                min={form.start_date || undefined}
                value={form.end_date}
                onChange={(event) => set('end_date', event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="civil-days">Days</Label>
              {datedDays ? (
                <p
                  id="civil-days"
                  className="flex h-9 items-center text-sm font-medium tabular-nums"
                >
                  {datedDays} {datedDays === 1 ? 'day' : 'days'}
                </p>
              ) : (
                <Input
                  id="civil-days"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={form.days}
                  onChange={(event) => set('days', event.target.value)}
                  placeholder="60"
                />
              )}
            </div>
          </div>
          {endBeforeStart ? (
            <p className="-mt-2 text-xs text-rose-600">It cannot finish before it starts.</p>
          ) : (
            <p className="-mt-2 text-xs text-muted-foreground">
              {datedDays
                ? 'Days are counted from the two dates.'
                : 'No dates yet? Type how many days it will take once it starts.'}
              {perDay !== null && (
                <>
                  {' '}
                  That is{' '}
                  <span className="font-medium text-foreground">
                    {formatArea(perDay.toFixed(2))} {AREA_UNIT_LABELS[form.area_unit]}
                  </span>{' '}
                  a day.
                </>
              )}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="civil-contractor">Contractor</Label>
            <Input
              id="civil-contractor"
              list="civil-contractors"
              value={form.contractor}
              onChange={(event) => set('contractor', event.target.value)}
              placeholder="DEEPAK JAIN"
              maxLength={200}
            />
            <datalist id="civil-contractors">
              {contractors.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="civil-remarks">Remarks</Label>
            <Textarea
              id="civil-remarks"
              value={form.remarks}
              onChange={(event) => set('remarks', event.target.value)}
              placeholder="Waiting for the soil test; one layer of material on site"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !form.name.trim() || endBeforeStart}
            >
              {mutation.isPending ? 'Saving…' : work ? 'Save' : `Add ${noun}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
