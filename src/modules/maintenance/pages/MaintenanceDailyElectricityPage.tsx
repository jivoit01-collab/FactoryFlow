import { Gauge, Loader2, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { COMPANY_CODE_LIST, COMPANY_LABELS, type CompanyCode } from '@/config/constants';
import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  useCreateDailyElectricityReading,
  useCreateElectricityMeter,
  useDailyElectricityReadings,
  useDeleteDailyElectricityReading,
  useElectricityMeters,
  useUpdateDailyElectricityReading,
  useUpdateElectricityMeter,
} from '../api';
import type { DailyElectricityReading, ElectricityMeter } from '../types';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** "40.0000" reads as ×40; only show decimals when the MF actually has them. */
function trimFactor(factor: string) {
  const value = parseFloat(factor);
  return Number.isFinite(value) ? String(value) : factor;
}

function firstOfMonthISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

const EMPTY_READING_FORM = {
  meter: '',
  date: todayISO(),
  opening_reading: '',
  closing_reading: '',
  rate_per_unit: '',
  multiplying_factor: '',
  remarks: '',
};

const EMPTY_METER_FORM = {
  name: '',
  meter_number: '',
  location: '',
  rate_per_unit: '',
  // Grid MF — left blank the backend keeps it at 1 (dial read as-is).
  multiplying_factor: '',
  // Companies the meter feeds — several for a shared meter, one for a meter on
  // its own supply (Jivo Mart), none if it is not attributed yet.
  company_codes: [] as CompanyCode[],
};

