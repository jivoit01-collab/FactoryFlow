/**
 * Daily back washing — the "Daily Back Washing Record".
 *
 * A day is four short rows (sand filter backwash, sand rinse, carbon backwash,
 * carbon rinse), each a start and a stop time. The steps themselves are master
 * data per plant, and "Log today's steps" lays out one row per configured step
 * with its usual duration so the operator only adjusts the clock.
 */

import { Pencil, Plus, Printer, ShowerHead, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { CompanyCode } from '@/config/constants';
import { ETP_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
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
  useCreateEtpBackwashEntry,
  useDeleteEtpBackwashEntry,
  useEtpBackwashEntries,
  useEtpBackwashEquipment,
  useEtpChemicals,
  useEtpPlants,
  useEtpStaff,
  useUpdateEtpBackwashEntry,
} from '../api';
import {
  FilterTotal,
  PlantSelect,
  RegisterFilterBar,
  StaffSelect,
  TableState,
} from '../components/EtpControls';
import { EtpEntryHistory } from '../components/EtpEntryHistory';
import { useEtpRegisterPrint } from '../components/useEtpRegisterPrint';
import type { BackwashEntry } from '../types';
import { useEtpPrintDocument } from '../usePrintDocument';
import { firstOfMonthISO, fmt, todayISO } from '../utils';

const EMPTY_FORM = {
  plant: '',
  date: todayISO(),
  equipment: '',
  chemical: '',
  chemical_quantity: '',
  start_time: '',
  stop_time: '',
  operator: '',
  chemist: '',
  remarks: '',
};

/** "08:20" + 10 minutes → "08:30", for the stop-time prefill. */
function addMinutes(time: string, minutes: number): string {
  if (!time) return '';
  const [hours, mins] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return '';
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function EtpBackwashPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(ETP_PERMISSIONS.MANAGE_BACKWASH);

  const [plantFilter, setPlantFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [company, setCompany] = useState<CompanyCode | ''>('');

  const { data: plants = [] } = useEtpPlants({ is_active: true });
  const { data: staff = [] } = useEtpStaff({ is_active: true });
  const { data: chemicals = [] } = useEtpChemicals({ is_active: true });
  const { data: equipment = [] } = useEtpBackwashEquipment({ is_active: true });
  const { data: entries = [], isLoading } = useEtpBackwashEntries({
    plant: plantFilter ? Number(plantFilter) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    company: company || undefined,
  });

  const createEntry = useCreateEtpBackwashEntry();
  const updateEntry = useUpdateEtpBackwashEntry();
  const deleteEntry = useDeleteEtpBackwashEntry();
  const { print, printPortal } = useEtpRegisterPrint();
  // The register's document number comes from the database, not the bundle.
  const printDocument = useEtpPrintDocument();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BackwashEntry | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const formEquipment = useMemo(
    () => equipment.filter((step) => !form.plant || step.plant === Number(form.plant)),
    [equipment, form.plant],
  );

  const totalMinutes = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.contact_minutes || 0), 0),
    [entries],
  );

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: todayISO(), plant: plantFilter });
    setDialogOpen(true);
  };

  const openEdit = (entry: BackwashEntry) => {
    setEditing(entry);
    setForm({
      plant: String(entry.plant),
      date: entry.date,
      equipment: String(entry.equipment),
      chemical: entry.chemical ? String(entry.chemical) : '',
      chemical_quantity: entry.chemical_quantity ?? '',
      start_time: entry.start_time?.slice(0, 5) ?? '',
      stop_time: entry.stop_time?.slice(0, 5) ?? '',
      operator: entry.operator ? String(entry.operator) : '',
      chemist: entry.chemist ? String(entry.chemist) : '',
      remarks: entry.remarks ?? '',
    });
    setDialogOpen(true);
  };

  /** Picking a step pulls in its usual chemical and duration. */
  const onEquipmentPicked = (equipmentId: string) => {
    const step = equipment.find((row) => String(row.id) === equipmentId);
    setForm((current) => ({
      ...current,
      equipment: equipmentId,
      chemical: step?.default_chemical ? String(step.default_chemical) : current.chemical,
      stop_time:
        step?.default_duration_minutes && current.start_time
          ? addMinutes(current.start_time, step.default_duration_minutes)
          : current.stop_time,
    }));
  };

  const onStartPicked = (value: string) => {
    const step = equipment.find((row) => String(row.id) === form.equipment);
    setForm((current) => ({
      ...current,
      start_time: value,
      stop_time:
        step?.default_duration_minutes && value
          ? addMinutes(value, step.default_duration_minutes)
          : current.stop_time,
    }));
  };

  const submit = async () => {
    if (!form.plant || !form.equipment || !form.date || !form.start_time) {
      toast.error('Plant, step, date and start time are needed');
      return;
    }
    const payload = {
      plant: Number(form.plant),
      date: form.date,
      equipment: Number(form.equipment),
      chemical: form.chemical ? Number(form.chemical) : null,
      chemical_quantity: form.chemical_quantity === '' ? null : form.chemical_quantity,
      start_time: form.start_time,
      stop_time: form.stop_time || null,
      operator: form.operator ? Number(form.operator) : null,
      chemist: form.chemist ? Number(form.chemist) : null,
      remarks: form.remarks,
    };
    try {
      if (editing) {
        await updateEntry.mutateAsync({ id: editing.id, payload });
        toast.success('Step updated');
      } else {
        await createEntry.mutateAsync(payload);
        toast.success('Step logged');
      }
      setDialogOpen(false);
    } catch {
      /* interceptor surfaces the backend's message */
    }
  };

  const remove = async (entry: BackwashEntry) => {
    if (!window.confirm(`Delete ${entry.equipment_name} on ${entry.date}?`)) return;
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast.success('Entry deleted');
    } catch {
      toast.error('Could not delete the entry');
    }
  };

  const printRegister = () => {
    const { doc, documentId } = printDocument('ETP_BACKWASH_RECORD');
    print({
      doc,
      documentId,
      title: doc.name,
      headerPairs: [
        [
          'Plant',
          plantFilter
            ? (plants.find((plant) => String(plant.id) === plantFilter)?.name ?? '—')
            : 'All plants',
        ],
        ['Period', `${dateFrom} to ${dateTo}`],
        ['Steps logged', String(entries.length)],
        ['Printed on', todayISO()],
      ],
      columns: [
        { label: 'Date' },
        { label: 'Name of equipment' },
        { label: 'Type of chemical' },
        { label: 'Start' },
        { label: 'Stop' },
        { label: 'Contact (min)', align: 'right' },
        { label: 'Operator' },
        { label: 'Chemist' },
        { label: 'Remarks' },
      ],
      rows: [...entries]
        .sort(
          (left, right) =>
            left.date.localeCompare(right.date) || left.start_time.localeCompare(right.start_time),
        )
        .map((entry) => [
          entry.date,
          entry.equipment_name,
          entry.chemical_name,
          entry.start_time?.slice(0, 5),
          entry.stop_time?.slice(0, 5),
          entry.contact_minutes,
          entry.operator_name,
          entry.chemist_name,
          entry.remarks,
        ]),
    });
  };

  return (
    <div className="space-y-6 p-6">
      {printPortal}
      <DashboardHeader
        title="Daily Back Washing"
        description="Filter back-wash and rinse steps with their contact times"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={printRegister} disabled={entries.length === 0}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          {canManage && (
            <Button onClick={openAdd} disabled={equipment.length === 0}>
              <Plus className="mr-1 h-4 w-4" /> Log Step
            </Button>
          )}
        </div>
      </DashboardHeader>

      <RegisterFilterBar
        idPrefix="etp-backwash"
        plants={plants}
        plant={plantFilter}
        onPlantChange={setPlantFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        company={company}
        onCompanyChange={setCompany}
      >
        <FilterTotal label="Steps" value={entries.length} />
        <FilterTotal label="Contact time" value={`${totalMinutes} min`} />
      </RegisterFilterBar>

      <Card>
        <CardContent className="p-0">
          <TableState
            loading={isLoading}
            empty={entries.length === 0}
            emptyMessage={
              equipment.length === 0
                ? 'No back-wash steps configured yet — add them in Settings.'
                : 'No back washing logged in this period.'
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Equipment</th>
                    <th className="px-3 py-2 font-medium">Chemical</th>
                    <th className="px-3 py-2 font-medium">Start</th>
                    <th className="px-3 py-2 font-medium">Stop</th>
                    <th className="px-3 py-2 text-right font-medium">Minutes</th>
                    <th className="px-3 py-2 font-medium">Operator</th>
                    <th className="px-3 py-2 font-medium">Chemist</th>
                    {canManage && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2">{entry.date}</td>
                      <td className="px-3 py-2">{entry.equipment_name}</td>
                      <td className="px-3 py-2">{fmt(entry.chemical_name)}</td>
                      <td className="px-3 py-2">{entry.start_time?.slice(0, 5)}</td>
                      <td className="px-3 py-2">{fmt(entry.stop_time?.slice(0, 5))}</td>
                      <td className="px-3 py-2 text-right">{entry.contact_minutes}</td>
                      <td className="px-3 py-2">{fmt(entry.operator_name)}</td>
                      <td className="px-3 py-2">{fmt(entry.chemist_name)}</td>
                      {canManage && (
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(entry)}
                            aria-label={`Edit ${entry.date} ${entry.equipment_name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(entry)}
                            aria-label={`Delete ${entry.date} ${entry.equipment_name}`}
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
            <DialogTitle>{editing ? 'Edit back-wash step' : 'Log a back-wash step'}</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="bw-plant">Plant</Label>
                <PlantSelect
                  id="bw-plant"
                  plants={plants}
                  value={form.plant}
                  onChange={(value) => setField('plant', value)}
                />
              </div>
              <div>
                <Label htmlFor="bw-date">Date</Label>
                <Input
                  id="bw-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => setField('date', event.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bw-equipment">Name of equipment</Label>
                <NativeSelect
                  id="bw-equipment"
                  value={form.equipment}
                  onChange={(event) => onEquipmentPicked(event.target.value)}
                >
                  <SelectOption value="">Select the step…</SelectOption>
                  {formEquipment.map((step) => (
                    <SelectOption key={step.id} value={String(step.id)}>
                      {step.name}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="bw-start">Contact time — start</Label>
                <Input
                  id="bw-start"
                  type="time"
                  value={form.start_time}
                  onChange={(event) => onStartPicked(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bw-stop">Contact time — stop</Label>
                <Input
                  id="bw-stop"
                  type="time"
                  value={form.stop_time}
                  onChange={(event) => setField('stop_time', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bw-chemical">Type of chemical</Label>
                <NativeSelect
                  id="bw-chemical"
                  value={form.chemical}
                  onChange={(event) => setField('chemical', event.target.value)}
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
                <Label htmlFor="bw-chemical-qty">Chemical quantity</Label>
                <Input
                  id="bw-chemical-qty"
                  type="number"
                  step="0.001"
                  value={form.chemical_quantity}
                  onChange={(event) => setField('chemical_quantity', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bw-operator">Operator</Label>
                <StaffSelect
                  id="bw-operator"
                  staff={staff}
                  role="OPERATOR"
                  value={form.operator}
                  onChange={(value) => setField('operator', value)}
                />
              </div>
              <div>
                <Label htmlFor="bw-chemist">Chemist</Label>
                <StaffSelect
                  id="bw-chemist"
                  staff={staff}
                  role="CHEMIST"
                  value={form.chemist}
                  onChange={(value) => setField('chemist', value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bw-remarks">Remarks</Label>
                <Input
                  id="bw-remarks"
                  value={form.remarks}
                  onChange={(event) => setField('remarks', event.target.value)}
                />
              </div>
            </div>

            {/* The history of THIS entry, so a correction is always read in
                the context of the day it belongs to. */}
            {editing && <EtpEntryHistory register="BACKWASH" objectId={editing.id} />}
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createEntry.isPending || updateEntry.isPending}>
              <ShowerHead className="mr-1 h-4 w-4" />
              {editing ? 'Save changes' : 'Log step'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
