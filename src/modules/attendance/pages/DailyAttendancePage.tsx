/**
 * The daily attendance sheet.
 *
 * One date, everybody, and the toggle this page exists for.
 *
 * **"Show corrections" is off by default**, and with it off the table shows
 * exactly what the punching machine recorded and nothing else — one status
 * column, no override columns, no highlighting. That is the raw machine view
 * somebody needs when they are checking the machine itself.
 *
 * Turned on, the same rows grow three columns — Final status, Reason, Changed
 * by — and every corrected row is tinted. Nothing is re-fetched: the API always
 * sends both statuses on every row (see attendance.api.ts), so the toggle is
 * pure presentation and the two views can never disagree.
 *
 * The banner at the top is not decoration. A sheet full of absences looks
 * identical whether the factory was shut or the sync has not run since Tuesday,
 * so the page says which.
 */
import { AlertTriangle, Download, History,Pencil, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { API_CONFIG } from '@/config/constants/api.constants';
import { ATTENDANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Switch,
} from '@/shared/components/ui';

import {
  useAttendanceSourceStatus,
  useAttendanceSummary,
  useDailyAttendance,
  useSyncAttendance,
} from '../api';
import type { AttendanceStatusValue, DailyAttendanceRow } from '../api/attendance.api';
import { attendanceApi } from '../api/attendance.api';
import { HistoryDialog } from '../components/HistoryDialog';
import { OverrideDialog } from '../components/OverrideDialog';
import { StatusBadge } from '../components/StatusBadge';
import { formatMinutes, formatTime, statusLabel } from '../components/statusBits';
import { countsInView, rowMatches, todayLocal } from '../utils';

const TILE_ORDER: AttendanceStatusValue[] = [
  'PRESENT',
  'ABSENT',
  'MISSING_PUNCH',
  'HALF_DAY',
  'WEEKLY_OFF',
];

export default function DailyAttendancePage() {
  const { hasPermission } = usePermission();
  const canOverride = hasPermission(ATTENDANCE_PERMISSIONS.OVERRIDE);
  const canSync =
    hasPermission(ATTENDANCE_PERMISSIONS.SYNC) || hasPermission(ATTENDANCE_PERMISSIONS.OVERRIDE);

  const [date, setDate] = useState(todayLocal());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusValue | ''>('');
  // The heart of this screen: off means "punch machine data only".
  const [showCorrections, setShowCorrections] = useState(false);
  const [editing, setEditing] = useState<DailyAttendanceRow | null>(null);
  const [historyFor, setHistoryFor] = useState<DailyAttendanceRow | null>(null);

  const filters = useMemo(() => ({ date }), [date]);
  const { data: rows = [], isLoading } = useDailyAttendance(filters);
  const { data: summary } = useAttendanceSummary(filters);
  const { data: source } = useAttendanceSourceStatus();
  const sync = useSyncAttendance();

  // The filter follows the view — see utils.rowMatches for why that matters.
  const visible = useMemo(
    () => rows.filter((row) => rowMatches(row, { search, statusFilter, showCorrections })),
    [rows, search, statusFilter, showCorrections],
  );

  const counts = countsInView(summary, showCorrections);

  const handleSync = async () => {
    try {
      const result = await sync.mutateAsync({ dateFrom: date, dateTo: date });
      toast.success(`Rolled up ${result.punches} punches for ${date}.`);
    } catch {
      /* the API client toasts, and the banner explains */
    }
  };

  const handleExport = () => {
    window.open(
      `${API_CONFIG.baseUrl}${attendanceApi.exportUrl({ date })}`,
      '_blank',
      'noopener',
    );
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Read from the punching machines. Corrections are recorded, never overwritten.
          </p>
        </div>
        <div className="flex gap-2">
          {canSync && (
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={sync.isPending}
              // It re-reads the punches already collected; it cannot reach the
              // machines. Worth saying, or a stale sheet looks like a broken button.
              title="Re-read the punches already collected for this day"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? 'animate-spin' : ''}`} />
              {sync.isPending ? 'Syncing…' : 'Sync punches'}
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Absent-because-shut vs absent-because-uncollected. The machines are not
          reachable from the server; an agent in the plant copies punches across,
          and this says when it last managed it. Without the distinction a row of
          absences reads as a quiet day. */}
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
              Anyone who punched since then shows as absent here until it runs again.{' '}
              {source.detail}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label htmlFor="attendance-date">Date</Label>
            <Input
              id="attendance-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-44"
            />
          </div>
          <div className="min-w-48 flex-1">
            <Label htmlFor="attendance-search">Search</Label>
            <Input
              id="attendance-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or JWPL code"
            />
          </div>
          <div>
            <Label htmlFor="attendance-status">Status</Label>
            <NativeSelect
              id="attendance-status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as AttendanceStatusValue | '')
              }
              className="w-44"
            >
              <SelectOption value="">All</SelectOption>
              {TILE_ORDER.map((value) => (
                <SelectOption key={value} value={value}>
                  {statusLabel(value)}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="show-corrections"
              checked={showCorrections}
              onChange={setShowCorrections}
            />
            <Label htmlFor="show-corrections" className="cursor-pointer text-sm">
              Show corrections
              <span className="ml-1 text-xs text-muted-foreground">
                ({summary?.overridden ?? 0} on this day)
              </span>
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">{summary?.total ?? 0}</p>
          </CardContent>
        </Card>
        {TILE_ORDER.map((value) => (
          <Card key={value}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{statusLabel(value)}</p>
              <p className="text-2xl font-semibold">{counts?.[value] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Code</th>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Department</th>
                  <th className="p-3 font-medium">In</th>
                  <th className="p-3 font-medium">Out</th>
                  <th className="p-3 font-medium">Hours</th>
                  <th className="p-3 font-medium">Punch machine</th>
                  {showCorrections && (
                    <>
                      <th className="p-3 font-medium">Final status</th>
                      <th className="p-3 font-medium">Reason</th>
                      <th className="p-3 font-medium">Changed by</th>
                    </>
                  )}
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={showCorrections ? 11 : 8} className="p-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && visible.length === 0 && (
                  <tr>
                    <td colSpan={showCorrections ? 11 : 8} className="p-6 text-center text-muted-foreground">
                      Nothing for {date}. If this looks wrong, sync the punches for that day.
                    </td>
                  </tr>
                )}
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b last:border-0 ${
                      showCorrections && row.is_overridden ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <td className="p-3 font-mono text-xs">{row.employee_code}</td>
                    <td className="p-3">{row.employee_name}</td>
                    <td className="p-3 text-muted-foreground">{row.department_name ?? '—'}</td>
                    <td className="p-3">{formatTime(row.machine_first_punch)}</td>
                    <td className="p-3">{formatTime(row.machine_last_punch)}</td>
                    <td className="p-3">{formatMinutes(row.machine_worked_minutes)}</td>
                    <td className="p-3">
                      <StatusBadge
                        status={row.machine_status}
                        label={row.machine_status_display}
                        // Struck through only when a correction has replaced it
                        // and the user has asked to see corrections.
                        muted={showCorrections && row.is_overridden}
                      />
                    </td>
                    {showCorrections && (
                      <>
                        <td className="p-3">
                          <StatusBadge
                            status={row.effective_status}
                            label={row.effective_status_display}
                          />
                        </td>
                        <td className="p-3 max-w-64">
                          {row.is_overridden ? (
                            <div>
                              <Badge variant="outline" className="mb-1 text-xs">
                                {row.override_reason_code_display}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {row.override_reason}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {row.overridden_by_name ?? '—'}
                          {row.overridden_at && (
                            <div>{new Date(row.overridden_at).toLocaleString()}</div>
                          )}
                        </td>
                      </>
                    )}
                    <td className="p-3 text-right whitespace-nowrap">
                      {row.is_overridden && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryFor(row)}
                          title="Change history"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      )}
                      {canOverride && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(row)}
                          title="Change status"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <OverrideDialog row={editing} onClose={() => setEditing(null)} />
      <HistoryDialog row={historyFor} onClose={() => setHistoryFor(null)} />
    </div>
  );
}
