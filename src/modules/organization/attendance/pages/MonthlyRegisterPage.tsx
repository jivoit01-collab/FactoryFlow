/**
 * The monthly attendance register — the muster roll.
 *
 * The daily sheet answers "who turned up today". This answers "what did
 * September look like", which is the shape payroll is run from and the only way
 * a pattern is visible at all: a man who is MISSING_PUNCH every Tuesday is
 * invisible one page at a time and obvious across a row.
 *
 * **A blank cell and an absent cell are different facts**, and the grid keeps
 * them apart. A day nobody has synced is a faint dot; an absence is a red `A`.
 * Collapsing the two would invent a fortnight of absences for three hundred
 * people every time the LAN to the punch box drops — the same confusion the
 * daily sheet's banner exists to prevent, which is why that banner is here too.
 *
 * Cells carry only an id and a letter, because a month is ~7,600 of them. The
 * correction dialog needs the whole row — punch times, reason, who — so a click
 * fetches that one row first and then opens the very same dialog the daily
 * sheet uses. There is no second correction path to keep in step.
 */
import { AlertTriangle, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ATTENDANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Badge, Button, Card, CardContent, Input, Label, Switch } from '@/shared/components/ui';

import { useAttendanceRow, useAttendanceSourceStatus, useMuster } from '../api';
import type { AttendanceStatusValue, MusterRow } from '../api/attendance.api';
import { attendanceApi } from '../api/attendance.api';
import { OverrideDialog } from '../components/OverrideDialog';
import { STATUS_STYLES, statusLabel } from '../components/statusBits';
import { cellKind, cellLetter, currentMonth, monthLabel, saveBlob } from '../utils';

/** The order the totals columns read in, widest concept last. */
const TOTAL_ORDER: AttendanceStatusValue[] = [
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'MISSING_PUNCH',
  'ON_LEAVE',
  'WEEKLY_OFF',
];