export default function MaintenanceDailyElectricityPage() {
  const { hasPermission } = usePermission();
  // can_manage_daily_electricity stays the legacy superset; each granular right
  // below can also be granted on its own (meter keeper, data-entry operator...).
  const canManageAll = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY);
  const canManageMeters =
    canManageAll || hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_ELECTRICITY_METER);
  const canAddReading =
    canManageAll || hasPermission(MAINTENANCE_PERMISSIONS.ADD_DAILY_ELECTRICITY);
  const canEditReading =
    canManageAll || hasPermission(MAINTENANCE_PERMISSIONS.EDIT_DAILY_ELECTRICITY);
  const canDeleteReading =
    canManageAll || hasPermission(MAINTENANCE_PERMISSIONS.DELETE_DAILY_ELECTRICITY);
  const canRowAction = canEditReading || canDeleteReading;

  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [meterFilter, setMeterFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState<CompanyCode | ''>('');

  // The meter master stays unfiltered so editing a reading always finds its
  // meter; only the readings list narrows by company.
  const { data: meters = [], isLoading: metersLoading } = useElectricityMeters();
  const { data: readings = [], isLoading } = useDailyElectricityReadings({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    meter: meterFilter ? Number(meterFilter) : undefined,
    company: companyFilter || undefined,
  });

  const createReading = useCreateDailyElectricityReading();
  const updateReading = useUpdateDailyElectricityReading();
  const deleteReading = useDeleteDailyElectricityReading();
  const createMeter = useCreateElectricityMeter();
  const updateMeter = useUpdateElectricityMeter();

  const [dialog, setDialog] = useState<'reading' | 'meters' | null>(null);
  const [editingReading, setEditingReading] = useState<DailyElectricityReading | null>(null);
  const [readingForm, setReadingForm] = useState(EMPTY_READING_FORM);
  const [editingMeter, setEditingMeter] = useState<ElectricityMeter | null>(null);
  const [meterForm, setMeterForm] = useState(EMPTY_METER_FORM);

  const activeMeters = useMemo(() => meters.filter((m) => m.is_active), [meters]);

  const totals = useMemo(() => {
    let units = 0;
    let cost = 0;
    for (const r of readings) {
      units += parseFloat(r.units_consumed || '0');
      cost += parseFloat(r.total_cost || '0');
    }
    return { units, cost };
  }, [readings]);

  const selectedMeter = readingForm.meter
    ? meters.find((m) => m.id === Number(readingForm.meter))
    : undefined;
  // What the dial moved, before the multiplying factor.
  const previewDialDiff =
    readingForm.opening_reading !== '' && readingForm.closing_reading !== ''
      ? parseFloat(readingForm.closing_reading) - parseFloat(readingForm.opening_reading)
      : null;
  const previewFactor = readingForm.multiplying_factor !== ''
    ? parseFloat(readingForm.multiplying_factor)
    : selectedMeter
      ? parseFloat(selectedMeter.multiplying_factor)
      : 1;
  // Billed units — what the grid charges for, dial difference × MF.
  const previewUnits =
    previewDialDiff != null && Number.isFinite(previewFactor)
      ? previewDialDiff * previewFactor
      : null;
  const previewRate = readingForm.rate_per_unit !== ''
    ? parseFloat(readingForm.rate_per_unit)
    : selectedMeter
      ? parseFloat(selectedMeter.rate_per_unit)
      : null;
  const previewCost =
    previewUnits != null && previewRate != null ? previewUnits * previewRate : null;

  const openAddReading = () => {
    setEditingReading(null);
    setReadingForm({ ...EMPTY_READING_FORM, date: todayISO() });
    setDialog('reading');
  };

  const openEditReading = (reading: DailyElectricityReading) => {
    setEditingReading(reading);
    setReadingForm({
      meter: String(reading.meter),
      date: reading.date,
      opening_reading: reading.opening_reading,
      closing_reading: reading.closing_reading,
      rate_per_unit: reading.rate_per_unit,
      multiplying_factor: reading.multiplying_factor,
      remarks: reading.remarks || '',
    });
    setDialog('reading');
  };

  const onSelectReadingMeter = (meterId: string) => {
    const meter = meters.find((m) => m.id === Number(meterId));
    setReadingForm((prev) => ({
      ...prev,
      meter: meterId,
      // Prefill for convenience; both stay editable.
      opening_reading: meter?.last_closing_reading ?? prev.opening_reading,
      rate_per_unit: meter?.rate_per_unit ?? prev.rate_per_unit,
      multiplying_factor: meter?.multiplying_factor ?? prev.multiplying_factor,
    }));
  };

  const submitReading = async () => {
    if (!readingForm.meter) {
      toast.error('Select a meter');
      return;
    }
    if (!readingForm.date || readingForm.closing_reading === '') {
      toast.error('Enter the date and closing reading');
      return;
    }
    const payload = {
      meter: Number(readingForm.meter),
      date: readingForm.date,
      opening_reading: readingForm.opening_reading === '' ? undefined : readingForm.opening_reading,
      closing_reading: readingForm.closing_reading,
      rate_per_unit: readingForm.rate_per_unit === '' ? undefined : readingForm.rate_per_unit,
      multiplying_factor:
        readingForm.multiplying_factor === '' ? undefined : readingForm.multiplying_factor,
      remarks: readingForm.remarks,
    };
    try {
      if (editingReading) {
        await updateReading.mutateAsync({ readingId: editingReading.id, payload });
        toast.success('Reading updated');
      } else {
        await createReading.mutateAsync(payload);
        toast.success('Reading recorded');
      }
      setDialog(null);
    } catch {
      /* interceptor surfaces backend detail (duplicate day, closing < opening, …) */
    }
  };

  const removeReading = async (reading: DailyElectricityReading) => {
    if (!window.confirm(`Delete the ${reading.date} reading for ${reading.meter_name}?`)) return;
    try {
      await deleteReading.mutateAsync(reading.id);
      toast.success('Reading deleted');
    } catch {
      toast.error('Failed to delete reading');
    }
  };

  const openEditMeter = (meter: ElectricityMeter) => {
    setEditingMeter(meter);
    setMeterForm({
      name: meter.name,
      meter_number: meter.meter_number,
      location: meter.location,
      rate_per_unit: meter.rate_per_unit,
      multiplying_factor: meter.multiplying_factor,
      company_codes: meter.company_codes ?? [],
    });
  };

  const submitMeter = async () => {
    if (!meterForm.name.trim()) {
      toast.error('Enter the meter name');
      return;
    }
    const payload = {
      name: meterForm.name.trim(),
      meter_number: meterForm.meter_number,
      location: meterForm.location,
      rate_per_unit: meterForm.rate_per_unit === '' ? undefined : meterForm.rate_per_unit,
      multiplying_factor:
        meterForm.multiplying_factor === '' ? undefined : meterForm.multiplying_factor,
      company_codes: meterForm.company_codes,
    };
    try {
      if (editingMeter) {
        await updateMeter.mutateAsync({ meterId: editingMeter.id, payload });
        toast.success('Meter updated');
      } else {
        await createMeter.mutateAsync(payload);
        toast.success('Meter added');
      }
      setEditingMeter(null);
      setMeterForm(EMPTY_METER_FORM);
    } catch {
      /* interceptor handles (e.g. duplicate name) */
    }
  };

  const toggleMeterCompany = (code: CompanyCode) => {
    setMeterForm((prev) => ({
      ...prev,
      company_codes: prev.company_codes.includes(code)
        ? prev.company_codes.filter((c) => c !== code)
        : [...prev.company_codes, code],
    }));
  };

  const toggleMeterActive = async (meter: ElectricityMeter) => {
    try {
      await updateMeter.mutateAsync({
        meterId: meter.id,
        payload: { is_active: !meter.is_active },
      });
      toast.success(meter.is_active ? 'Meter deactivated' : 'Meter activated');
    } catch {
      toast.error('Failed to update meter');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Daily Electricity"
        description="Factory-wide daily meter readings — units and cost per meter"
      >
        {(canManageMeters || canAddReading) && (
          <div className="flex gap-2">
            {canManageMeters && (
              <Button variant="outline" onClick={() => { setEditingMeter(null); setMeterForm(EMPTY_METER_FORM); setDialog('meters'); }}>
                <Gauge className="h-4 w-4 mr-1" /> Meters
              </Button>
            )}
            {canAddReading && (
              <Button onClick={openAddReading} disabled={activeMeters.length === 0 && !metersLoading}>
                <Plus className="h-4 w-4 mr-1" /> Add Reading
              </Button>
            )}
          </div>
        )}
      </DashboardHeader>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div>
            <Label htmlFor="elec-date-from">From</Label>
            <Input
              id="elec-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="elec-date-to">To</Label>
            <Input
              id="elec-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="min-w-[200px]">
            <Label htmlFor="elec-meter-filter">Meter</Label>
            <NativeSelect
              id="elec-meter-filter"
              value={meterFilter}
              onChange={(e) => setMeterFilter(e.target.value)}
            >
              <SelectOption value="">All meters</SelectOption>
              {meters.map((meter) => (
                <SelectOption key={meter.id} value={String(meter.id)}>
                  {meter.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="min-w-[180px]">
            <Label htmlFor="elec-company-filter">Company</Label>
            <NativeSelect
              id="elec-company-filter"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value as CompanyCode | '')}
            >
              <SelectOption value="">All companies</SelectOption>
              {COMPANY_CODE_LIST.map((code) => (
                <SelectOption key={code} value={code}>
                  {COMPANY_LABELS[code]}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="ml-auto flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Total Units: </span>
              <span className="font-semibold">{totals.units.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Cost: </span>
              <span className="font-semibold">
                ₹{totals.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readings table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading readings...</div>
          ) : readings.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-muted-foreground">
              <Zap className="mb-2 h-8 w-8" />
              <p>No readings in this period.</p>
              {canManageMeters && meters.length === 0 && (
                <p className="mt-1 text-sm">Add your meters first via the Meters button.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Meter</th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium text-right">Opening</th>
                    <th className="px-3 py-2 font-medium text-right">Closing</th>
                    <th className="px-3 py-2 font-medium text-right">MF</th>
                    <th className="px-3 py-2 font-medium text-right">Units</th>
                    <th className="px-3 py-2 font-medium text-right">Rate</th>
                    <th className="px-3 py-2 font-medium text-right">Cost</th>
                    <th className="px-3 py-2 font-medium">Entered By</th>
                    <th className="px-3 py-2 font-medium">Remarks</th>
                    {canRowAction && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {readings.map((reading) => (
                    <tr key={reading.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2">{reading.date}</td>
                      <td className="px-3 py-2">{reading.meter_name}</td>
                      <td className="px-3 py-2">
                        {reading.meter_companies_display || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{reading.opening_reading}</td>
                      <td className="px-3 py-2 text-right">{reading.closing_reading}</td>
                      <td className="px-3 py-2 text-right">
                        ×{trimFactor(reading.multiplying_factor)}
                      </td>
                      <td
                        className="px-3 py-2 text-right font-medium"
                        title={`Dial ${reading.dial_difference} × MF ${trimFactor(
                          reading.multiplying_factor,
                        )}`}
                      >
                        {reading.units_consumed}
                      </td>
                      <td className="px-3 py-2 text-right">{reading.rate_per_unit}</td>
                      <td className="px-3 py-2 text-right">{reading.total_cost}</td>
                      <td className="px-3 py-2">{reading.created_by_name}</td>
                      <td className="max-w-[240px] truncate px-3 py-2" title={reading.remarks}>
                        {reading.remarks}
                      </td>
                      {canRowAction && (
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {canEditReading && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Edit ${reading.date} reading for ${reading.meter_name}`}
                              onClick={() => openEditReading(reading)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteReading && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Delete ${reading.date} reading for ${reading.meter_name}`}
                              onClick={() => removeReading(reading)}
                              disabled={deleteReading.isPending}
                            >
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
      </Card>

      {/* Add / Edit reading dialog */}
      <Dialog open={dialog === 'reading'} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReading ? 'Edit Reading' : 'Add Reading'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reading-meter">Meter</Label>
              <NativeSelect
                id="reading-meter"
                value={readingForm.meter}
                onChange={(e) => onSelectReadingMeter(e.target.value)}
                disabled={Boolean(editingReading)}
              >
                <SelectOption value="">Select meter...</SelectOption>
                {activeMeters.map((meter) => (
                  <SelectOption key={meter.id} value={String(meter.id)}>
                    {meter.name}
                    {meter.meter_number ? ` (${meter.meter_number})` : ''}
                  </SelectOption>
                ))}
              </NativeSelect>
              {selectedMeter?.last_reading_date && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last reading {selectedMeter.last_reading_date}: closing{' '}
                  {selectedMeter.last_closing_reading}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="reading-date">Date</Label>
                <Input
                  id="reading-date"
                  type="date"
                  value={readingForm.date}
                  onChange={(e) => setReadingForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="reading-rate">Rate per Unit (₹)</Label>
                <Input
                  id="reading-rate"
                  type="number"
                  step="0.0001"
                  value={readingForm.rate_per_unit}
                  onChange={(e) => setReadingForm((p) => ({ ...p, rate_per_unit: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="reading-factor">Multiplying Factor (MF)</Label>
                <Input
                  id="reading-factor"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={readingForm.multiplying_factor}
                  onChange={(e) =>
                    setReadingForm((p) => ({ ...p, multiplying_factor: e.target.value }))
                  }
                  placeholder="Carried from the meter"
                />
              </div>
              <div>
                <Label htmlFor="reading-opening">Opening Reading</Label>
                <Input
                  id="reading-opening"
                  type="number"
                  step="0.01"
                  value={readingForm.opening_reading}
                  onChange={(e) =>
                    setReadingForm((p) => ({ ...p, opening_reading: e.target.value }))
                  }
                  placeholder="Carried from last closing"
                />
              </div>
              <div>
                <Label htmlFor="reading-closing">Closing Reading</Label>
                <Input
                  id="reading-closing"
                  type="number"
                  step="0.01"
                  value={readingForm.closing_reading}
                  onChange={(e) =>
                    setReadingForm((p) => ({ ...p, closing_reading: e.target.value }))
                  }
                />
              </div>
            </div>
            {previewDialDiff != null && (
              <p
                className={`text-sm ${
                  previewDialDiff < 0 ? 'text-red-600' : 'text-muted-foreground'
                }`}
              >
                {previewDialDiff < 0
                  ? 'Closing reading is less than opening reading.'
                  : `Dial: ${previewDialDiff.toLocaleString()} × MF ${previewFactor.toLocaleString()} = ${
                      previewUnits?.toLocaleString() ?? '—'
                    } units${
                      previewCost != null
                        ? ` · Cost: ₹${previewCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : ''
                    }`}
              </p>
            )}
            <div>
              <Label htmlFor="reading-remarks">Remarks</Label>
              <Textarea
                id="reading-remarks"
                value={readingForm.remarks}
                onChange={(e) => setReadingForm((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="Optional remarks..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={submitReading}
                disabled={createReading.isPending || updateReading.isPending}
              >
                {(createReading.isPending || updateReading.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                {editingReading ? 'Save Reading' : 'Add Reading'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meter master dialog */}
      <Dialog open={dialog === 'meters'} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Electricity Meters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {metersLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : meters.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No meters yet — add the first one below.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Meter No.</th>
                      <th className="px-3 py-2 font-medium">Location</th>
                      <th className="px-3 py-2 font-medium">Company</th>
                      <th className="px-3 py-2 font-medium text-right">MF</th>
                      <th className="px-3 py-2 font-medium text-right">Rate</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {meters.map((meter) => (
                      <tr key={meter.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          {meter.name}
                          {!meter.is_active && (
                            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">{meter.meter_number}</td>
                        <td className="px-3 py-2">{meter.location}</td>
                        <td className="px-3 py-2">
                          {meter.companies_display || (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          ×{trimFactor(meter.multiplying_factor)}
                        </td>
                        <td className="px-3 py-2 text-right">{meter.rate_per_unit}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit meter ${meter.name}`}
                            onClick={() => openEditMeter(meter)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleMeterActive(meter)}>
                            {meter.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-3 text-sm font-medium">
                {editingMeter ? `Edit: ${editingMeter.name}` : 'Add Meter'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="meter-name">Name</Label>
                  <Input
                    id="meter-name"
                    value={meterForm.name}
                    onChange={(e) => setMeterForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Main Incomer"
                  />
                </div>
                <div>
                  <Label htmlFor="meter-number">Meter No.</Label>
                  <Input
                    id="meter-number"
                    value={meterForm.meter_number}
                    onChange={(e) => setMeterForm((p) => ({ ...p, meter_number: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="meter-location">Location</Label>
                  <Input
                    id="meter-location"
                    value={meterForm.location}
                    onChange={(e) => setMeterForm((p) => ({ ...p, location: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="meter-rate">Rate per Unit (₹)</Label>
                  <Input
                    id="meter-rate"
                    type="number"
                    step="0.0001"
                    value={meterForm.rate_per_unit}
                    onChange={(e) => setMeterForm((p) => ({ ...p, rate_per_unit: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="meter-factor">Multiplying Factor (MF)</Label>
                  <Input
                    id="meter-factor"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={meterForm.multiplying_factor}
                    onChange={(e) =>
                      setMeterForm((p) => ({ ...p, multiplying_factor: e.target.value }))
                    }
                    placeholder="1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    The factor the grid gave the factory for this meter — each day&apos;s dial
                    difference is multiplied by it to get the billed units. Leave blank (or 1) if
                    the dial reads true.
                  </p>
                </div>
              </div>
              <fieldset className="mt-3">
                {/* A legend, not a Label: the heading names the group, each
                    checkbox carries its own label. */}
                <legend className="text-sm font-medium leading-none">Companies served</legend>
                <div className="mt-1 flex flex-wrap items-center gap-4">
                  {COMPANY_CODE_LIST.map((code) => (
                    <label key={code} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={`meter-company-${code}`}
                        checked={meterForm.company_codes.includes(code)}
                        onCheckedChange={() => toggleMeterCompany(code)}
                      />
                      {COMPANY_LABELS[code]}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tick every company this meter feeds — a shared meter can serve both Jivo Oil
                  and Jivo Beverages. Jivo Mart runs on its own supply, so its meters are tagged
                  Mart alone.
                </p>
              </fieldset>
              <div className="mt-3 flex justify-end gap-2">
                {editingMeter && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingMeter(null);
                      setMeterForm(EMPTY_METER_FORM);
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  onClick={submitMeter}
                  disabled={createMeter.isPending || updateMeter.isPending}
                >
                  {(createMeter.isPending || updateMeter.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  )}
                  {editingMeter ? 'Save Meter' : 'Add Meter'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
