import { Gauge, Loader2, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { COMPANY_CODE_LIST, COMPANY_LABELS, type CompanyCode } from '@/config/constants';
import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
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

import {
  useCreateDailyElectricityReading,
  useCreateElectricityMeter,
  useDailyElectricityReadings,
  useDeleteDailyElectricityReading,
  useElectricityMeters,
  useUpdateDailyElectricityReading,
  useUpdateElectricityMeter,
} from '../api';
import type { DailyElectricityReading, ElectricityMeter, SupplySource } from '../types';
import { SUPPLY_SOURCE_LABELS, SUPPLY_SOURCE_LIST } from '../types';

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
  // ₹/unit is not edited here — it lives in the admin Cost Master
  // (VALUE rate "meter:<name>"); the API serves the resolved rate.
  // Grid MF — left blank the backend keeps it at 1 (dial read as-is).
  multiplying_factor: '',
  // Companies the meter feeds — several for a shared meter, one for a meter on
  // its own supply (Jivo Mart), none if it is not attributed yet.
  company_codes: [] as CompanyCode[],
  // A main meter is a supply the others are drawn from — read beside the
  // register, never added into it. Which supply it measures matters because the
  // plant swaps between them: grid most days, the DG set when the grid is out.
  is_main: false,
  supply_source: 'GRID' as SupplySource,
  counts_as_supply: true,
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
  // The master list and the add/edit form are two modals, the form stacked on
  // top of the list: the list only lists, and a meter is only ever edited in a
  // dialog of its own.
  const [meterFormOpen, setMeterFormOpen] = useState(false);

  const activeMeters = useMemo(() => meters.filter((m) => m.is_active), [meters]);

  // The main meters are the incoming supply; every other meter measures a
  // slice of that same electricity. So the two are never added together — the
  // mains are listed and totalled on their own, and the register's total is
  // the sub-meters alone.
  const mainReadings = useMemo(() => readings.filter((r) => r.meter_is_main), [readings]);
  const subReadings = useMemo(() => readings.filter((r) => !r.meter_is_main), [readings]);

  const sumReadings = (rows: DailyElectricityReading[]) => {
    let units = 0;
    let cost = 0;
    for (const r of rows) {
      units += parseFloat(r.units_consumed || '0');
      cost += parseFloat(r.total_cost || '0');
    }
    return { units, cost };
  };
  const totals = useMemo(() => sumReadings(subReadings), [subReadings]);

  // The mains are grouped by the supply they measure, never added blind: a day
  // the plant ran off the generator shows a grid meter that barely moved and a
  // DG meter that did all the work, and both figures are the story.
  const supplyGroups = useMemo(() => {
    const groups = new Map<string, { source: string; label: string; counts: boolean; rows: DailyElectricityReading[] }>();
    for (const reading of mainReadings) {
      const source = reading.meter_supply_source || 'GRID';
      // A duplicate main (KVAH measuring KWH a second way) is shown on its own
      // line rather than folded in, so it is never silently added to the grid.
      const key = `${source}:${reading.meter_counts_as_supply ? 'in' : 'out'}`;
      const existing = groups.get(key);
      if (existing) {
        existing.rows.push(reading);
      } else {
        groups.set(key, {
          source,
          label:
            reading.meter_supply_source_display ||
            SUPPLY_SOURCE_LABELS[source as SupplySource] ||
            source,
          counts: reading.meter_counts_as_supply,
          rows: [reading],
        });
      }
    }
    return [...groups.values()].map((group) => ({ ...group, ...sumReadings(group.rows) }));
  }, [mainReadings]);

  // What the factory actually took in: the counted sources added together.
  // Leaving the duplicates out is what makes the sum mean anything.
  const totalSupply = useMemo(
    () => sumReadings(mainReadings.filter((r) => r.meter_counts_as_supply)),
    [mainReadings],
  );

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
    const confirmed = await confirmDialog({
      title: 'Delete reading?',
      description: `The ${reading.date} reading for ${reading.meter_name} will be deleted.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteReading.mutateAsync(reading.id);
      toast.success('Reading deleted');
    } catch {
      toast.error('Failed to delete reading');
    }
  };

  const closeMeterForm = () => {
    setMeterFormOpen(false);
    setEditingMeter(null);
    setMeterForm(EMPTY_METER_FORM);
  };

  const openAddMeter = () => {
    setEditingMeter(null);
    setMeterForm(EMPTY_METER_FORM);
    setMeterFormOpen(true);
  };

  const openEditMeter = (meter: ElectricityMeter) => {
    setEditingMeter(meter);
    setMeterForm({
      name: meter.name,
      meter_number: meter.meter_number,
      location: meter.location,
      multiplying_factor: meter.multiplying_factor,
      company_codes: meter.company_codes ?? [],
      is_main: meter.is_main,
      supply_source: (meter.supply_source || 'GRID') as SupplySource,
      counts_as_supply: meter.counts_as_supply,
    });
    setMeterFormOpen(true);
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
      multiplying_factor:
        meterForm.multiplying_factor === '' ? undefined : meterForm.multiplying_factor,
      company_codes: meterForm.company_codes,
      is_main: meterForm.is_main,
      // Only a main meter measures a supply; the backend clears these for a
      // sub-meter either way, and sending them would only muddy the request.
      supply_source: (meterForm.is_main ? meterForm.supply_source : '') as SupplySource | '',
      counts_as_supply: meterForm.is_main ? meterForm.counts_as_supply : true,
    };
    try {
      if (editingMeter) {
        await updateMeter.mutateAsync({ meterId: editingMeter.id, payload });
        toast.success('Meter updated');
      } else {
        await createMeter.mutateAsync(payload);
        toast.success('Meter added');
      }
      closeMeterForm();
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

  // One markup for both halves of the split: the mains and the sub-meters are
  // the same register, read apart only so the same electricity is not added twice.
  const readingsTable = (rows: DailyElectricityReading[]) => (
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
          {rows.map((reading) => (
            <tr key={reading.id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-sky-50/60 dark:border-border/60 dark:hover:bg-muted/40">
              <td className="whitespace-nowrap px-3 py-2">{reading.date}</td>
              <td className="px-3 py-2">
                {reading.meter_name}
                {reading.meter_is_main && (
                  <span
                    className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                    title="Main meter — an incoming supply, not added to the total"
                  >
                    Main
                    {reading.meter_supply_source_display
                      ? ` · ${reading.meter_supply_source_display}`
                      : ''}
                  </span>
                )}
              </td>
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
  );

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Daily Electricity"
        description="Factory-wide daily meter readings — units and cost per meter"
      >
        {(canManageMeters || canAddReading) && (
          <div className="flex gap-2">
            {canManageMeters && (
              <Button variant="outline" onClick={() => { closeMeterForm(); setDialog('meters'); }}>
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
      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
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
          <div className="ml-auto flex flex-wrap items-center gap-6 text-sm">
            {mainReadings.length > 0 && (
              <div
                className="rounded-lg border border-dashed border-slate-300 bg-slate-50/40 px-3 py-1 dark:border-border dark:bg-muted/10"
                title="Incoming supply — read on its own, not added to the total"
              >
                <span className="text-muted-foreground">Total Supply: </span>
                <span className="font-semibold">{totalSupply.units.toLocaleString()}</span>
                <span className="text-muted-foreground"> units · </span>
                <span className="font-semibold">
                  ₹{totalSupply.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">
                {mainReadings.length > 0 ? 'Sub-meter Units: ' : 'Total Units: '}
              </span>
              <span className="font-semibold">{totals.units.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">
                {mainReadings.length > 0 ? 'Sub-meter Cost: ' : 'Total Cost: '}
              </span>
              <span className="font-semibold">
                ₹{totals.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main meters — the incoming supply, reported apart from the total */}
      {mainReadings.length > 0 && (
        <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
          <CardContent className="p-0">
            <div className="border-b bg-muted/30 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Incoming Supply</p>
                  <p className="text-xs text-muted-foreground">
                    Every other meter draws off these, so they are shown here and left out
                    of the sub-meter total below.
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Supply: </span>
                    <span className="font-semibold">{totalSupply.units.toLocaleString()}</span>
                    <span className="text-muted-foreground"> units</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cost: </span>
                    <span className="font-semibold">
                      ₹{totalSupply.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
              {/* One line per supply. On a day the grid went out this is where
                  it shows: the grid near zero, the DG carrying the plant. */}
              <div className="mt-3 flex flex-wrap gap-2">
                {supplyGroups.map((group) => (
                  <div
                    key={`${group.source}-${group.counts}`}
                    className={`rounded-lg border px-3 py-1 text-sm ${
                      group.counts
                        ? 'border-slate-200/80 bg-background dark:border-border'
                        : 'border-dashed border-slate-300 bg-slate-50/40 text-muted-foreground dark:border-border dark:bg-muted/10'
                    }`}
                    title={
                      group.counts
                        ? undefined
                        : 'Measures a supply another meter already counts — read, but not added in'
                    }
                  >
                    <span className="font-medium">{group.label}</span>
                    {!group.counts && <span> (duplicate)</span>}
                    <span className="text-muted-foreground"> · </span>
                    <span className="font-semibold">{group.units.toLocaleString()}</span>
                    <span className="text-muted-foreground"> units · ₹</span>
                    <span className="font-semibold">
                      {group.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    {group.counts && totalSupply.units > 0 && (
                      // One string, not a run of nodes: "69% of supply" is the
                      // phrase a reader scans for on a day the grid went out.
                      <span className="text-muted-foreground">
                        {` · ${Math.round((group.units / totalSupply.units) * 100)}% of supply`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {readingsTable(mainReadings)}
          </CardContent>
        </Card>
      )}

      {/* Readings table — sub-meters, the ones that add up */}
      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading readings...</div>
          ) : subReadings.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-muted-foreground">
              <Zap className="mb-2 h-8 w-8" />
              <p>
                {mainReadings.length > 0
                  ? 'No sub-meter readings in this period.'
                  : 'No readings in this period.'}
              </p>
              {canManageMeters && meters.length === 0 && (
                <p className="mt-1 text-sm">Add your meters first via the Meters button.</p>
              )}
            </div>
          ) : (
            <>
              {mainReadings.length > 0 && (
                <div className="border-b bg-muted/30 px-4 py-3">
                  <p className="text-sm font-medium">Sub-Meters</p>
                  <p className="text-xs text-muted-foreground">
                    These are the readings that add up to the register total.
                  </p>
                </div>
              )}
              {readingsTable(subReadings)}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit reading dialog */}
      <Dialog open={dialog === 'reading'} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        {/* Scrolls inside itself: the meter picker, six fields, the preview and
            the remarks box are taller than a laptop screen, and a dialog that
            grows past it puts "Add Reading" out of reach. */}
        <DialogContent className="grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingReading ? 'Edit Reading' : 'Add Reading'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
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
                    {meter.is_main ? ' — Main' : ''}
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
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Meter master dialog */}
      <Dialog open={dialog === 'meters'} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        {/* The master list only lists: a long meter list is what this dialog is
            for, so the body scrolls and the title stays put, and adding or
            editing one opens a dialog of its own on top of it. */}
        <DialogContent className="grid max-h-[90vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Electricity Meters</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Every meter the factory reads — edit one to change its factor, supply or the
                companies it feeds.
              </p>
              <Button size="sm" onClick={openAddMeter}>
                <Plus className="h-4 w-4 mr-1" /> New Meter
              </Button>
            </div>
            <div className="overflow-y-auto rounded-xl border border-slate-200/80 bg-card shadow-sm dark:border-border">
              {metersLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : meters.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No meters yet — add the first one with “New Meter”.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Meter No.</th>
                      <th className="px-3 py-2 font-medium">Location</th>
                      <th className="px-3 py-2 font-medium">Company</th>
                      <th className="px-3 py-2 font-medium">Supply</th>
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
                          {meter.is_main && (
                            <span
                              className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              title="Main meter — the incoming supply the others draw from"
                            >
                              Main
                            </span>
                          )}
                          {!meter.is_active && (
                            <span className="ml-2 rounded-full bg-gray-100 dark:bg-muted px-2 py-0.5 text-xs text-gray-600 dark:text-muted-foreground">
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
                        <td className="px-3 py-2">
                          {meter.is_main ? (
                            <>
                              {meter.supply_source_display}
                              {!meter.counts_as_supply && (
                                <span
                                  className="ml-1 text-xs text-muted-foreground"
                                  title="Measures a supply another meter already counts"
                                >
                                  (duplicate)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
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
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Meter — stacked on top of the master list, so the list
          stays where it was and comes back as soon as this closes. */}
      <Dialog open={meterFormOpen} onOpenChange={(open) => { if (!open) closeMeterForm(); }}>
        <DialogContent className="grid max-h-[90vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingMeter ? `Edit: ${editingMeter.name}` : 'Add Meter'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
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
              <div className="flex items-end pb-2 text-xs text-muted-foreground">
                ₹/unit is set on the{' '}
                <Link to="/admin/cost-master" className="mx-1 text-primary underline">
                  Cost Master
                </Link>{' '}
                (value “meter:&lt;name&gt;”).
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
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    id="meter-is-main"
                    checked={meterForm.is_main}
                    onCheckedChange={(checked) =>
                      setMeterForm((p) => ({ ...p, is_main: checked === true }))
                    }
                  />
                  Main (incoming supply) meter
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tick this for the meters a supply comes in on. Every other meter measures
                  a part of that same electricity, so a main meter is listed and totalled on
                  its own and left out of the register total — adding it would count the same
                  units twice.
                </p>
              </div>
              {meterForm.is_main && (
                <>
                  <div>
                    <Label htmlFor="meter-supply-source">Supply</Label>
                    <NativeSelect
                      id="meter-supply-source"
                      value={meterForm.supply_source}
                      onChange={(e) =>
                        setMeterForm((p) => ({
                          ...p,
                          supply_source: e.target.value as SupplySource,
                        }))
                      }
                    >
                      {SUPPLY_SOURCE_LIST.map((source) => (
                        <SelectOption key={source} value={source}>
                          {SUPPLY_SOURCE_LABELS[source]}
                        </SelectOption>
                      ))}
                    </NativeSelect>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Which supply this meter measures. The plant swaps between them — on a
                      day the grid is out the DG carries the load, and the register has to
                      say so rather than show a grid meter that stopped moving.
                    </p>
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        id="meter-counts-as-supply"
                        checked={meterForm.counts_as_supply}
                        onCheckedChange={(checked) =>
                          setMeterForm((p) => ({ ...p, counts_as_supply: checked === true }))
                        }
                      />
                      Counts toward total supply
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Untick a meter that measures a supply another meter already counts —
                      KVAH is the grid&apos;s KWH as apparent energy, so counting both would
                      double the grid.
                    </p>
                  </div>
                </>
              )}
            </div>
            <fieldset>
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
          </DialogBody>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={closeMeterForm}>
              Cancel
            </Button>
            <Button
              onClick={submitMeter}
              disabled={createMeter.isPending || updateMeter.isPending}
            >
              {(createMeter.isPending || updateMeter.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              {editingMeter ? 'Save Meter' : 'Add Meter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