export default function MonthlyRegisterPage() {
  const { hasPermission } = usePermission();
  const canOverride = hasPermission(ATTENDANCE_PERMISSIONS.OVERRIDE);

  const [month, setMonth] = useState(currentMonth());
  const [search, setSearch] = useState('');
  const [openRowId, setOpenRowId] = useState<number | null>(null);
  // Off by default, like the daily sheet. Turn it on to settle a leaver's
  // final month -- the days they worked are still on the register, and this is
  // the only way back to them from the app.
  const [includeInactive, setIncludeInactive] = useState(false);

  const filters = useMemo(
    () => ({
      month,
      search: search.trim() || undefined,
      include_inactive: includeInactive,
      page_size: 500,
    }),
    [month, search, includeInactive],
  );
  const muster = useMuster(filters);
  const source = useAttendanceSourceStatus().data;

  // The grid is too small to open the dialog with; the row is fetched on click.
  const openRow = useAttendanceRow(openRowId);

  const days = useMemo(
    () => Array.from({ length: muster.data?.days_in_month ?? 0 }, (_, i) => i + 1),
    [muster.data?.days_in_month],
  );

  // The export already honours date_from/date_to, so a month costs nothing
  // beyond handing it the register's own bounds.
  const [isExporting, setIsExporting] = useState(false);
  const handleExport = async () => {
    const dateFrom = muster.data?.date_from;
    const dateTo = muster.data?.date_to;
    if (!dateFrom || !dateTo) return;
    setIsExporting(true);
    try {
      const blob = await attendanceApi.exportXlsx({ date_from: dateFrom, date_to: dateTo });
      saveBlob(blob, `attendance_${month}.xlsx`);
    } catch {
      toast.error('Could not export attendance');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Attendance register</h1>
          <p className="text-sm text-muted-foreground">
            {monthLabel(month)} · {muster.data?.pagination.total ?? 0} employees
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="register-month">Month</Label>
            <Input
              id="register-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="w-[170px]"
            />
          </div>
          <div>
            <Label htmlFor="register-search">Search</Label>
            <Input
              id="register-search"
              placeholder="Name or JWPL code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-[220px]"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="register-include-inactive"
              checked={includeInactive}
              onChange={setIncludeInactive}
            />
            <Label htmlFor="register-include-inactive" className="cursor-pointer text-sm">
              Include past employees
            </Label>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || !muster.data}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting…' : 'Export'}
          </Button>
        </div>
      </div>

      {source && !source.reachable && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              {source.last_agent_run
                ? 'Punches are not being collected right now.'
                : 'Punches have never been collected.'}
            </p>
            <p className="text-xs">
              {source.last_agent_run
                ? `The last collection from the punching machines was ${new Date(
                    source.last_agent_run,
                  ).toLocaleString()}. `
                : ''}
              Days that were never rolled up show as a faint dot, not as an absence.{' '}
              {source.detail}
            </p>
          </div>
        </div>
      )}

      <Legend />

      <Card>
        <CardContent className="p-0">
          {muster.isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {muster.isError && (
            <p className="p-6 text-sm text-red-600">The register could not be loaded.</p>
          )}
          {muster.data && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="sticky left-0 z-20 bg-muted/40 px-3 py-2 text-left font-medium">
                      Code
                    </th>
                    <th className="sticky left-[104px] z-20 bg-muted/40 px-3 py-2 text-left font-medium">
                      Name
                    </th>
                    {days.map((day) => (
                      <th key={day} className="w-6 py-2 text-center font-medium">
                        {day}
                      </th>
                    ))}
                    {TOTAL_ORDER.map((status) => (
                      <th key={status} className="px-2 py-2 text-center font-medium">
                        {cellLetter(status)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {muster.data.data.map((row) => (
                    <RegisterRow
                      key={row.employee}
                      row={row}
                      days={days}
                      canOverride={canOverride}
                      onPick={setOpenRowId}
                    />
                  ))}
                </tbody>
              </table>
              {muster.data.data.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground">
                  Nobody matches that search this month.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <OverrideDialog row={openRow.data ?? null} onClose={() => setOpenRowId(null)} />
    </div>
  );
}

function RegisterRow({
  row,
  days,
  canOverride,
  onPick,
}: {
  row: MusterRow;
  days: number[];
  canOverride: boolean;
  onPick: (id: number) => void;
}) {
  return (
    <tr className="border-t hover:bg-muted/20">
      <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-1.5 font-mono">
        {row.employee_code}
      </td>
      <td className="sticky left-[104px] z-10 max-w-[200px] truncate bg-card px-3 py-1.5">
        {row.employee_name}
      </td>
      {days.map((day) => {
        const kind = cellKind(row.days, day);
        if (kind === 'outside') return <td key={day} className="w-6" />;
        if (kind === 'missing') {
          return (
            <td
              key={day}
              className="w-6 text-center text-muted-foreground/40"
              title="Not synced — the punch machine has not been read for this day"
            >
              ·
            </td>
          );
        }
        const cell = row.days[String(day)]!;
        const standing = cell.e ?? cell.m;
        const corrected = cell.e !== undefined;
        return (
          <td key={day} className="w-6 p-0 text-center">
            <button
              type="button"
              disabled={!canOverride}
              onClick={() => onPick(cell.id)}
              title={
                corrected
                  ? `${statusLabel(standing)} — corrected from ${statusLabel(cell.m)}`
                  : statusLabel(standing)
              }
              className={[
                'h-6 w-6 border text-[10px] font-semibold leading-none',
                STATUS_STYLES[standing],
                corrected ? 'ring-1 ring-inset ring-amber-500' : '',
                canOverride ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
              ].join(' ')}
            >
              {cellLetter(standing)}
            </button>
          </td>
        );
      })}
      {TOTAL_ORDER.map((status) => (
        <td key={status} className="px-2 py-1.5 text-center tabular-nums">
          {row.totals[status] ?? 0}
        </td>
      ))}
    </tr>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {TOTAL_ORDER.map((status) => (
        <Badge key={status} variant="outline" className={STATUS_STYLES[status]}>
          {cellLetter(status)} {statusLabel(status)}
        </Badge>
      ))}
      <span className="ml-2">
        <span className="text-muted-foreground/40">·</span> not synced
      </span>
      <span>· a ringed cell was corrected by hand</span>
    </div>
  );
}
