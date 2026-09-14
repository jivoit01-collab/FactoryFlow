/**
 * The plant's own labour: how many there are, and how many turned up.
 *
 * The factory has two kinds of manpower and counts them in two different
 * places. The contractor's people are counted by the gate, per contractor, on
 * the Labour screens. The plant's *own* permanent labourers were counted
 * nowhere — everybody knows there are eighty-five of them, and nobody could say
 * how many of the eighty-five were on site yesterday. This is that register.
 *
 * It is deliberately two facts, not one. **The strength** is a master: one
 * number per company, moved only when the plant hires or loses somebody, and
 * editable by whoever maintains the org structure. **The presence** is a daily
 * entry, per shift, by whoever is asked to take the count — a separate grant,
 * because taking a headcount is not the same job as changing what the roll
 * says.
 *
 * The shape follows from that: **one date at the top, three cards under it**,
 * each a figure with an Edit behind it. The day being looked at is chosen once
 * rather than repeated in a form below, and a shift is corrected where it is
 * read — the card, or its row in the register — so the same count is never
 * entered in two places. Rows in the register open the same dialog, which is
 * how a day older than the one on screen gets fixed.
 *
 * Each recorded shift keeps the strength it was measured against, so a day that
 * read "78 of 85" still reads that after the eighty-sixth is hired. That is why
 * the rows below show their own strength rather than today's.
 *
 * Both figures are overwritten in place, so every edit dialog carries a **Show
 * audit trail** link into what that figure used to say and who changed it. The
 * trail stacks on top of the edit it was opened from rather than replacing it:
 * a correction being typed is usually the reason somebody wants to see the last
 * one, and swapping one dialog for another makes that glance feel like losing
 * the form.
 *
 * Record-only: nothing costs or plans off these figures yet.
 */
import { CalendarDays, History, Loader2, Moon, Pencil, Plus, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardError } from '@/shared/components/dashboard';
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
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useEmployeeMeta,
  useLabourPresence,
  useLabourPresenceAudit,
  useLabourStrength,
  useLabourStrengthAudit,
  useRecordLabourPresence,
  useSetLabourStrength,
} from '../api';
import type { LabourAuditEntry, LabourPresenceRow, LabourShift } from '../types';

const SHIFTS: { value: LabourShift; label: string; hours: string; icon: typeof Sun }[] = [
  { value: 'DAY', label: 'Day', hours: '07:00 – 19:00', icon: Sun },
  { value: 'NIGHT', label: 'Night', hours: '19:00 – 07:00', icon: Moon },
];

/** How far back the register reads by default. */
const WINDOW_DAYS = 14;

/** The widest window the API will answer (see the view's MAX_PRESENCE_DAYS). */
const MAX_WINDOW_DAYS = 180;

