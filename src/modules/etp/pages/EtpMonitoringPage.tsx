/**
 * On-line monitoring — the "ETP On Line Monitoring Record".
 *
 * The paper form is a grid: a row every two hours, columns grouped by sampling
 * point (influent / aeration / treated). Both are configuration — the columns
 * come from the plant's monitoring parameters and the rows from the sampling
 * interval — so a plant that samples hourly, or measures COD as well, needs no
 * code change.
 *
 * The whole day is saved in one call (the API replaces the sheet's rows), which
 * is how an operator thinks about the page they are filling. The grid itself is
 * a keyed child component so switching plant or date remounts it with the saved
 * sheet as its initial state, rather than syncing state in an effect.
 */

import { CheckCircle2, Gauge, Printer, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ETP_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  useCreateEtpMonitoringRecord,
  useEtpMonitoringRecords,
  useEtpPlants,
  useEtpSheetTemplate,
  useEtpStaff,
  useUpdateEtpMonitoringRecord,
  useVerifyEtpMonitoringRecord,
} from '../api';
import { PlantSelect, StaffSelect } from '../components/EtpControls';
import { EtpEntryHistory } from '../components/EtpEntryHistory';
import { useEtpRegisterPrint } from '../components/useEtpRegisterPrint';
import {
  MONITORING_STAGE_LABELS,
  type MonitoringParameter,
  type MonitoringRecord,
  type MonitoringStage,
  type PlantStaff,
  type TreatmentPlant,
} from '../types';
import { useEtpPrintDocument } from '../usePrintDocument';
import { todayISO } from '../utils';

/** One editable row of the sheet: a time, an operator and a value per column. */
interface GridRow {
  time: string;
  operator: string;
  values: Record<number, string>;
}

/** Is the typed value outside the parameter's configured limits? */
function outOfSpec(parameter: MonitoringParameter, raw: string): boolean {
  if (raw === '' || parameter.validation_type === 'NONE') return false;
  const value = Number(raw);
  if (!Number.isFinite(value)) return false;
  const low = parameter.min_value === null ? null : Number(parameter.min_value);
  const high = parameter.max_value === null ? null : Number(parameter.max_value);
  if (parameter.validation_type === 'MIN') return low !== null && value < low;
  if (parameter.validation_type === 'MAX') return high !== null && value > high;
  return (low !== null && value < low) || (high !== null && value > high);
}

function specLabel(parameter: MonitoringParameter): string {
  if (parameter.specification_text) return parameter.specification_text;
  if (parameter.min_value !== null && parameter.max_value !== null) {
    return `${parameter.min_value}–${parameter.max_value}`;
  }
  if (parameter.min_value !== null) return `≥ ${parameter.min_value}`;
  if (parameter.max_value !== null) return `≤ ${parameter.max_value}`;
  return '';
}

/** Group the columns by sampling point, keeping the configured order. */
function groupByStage(parameters: MonitoringParameter[]) {
  const groups: { stage: MonitoringStage; parameters: MonitoringParameter[] }[] = [];
  parameters.forEach((parameter) => {
    const existing = groups.find((group) => group.stage === parameter.stage);
    if (existing) existing.parameters.push(parameter);
    else groups.push({ stage: parameter.stage, parameters: [parameter] });
  });
  return groups;
}

function initialRows(record: MonitoringRecord | undefined, timeSlots: string[]): GridRow[] {
  if (record) {
    return record.readings.map((reading) => ({
      time: reading.reading_time.slice(0, 5),
      operator: reading.operator ? String(reading.operator) : '',
      values: Object.fromEntries(
        reading.values.map((value) => [value.parameter, value.value ?? '']),
      ),
    }));
  }
  return timeSlots.map((slot) => ({ time: slot, operator: '', values: {} }));
}

interface SheetEditorProps {
  plant: TreatmentPlant;
  date: string;
  intervalHours: number;
  parameters: MonitoringParameter[];
  timeSlots: string[];
  record?: MonitoringRecord;
  staff: PlantStaff[];
  canManage: boolean;
  canVerify: boolean;
}

/**
 * The day's grid. Mounted with a key of plant + date + record, so its initial
 * state is simply the saved sheet (or the blank slots) — no effect needed.
 */
