import { ChevronLeft, ChevronRight, Loader2, Lock, Moon, RotateCcw, Save, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button, Card, CardContent, Checkbox, Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useElectricityDaySheet, useSaveElectricityDaySheet } from '../../api';
import type { DaySheet, DaySheetEntryPayload, DaySheetRow, ReadingShift } from '../../types';
import { fmtDate, fmtRound, fmtUnits, shiftISO, todayISO, toNumber, trimFactor } from './electricityFormat';

const SHIFTS: { value: ReadingShift; label: string; Icon: typeof Sun }[] = [
  { value: 'DAY', label: 'Day', Icon: Sun },
  { value: 'NIGHT', label: 'Night', Icon: Moon },
];

interface Entry {
  closing: string;
  /** Only sent when the chain cannot give it: a first reading, or a reset. */
  opening: string;
  reset: boolean;
  remarks: string;
}

interface DaySheetTabProps {
  canAdd: boolean;
  canEdit: boolean;
}

function entryFor(row: DaySheetRow): Entry {
  return {
    closing: row.reading?.closing_reading ?? '',
    opening: row.reading?.opening_reading ?? '',
    reset: row.reading?.meter_reset ?? false,
    remarks: row.reading?.remarks ?? '',
  };
}

/** The round a reading normally opens on: a night on its day, a day on the night before. */
function roundBefore(date: string, shift: ReadingShift): { date: string; shift: ReadingShift } {
  return shift === 'NIGHT' ? { date, shift: 'DAY' } : { date: shiftISO(date, -1), shift: 'NIGHT' };
}

/** Where the round's reading starts: the chain's previous closing unless reset. */
function openingOf(row: DaySheetRow, entry: Entry): string | null {
  if (entry.reset || (!row.previous && !row.reading)) return entry.opening === '' ? null : entry.opening;
  if (row.reading) return row.reading.opening_reading;
  return row.previous?.closing_reading ?? null;
}

function entriesFrom(sheet: DaySheet | undefined): Record<number, Entry> {
  return Object.fromEntries((sheet?.rows ?? []).map((row) => [row.meter, entryFor(row)]));
}

function errorText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(errorText).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(errorText).join(' ');
  return String(value);
}

/**
 * One round of a day, every meter at once, in tree order. A day is read twice:
 * the day round, then the night round, which opens on the day's closing; the
 * next day opens on the night's closing, or on the day's when the night was not
 * read. The opening is always the previous closing — the chain the split
 * depends on — so the operator types only the closing, and each parent shows at
 * once whether its sub-meters fit inside it.
 */
