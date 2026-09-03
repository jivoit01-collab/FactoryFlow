/**
 * Calibration — the plant instruments' "Calibration Record".
 *
 * Picking an instrument lays out the buffer points configured for it (pH 4.00 /
 * 7.00 / 10.01), so the operator types only the observed column: the variation,
 * the in/out-of-tolerance verdict and the next due date are all worked out.
 */

import { Beaker, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ETP_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
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
} from '@/shared/components/ui';

import {
  useCreateEtpCalibrationRecord,
  useDeleteEtpCalibrationRecord,
  useEtpCalibrationRecords,
  useEtpInstruments,
  useEtpOptions,
  useEtpStaff,
  useUpdateEtpCalibrationRecord,
} from '../api';
import { OptionSelect, StaffSelect, TableState } from '../components/EtpControls';
import { EtpEntryHistory } from '../components/EtpEntryHistory';
import { useEtpRegisterPrint } from '../components/useEtpRegisterPrint';
import type { CalibrationRecord } from '../types';
import { useEtpPrintDocument } from '../usePrintDocument';
import { firstOfMonthISO, fmt, todayISO } from '../utils';

/** One row of the dialog: a configured buffer point and what was observed. */
interface ReadingForm {
  actual_value: string;
  observed_value: string;
}

export default function EtpCalibrationPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(ETP_PERMISSIONS.MANAGE_CALIBRATION);

  const [instrumentFilter, setInstrumentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const { data: instruments = [] } = useEtpInstruments({});
  const { data: staff = [] } = useEtpStaff({ is_active: true });
  const { data: options = [] } = useEtpOptions({ is_active: true });
  const { data: records = [], isLoading } = useEtpCalibrationRecords({
    instrument: instrumentFilter ? Number(instrumentFilter) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const createRecord = useCreateEtpCalibrationRecord();
  const updateRecord = useUpdateEtpCalibrationRecord();
  const deleteRecord = useDeleteEtpCalibrationRecord();
  const { print, printPortal } = useEtpRegisterPrint();
  // The register's document number comes from the database, not the bundle.
  const printDocument = useEtpPrintDocument();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalibrationRecord | null>(null);
  const [instrument, setInstrument] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [wasReplaced, setWasReplaced] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [readings, setReadings] = useState<ReadingForm[]>([]);

  const selectedInstrument = useMemo(
    () => instruments.find((row) => String(row.id) === instrument),
    [instruments, instrument],
  );
  const tolerance = Number(selectedInstrument?.tolerance ?? 0);

  const openAdd = () => {
    setEditing(null);
    const startingInstrument =
      instrumentFilter || (instruments[0] ? String(instruments[0].id) : '');
    setInstrument(startingInstrument);
    setDate(todayISO());
    setTime('');
    setCorrectiveAction(
      String(
        options.find(
          (option) =>
            option.category === 'CALIBRATION_ACTION' && option.is_default && option.is_active,
        )?.id ?? '',
      ),
    );
    setCheckedBy('');
    setVerifiedBy('');
    setWasReplaced(false);
    setRemarks('');
    setReadings(pointsOf(startingInstrument));
    setDialogOpen(true);
  };

  /** The buffer points configured for an instrument, as blank rows. */
  const pointsOf = (instrumentId: string): ReadingForm[] => {
    const row = instruments.find((candidate) => String(candidate.id) === instrumentId);
    return (row?.points ?? [])
      .filter((point) => point.is_active !== false)
      .map((point) => ({ actual_value: point.actual_value, observed_value: '' }));
  };

  const openEdit = (record: CalibrationRecord) => {
    setEditing(record);
    setInstrument(String(record.instrument));
    setDate(record.date);
    setTime(record.time?.slice(0, 5) ?? '');
    setCorrectiveAction(record.corrective_action ? String(record.corrective_action) : '');
    setCheckedBy(record.checked_by ? String(record.checked_by) : '');
    setVerifiedBy(record.verified_by ? String(record.verified_by) : '');
    setWasReplaced(record.was_replaced);
    setRemarks(record.remarks ?? '');
    setReadings(
      record.readings.map((reading) => ({
        actual_value: reading.actual_value,
        observed_value: reading.observed_value ?? '',
      })),
    );
    setDialogOpen(true);
  };

  const onInstrumentPicked = (value: string) => {
    setInstrument(value);
    if (!editing) setReadings(pointsOf(value));
  };

  const setReadingField = (index: number, key: keyof ReadingForm, value: string) =>
    setReadings((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );

  const variationOf = (row: ReadingForm) => {
    if (row.observed_value === '' || row.actual_value === '') return null;
    const variation = Number(row.observed_value) - Number(row.actual_value);
    return Number.isFinite(variation) ? variation : null;
  };

  const anyOutOfTolerance = readings.some((row) => {
    const variation = variationOf(row);
    return variation !== null && Math.abs(variation) > tolerance;
  });

  const submit = async () => {
    if (!instrument || !date) {
      toast.error('Pick the instrument and the date');
      return;
    }
    const payload = {
      instrument: Number(instrument),
      date,
      time: time || null,
      corrective_action: correctiveAction ? Number(correctiveAction) : null,
      checked_by: checkedBy ? Number(checkedBy) : null,
      verified_by: verifiedBy ? Number(verifiedBy) : null,
      was_replaced: wasReplaced,
      remarks,
      readings: readings
        .filter((row) => row.actual_value !== '')
        .map((row) => ({
          actual_value: row.actual_value,
          observed_value: row.observed_value === '' ? null : row.observed_value,
        })),
    };
    try {
      if (editing) {
        await updateRecord.mutateAsync({ id: editing.id, payload });
        toast.success('Calibration updated');
      } else {
        await createRecord.mutateAsync(payload);
        toast.success('Calibration recorded');
      }
      setDialogOpen(false);
    } catch {
      /* interceptor surfaces the backend's message */
    }
  };

  const remove = async (record: CalibrationRecord) => {
    const confirmed = await confirmDialog({
      title: `Delete the ${record.date} calibration of ${record.instrument_code}?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteRecord.mutateAsync(record.id);
      toast.success('Calibration deleted');
    } catch {
      toast.error('Could not delete the calibration');
    }
  };

  const printRegister = () => {
    const header = instruments.find((row) => String(row.id) === instrumentFilter);
    const { doc, documentId } = printDocument('ETP_CALIBRATION_RECORD');
    print({
      doc,
      documentId,
      title: doc.name,
      orientation: 'landscape',
      headerPairs: [
        ['Equipment name', header?.equipment_name ?? 'All instruments'],
        ['Equipment ID', header?.equipment_id ?? '—'],
        ['Location', header?.location ?? '—'],
        ['Working range', header?.working_range ?? '—'],
        ['Frequency', header?.frequency_display ?? '—'],
        ['Standard equipment', header?.standard_make_model ?? '—'],
        ['Allowed variation', header ? `± ${header.tolerance}` : '—'],
        ['Period', `${dateFrom} to ${dateTo}`],
      ],
      columns: [
        { label: 'Date' },
        { label: 'Time' },
        { label: 'Due date' },
        { label: 'Instrument' },
        { label: 'Actual', align: 'right' },
        { label: 'Observed', align: 'right' },
        { label: 'Variation', align: 'right' },
        { label: 'Corrective action' },
        { label: 'Checked by' },
      ],
      // One printed line per reading, the way the paper form stacks the buffer
      // values under one date.
      rows: [...records]
        .sort((left, right) => left.date.localeCompare(right.date))
        .flatMap((record) =>
          (record.readings.length > 0
            ? record.readings
            : [{ actual_value: '', observed_value: null, variation: '', is_within_tolerance: true }]
          ).map((reading, index) => [
            index === 0 ? record.date : '',
            index === 0 ? (record.time?.slice(0, 5) ?? '') : '',
            index === 0 ? (record.due_date ?? '') : '',
            index === 0 ? record.instrument_code : '',
            reading.actual_value,
            { text: reading.observed_value, flag: reading.is_within_tolerance === false },
            { text: reading.variation, flag: reading.is_within_tolerance === false },
            index === 0 ? record.corrective_action_label : '',
            index === 0 ? record.checked_by_name : '',
          ]),
        ),
      note: 'A variation beyond the allowed limit flags the instrument as out of calibration.',
      signatures: [
        ['Checked by', records[0]?.checked_by_name ?? ''],
        ['Verified by', records[0]?.verified_by_name ?? ''],
      ],
    });
  };

  return (
    <div className="space-y-6 p-6">
      {printPortal}
      <DashboardHeader
        title="Calibration"
        description="Instrument buffer checks, variation against the standard and the next due date"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={printRegister} disabled={records.length === 0}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          {canManage && (
            <Button onClick={openAdd} disabled={instruments.length === 0}>
              <Plus className="mr-1 h-4 w-4" /> Record Calibration
            </Button>
          )}
        </div>
      </DashboardHeader>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="min-w-[260px]">
            <Label htmlFor="cal-instrument">Instrument</Label>
            <NativeSelect
              id="cal-instrument"
              value={instrumentFilter}
              onChange={(event) => setInstrumentFilter(event.target.value)}
            >
              <SelectOption value="">All instruments</SelectOption>
              {instruments.map((row) => (
                <SelectOption key={row.id} value={String(row.id)}>
                  {row.equipment_name} ({row.equipment_id})
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="cal-from">From</Label>
            <Input
              id="cal-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cal-to">To</Label>
            <Input
              id="cal-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          {instrumentFilter && (
            <div className="ml-auto text-sm text-muted-foreground">
              {(() => {
                const row = instruments.find(
                  (candidate) => String(candidate.id) === instrumentFilter,
                );
                if (!row) return null;
                return (
                  <span>
                    Last done {row.last_calibration_date ?? 'never'} · next due{' '}
                    {row.calibration_due_date ?? '—'} · allowed variation ± {row.tolerance}
                  </span>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <TableState
            loading={isLoading}
            empty={records.length === 0}
            emptyMessage={
              instruments.length === 0
                ? 'No instruments configured yet — add them in Settings.'
                : 'No calibrations recorded in this period.'
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Instrument</th>
                    <th className="px-3 py-2 font-medium">Readings (actual → observed)</th>
                    <th className="px-3 py-2 font-medium">Due date</th>
                    <th className="px-3 py-2 font-medium">Corrective action</th>
                    <th className="px-3 py-2 font-medium">Checked by</th>
                    <th className="px-3 py-2 font-medium">Verdict</th>
                    {canManage && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2">{record.date}</td>
                      <td className="px-3 py-2">{fmt(record.time?.slice(0, 5))}</td>
                      <td className="px-3 py-2">{record.instrument_code}</td>
                      <td className="px-3 py-2">
                        {record.readings.map((reading, index) => (
                          <span
                            key={index}
                            className={
                              reading.is_within_tolerance === false
                                ? 'mr-3 text-destructive'
                                : 'mr-3'
                            }
                          >
                            {reading.actual_value} → {fmt(reading.observed_value)} (
                            {fmt(reading.variation)})
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-2">{fmt(record.due_date)}</td>
                      <td className="px-3 py-2">{fmt(record.corrective_action_label)}</td>
                      <td className="px-3 py-2">{fmt(record.checked_by_name)}</td>
                      <td className="px-3 py-2">
                        {record.is_out_of_calibration ? (
                          <Badge variant="destructive">Out of calibration</Badge>
                        ) : (
                          <Badge variant="secondary">In calibration</Badge>
                        )}
                      </td>
                      {canManage && (
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(record)}
                            aria-label={`Edit ${record.date} calibration`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(record)}
                            aria-label={`Delete ${record.date} calibration`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableState>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {/* Title and buttons stay put; only the fields scroll. */}
        <DialogContent className="max-h-[90vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit calibration' : 'Record a calibration'}</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Label htmlFor="cal-dialog-instrument">Instrument</Label>
                <NativeSelect
                  id="cal-dialog-instrument"
                  value={instrument}
                  disabled={Boolean(editing)}
                  onChange={(event) => onInstrumentPicked(event.target.value)}
                >
                  <SelectOption value="">Select the instrument…</SelectOption>
                  {instruments.map((row) => (
                    <SelectOption key={row.id} value={String(row.id)}>
                      {row.equipment_name} ({row.equipment_id}) — {row.frequency_display}
                    </SelectOption>
                  ))}
                </NativeSelect>
                {selectedInstrument && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Standard: {selectedInstrument.standard_make_model || '—'} · working range{' '}
                    {selectedInstrument.working_range || '—'} · allowed variation ±{' '}
                    {selectedInstrument.tolerance}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="cal-dialog-date">Date</Label>
                <Input
                  id="cal-dialog-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cal-dialog-time">Time</Label>
                <Input
                  id="cal-dialog-time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </div>
              <div className="flex items-end text-sm text-muted-foreground">
                Due date is worked out from the frequency
              </div>
            </div>

            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Actual (standard)</th>
                    <th className="px-3 py-2 font-medium">Observed</th>
                    <th className="px-3 py-2 text-right font-medium">Variation</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                        This instrument has no buffer points configured — add them in Settings.
                      </td>
                    </tr>
                  ) : (
                    readings.map((row, index) => {
                      const variation = variationOf(row);
                      const out = variation !== null && Math.abs(variation) > tolerance;
                      return (
                        <tr key={index} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <Input
                              className="h-8 w-28"
                              value={row.actual_value}
                              onChange={(event) =>
                                setReadingField(index, 'actual_value', event.target.value)
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              className={`h-8 w-28 ${out ? 'border-destructive text-destructive' : ''}`}
                              type="number"
                              step="0.001"
                              value={row.observed_value}
                              onChange={(event) =>
                                setReadingField(index, 'observed_value', event.target.value)
                              }
                            />
                          </td>
                          <td
                            className={`px-3 py-2 text-right ${out ? 'font-semibold text-destructive' : ''}`}
                          >
                            {variation === null ? '—' : variation.toFixed(3)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {anyOutOfTolerance && (
              <p className="text-sm text-destructive">
                A reading is beyond ± {tolerance} — this will be filed as out of calibration.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cal-action">Corrective action</Label>
                <OptionSelect
                  id="cal-action"
                  options={options}
                  category="CALIBRATION_ACTION"
                  value={correctiveAction}
                  onChange={setCorrectiveAction}
                />
              </div>
              <div className="flex items-end gap-2">
                <Checkbox
                  id="cal-replaced"
                  checked={wasReplaced}
                  onCheckedChange={(checked) => setWasReplaced(checked === true)}
                />
                <Label htmlFor="cal-replaced">Equipment was replaced</Label>
              </div>
              <div>
                <Label htmlFor="cal-checked">Checked by</Label>
                <StaffSelect
                  id="cal-checked"
                  staff={staff}
                  role="CHEMIST"
                  value={checkedBy}
                  onChange={setCheckedBy}
                />
              </div>
              <div>
                <Label htmlFor="cal-verified">Verified by</Label>
                <StaffSelect
                  id="cal-verified"
                  staff={staff}
                  role="QAM"
                  value={verifiedBy}
                  onChange={setVerifiedBy}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cal-remarks">Remarks</Label>
                <Input
                  id="cal-remarks"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                />
              </div>
            </div>

            {/* The history of THIS entry, so a correction is always read in
                the context of the day it belongs to. */}
            {editing && <EtpEntryHistory register="CALIBRATION" objectId={editing.id} />}
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createRecord.isPending || updateRecord.isPending}>
              <Beaker className="mr-1 h-4 w-4" />
              {editing ? 'Save changes' : 'Record calibration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
