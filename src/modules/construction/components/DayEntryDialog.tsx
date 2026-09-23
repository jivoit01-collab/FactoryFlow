/**
 * One day on site, in a dialog.
 *
 * Was a page of its own, which meant a navigation away from the project and a
 * route to come back to. It is a short form about one day — it belongs over the
 * project, not instead of it.
 *
 * Still built for a phone held in one hand at a dusty site: one required field,
 * a typeable head count rather than only a stepper, reason chips instead of a
 * dropdown, and a single Save. Photos are compressed in the browser before they
 * go, because a modern camera makes 4MB files and a site uploads twenty.
 */
import { AlertTriangle, Camera, Check, Minus, Plus, Trash2, Users } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CONSTRUCTION_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useAddPhoto, useDailyLogs, useDay, useProjectSummary, useSaveDailyLog } from '../api';
import type { StopReason } from '../types';
import {
  BACKDATE_DAYS,
  daysBefore,
  formatDate,
  formatMoney,
  STOP_REASON_LABELS,
  todayISO,
} from '../utils';

/** Shrink a camera photo to something a site's connection can actually send. */
async function compress(file: File, maxEdge = 1600, quality = 0.75): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 900_000) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    // A browser without createImageBitmap, or a file it cannot decode: send the
    // original rather than losing the photo.
    return file;
  }
}

const STOP_REASONS = Object.keys(STOP_REASON_LABELS) as StopReason[];