/** Today in the browser's own timezone — the factory's day, not UTC's. */
function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const parsed = new Date(`${iso}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  const offset = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 10);
}

function formatDay(iso: string) {
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? iso
    : parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Which days to ask the register for, given the day on screen.
 *
 * The fortnight by default; stretched back to an older day being looked at; and
 * past the API's widest window, that one day alone — a year-old date must show
 * its own shifts rather than fail the whole page on a range the server refuses.
 */
function presenceWindow(date: string) {
  const today = todayIso();
  const fortnightAgo = addDays(today, -(WINDOW_DAYS - 1));
  if (date >= fortnightAgo) return { from: fortnightAgo, to: today };
  if (date >= addDays(today, -(MAX_WINDOW_DAYS - 1))) return { from: date, to: today };
  return { from: date, to: date };
}

/** What the audit dialog is showing, and what closing it goes back to. */
type AuditView = { kind: 'STRENGTH' } | { kind: 'PRESENCE'; presenceId: number; title: string };

function formatMoment(iso: string) {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? iso
    : parsed.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

/** One write, read as the sentence it is: what it became, and from what. */
function AuditRow({ entry }: { entry: LabourAuditEntry }) {
  const remarkChanged = entry.new_remark !== entry.previous_remark;
  return (
    <li className="border-b pb-2 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm">
          {entry.is_first ? (
            <>
              Set to <span className="font-semibold tabular-nums">{entry.new_count}</span>
            </>
          ) : (
            <>
              <span className="tabular-nums text-muted-foreground line-through">
                {entry.previous_count}
              </span>
              <span className="mx-1.5 text-muted-foreground">→</span>
              <span className="font-semibold tabular-nums">{entry.new_count}</span>
            </>
          )}
          {entry.strength !== null && (
            <span className="ml-1.5 text-xs text-muted-foreground">of {entry.strength}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{formatMoment(entry.performed_at)}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {entry.performed_by_detail?.full_name ?? 'Somebody no longer on the system'}
        {remarkChanged && (
          <>
            {' · '}
            {entry.new_remark ? `Remark: ${entry.new_remark}` : 'Remark cleared'}
          </>
        )}
      </p>
    </li>
  );
}

interface PresenceDraft {
  work_date: string;
  shift: LabourShift;
  present: string;
  remark: string;
  /** What the register already holds for that date and shift, if anything. */
  existing: LabourPresenceRow | null;
}

export default function LabourPresencePage() {
  const meta = useEmployeeMeta();
  const strength = useLabourStrength();
  const setStrength = useSetLabourStrength();
  const record = useRecordLabourPresence();

  const canSetStrength = !!meta.data?.permissions.can_manage_structure;
  const canRecord = !!meta.data?.permissions.can_record_presence;

  const [date, setDate] = useState(todayIso());
  const [strengthDraft, setStrengthDraft] = useState<{ headcount: string; note: string } | null>(
    null,
  );
  const [presenceDraft, setPresenceDraft] = useState<PresenceDraft | null>(null);
  const [auditView, setAuditView] = useState<AuditView | null>(null);

  // The trail is fetched only while its dialog is open — it is a question
  // nobody asks most days.
  const strengthAudit = useLabourStrengthAudit(auditView?.kind === 'STRENGTH');
  const presenceAudit = useLabourPresenceAudit(
    auditView?.kind === 'PRESENCE' ? auditView.presenceId : null,
  );
  const audit = auditView?.kind === 'PRESENCE' ? presenceAudit : strengthAudit;

  // Plain, not memoised: it reads today's date, so it is not a pure function of
  // its dependencies, and react-query hashes the key by value anyway.
  const range = presenceWindow(date);
  const presence = useLabourPresence(range);

  const rows = useMemo(() => presence.data?.results ?? [], [presence.data]);
  const headcount = strength.data?.headcount ?? 0;
  const isSet = !!strength.data?.is_set && headcount > 0;
  const isToday = date === todayIso();

  const shiftCards = useMemo(
    () =>
      SHIFTS.map((entry) => ({
        ...entry,
        row: rows.find((row) => row.work_date === date && row.shift === entry.value) ?? null,
      })),
    [rows, date],
  );

  function openPresence(workDate: string, shift: LabourShift, existing: LabourPresenceRow | null) {
    setPresenceDraft({
      work_date: workDate,
      shift,
      present: existing ? String(existing.present_count) : '',
      remark: existing?.remark ?? '',
      existing,
    });
  }

  if (strength.isError || presence.isError) {
    return (
      <DashboardError
        message="The permanent labour register could not be loaded."
        onRetry={() => {
          void strength.refetch();
          void presence.refetch();
        }}
      />
    );
  }

  async function saveStrength() {
    if (!strengthDraft) return;
    const headcountValue = parseInt(strengthDraft.headcount || '', 10);
    if (!Number.isFinite(headcountValue) || headcountValue < 0) {
      toast.error('The strength has to be a whole number of people.');
      return;
    }
    try {
      await setStrength.mutateAsync({
        headcount: headcountValue,
        note: strengthDraft.note.trim(),
      });
      setStrengthDraft(null);
      toast.success('Permanent labour strength saved');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function savePresence() {
    if (!presenceDraft) return;
    const count = parseInt(presenceDraft.present || '', 10);
    if (!Number.isFinite(count) || count < 0) {
      toast.error('Enter how many were present.');
      return;
    }
    try {
      await record.mutateAsync({
        work_date: presenceDraft.work_date,
        shift: presenceDraft.shift,
        present_count: count,
        remark: presenceDraft.remark.trim(),
      });
      toast.success(
        presenceDraft.existing
          ? `${formatDay(presenceDraft.work_date)} corrected to ${count}`
          : `${count} of ${headcount} recorded`,
      );
      setPresenceDraft(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Permanent labour</h1>
          <p className="text-sm text-muted-foreground">
            The plant&apos;s own labourers on the rolls, and how many of them were present each
            shift. Contractor labour is counted separately, on the{' '}
            <Link to="/labour" className="underline underline-offset-2">
              Labour
            </Link>{' '}
            screens.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/employees">Directory</Link>
        </Button>
      </header>

      {/* The day being looked at, chosen once. Both shift cards and everything
          the dialogs default to follow it. */}
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="presence-date" className="text-sm font-medium">
          Showing
        </Label>
        <Input
          id="presence-date"
          type="date"
          max={todayIso()}
          value={date}
          onChange={(event) => setDate(event.target.value || todayIso())}
          className="w-auto"
        />
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => setDate(todayIso())}>
            Today
          </Button>
        )}
        {presence.isFetching && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                On the rolls
              </p>
              {strength.isLoading ? (
                <Loader2 className="mt-2 h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="mt-1 text-3xl font-semibold tabular-nums">
                  {isSet ? headcount : '—'}
                  {isSet && (
                    <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                      permanent labour
                    </span>
                  )}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {!strength.isLoading && !isSet
                  ? 'Nobody has entered the strength yet. A shift cannot be recorded until somebody does.'
                  : strength.data?.note || 'What the plant employs directly'}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {strength.data?.updated_by_detail
                  ? `Set by ${strength.data.updated_by_detail.full_name}`
                  : 'Not set'}
              </p>
              {canSetStrength && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setStrengthDraft({
                      headcount: isSet ? String(headcount) : '',
                      note: strength.data?.note ?? '',
                    })
                  }
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {isSet ? 'Edit' : 'Set strength'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {shiftCards.map(({ value, label, hours, icon: Icon, row }) => (
          <Card key={value}>
            <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {isToday ? 'Today' : formatDay(date)} · {label} shift
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">
                  {row ? row.present_count : '—'}
                  {row && (
                    <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                      of {row.strength} present
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row
                    ? row.is_over_strength
                      ? 'More present than the rolls say exist — the strength may be stale.'
                      : `${row.absent_count} absent · ${hours}`
                    : `Not recorded · ${hours}`}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  {row?.recorded_by_detail
                    ? `By ${row.recorded_by_detail.full_name}`
                    : row
                      ? 'Recorded'
                      : 'Nobody has counted this shift'}
                </p>
                {canRecord && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!isSet}
                    title={isSet ? undefined : 'Set the strength first'}
                    onClick={() => openPresence(date, value, row)}
                  >
                    {row ? (
                      <>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Record
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* The register. Its rows are the way back to a day older than the one on
          screen — clicking one opens the same dialog the cards do. */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Register</h2>
            <span className="text-xs text-muted-foreground">
              {range.from === range.to
                ? formatDay(range.from)
                : `${formatDay(range.from)} – ${formatDay(range.to)}`}
            </span>
          </div>

          {presence.isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading the register…</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nothing recorded in this window.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Shift</th>
                    <th className="p-3 text-right font-medium">Present</th>
                    <th className="p-3 text-right font-medium">Absent</th>
                    <th className="p-3 text-right font-medium">Of strength</th>
                    <th className="p-3 font-medium">Remark</th>
                    <th className="p-3 font-medium">Recorded by</th>
                    {canRecord && <th className="p-3" aria-label="Edit" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: LabourPresenceRow) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap p-3">{formatDay(row.work_date)}</td>
                      <td className="whitespace-nowrap p-3 text-muted-foreground">
                        {row.shift === 'NIGHT' ? (
                          <Moon className="mr-1 inline h-3.5 w-3.5" />
                        ) : (
                          <Sun className="mr-1 inline h-3.5 w-3.5" />
                        )}
                        {row.shift === 'NIGHT' ? 'Night' : 'Day'}
                      </td>
                      <td className="p-3 text-right font-semibold tabular-nums">
                        {row.present_count}
                      </td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                        {row.is_over_strength ? '—' : row.absent_count}
                      </td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                        {row.strength}
                      </td>
                      <td className="p-3 text-muted-foreground">{row.remark || '—'}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {row.recorded_by_detail?.full_name || '—'}
                      </td>
                      {canRecord && (
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            aria-label={`Edit ${formatDay(row.work_date)} ${row.shift === 'NIGHT' ? 'night' : 'day'} shift`}
                            onClick={() => openPresence(row.work_date, row.shift, row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
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

      <Dialog open={!!strengthDraft} onOpenChange={(open) => !open && setStrengthDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Permanent labour strength</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="strength-headcount">How many on the rolls</Label>
              <Input
                id="strength-headcount"
                type="number"
                min="0"
                step="1"
                value={strengthDraft?.headcount ?? ''}
                onChange={(event) =>
                  setStrengthDraft((draft) =>
                    draft ? { ...draft, headcount: event.target.value } : draft,
                  )
                }
                placeholder="e.g. 85"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Days already recorded keep the strength they were counted against; this changes what
                the next count is measured by.
              </p>
            </div>
            <div>
              <Label htmlFor="strength-note">Note</Label>
              <Input
                id="strength-note"
                value={strengthDraft?.note ?? ''}
                onChange={(event) =>
                  setStrengthDraft((draft) =>
                    draft ? { ...draft, note: event.target.value } : draft,
                  )
                }
                placeholder="Optional — a sanction order, when it was revised"
              />
            </div>
          </DialogBody>
          <DialogFooter className="sm:justify-between">
            {/* Nothing to look back on until the figure exists. */}
            {isSet ? <AuditLink onClick={() => setAuditView({ kind: 'STRENGTH' })} /> : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStrengthDraft(null)}>
                Cancel
              </Button>
              <Button onClick={saveStrength} disabled={setStrength.isPending}>
                {setStrength.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!presenceDraft} onOpenChange={(open) => !open && setPresenceDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {presenceDraft
                ? `${presenceDraft.shift === 'NIGHT' ? 'Night' : 'Day'} shift · ${formatDay(
                    presenceDraft.work_date,
                  )}`
                : 'Record a shift'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="presence-count">How many were present</Label>
              <Input
                id="presence-count"
                type="number"
                min="0"
                step="1"
                autoFocus
                value={presenceDraft?.present ?? ''}
                onChange={(event) =>
                  setPresenceDraft((draft) =>
                    draft ? { ...draft, present: event.target.value } : draft,
                  )
                }
                placeholder={`of ${headcount}`}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {presenceDraft?.existing
                  ? `Currently ${presenceDraft.existing.present_count} of ${presenceDraft.existing.strength} — saving corrects it.`
                  : `Counted against the ${headcount} on the rolls today.`}
              </p>
            </div>
            <div>
              <Label htmlFor="presence-remark">Remark</Label>
              <Input
                id="presence-remark"
                value={presenceDraft?.remark ?? ''}
                onChange={(event) =>
                  setPresenceDraft((draft) =>
                    draft ? { ...draft, remark: event.target.value } : draft,
                  )
                }
                placeholder="Optional — a holiday, a strike"
              />
            </div>
          </DialogBody>
          <DialogFooter className="sm:justify-between">
            {/* Nothing to show for a shift nobody has counted yet. */}
            {presenceDraft?.existing ? (
              <AuditLink
                onClick={() =>
                  setAuditView({
                    kind: 'PRESENCE',
                    presenceId: presenceDraft.existing!.id,
                    title: `${presenceDraft.shift === 'NIGHT' ? 'Night' : 'Day'} shift · ${formatDay(
                      presenceDraft.work_date,
                    )}`,
                  })
                }
              />
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPresenceDraft(null)}>
                Cancel
              </Button>
              <Button onClick={savePresence} disabled={record.isPending}>
                {record.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {presenceDraft?.existing ? 'Save correction' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* The trail opens ON TOP of whichever edit dialog asked for it, which
          stays open underneath: a half-typed correction is never lost, and
          nothing fades out and back in as the history is glanced at. It is
          declared last so its overlay mounts over that dialog, and its own
          content is lifted above that overlay. */}
      <Dialog open={!!auditView} onOpenChange={(open) => !open && setAuditView(null)}>
        <DialogContent className="z-[60] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {auditView?.kind === 'PRESENCE' ? auditView.title : 'Strength on the rolls'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {audit.isLoading ? (
              <p className="py-4 text-sm text-muted-foreground">Loading the trail…</p>
            ) : audit.isError ? (
              <p className="py-4 text-sm text-muted-foreground">
                The audit trail could not be loaded.
              </p>
            ) : (audit.data?.results.length ?? 0) === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nothing recorded before this screen started keeping the trail.
              </p>
            ) : (
              <ul className="space-y-2">
                {audit.data?.results.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditView(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** The same small link in every edit dialog, so it reads the same everywhere. */
function AuditLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
    >
      <History className="h-3.5 w-3.5" />
      Show audit trail
    </button>
  );
}
