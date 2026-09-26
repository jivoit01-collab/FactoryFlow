import { Loader2, Pencil, RotateCcw, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
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

import { useDeleteTreeReading, useTreeReadings, useUpdateTreeReading } from '../../api';
import type { TreeMeter, TreeReading } from '../../types';
import { firstOfMonthISO, fmtDate, fmtMoney, fmtUnits, todayISO, toNumber, trimFactor, trimSeconds } from './electricityFormat';

interface ReadingsTabProps {
  meters: TreeMeter[];
  canEdit: boolean;
  canDelete: boolean;
  keeps: (meterId: number) => boolean;
}

interface CorrectionForm {
  closing_reading: string;
  opening_reading: string;
  meter_reset: boolean;
  reading_time: string;
  multiplying_factor: string;
  remarks: string;
}

/**
 * The register as it was typed, day by day and meter by meter — for looking
 * something up and correcting it. New readings go in on the day sheet.
 */
export function ReadingsTab({ meters, canEdit, canDelete, keeps }: ReadingsTabProps) {
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [meterFilter, setMeterFilter] = useState('');
  const { data: readings = [], isLoading } = useTreeReadings({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    meter: meterFilter ? Number(meterFilter) : undefined,
  });
  const updateReading = useUpdateTreeReading();
  const deleteReading = useDeleteTreeReading();

  const [editing, setEditing] = useState<TreeReading | null>(null);
  const [form, setForm] = useState<CorrectionForm | null>(null);

  const openCorrection = (reading: TreeReading) => {
    setEditing(reading);
    setForm({
      closing_reading: reading.closing_reading,
      opening_reading: reading.opening_reading,
      meter_reset: reading.meter_reset,
      reading_time: trimSeconds(reading.reading_time),
      multiplying_factor: trimFactor(reading.multiplying_factor),
      remarks: reading.remarks,
    });
  };

  const saveCorrection = async () => {
    if (!editing || !form) return;
    try {
      await updateReading.mutateAsync({
        readingId: editing.id,
        payload: {
          closing_reading: form.closing_reading,
          // The opening only moves on a reset: otherwise it is the previous
          // closing, and correcting that reading is how it changes.
          ...(form.meter_reset ? { opening_reading: form.opening_reading } : {}),
          meter_reset: form.meter_reset,
          reading_time: form.reading_time || undefined,
          multiplying_factor: form.multiplying_factor || undefined,
          remarks: form.remarks,
        },
      });
      toast.success('Reading corrected — the next day follows on from it');
      setEditing(null);
    } catch {
      // The API client has already said why.
    }
  };

  const remove = async (reading: TreeReading) => {
    const ok = await confirmDialog({
      title: 'Delete this reading?',
      description: `${reading.meter_name} on ${fmtDate(reading.date)}. The next reading takes over its days, so no unit drops out of the register.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteReading.mutateAsync(reading.id);
      toast.success('Reading deleted');
    } catch {
      // The API client has already said why.
    }
  };

  const previewUnits =
    form && form.closing_reading !== ''
      ? (toNumber(form.closing_reading) - toNumber(form.meter_reset ? form.opening_reading : editing?.opening_reading)) *
        toNumber(form.multiplying_factor || '1')
      : null;

  return (
    <Card className="border-slate-200/80 shadow-sm dark:border-border">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="readings-from">From</Label>
            <Input id="readings-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="readings-to">To</Label>
            <Input id="readings-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="min-w-[220px]">
            <Label htmlFor="readings-meter">Meter</Label>
            <NativeSelect id="readings-meter" value={meterFilter} onChange={(e) => setMeterFilter(e.target.value)}>
              <SelectOption value="">All meters</SelectOption>
              {meters.map((meter) => (
                <SelectOption key={meter.id} value={String(meter.id)}>
                  {meter.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        {isLoading ? (
          <p className="p-6 text-center text-muted-foreground">Loading readings…</p>
        ) : readings.length === 0 ? (
          <div className="flex flex-col items-center p-8 text-muted-foreground">
            <Zap className="mb-2 h-8 w-8" />
            No readings in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Meter</th>
                  <th className="px-3 py-2 text-right font-medium">Opening</th>
                  <th className="px-3 py-2 text-right font-medium">Closing</th>
                  <th className="px-3 py-2 text-right font-medium">MF</th>
                  <th className="px-3 py-2 text-right font-medium">Units</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                  <th className="px-3 py-2 font-medium">Entered by</th>
                  <th className="px-3 py-2 font-medium">Remarks</th>
                  {(canEdit || canDelete) && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {readings.map((reading) => (
                  <tr key={reading.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/60 dark:border-border/60 dark:hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-2">{fmtDate(reading.date)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{trimSeconds(reading.reading_time) || '—'}</td>
                    <td className="px-3 py-2">
                      {reading.meter_name}
                      {reading.meter_reset && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-muted dark:text-muted-foreground">
                          <RotateCcw className="h-3 w-3" /> reset
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{reading.opening_reading}</td>
                    <td className="px-3 py-2 text-right">{reading.closing_reading}</td>
                    <td className="px-3 py-2 text-right">×{trimFactor(reading.multiplying_factor)}</td>
                    <td className="px-3 py-2 text-right font-medium" title={`Dial ${reading.dial_difference} × MF ${trimFactor(reading.multiplying_factor)}`}>
                      {fmtUnits(reading.units_consumed)}
                    </td>
                    <td className="px-3 py-2 text-right">{fmtMoney(reading.total_cost)}</td>
                    <td className="px-3 py-2" title={reading.created_at ? `Saved ${new Date(reading.created_at).toLocaleString()}` : undefined}>
                      {reading.created_by_name}
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-2" title={reading.remarks}>
                      {reading.remarks}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {canEdit && keeps(reading.meter) && (
                          <Button variant="ghost" size="sm" aria-label={`Correct ${reading.date} reading for ${reading.meter_name}`} onClick={() => openCorrection(reading)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && keeps(reading.meter) && (
                          <Button variant="ghost" size="sm" aria-label={`Delete ${reading.date} reading for ${reading.meter_name}`} onClick={() => remove(reading)} disabled={deleteReading.isPending}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={editing != null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Correct {editing?.meter_name} on {fmtDate(editing?.date)}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <DialogBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="correct-opening">Opening</Label>
                  <Input
                    id="correct-opening"
                    inputMode="decimal"
                    disabled={!form.meter_reset}
                    value={form.meter_reset ? form.opening_reading : editing?.opening_reading ?? ''}
                    onChange={(e) => setForm((f) => (f ? { ...f, opening_reading: e.target.value } : f))}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    The previous closing. To change it, correct that reading — or tick the reset below.
                  </p>
                </div>
                <div>
                  <Label htmlFor="correct-closing">Closing</Label>
                  <Input
                    id="correct-closing"
                    inputMode="decimal"
                    value={form.closing_reading}
                    onChange={(e) => setForm((f) => (f ? { ...f, closing_reading: e.target.value } : f))}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.meter_reset}
                  onCheckedChange={(checked) => setForm((f) => (f ? { ...f, meter_reset: checked } : f))}
                />
                The meter was replaced or its dial reset on this day
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="correct-time">Read at</Label>
                  <Input
                    id="correct-time"
                    type="time"
                    value={form.reading_time}
                    onChange={(e) => setForm((f) => (f ? { ...f, reading_time: e.target.value } : f))}
                  />
                </div>
                <div>
                  <Label htmlFor="correct-mf">MF</Label>
                  <Input
                    id="correct-mf"
                    inputMode="decimal"
                    value={form.multiplying_factor}
                    onChange={(e) => setForm((f) => (f ? { ...f, multiplying_factor: e.target.value } : f))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="correct-remarks">Remarks</Label>
                <Textarea
                  id="correct-remarks"
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => setForm((f) => (f ? { ...f, remarks: e.target.value } : f))}
                />
              </div>
              {previewUnits != null && (
                <p className={`text-sm ${previewUnits < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {previewUnits < 0 ? 'Closing is below the opening.' : `${fmtUnits(previewUnits)} units`}
                </p>
              )}
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveCorrection} disabled={updateReading.isPending}>
              {updateReading.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Save correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