function SheetEditor({
  plant,
  date,
  intervalHours,
  parameters,
  timeSlots,
  record,
  staff,
  canManage,
  canVerify,
}: SheetEditorProps) {
  const [rows, setRows] = useState<GridRow[]>(() => initialRows(record, timeSlots));
  const [chemist, setChemist] = useState(record?.chemist ? String(record.chemist) : '');
  const [verifier, setVerifier] = useState(record?.verified_by ? String(record.verified_by) : '');
  const [remarks, setRemarks] = useState(record?.remarks ?? '');

  const createRecord = useCreateEtpMonitoringRecord();
  const updateRecord = useUpdateEtpMonitoringRecord();
  const verifyRecord = useVerifyEtpMonitoringRecord();
  const { print, printPortal } = useEtpRegisterPrint();
  // The register's document number comes from the database, not the bundle.
  const printDocument = useEtpPrintDocument();

  const stageGroups = useMemo(() => groupByStage(parameters), [parameters]);

  const flaggedCount = useMemo(
    () =>
      rows.reduce(
        (count, row) =>
          count +
          parameters.filter((parameter) => outOfSpec(parameter, row.values[parameter.id] ?? ''))
            .length,
        0,
      ),
    [rows, parameters],
  );

  const setCell = (rowIndex: number, parameterId: number, value: string) =>
    setRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? { ...row, values: { ...row.values, [parameterId]: value } } : row,
      ),
    );

  const setRowField = (rowIndex: number, key: 'time' | 'operator', value: string) =>
    setRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );

  const addRow = () => setRows((current) => [...current, { time: '', operator: '', values: {} }]);

  const removeRow = (rowIndex: number) =>
    setRows((current) => current.filter((_, index) => index !== rowIndex));

  const save = async () => {
    // Only rows that carry a time and at least one value are part of the sheet;
    // an untouched slot stays blank exactly as it does on paper.
    const readings = rows
      .filter((row) => row.time)
      .map((row) => ({
        reading_time: row.time,
        operator: row.operator ? Number(row.operator) : null,
        values: parameters
          .filter((parameter) => (row.values[parameter.id] ?? '') !== '')
          .map((parameter) => ({
            parameter: parameter.id,
            value: row.values[parameter.id],
          })),
      }))
      .filter((reading) => reading.values.length > 0);

    if (readings.length === 0) {
      toast.error('Enter at least one reading');
      return;
    }

    const payload = {
      plant: plant.id,
      date,
      interval_hours: intervalHours,
      chemist: chemist ? Number(chemist) : null,
      remarks,
      readings,
    };
    try {
      if (record) {
        await updateRecord.mutateAsync({ id: record.id, payload });
        toast.success('Sheet updated');
      } else {
        await createRecord.mutateAsync(payload);
        toast.success('Sheet saved');
      }
    } catch {
      /* interceptor surfaces the backend's message */
    }
  };

  const verify = async () => {
    if (!record) return;
    try {
      await verifyRecord.mutateAsync({
        id: record.id,
        verifiedBy: verifier ? Number(verifier) : null,
      });
      toast.success('Sheet verified');
    } catch {
      toast.error('Could not verify the sheet');
    }
  };

  const printSheet = () => {
    const { doc, documentId } = printDocument('ETP_MONITORING_RECORD');
    print({
      doc,
      documentId,
      title: doc.name,
      orientation: 'landscape',
      headerPairs: [
        ['Plant', `${plant.code} — ${plant.name}`],
        ['Date', date],
        ['Frequency', `Every ${intervalHours} hour(s)`],
        ['Out of spec', String(flaggedCount)],
      ],
      columnGroups: [
        { label: '', span: 1 },
        ...stageGroups.map((group) => ({
          label: MONITORING_STAGE_LABELS[group.stage],
          span: group.parameters.length,
        })),
        { label: '', span: 1 },
      ],
      columns: [
        { label: 'Time' },
        ...parameters.map((parameter) => ({
          label: `${parameter.parameter_name}${parameter.unit ? ` (${parameter.unit})` : ''}`,
          align: 'right' as const,
        })),
        { label: 'Operator' },
      ],
      rows: rows
        .filter((row) => row.time)
        .map((row) => [
          row.time,
          ...parameters.map((parameter) => ({
            text: row.values[parameter.id] ?? '',
            flag: outOfSpec(parameter, row.values[parameter.id] ?? ''),
          })),
          staff.find((person) => String(person.id) === row.operator)?.name ?? '',
        ]),
      signatures: [
        ['QA Chemist', staff.find((person) => String(person.id) === chemist)?.name ?? ''],
        [
          'QAM (verified)',
          record?.is_verified ? record.verified_by_name || 'verified' : 'not verified',
        ],
        ['Remarks', remarks],
      ],
      note:
        'Specifications: ' +
        (parameters
          .filter((parameter) => specLabel(parameter))
          .map(
            (parameter) =>
              `${MONITORING_STAGE_LABELS[parameter.stage]} ${parameter.parameter_name} ${specLabel(
                parameter,
              )}`,
          )
          .join('; ') || 'not configured'),
    });
  };

  return (
    <div className="space-y-4">
      {printPortal}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="min-w-[180px]">
            <Label htmlFor="mon-chemist">QA Chemist</Label>
            <StaffSelect
              id="mon-chemist"
              staff={staff}
              role="CHEMIST"
              value={chemist}
              onChange={setChemist}
            />
          </div>
          {canVerify && (
            <div className="min-w-[180px]">
              <Label htmlFor="mon-verifier">QAM</Label>
              <StaffSelect
                id="mon-verifier"
                staff={staff}
                role="QAM"
                value={verifier}
                onChange={setVerifier}
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {flaggedCount > 0 && <Badge variant="destructive">{flaggedCount} out of spec</Badge>}
            {record?.is_verified && (
              <Badge variant="secondary">Verified {record.verified_by_name}</Badge>
            )}
            <Button variant="outline" onClick={printSheet}>
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
            {canVerify && record && !record.is_verified && (
              <Button variant="outline" onClick={verify}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Verify
              </Button>
            )}
            {canManage && (
              <Button onClick={save} disabled={createRecord.isPending || updateRecord.isPending}>
                <Save className="mr-1 h-4 w-4" /> {record ? 'Save changes' : 'Save sheet'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-left font-medium">Time</th>
                  {stageGroups.map((group) => (
                    <th
                      key={group.stage}
                      colSpan={group.parameters.length}
                      className="border-l px-2 py-2 text-center font-medium"
                    >
                      {MONITORING_STAGE_LABELS[group.stage]}
                    </th>
                  ))}
                  <th className="border-l px-2 py-2 text-left font-medium">Operator</th>
                  {canManage && <th className="px-2 py-2" />}
                </tr>
                <tr className="border-b bg-muted/30 text-xs">
                  <th />
                  {parameters.map((parameter) => (
                    <th key={parameter.id} className="border-l px-2 py-1 font-medium">
                      {parameter.parameter_name}
                      {parameter.unit ? ` (${parameter.unit})` : ''}
                      {specLabel(parameter) && (
                        <div className="font-normal text-muted-foreground">
                          {specLabel(parameter)}
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="border-l" />
                  {canManage && <th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`${row.time}-${rowIndex}`} className="border-b last:border-0">
                    <td className="px-2 py-1">
                      <Input
                        type="time"
                        className="h-8 w-28"
                        value={row.time}
                        disabled={!canManage}
                        onChange={(event) => setRowField(rowIndex, 'time', event.target.value)}
                      />
                    </td>
                    {parameters.map((parameter) => {
                      const value = row.values[parameter.id] ?? '';
                      const flagged = outOfSpec(parameter, value);
                      return (
                        <td key={parameter.id} className="border-l px-1 py-1">
                          <Input
                            type="number"
                            step="0.001"
                            className={`h-8 w-20 text-right ${
                              flagged ? 'border-destructive text-destructive' : ''
                            }`}
                            value={value}
                            disabled={!canManage}
                            onChange={(event) =>
                              setCell(rowIndex, parameter.id, event.target.value)
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="border-l px-1 py-1">
                      <StaffSelect
                        id={`mon-row-operator-${rowIndex}`}
                        staff={staff}
                        role="OPERATOR"
                        value={row.operator}
                        onChange={(value) => setRowField(rowIndex, 'operator', value)}
                        placeholder="—"
                      />
                    </td>
                    {canManage && (
                      <td className="px-1 py-1 text-right">
                        <Button size="sm" variant="ghost" onClick={() => removeRow(rowIndex)}>
                          ✕
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {canManage && (
              <div className="border-t p-3">
                <Button size="sm" variant="outline" onClick={addRow}>
                  Add a reading time
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Label htmlFor="mon-remarks">Remarks</Label>
          <Textarea
            id="mon-remarks"
            rows={2}
            value={remarks}
            disabled={!canManage}
            onChange={(event) => setRemarks(event.target.value)}
          />
        </CardContent>
      </Card>

      {/* The history of this day's sheet, under the sheet itself. */}
      {record && <EtpEntryHistory register="MONITORING" objectId={record.id} />}
    </div>
  );
}

export default function EtpMonitoringPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(ETP_PERMISSIONS.MANAGE_MONITORING);
  const canVerify = hasPermission(ETP_PERMISSIONS.VERIFY_MONITORING);

  const [plantId, setPlantId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [intervalHours, setIntervalHours] = useState('2');
  const [startHour, setStartHour] = useState('6');

  const { data: plants = [] } = useEtpPlants({ is_active: true });
  const { data: staff = [] } = useEtpStaff({ is_active: true });
  const { data: template, isLoading: templateLoading } = useEtpSheetTemplate({
    plant: plantId ? Number(plantId) : undefined,
    interval_hours: Number(intervalHours) || 2,
    start_hour: Number(startHour) || 0,
  });
  const { data: records = [], isLoading: recordLoading } = useEtpMonitoringRecords({
    plant: plantId ? Number(plantId) : undefined,
    date: date || undefined,
  });

  const plant = plants.find((row) => String(row.id) === plantId);
  const record = records[0];
  const parameters = template?.parameters ?? [];
  const loading = templateLoading || recordLoading;

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="On-line Monitoring"
        description="Two-hourly pH / TDS / DO readings across the plant's sampling points"
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="min-w-[220px]">
            <Label htmlFor="mon-plant">Plant</Label>
            <PlantSelect id="mon-plant" plants={plants} value={plantId} onChange={setPlantId} />
          </div>
          <div>
            <Label htmlFor="mon-date">Date</Label>
            <Input
              id="mon-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="w-32">
            <Label htmlFor="mon-interval">Every (hours)</Label>
            <NativeSelect
              id="mon-interval"
              value={intervalHours}
              onChange={(event) => setIntervalHours(event.target.value)}
            >
              {['1', '2', '3', '4', '6', '8', '12'].map((hours) => (
                <SelectOption key={hours} value={hours}>
                  {hours}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="w-32">
            <Label htmlFor="mon-start">Starts at</Label>
            <NativeSelect
              id="mon-start"
              value={startHour}
              onChange={(event) => setStartHour(event.target.value)}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <SelectOption key={hour} value={String(hour)}>
                  {String(hour).padStart(2, '0')}:00
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <p className="ml-auto max-w-sm text-xs text-muted-foreground">
            Changing the frequency re-lays the blank sheet; a saved sheet keeps the times it was
            filled at.
          </p>
        </CardContent>
      </Card>

      {!plantId || !plant ? (
        <Card>
          <CardContent className="flex flex-col items-center p-10 text-muted-foreground">
            <Gauge className="mb-2 h-8 w-8" />
            <p>Pick a plant to open its sheet.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading the sheet…
          </CardContent>
        </Card>
      ) : parameters.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            This plant has no monitoring parameters configured yet — add them in Settings.
          </CardContent>
        </Card>
      ) : (
        <SheetEditor
          // Remounting on any of these makes the saved sheet the initial state.
          key={`${plantId}-${date}-${record?.id ?? 'new'}-${template?.time_slots.length ?? 0}`}
          plant={plant}
          date={date}
          intervalHours={Number(intervalHours) || 2}
          parameters={parameters}
          timeSlots={template?.time_slots ?? []}
          record={record}
          staff={staff}
          canManage={canManage}
          canVerify={canVerify}
        />
      )}
    </div>
  );
}
