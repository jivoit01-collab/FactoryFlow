import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import {
  useCheckShiftSheet,
  useMachines,
  useParseShiftSheet,
  usePreformSpecs,
  useSaveShiftSheet,
} from '../api';
import { SHIFT_LABELS } from '../constants';
import type {
  ParsedShiftSheetRow,
  ShiftCode,
  ShiftSheetParse,
  ShiftSheetPlan,
  ShiftSheetPlanRow,
  ShiftSheetRowInput,
} from '../types';

/** A grid row: what is sent, plus what the upload said about it. */
interface GridRow extends ShiftSheetRowInput {
  key: string;
  /** The SKU as the sheet wrote it, shown when it matched no preform. */
  sku_text?: string;
  /** Where the row came from in the upload, e.g. "Sheet1 line 12". */
  origin?: string;
  notes?: string[];
}

const FIGURES = [
  'total_counter_production',
  'own_labour_count',
  'contract_labour_count',
  'machine_units',
  'utility_units',
  'rejection_pcs',
] as const;
type Figure = (typeof FIGURES)[number];

const FIGURE_LABELS: Record<Figure, string> = {
  total_counter_production: 'Total production',
  own_labour_count: 'Company labour',
  contract_labour_count: 'Outside labour',
  machine_units: 'Total electricity',
  utility_units: 'Utility',
  rejection_pcs: 'Wastage',
};

const WHOLE_NUMBERS: ReadonlySet<Figure> = new Set([
  'total_counter_production',
  'own_labour_count',
  'contract_labour_count',
  'rejection_pcs',
]);

const istDate = (offsetDays = 0) => {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

let keySeed = 0;
const nextKey = () => `row-${++keySeed}`;

function blankRow(from?: GridRow): GridRow {
  return {
    key: nextKey(),
    // A shift missed at the machine is usually last night's.
    date: from?.date ?? istDate(-1),
    shift: from?.shift === 'DAY' ? 'NIGHT' : null,
    preform_spec_id: from?.preform_spec_id ?? null,
    total_counter_production: '',
    own_labour_count: '',
    contract_labour_count: '',
    machine_units: '',
    utility_units: '',
    rejection_pcs: '',
  };
}

function fromParsed(row: ParsedShiftSheetRow): GridRow {
  return {
    key: nextKey(),
    date: row.date ?? '',
    shift: row.shift,
    preform_spec_id: row.preform_spec_id,
    total_counter_production: row.total_counter_production ?? '',
    own_labour_count: row.own_labour_count ?? '',
    contract_labour_count: row.contract_labour_count ?? '',
    machine_units: row.machine_units ?? '',
    utility_units: row.utility_units ?? '',
    rejection_pcs: row.rejection_pcs ?? '',
    sku_text: row.sku_text,
    origin: `${row.sheet} line ${row.line}`,
    notes: row.notes,
  };
}

function toPayload(row: GridRow): ShiftSheetRowInput {
  return {
    date: row.date,
    shift: row.shift,
    preform_spec_id: row.preform_spec_id,
    total_counter_production: row.total_counter_production,
    own_labour_count: row.own_labour_count,
    contract_labour_count: row.contract_labour_count,
    machine_units: row.machine_units,
    utility_units: row.utility_units,
    rejection_pcs: row.rejection_pcs,
    add_anyway: row.add_anyway ?? false,
  };
}

const fmt = (v: string | number | null | undefined, digits = 2) => {
  if (v === null || v === undefined || v === '') return '–';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: digits }) : '–';
};

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

/** "07:56" from the server's IST timestamp. */
const clock = (iso: string | null) => (iso ? iso.slice(11, 16) : null);

const STATUS_BADGE: Record<ShiftSheetPlanRow['status'], string> = {
  NEW: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400',
  DUPLICATE: 'bg-gray-100 dark:bg-muted text-gray-700 dark:text-muted-foreground',
  ERROR: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
};

const cellInput = 'h-8 px-2 text-sm';

/** Input widths sized to the figures each column holds. */
const FIGURE_WIDTH: Record<Figure, string> = {
  total_counter_production: 'w-24',
  own_labour_count: 'w-14',
  contract_labour_count: 'w-14',
  machine_units: 'w-20',
  utility_units: 'w-20',
  rejection_pcs: 'w-16',
};