export function DaySheetTab({ canAdd, canEdit }: DaySheetTabProps) {
  const [date, setDate] = useState(todayISO());
  const [shift, setShift] = useState<ReadingShift>('DAY');
  const { data: sheet, isLoading } = useElectricityDaySheet(date, shift);
  const save = useSaveElectricityDaySheet();
  const [entries, setEntries] = useState<Record<number, Entry>>(() => entriesFrom(sheet));
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  // A new sheet — another day, or the one a save brought back — replaces
  // whatever was typed. Adjusted while rendering rather than in an effect, so
  // the stale entries never paint for a frame.
  const [entriesOf, setEntriesOf] = useState(sheet);
  if (sheet !== entriesOf) {
    setEntriesOf(sheet);
    setEntries(entriesFrom(sheet));
    setRowErrors({});
  }

  const rows = useMemo(() => sheet?.rows ?? [], [sheet]);

  const setEntry = (meterId: number, patch: Partial<Entry>) =>
    setEntries((current) => ({ ...current, [meterId]: { ...current[meterId], ...patch } }));

  const units = useMemo(() => {
    const byMeter = new Map<number, number | null>();
    for (const row of rows) {
      const entry = entries[row.meter];
      if (!entry || entry.closing === '') {
        byMeter.set(row.meter, null);
        continue;
      }
      const opening = openingOf(row, entry);
      byMeter.set(
        row.meter,
        opening == null ? null : (toNumber(entry.closing) - toNumber(opening)) * toNumber(row.multiplying_factor || '1'),
      );
    }
    return byMeter;
  }, [rows, entries]);

  const children = useMemo(() => {
    const map = new Map<number, DaySheetRow[]>();
    for (const row of rows) {
      if (row.parent != null && !row.is_register) map.set(row.parent, [...(map.get(row.parent) ?? []), row]);
    }
    return map;
  }, [rows]);

  const changed = useMemo(
    () =>
      rows.filter((row) => {
        const entry = entries[row.meter];
        if (!entry || entry.closing === '') return false;
        const was = entryFor(row);
        return (
          !row.reading ||
          entry.closing !== was.closing ||
          entry.reset !== was.reset ||
          entry.remarks !== was.remarks ||
          (entry.reset && entry.opening !== was.opening)
        );
      }),
    [rows, entries],
  );

  const readCount = rows.filter((row) => row.reading).length;
  const supply = rows
    .filter((row) => row.parent == null && !row.is_register)
    .reduce((sum, row) => sum + (units.get(row.meter) ?? 0), 0);

  const submit = async () => {
    const payload: DaySheetEntryPayload[] = changed.map((row) => {
      const entry = entries[row.meter];
      const needsOpening = entry.reset || (!row.previous && !row.reading);
      return {
        meter: row.meter,
        closing_reading: entry.closing,
        ...(needsOpening && entry.opening !== '' ? { opening_reading: entry.opening } : {}),
        meter_reset: entry.reset,
        remarks: entry.remarks,
      };
    });
    try {
      const result = await save.mutateAsync({ date, shift, entries: payload });
      toast.success(
        `Saved ${fmtRound(date, shift)} — ${result.created} new, ${result.updated} corrected`,
      );
    } catch (error) {
      const body = (error as { response?: { data?: { errors?: Record<string, unknown> } } })?.response?.data;
      if (body?.errors) {
        setRowErrors(
          Object.fromEntries(Object.entries(body.errors).map(([meterId, value]) => [Number(meterId), errorText(value)])),
        );
      }
    }
  };

  const isToday = date === todayISO();
  // Judged against the round the rows belong to, which is the one asked for.
  const sheetShift = sheet?.shift ?? shift;
  const before = roundBefore(sheet?.date ?? date, sheetShift);

  return (
    <Card className="border-slate-200/80 shadow-sm dark:border-border">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" aria-label="Previous day" onClick={() => setDate(shiftISO(date, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <Label htmlFor="sheet-date">Date</Label>
              <Input id="sheet-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next day"
              disabled={isToday}
              onClick={() => setDate(shiftISO(date, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-2">
              <Label id="sheet-shift">Shift</Label>
              <div
                role="group"
                aria-labelledby="sheet-shift"
                className="flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground"
              >
                {SHIFTS.map(({ value, label, Icon }) => {
                  const read = sheet?.read?.[value];
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={shift === value}
                      onClick={() => setShift(value)}
                      className={cn(
                        'inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        shift === value && 'bg-background text-foreground shadow',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      {read != null && rows.length > 0 && (
                        <span className="text-xs tabular-nums opacity-70">
                          {read}/{rows.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {readCount} of {rows.length} meters read · supply {fmtUnits(supply)} units
          </div>
          {(canAdd || canEdit) && (
            <Button onClick={submit} disabled={changed.length === 0 || save.isPending}>
              {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save {changed.length > 0 ? `${changed.length} reading${changed.length === 1 ? '' : 's'}` : 'sheet'}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          The date the units were used, read twice: the day shift, then the night shift, which opens on the day's
          closing. The next day opens on the night's closing — or on the day's, when the night was not read. Only the
          closing is typed; a reading after skipped days covers all of them and is spread across them on the split.
        </p>

        {isLoading ? (
          <p className="p-6 text-center text-muted-foreground">Loading the sheet…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">No meter is in the tree on {fmtDate(date)}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">Meter</th>
                  <th className="px-3 py-2 text-right font-medium">Opening</th>
                  <th className="px-3 py-2 font-medium">Closing</th>
                  <th className="px-3 py-2 text-right font-medium">MF</th>
                  <th className="px-3 py-2 text-right font-medium">Units</th>
                  <th className="px-3 py-2 font-medium">Check</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const entry = entries[row.meter] ?? entryFor(row);
                  const opening = openingOf(row, entry);
                  const rowUnits = units.get(row.meter) ?? null;
                  const locked = !row.keeps || (row.reading ? !canEdit : !canAdd);
                  const needsOpening = entry.reset || (!row.previous && !row.reading);
                  const kids = children.get(row.meter) ?? [];
                  const kidUnits = kids.reduce((sum, kid) => sum + (units.get(kid.meter) ?? 0), 0);
                  const unreadKids = kids.filter((kid) => units.get(kid.meter) == null).length;
                  const backwards = rowUnits != null && rowUnits < 0;
                  const overRead = rowUnits != null && kids.length > 0 && kidUnits > rowUnits + 0.5;
                  const previous = row.previous;
                  const opensOnGap =
                    previous != null &&
                    !needsOpening &&
                    !row.reading &&
                    (previous.date !== before.date || previous.shift !== before.shift);
                  // A day opening on the previous day's closing: that night was
                  // not read, which is allowed — the day takes the night's units.
                  const nightSkipped =
                    opensOnGap && sheetShift === 'DAY' && previous.date === before.date && previous.shift === 'DAY';
                  return (
                    <tr
                      key={row.meter}
                      className={cn(
                        'border-b border-slate-100 align-top last:border-0 dark:border-border/60',
                        row.is_register && 'bg-muted/20 text-muted-foreground',
                      )}
                    >
                      <td className="px-3 py-2">
                        <div style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
                          <div className="flex items-center gap-1.5 font-medium">
                            {row.depth > 0 && (
                              <span className="text-muted-foreground">{row.is_register ? '↳' : '└'}</span>
                            )}
                            {row.name}
                            {locked && (
                              <Lock
                                className="h-3.5 w-3.5 text-muted-foreground"
                                aria-label={row.keeps ? 'You may not change this reading' : 'Not your meter'}
                              />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.is_register
                              ? `${row.parent_name ?? 'Its meter'}'s second register — read beside it, never counted`
                              : row.split}
                          </div>
                          {rowErrors[row.meter] && <div className="mt-1 text-xs text-red-600">{rowErrors[row.meter]}</div>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {needsOpening && !locked ? (
                          <Input
                            aria-label={`Opening for ${row.name}`}
                            className="ml-auto w-32 text-right"
                            inputMode="decimal"
                            value={entry.opening}
                            placeholder="Opening"
                            onChange={(e) => setEntry(row.meter, { opening: e.target.value })}
                          />
                        ) : (
                          <span title={previous ? `Closing of ${fmtRound(previous.date, previous.shift)}` : undefined}>
                            {opening ?? '—'}
                          </span>
                        )}
                        {opensOnGap &&
                          (nightSkipped ? (
                            <div className="text-xs text-muted-foreground">night not read</div>
                          ) : (
                            <div className="text-xs text-amber-700 dark:text-amber-300">
                              last read {fmtRound(previous.date, previous.shift)}
                            </div>
                          ))}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Input
                            aria-label={`Closing for ${row.name}`}
                            className={cn('w-36', backwards && 'border-red-500')}
                            inputMode="decimal"
                            disabled={locked}
                            value={entry.closing}
                            onChange={(e) => setEntry(row.meter, { closing: e.target.value })}
                          />
                          {!locked && (
                            <label className="flex items-center gap-1 text-xs text-muted-foreground" title="The meter was replaced or its dial reset, so it starts from a new number">
                              <Checkbox
                                aria-label={`Meter reset for ${row.name}`}
                                checked={entry.reset}
                                onCheckedChange={(checked) => setEntry(row.meter, { reset: checked })}
                              />
                              <RotateCcw className="h-3 w-3" />
                            </label>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">×{trimFactor(row.multiplying_factor)}</td>
                      <td className={cn('px-3 py-2 text-right font-medium', backwards && 'text-red-600')}>
                        {rowUnits == null ? '—' : fmtUnits(rowUnits)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {backwards ? (
                          <span className="text-red-600">Closing is below the opening</span>
                        ) : overRead ? (
                          <span className="text-red-600">
                            Sub-meters read {fmtUnits(kidUnits)} — {fmtUnits(kidUnits - (rowUnits ?? 0))} more than this meter
                          </span>
                        ) : kids.length > 0 && rowUnits != null ? (
                          <span className="text-muted-foreground">
                            Sub-meters {fmtUnits(kidUnits)} · rest {fmtUnits(rowUnits - kidUnits)}
                            {unreadKids > 0 && ` · ${unreadKids} not read`}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
