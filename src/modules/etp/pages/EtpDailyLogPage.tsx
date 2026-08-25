/**
 * Daily plant log — the "Effluent Treatment Plant Record".
 *
 * One row per plant per day: the two flow meters, the pH reading and the energy
 * meter. Opening readings are prefilled from the plant's previous day (and the
 * backend carries them forward even if the operator clears them), so the shift
 * entry is three closing figures and a pH.
 */

import { Droplets, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
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
  Textarea,
} from '@/shared/components/ui';

import {
  etpApi,
  useCreateEtpDailyLog,
  useDeleteEtpDailyLog,
  useEtpDailyLogs,
  useEtpPlants,
  useEtpStaff,
  useUpdateEtpDailyLog,
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
import type { DailyPlantLog } from '../types';
import { useEtpPrintDocument } from '../usePrintDocument';
import { firstOfMonthISO, fmt, todayISO } from '../utils';

const EMPTY_FORM = {
  plant: '',
  date: todayISO(),
  inlet_initial: '',
  inlet_final: '',
  outlet_initial: '',
  outlet_final: '',
  ph_reading: '',
  ph_reading_time: '',
  energy_initial: '',
  energy_final: '',
  operator: '',
  chemist: '',
  remarks: '',
};

/** What the register's TOTAL column shows for a typed pair. */
function preview(initial: string, final: string) {
  if (initial === '' || final === '') return null;
  const difference = Number(final) - Number(initial);
  return Number.isFinite(difference) ? difference : null;
}

export default function EtpDailyLogPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(ETP_PERMISSIONS.MANAGE_DAILY_LOG);

  const [plantFilter, setPlantFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [company, setCompany] = useState<CompanyCode | ''>('');

  const { data: plants = [] } = useEtpPlants({ is_active: true });
  const { data: staff = [] } = useEtpStaff({ is_active: true });
  const { data: logs = [], isLoading } = useEtpDailyLogs({
    plant: plantFilter ? Number(plantFilter) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    company: company || undefined,
  });

  const createLog = useCreateEtpDailyLog();
  const updateLog = useUpdateEtpDailyLog();
  const deleteLog = useDeleteEtpDailyLog();
  const { print, printPortal } = useEtpRegisterPrint();
  // The register's document number comes from the database, not the bundle.
  const printDocument = useEtpPrintDocument();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DailyPlantLog | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const totals = useMemo(
    () =>
      logs.reduce(
        (accumulator, log) => ({
          inlet: accumulator.inlet + Number(log.inlet_total || 0),
          outlet: accumulator.outlet + Number(log.outlet_total || 0),
          energy: accumulator.energy + Number(log.energy_units || 0),
        }),
        { inlet: 0, outlet: 0, energy: 0 },
      ),
    [logs],
  );

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: todayISO(), plant: plantFilter });
    setDialogOpen(true);
    if (plantFilter) void carryForward(plantFilter, todayISO());
  };

  const openEdit = (log: DailyPlantLog) => {
    setEditing(log);
    setForm({
      plant: String(log.plant),
      date: log.date,
      inlet_initial: log.inlet_initial ?? '',
      inlet_final: log.inlet_final ?? '',
      outlet_initial: log.outlet_initial ?? '',
      outlet_final: log.outlet_final ?? '',
      ph_reading: log.ph_reading ?? '',
      ph_reading_time: log.ph_reading_time ?? '',
      energy_initial: log.energy_initial ?? '',
      energy_final: log.energy_final ?? '',
      operator: log.operator ? String(log.operator) : '',
      chemist: log.chemist ? String(log.chemist) : '',
      remarks: log.remarks ?? '',
    });
    setDialogOpen(true);
  };

  /** Pull the plant's previous closing figures into the opening fields. */
  const carryForward = async (plantId: string, date: string) => {
    if (!plantId) return;
    try {
      const previous = await etpApi.getLastReadings(Number(plantId), date || undefined);
      if (!previous.found) return;
      setForm((current) => ({
        ...current,
        inlet_initial: previous.inlet_final ?? current.inlet_initial,
        outlet_initial: previous.outlet_final ?? current.outlet_initial,
        energy_initial: previous.energy_final ?? current.energy_initial,
      }));
    } catch {
      /* prefill is a convenience; the backend carries the openings anyway */
    }
  };

  const onPlantPicked = (plantId: string) => {
    setField('plant', plantId);
    if (!editing) void carryForward(plantId, form.date);
  };

  const submit = async () => {
    if (!form.plant) {
      toast.error('Select the plant');
      return;
    }
    if (!form.date) {
      toast.error('Pick the date');
      return;
    }
    const numberOrNull = (value: string) => (value === '' ? null : value);
    const payload = {
      plant: Number(form.plant),
      date: form.date,
      inlet_initial: numberOrNull(form.inlet_initial),
      inlet_final: numberOrNull(form.inlet_final),
      outlet_initial: numberOrNull(form.outlet_initial),
      outlet_final: numberOrNull(form.outlet_final),
      ph_reading: numberOrNull(form.ph_reading),
      ph_reading_time: form.ph_reading_time || null,
      energy_initial: numberOrNull(form.energy_initial),
      energy_final: numberOrNull(form.energy_final),
      operator: form.operator ? Number(form.operator) : null,
      chemist: form.chemist ? Number(form.chemist) : null,
      remarks: form.remarks,
    };
    try {
      if (editing) {
        await updateLog.mutateAsync({ id: editing.id, payload });
        toast.success('Day updated');
      } else {
        await createLog.mutateAsync(payload);
        toast.success('Day recorded');
      }
      setDialogOpen(false);
    } catch {
      /* the api interceptor surfaces the backend's message */
    }
  };

  const remove = async (log: DailyPlantLog) => {
    if (!window.confirm(`Delete the ${log.date} log for ${log.plant_code}?`)) return;
    try {
      await deleteLog.mutateAsync(log.id);
      toast.success('Entry deleted');
    } catch {
      toast.error('Could not delete the entry');
    }
  };

  const printRegister = () => {
    const plantName = plantFilter
      ? plants.find((plant) => String(plant.id) === plantFilter)?.name
      : 'All plants';
    const { doc, documentId } = printDocument('ETP_DAILY_RECORD');
    print({
      doc,
      documentId,
      title: doc.name,
      orientation: 'landscape',
      headerPairs: [
        ['Plant', plantName ?? '—'],
        ['Period', `${dateFrom} to ${dateTo}`],
        ['Days recorded', String(logs.length)],
        ['Printed on', todayISO()],
      ],
      columnGroups: [
        { label: '', span: 2 },
        { label: 'Inlet flow meter (KL)', span: 3 },
        { label: 'Outlet flow meter (KL)', span: 3 },
        { label: 'pH', span: 1 },
        { label: 'Energy meter', span: 3 },
        { label: '', span: 3 },
      ],
      columns: [
        { label: 'Date' },
        { label: 'Plant' },
        { label: 'Initial', align: 'right' },
        { label: 'Final', align: 'right' },
        { label: 'Total', align: 'right' },
        { label: 'Initial', align: 'right' },
        { label: 'Final', align: 'right' },
        { label: 'Total', align: 'right' },
        { label: 'Reading', align: 'right' },
        { label: 'Initial', align: 'right' },
        { label: 'Final', align: 'right' },
        { label: 'Units', align: 'right' },
        { label: 'Operator' },
        { label: 'Chemist' },
        { label: 'Remarks' },
      ],
      rows: [...logs]
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((log) => [
          log.date,
          log.plant_code,
          log.inlet_initial,
          log.inlet_final,
          log.inlet_total,
          log.outlet_initial,
          log.outlet_final,
          log.outlet_total,
          log.ph_reading,
          log.energy_initial,
          log.energy_final,
          log.energy_units,
          log.operator_name,
          log.chemist_name,
          log.remarks,
        ]),
      totalsRow: [
        'TOTAL',
        '',
        '',
        '',
        totals.inlet.toFixed(2),
        '',
        '',
        totals.outlet.toFixed(2),
        '',
        '',
        '',
        totals.energy.toFixed(2),
        '',
        '',
        '',
      ],
    });
  };

  const inletPreview = preview(form.inlet_initial, form.inlet_final);
  const outletPreview = preview(form.outlet_initial, form.outlet_final);
  const energyPreview = preview(form.energy_initial, form.energy_final);

  return (
    <div className="space-y-6 p-6">
      {printPortal}
      <DashboardHeader
        title="Daily Plant Log"
        description="Inlet / outlet flow, pH and energy meter — the plant's day sheet"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={printRegister} disabled={logs.length === 0}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
          {canManage && (
            <Button onClick={openAdd} disabled={plants.length === 0}>
              <Plus className="mr-1 h-4 w-4" /> Record Day
            </Button>
          )}
        </div>
      </DashboardHeader>

      <RegisterFilterBar
        idPrefix="etp-log"
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
        <FilterTotal label="Inlet" value={`${totals.inlet.toFixed(2)} KL`} />
        <FilterTotal label="Outlet" value={`${totals.outlet.toFixed(2)} KL`} />
        <FilterTotal label="Energy" value={`${totals.energy.toFixed(2)} units`} />
      </RegisterFilterBar>

      <Card>
        <CardContent className="p-0">
          <TableState
            loading={isLoading}
            empty={logs.length === 0}
            emptyMessage="No days recorded in this period."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Plant</th>
                    <th className="px-3 py-2 text-right font-medium">Inlet KL</th>
                    <th className="px-3 py-2 text-right font-medium">Outlet KL</th>
                    <th className="px-3 py-2 text-right font-medium">pH</th>
                    <th className="px-3 py-2 text-right font-medium">Units</th>
                    <th className="px-3 py-2 font-medium">Operator</th>
                    <th className="px-3 py-2 font-medium">Chemist</th>
                    <th className="px-3 py-2 font-medium">Remarks</th>
                    {canManage && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2">{log.date}</td>
                      <td className="px-3 py-2">{log.plant_code}</td>
                      <td className="px-3 py-2 text-right">{log.inlet_total}</td>
                      <td className="px-3 py-2 text-right">{log.outlet_total}</td>
                      <td className="px-3 py-2 text-right">{fmt(log.ph_reading)}</td>
                      <td className="px-3 py-2 text-right">{log.energy_units}</td>
                      <td className="px-3 py-2">{fmt(log.operator_name)}</td>
                      <td className="px-3 py-2">{fmt(log.chemist_name)}</td>
                      <td className="px-3 py-2">{fmt(log.remarks)}</td>
                      {canManage && (
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(log)}
                            aria-label={`Edit ${log.date}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(log)}
                            aria-label={`Delete ${log.date}`}
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
        <DialogContent className="max-h-[90vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${editing.date} — ${editing.plant_code}` : 'Record a day'}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="log-plant">Plant</Label>
                <PlantSelect
                  id="log-plant"
                  plants={plants}
                  value={form.plant}
                  onChange={onPlantPicked}
                  disabled={Boolean(editing)}
                />
              </div>
              <div>
                <Label htmlFor="log-date">Date</Label>
                <Input
                  id="log-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => setField('date', event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3 text-sm font-medium text-muted-foreground">
                Inlet flow meter (KL)
                {inletPreview !== null && (
                  <span className="ml-2 font-normal">→ total {inletPreview.toFixed(2)} KL</span>
                )}
              </div>
              <div>
                <Label htmlFor="log-inlet-initial">Initial</Label>
                <Input
                  id="log-inlet-initial"
                  type="number"
                  step="0.01"
                  value={form.inlet_initial}
                  onChange={(event) => setField('inlet_initial', event.target.value)}
                  placeholder="carried from yesterday"
                />
              </div>
              <div>
                <Label htmlFor="log-inlet-final">Final</Label>
                <Input
                  id="log-inlet-final"
                  type="number"
                  step="0.01"
                  value={form.inlet_final}
                  onChange={(event) => setField('inlet_final', event.target.value)}
                />
              </div>
              <div className="flex items-end text-sm text-muted-foreground">
                Total is worked out for you
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3 text-sm font-medium text-muted-foreground">
                Outlet flow meter (KL)
                {outletPreview !== null && (
                  <span className="ml-2 font-normal">→ total {outletPreview.toFixed(2)} KL</span>
                )}
              </div>
              <div>
                <Label htmlFor="log-outlet-initial">Initial</Label>
                <Input
                  id="log-outlet-initial"
                  type="number"
                  step="0.01"
                  value={form.outlet_initial}
                  onChange={(event) => setField('outlet_initial', event.target.value)}
                  placeholder="carried from yesterday"
                />
              </div>
              <div>
                <Label htmlFor="log-outlet-final">Final</Label>
                <Input
                  id="log-outlet-final"
                  type="number"
                  step="0.01"
                  value={form.outlet_final}
                  onChange={(event) => setField('outlet_final', event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3 text-sm font-medium text-muted-foreground">
                Energy meter
                {energyPreview !== null && (
                  <span className="ml-2 font-normal">→ {energyPreview.toFixed(2)} units</span>
                )}
              </div>
              <div>
                <Label htmlFor="log-energy-initial">Initial</Label>
                <Input
                  id="log-energy-initial"
                  type="number"
                  step="0.01"
                  value={form.energy_initial}
                  onChange={(event) => setField('energy_initial', event.target.value)}
                  placeholder="carried from yesterday"
                />
              </div>
              <div>
                <Label htmlFor="log-energy-final">Final</Label>
                <Input
                  id="log-energy-final"
                  type="number"
                  step="0.01"
                  value={form.energy_final}
                  onChange={(event) => setField('energy_final', event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <Label htmlFor="log-ph">pH reading</Label>
                <Input
                  id="log-ph"
                  type="number"
                  step="0.01"
                  value={form.ph_reading}
                  onChange={(event) => setField('ph_reading', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="log-ph-time">Taken at</Label>
                <Input
                  id="log-ph-time"
                  type="time"
                  value={form.ph_reading_time}
                  onChange={(event) => setField('ph_reading_time', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="log-operator">Operator</Label>
                <StaffSelect
                  id="log-operator"
                  staff={staff}
                  role="OPERATOR"
                  value={form.operator}
                  onChange={(value) => setField('operator', value)}
                />
              </div>
              <div>
                <Label htmlFor="log-chemist">Chemist</Label>
                <StaffSelect
                  id="log-chemist"
                  staff={staff}
                  role="CHEMIST"
                  value={form.chemist}
                  onChange={(value) => setField('chemist', value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="log-remarks">Remarks</Label>
              <Textarea
                id="log-remarks"
                rows={2}
                value={form.remarks}
                onChange={(event) => setField('remarks', event.target.value)}
              />
            </div>

            {/* The history of THIS entry, so a correction is always read in
                the context of the day it belongs to. */}
            {editing && <EtpEntryHistory register="DAILY_LOG" objectId={editing.id} />}
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createLog.isPending || updateLog.isPending}>
              <Droplets className="mr-1 h-4 w-4" />
              {editing ? 'Save changes' : 'Record day'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