/**
 * The blowing floor's shift sheet, entered into the app.
 *
 * The person who books blowing runs is not at the machine for every shift — the
 * line runs through the night — so a missed shift reaches them as the floor's
 * Excel. This page takes it in the sheet's own columns: type the rows, or upload
 * the file and the grid fills from it. Many dates, SKUs and shifts can go in
 * at once.
 *
 * Two steps, so a wrong sheet is a wrong screen rather than wrong runs. **Check**
 * shows what each row would become — its run number, its meter readings (the
 * sheet gives units, so each row carries on from the run before it), its cost —
 * and skips any shift the floor already entered in the app. **Save** books the
 * checked rows as completed runs, and only once nothing needs fixing.
 */
function ShiftSheetPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: machines = [] } = useMachines(true);
  const { data: specs = [] } = usePreformSpecs(true);
  const parseSheet = useParseShiftSheet();
  const checkSheet = useCheckShiftSheet();
  const saveSheet = useSaveShiftSheet();

  const [pickedMachine, setPickedMachine] = useState<number | null>(null);
  const [rows, setRows] = useState<GridRow[]>(() => [blankRow()]);
  const [source, setSource] = useState('');
  const [ignored, setIgnored] = useState<ShiftSheetParse['ignored']>([]);
  const [plan, setPlan] = useState<ShiftSheetPlan | null>(null);
  const [planKey, setPlanKey] = useState('');
  // Which grid row each of the plan's rows was made for, so a row added or
  // removed after the check never shows another row's result.
  const [planRowKeys, setPlanRowKeys] = useState<string[]>([]);
  const [booked, setBooked] = useState<NonNullable<ShiftSheetPlan['created']>>([]);

  // One machine is the usual case — use it rather than ask.
  const machineId = pickedMachine ?? (machines.length === 1 ? machines[0].id : null);

  const payload = useMemo(() => rows.map(toPayload), [rows]);
  const currentKey = JSON.stringify({ machineId, payload });
  const fresh = plan !== null && planKey === currentKey;
  const busy = parseSheet.isPending || checkSheet.isPending || saveSheet.isPending;
  const specOptions = useMemo(
    () => specs.map((s) => ({ id: s.id, label: `${s.make} ${Number(s.gram)}g` })),
    [specs],
  );

  function update(key: string, patch: Partial<GridRow>) {
    // What the upload said about a row describes the sheet as read; once the
    // row is edited it no longer applies, and the check says what does.
    setRows((current) =>
      current.map((r) => (r.key === key ? { ...r, ...patch, notes: undefined } : r)),
    );
  }

  function removeRow(key: string) {
    setRows((current) => {
      const left = current.filter((r) => r.key !== key);
      return left.length ? left : [blankRow()];
    });
  }

  async function runCheck(forRows: GridRow[] = rows, forMachine = machineId) {
    if (!forMachine) {
      toast.error('Pick the machine first.');
      return null;
    }
    const body = { machine_id: forMachine, rows: forRows.map(toPayload) };
    try {
      const result = await checkSheet.mutateAsync(body);
      setPlan(result);
      setPlanKey(JSON.stringify({ machineId: forMachine, payload: body.rows }));
      setPlanRowKeys(forRows.map((r) => r.key));
      return result;
    } catch {
      // The API client has already said what went wrong.
      return null;
    }
  }

  async function handleFile(file: File | null) {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    try {
      const parsed = await parseSheet.mutateAsync(file);
      const filled = parsed.rows.map(fromParsed);
      setRows(filled);
      setSource(parsed.file_name);
      setIgnored(parsed.ignored);
      setBooked([]);
      setPlan(null);
      toast.success(
        `${filled.length} shift row${filled.length === 1 ? '' : 's'} read from ${parsed.file_name}.`,
      );
      if (machineId) await runCheck(filled, machineId);
    } catch {
      // The API client has already said why the file could not be read.
    }
  }

  async function handleSave() {
    if (!machineId || !fresh || !plan) return;
    try {
      const result = await saveSheet.mutateAsync({ machine_id: machineId, rows: payload, source });
      const created = result.created ?? [];
      setBooked(created);
      toast.success(`${created.length} run${created.length === 1 ? '' : 's'} saved.`);
      setRows([blankRow()]);
      setPlan(null);
      setIgnored([]);
      setSource('');
    } catch (err) {
      // Refused: the answer carries the plan made under the lock — show it.
      const data = (err as ApiError)?.response?.data as ShiftSheetPlan | undefined;
      if (data?.rows) {
        setPlan(data);
        setPlanKey(currentKey);
        setPlanRowKeys(rows.map((r) => r.key));
      }
    }
  }

  const resultFor = (key: string) => {
    const at = planRowKeys.indexOf(key);
    return at >= 0 ? plan?.rows[at] : undefined;
  };

  /** Ticking "Add anyway" changes what Save would do, so check again at once. */
  function setAddAnyway(key: string, addAnyway: boolean) {
    const next = rows.map((r) => (r.key === key ? { ...r, add_anyway: addAnyway } : r));
    setRows(next);
    void runCheck(next);
  }
  const toBook = fresh ? (plan?.summary.NEW ?? 0) : 0;
  const toFix = fresh ? (plan?.summary.ERROR ?? 0) : 0;
  const canSave = fresh && toBook > 0 && toFix === 0 && !busy;

  return (
    <div className="space-y-6">
      <DashboardHeader title="Blowing Shift Sheet">
        <Button variant="outline" onClick={() => navigate('/production/blowing')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Blowing
        </Button>
      </DashboardHeader>

      {booked.length > 0 && (
        <Card className="border-green-300 dark:border-green-500/40">
          <CardContent className="flex flex-wrap items-center gap-2 py-4 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Saved:</span>
            {booked.map((b) => (
              <Link
                key={b.id}
                to={`/production/blowing/runs/${b.id}`}
                className="rounded-md border px-2 py-0.5 hover:bg-muted"
              >
                {fmtDay(b.date)} {SHIFT_LABELS[b.shift].toLowerCase()} · run {b.run_number}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Sheet</CardTitle>
              <CardDescription>
                The sheet&apos;s own columns. Total electricity is the machine&apos;s units for the
                shift — the meter readings follow on from the run before it.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {machines.length > 1 && (
                <div>
                  <Label htmlFor="ss-machine">Machine</Label>
                  <select
                    id="ss-machine"
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={machineId ?? ''}
                    onChange={(e) =>
                      setPickedMachine(e.target.value ? Number(e.target.value) : null)
                    }
                  >
                    <option value="">Pick the machine</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {machines.length === 1 && (
                <span className="pb-2 text-sm text-muted-foreground">{machines[0].name}</span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xlsm"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                {parseSheet.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Upload sheet
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setRows((current) => [...current, blankRow(current[current.length - 1])])
                }
                disabled={busy}
              >
                <Plus className="mr-2 h-4 w-4" /> Add row
              </Button>
            </div>
          </div>
          {source && (
            <p className="text-xs text-muted-foreground">
              From <span className="font-medium">{source}</span> — check the rows, then save.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th rowSpan={2} className="py-2 pr-2 font-medium">
                    Date
                  </th>
                  <th rowSpan={2} className="py-2 pr-2 font-medium">
                    SKU
                  </th>
                  <th rowSpan={2} className="py-2 pr-2 font-medium">
                    Shift
                  </th>
                  <th rowSpan={2} className="py-2 pr-2 text-right font-medium">
                    Total production
                  </th>
                  <th colSpan={2} className="pt-2 text-center font-medium">
                    Labour
                  </th>
                  <th rowSpan={2} className="py-2 pr-2 text-right font-medium">
                    Total electricity
                  </th>
                  <th rowSpan={2} className="py-2 pr-2 text-right font-medium">
                    Utility
                  </th>
                  <th rowSpan={2} className="py-2 pr-2 text-right font-medium">
                    Wastage
                  </th>
                  <th rowSpan={2} className="py-2 pl-3 font-medium">
                    Becomes
                  </th>
                  <th rowSpan={2} aria-label="Remove row" />
                </tr>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 pr-2 text-right text-xs font-medium">Company</th>
                  <th className="pb-2 pr-2 text-right text-xs font-medium">Outside</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const result = resultFor(row.key);
                  const n = index + 1;
                  const messages = [
                    ...(row.notes ?? []).map((text) => ({ tone: 'note' as const, text })),
                    ...(result?.errors ?? []).map((text) => ({ tone: 'error' as const, text })),
                    ...(result?.warnings ?? []).map((text) => ({ tone: 'warn' as const, text })),
                  ];
                  return (
                    <RowBlock
                      key={row.key}
                      row={row}
                      n={n}
                      result={result}
                      stale={!fresh}
                      messages={messages}
                      specs={specOptions}
                      busy={busy}
                      onChange={(patch) => update(row.key, patch)}
                      onAddAnyway={(value) => setAddAnyway(row.key, value)}
                      onRemove={() => removeRow(row.key)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {!plan
                ? 'Check the rows to see what each becomes. Nothing is saved until you press Save.'
                : !fresh
                  ? 'Changed since the check — check again before saving.'
                  : [
                      `${plan.summary.NEW} to add`,
                      plan.summary.DUPLICATE ? `${plan.summary.DUPLICATE} already in the app` : '',
                      plan.summary.ERROR ? `${plan.summary.ERROR} to fix` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => runCheck()} disabled={busy || !machineId}>
                {checkSheet.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                )}
                Check
              </Button>
              <Button onClick={handleSave} disabled={!canSave}>
                {saveSheet.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save {toBook > 0 ? `${toBook} run${toBook === 1 ? '' : 's'}` : 'runs'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {ignored.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Left out of the upload</CardTitle>
            <CardDescription>
              Lines that were not read as a shift. Add a row by hand if one of them ran.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {ignored.map((item) => (
                <li key={`${item.sheet}-${item.line}`}>
                  <span className="text-muted-foreground">
                    {item.sheet} line {item.line}:
                  </span>{' '}
                  {item.reason}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {plan && plan.existing.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Already in the app on these dates</CardTitle>
            <CardDescription>
              What the floor entered on {plan.machine.name}. A shift here is skipped — the
              floor&apos;s figures stand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Shift</th>
                    <th className="py-2 pr-4 font-medium">Run</th>
                    <th className="py-2 pr-4 font-medium">Preform</th>
                    <th className="py-2 pr-4 text-right font-medium">Production</th>
                    <th className="py-2 pr-4 font-medium">Ran</th>
                    <th className="py-2 pr-4 text-right font-medium">Meter</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.existing.map((run) => (
                    <tr key={run.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{fmtDay(run.date)}</td>
                      <td className="py-2 pr-4">{run.shift ? SHIFT_LABELS[run.shift] : '–'}</td>
                      <td className="py-2 pr-4">
                        <Link
                          to={`/production/blowing/runs/${run.id}`}
                          className="text-primary hover:underline"
                        >
                          #{run.run_number}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{run.preform}</td>
                      <td className="py-2 pr-4 text-right">
                        {fmt(run.total_counter_production, 0)}
                      </td>
                      <td className="py-2 pr-4">
                        {run.started_at
                          ? `${clock(run.started_at)} – ${clock(run.ended_at) ?? '…'}`
                          : 'from a sheet'}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {run.machine_start_reading
                          ? `${fmt(run.machine_start_reading)} → ${fmt(run.machine_stop_reading)}`
                          : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface RowBlockProps {
  row: GridRow;
  n: number;
  result: ShiftSheetPlanRow | undefined;
  stale: boolean;
  messages: Array<{ tone: 'note' | 'error' | 'warn'; text: string }>;
  specs: Array<{ id: number; label: string }>;
  busy: boolean;
  onChange: (patch: Partial<GridRow>) => void;
  onAddAnyway: (value: boolean) => void;
  onRemove: () => void;
}

/** One sheet row: its inputs, what the check made of it, and its messages under it. */
function RowBlock({
  row,
  n,
  result,
  stale,
  messages,
  specs,
  busy,
  onChange,
  onAddAnyway,
  onRemove,
}: RowBlockProps) {
  const unmatched = row.sku_text && row.preform_spec_id === null;
  return (
    <>
      <tr className={messages.length ? '' : 'border-b'}>
        <td className="py-2 pr-2 align-top">
          <Input
            type="date"
            aria-label={`Row ${n} date`}
            className={`${cellInput} w-[8.5rem]`}
            value={row.date}
            max={istDate()}
            onChange={(e) => onChange({ date: e.target.value })}
            disabled={busy}
          />
        </td>
        <td className="py-2 pr-2 align-top">
          <select
            aria-label={`Row ${n} SKU`}
            className="flex h-8 w-36 rounded-md border border-input bg-background px-2 text-sm"
            value={row.preform_spec_id ?? ''}
            onChange={(e) =>
              onChange({ preform_spec_id: e.target.value ? Number(e.target.value) : null })
            }
            disabled={busy}
          >
            <option value="">Pick the preform</option>
            {specs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {unmatched && (
            <p className="mt-1 max-w-36 truncate text-xs text-amber-700 dark:text-amber-400">
              Sheet: {row.sku_text}
            </p>
          )}
        </td>
        <td className="py-2 pr-2 align-top">
          <select
            aria-label={`Row ${n} shift`}
            className="flex h-8 w-[5.5rem] rounded-md border border-input bg-background px-2 text-sm"
            value={row.shift ?? ''}
            onChange={(e) => onChange({ shift: (e.target.value || null) as ShiftCode | null })}
            disabled={busy}
          >
            <option value="">Pick</option>
            <option value="DAY">{SHIFT_LABELS.DAY}</option>
            <option value="NIGHT">{SHIFT_LABELS.NIGHT}</option>
          </select>
        </td>
        {FIGURES.map((field) => (
          <td key={field} className="py-2 pr-2 align-top">
            <Input
              type="number"
              inputMode={WHOLE_NUMBERS.has(field) ? 'numeric' : 'decimal'}
              step={WHOLE_NUMBERS.has(field) ? 1 : 'any'}
              min={0}
              aria-label={`Row ${n} ${FIGURE_LABELS[field].toLowerCase()}`}
              className={`${cellInput} ${FIGURE_WIDTH[field]} text-right`}
              value={row[field]}
              onChange={(e) => onChange({ [field]: e.target.value })}
              disabled={busy}
            />
          </td>
        ))}
        <td className={`min-w-[10rem] py-2 pl-3 align-top ${stale ? 'opacity-50' : ''}`}>
          <Outcome result={result} row={row} onAddAnyway={onAddAnyway} busy={busy} />
        </td>
        <td className="py-2 align-top">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Remove row ${n}`}
            onClick={onRemove}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
      {messages.length > 0 && (
        <tr className="border-b">
          <td colSpan={11} className={`pb-2 ${stale ? 'opacity-60' : ''}`}>
            <ul className="space-y-0.5 text-xs">
              {row.origin && <li className="text-muted-foreground">{row.origin}</li>}
              {messages.map((m, i) => (
                <li
                  key={i}
                  className={
                    m.tone === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }
                >
                  {m.text}
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

function Outcome({
  result,
  row,
  onAddAnyway,
  busy,
}: {
  result: ShiftSheetPlanRow | undefined;
  row: GridRow;
  onAddAnyway: (value: boolean) => void;
  busy: boolean;
}) {
  if (!result) return <span className="text-xs text-muted-foreground">Not checked</span>;
  if (result.status === 'ERROR') {
    return <Badge className={`${STATUS_BADGE.ERROR} whitespace-nowrap`}>Fix the row</Badge>;
  }
  if (result.status === 'DUPLICATE') {
    const twin = result.duplicate_of;
    return (
      <div className="space-y-1 text-xs">
        <Badge className={`${STATUS_BADGE.DUPLICATE} whitespace-nowrap`}>Already in the app</Badge>
        {twin && (
          <p>
            <Link
              to={`/production/blowing/runs/${twin.id}`}
              className="text-primary hover:underline"
            >
              Run #{twin.run_number}
            </Link>{' '}
            · {fmt(twin.total_counter_production, 0)} bottles
          </p>
        )}
        <label className="flex items-center gap-1.5 text-muted-foreground">
          <input
            type="checkbox"
            checked={row.add_anyway ?? false}
            onChange={(e) => onAddAnyway(e.target.checked)}
            disabled={busy}
          />
          Add anyway
        </label>
      </div>
    );
  }
  return (
    <div className="space-y-0.5 text-xs">
      <Badge className={STATUS_BADGE.NEW}>Run #{result.run_number}</Badge>
      <p className="tabular-nums text-muted-foreground">
        Meter {fmt(result.machine_start_reading)} → {fmt(result.machine_stop_reading)}
      </p>
      {result.blowing_cost_per_bottle !== null && (
        <p className="tabular-nums text-muted-foreground">
          ₹{fmt(result.blowing_cost_per_bottle, 4)}/bottle blowing
        </p>
      )}
    </div>
  );
}

export default ShiftSheetPage;