export function DayEntryDialog({
  projectId,
  open,
  onOpenChange,
  initialDate,
  canWrite = true,
}: {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The day to load. Defaults to today. */
  initialDate?: string;
  /**
   * Whether this project's status allows a day to be written at all.
   *
   * The permission on its own is not enough: a draft or a closed project
   * refuses the save server-side whoever is asking. The caller knows the
   * status, so it passes the gate in and the dialog opens as a read view
   * rather than offering a Save that will come back refused -- which is the
   * whole reason the day is a dialog and not a page.
   */
  canWrite?: boolean;
}) {
  const id = projectId;
  const canLog = useHasPermission(CONSTRUCTION_PERMISSIONS.LOG_DAILY_WORK) && canWrite;
  const canEdit = useHasPermission(CONSTRUCTION_PERMISSIONS.EDIT_PROJECT);

  const [date, setDate] = useState(initialDate ?? todayISO());
  const { data: summary } = useProjectSummary(id, open);
  const { data: day, isLoading } = useDay(id, date, open);
  // Guarded like the other two: a closed dialog sits on every project
  // page, and an unguarded query here fires on each one.
  const { data: recentLogs } = useDailyLogs(id, undefined, open);
  const save = useSaveDailyLog(id);
  const addPhoto = useAddPhoto(id);

  const [workDone, setWorkDone] = useState('');
  const [workers, setWorkers] = useState(0);
  const [progress, setProgress] = useState('');
  const [stopped, setStopped] = useState(false);
  const [reasons, setReasons] = useState<StopReason[]>([]);
  const [notes, setNotes] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  // Switching the date reloads the form from that day, which would bin
  // whatever had been typed for the one on screen. Tracked so it can ask.
  const [dirty, setDirty] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Yesterday's head count, for the pre-fill. */
  const lastCount = useMemo(() => {
    const earlier = recentLogs
      ?.filter((log) => log.log_date < date)
      .sort((a, b) => (a.log_date < b.log_date ? 1 : -1));
    return earlier?.[0]?.workers_count ?? 0;
  }, [recentLogs, date]);

  // The dialog reopens on whatever day it was asked for.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDate(initialDate ?? todayISO());
  }

  // Load whatever is already recorded for this date; otherwise start a fresh
  // day with the crew size carried over. Keyed on the date and the log it
  // found, and adjusted during render rather than in an effect — an effect
  // would show an empty form for one frame over a day that already has
  // entries, and a site in-charge would start typing into it.
  const dayKey = `${date}:${day?.log?.id ?? 'none'}`;
  const [loadedDayKey, setLoadedDayKey] = useState<string | null>(null);
  if (open && !isLoading && dayKey !== loadedDayKey) {
    setLoadedDayKey(dayKey);
    if (day?.log) {
      setWorkDone(day.log.work_done);
      setWorkers(day.log.workers_count);
      setProgress(day.log.progress_percent ?? '');
      setStopped(day.log.work_stopped);
      setReasons(day.log.stopped_reasons);
      setNotes(day.log.notes);
    } else {
      setWorkDone('');
      setWorkers(lastCount);
      setProgress('');
      setStopped(false);
      setReasons([]);
      setNotes('');
    }
    setPendingPhotos([]);
    setDirty(false);
  }
  if (!open && loadedDayKey !== null) setLoadedDayKey(null);

  async function pickPhotos(files: FileList | null) {
    if (!files?.length) return;
    const compressed = await Promise.all(Array.from(files).map((file) => compress(file)));
    setPendingPhotos((current) => [...current, ...compressed]);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function submit() {
    if (!workDone.trim()) {
      toast.error('Say what happened today.');
      return;
    }
    if (stopped && reasons.length === 0) {
      toast.error('Say why work stopped.');
      return;
    }
    if (progressGoesBackwards) {
      toast.error(`Progress was already ${recordedProgress}%. It cannot go backwards.`);
      return;
    }
    try {
      const result = await save.mutateAsync({
        log_date: date,
        work_done: workDone.trim(),
        workers_count: workers,
        progress_percent: progress === '' ? null : progress,
        work_stopped: stopped,
        stopped_reasons: stopped ? reasons : [],
        notes: notes.trim(),
      });

      // Photos are a second step on purpose — see the module docstring. Their
      // failure is reported separately: the day IS saved by this point, and
      // telling somebody it was not sends them back to retype it.
      if (pendingPhotos.length > 0) {
        const logId = result.log.id;
        try {
          await Promise.all(
            pendingPhotos.map((file) => addPhoto.mutateAsync({ logId, file })),
          );
        } catch {
          toast.warning(
            `${formatDate(date)} was saved, but the photos did not upload. Open the day again to add them.`,
            { duration: 8000 },
          );
          setPendingPhotos([]);
          onOpenChange(false);
          return;
        }
      }

      toast.success(`${formatDate(date)} saved`);
      setPendingPhotos([]);
      setDirty(false);
      onOpenChange(false);

      if (result.warning) toast.warning(result.warning.message, { duration: 8000 });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the day.'));
    }
  }

  const saving = save.isPending || addPhoto.isPending;

  // "It cannot go backwards" was enforced only by the server, so somebody
  // typed 5 where it had been 60 and found out after submitting the whole
  // form. The server stays the authority — this just says it sooner.
  // The service refuses a log before the project started, and one more than a
  // week back from anybody without edit rights. The picker offers neither,
  // rather than letting somebody choose a day and be told after typing it up.
  const earliestLog = (() => {
    const floors = [summary?.start_date].filter(Boolean) as string[];
    if (!canEdit) floors.push(daysBefore(todayISO(), BACKDATE_DAYS));
    return floors.sort().at(-1);
  })();

  const recordedProgress = Number(summary?.progress_percent ?? 0);
  const progressGoesBackwards =
    progress !== '' && Number(progress) < recordedProgress && recordedProgress > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>{formatDate(date)}</span>
            <Input
              type="date"
              min={earliestLog}
              max={todayISO()}
              value={date}
              onChange={(event) => {
                const next = event.target.value;
                if (
                  dirty &&
                  !window.confirm(
                    'You have changes on this day that have not been saved. Switch to another day and lose them?',
                  )
                ) {
                  return;
                }
                setDate(next);
                setDirty(false);
              }}
              aria-label="Which day"
              className="w-auto font-normal"
            />
          </DialogTitle>
          <DialogDescription>
            {summary
              ? `${summary.name} · ${formatMoney(summary.remaining)} of budget left`
              : 'What got done on site, and who was there.'}
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={!canLog} className="space-y-3">
      {/* ---- what happened ---- */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="work-done" className="text-base">
              What got done today
            </Label>
            <Textarea
              id="work-done"
              rows={4}
              value={workDone}
              onChange={(event) => {
                setWorkDone(event.target.value);
                setDirty(true);
              }}
              placeholder="Cast the slab, grid A1–A6. Curing started."
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">People on site</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={() => setWorkers((count) => Math.max(0, count - 1))}
                aria-label="One fewer"
              >
                <Minus className="h-5 w-5" />
              </Button>
              {/* Typeable, not only a stepper: a crew of 90 is one entry, not
                  ninety taps. The buttons stay for nudging a number by one. */}
              <div className="relative flex-1">
                <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={workers}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setWorkers(Number.isFinite(next) && next > 0 ? Math.floor(next) : 0);
                    setDirty(true);
                  }}
                  onFocus={(event) => event.target.select()}
                  aria-label="People on site"
                  className="h-11 pl-9 text-center text-2xl font-semibold tabular-nums"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={() => setWorkers((count) => count + 1)}
                aria-label="One more"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            {!day?.log && lastCount > 0 && workers === lastCount && (
              <p className="text-xs text-muted-foreground">
                Carried over from the last day written up.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="progress">How far along, overall (%)</Label>
            <Input
              id="progress"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              value={progress}
              onChange={(event) => {
                setProgress(event.target.value);
                setDirty(true);
              }}
              placeholder={summary ? Number(summary.progress_percent).toFixed(0) : '0'}
              className="text-base"
            />
            {progressGoesBackwards ? (
              <p className="text-xs text-rose-600">
                It was already {recordedProgress}%. Progress cannot go backwards — work
                does not un-happen.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Optional, and it cannot go backwards.
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="stopped" className="text-base">
                Work stopped today
              </Label>
              <Switch
                id="stopped"
                checked={stopped}
                onChange={(checked: boolean) => {
                  setStopped(checked);
                  if (!checked) setReasons([]);
                  setDirty(true);
                }}
              />
            </div>
            {stopped && (
              <>
                <p className="pt-1 text-xs text-muted-foreground">
                  Pick every reason that applies — a day can be both.
                </p>
                <div className="flex flex-wrap gap-2">
                  {STOP_REASONS.map((value) => {
                    const picked = reasons.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={picked}
                        onClick={() =>
                          setReasons((current) =>
                            current.includes(value)
                              ? current.filter((item) => item !== value)
                              : [...current, value],
                          )
                        }
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                          picked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        {picked && <Check className="h-3.5 w-3.5" />}
                        {STOP_REASON_LABELS[value]}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- photos ---- */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <Label className="text-base">Photos</Label>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            hidden
            onChange={(event) => void pickPhotos(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => fileInput.current?.click()}
          >
            <Camera className="mr-1.5 h-4 w-4" />
            Take or choose a photo
          </Button>

          {pendingPhotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingPhotos.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="h-20 w-20 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 shadow"
                    onClick={() =>
                      setPendingPhotos((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {day?.log?.photos && day.log.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {day.log.photos.map((photo) => (
                <a key={photo.id} href={photo.photo} target="_blank" rel="noreferrer">
                  <img
                    src={photo.photo}
                    alt={photo.caption || 'Site photo'}
                    className="h-20 w-20 rounded-md object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Anything else</Label>
        <Textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            setDirty(true);
          }}
          placeholder="Inspector visited. Two bags damaged in transit."
        />
      </div>

      {summary?.is_over_budget && (
        <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          This project is already over its sanctioned budget. Keep recording — the figures
          must be right — and ask for a revision from the project page.
        </p>
      )}

        </fieldset>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          {canLog ? (
            <Button onClick={submit} disabled={saving}>
              <Check className="mr-1.5 h-4 w-4" />
              {saving ? 'Saving…' : day?.log ? 'Update this day' : 'Save the day'}
            </Button>
          ) : (
            <span className="self-center text-sm text-muted-foreground">
              You can read this day but not write it up.
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
