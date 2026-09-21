import type { DispatchSheetRow, VehicleStage } from '../../types/sheet.types';

/**
 * Colouring a line of the register by where its truck has got to.
 *
 * Four states, not ten. The sheet has ten stages behind it — booked, at the
 * gate, ready to dock, docked, photo attached, ready for gatepass, gatepass
 * printed, print committed, dispatched, rejected — but a register read down a
 * page is answering one question, "is this one done?", and ten shades answer it
 * worse than four do. So the stages are grouped by what the desk would do
 * about them:
 *
 * * **waiting** — nothing has happened yet. Grey, because grey is what the
 *   rest of the sheet already is: a line nobody needs to act on should not
 *   shout.
 * * **at the gate** — the truck is here and not yet loading. Amber: somebody
 *   has to move it along.
 * * **loading** — docked, being scanned, waiting on a gatepass. Blue: in hand,
 *   no action owed.
 * * **gone** — dispatched. Green, and the only line that is finished.
 * * **rejected** — cancelled or turned away. Rose.
 *
 * Colours are the muted end of the palette on purpose. Every row is coloured,
 * so a strong tint would turn the sheet into a rainbow and hide the one thing
 * colour is for here — seeing at a glance which lines are still open.
 */

export type StageTone = 'waiting' | 'gate' | 'loading' | 'gone' | 'rejected';

const TONE_OF: Record<VehicleStage, StageTone> = {
  BOOKED: 'waiting',
  EMPTY_IN: 'gate',
  READY_TO_DOCK: 'gate',
  DOCKED: 'loading',
  PHOTO_ATTACHED: 'loading',
  READY_FOR_GATEPASS: 'loading',
  GATEPASS_PRINTED: 'loading',
  PRINT_COMMITTED: 'loading',
  DISPATCHED: 'gone',
  REJECTED: 'rejected',
};

/** The row's own tint. Left blank for a waiting line, which stays plain. */
const ROW_TINT: Record<StageTone, string> = {
  waiting: '',
  gate: 'bg-amber-50/70 dark:bg-amber-500/10',
  loading: 'bg-sky-50/70 dark:bg-sky-500/10',
  gone: 'bg-emerald-50/60 dark:bg-emerald-500/[0.07]',
  rejected: 'bg-rose-50/70 dark:bg-rose-500/10',
};

/** The badge in the Status cell, where the tint alone is too faint to name. */
const BADGE: Record<StageTone, string> = {
  waiting: 'bg-muted text-muted-foreground',
  gate: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  loading: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-300',
  gone: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300',
};

export function stageTone(stage: VehicleStage): StageTone {
  return TONE_OF[stage] ?? 'waiting';
}

export function stageRowClass(stage: VehicleStage): string {
  return ROW_TINT[stageTone(stage)];
}

export function stageBadgeClass(stage: VehicleStage): string {
  return BADGE[stageTone(stage)];
}

/**
 * What the Status cell says.
 *
 * The stage a truck is at begins at `BOOKED`, which is the pipeline's word for
 * "on the plan, not yet at the gate" — and on a line where no vehicle has been
 * booked at all it is a lie. Those lines are the ones the desk is looking for:
 * a bill in the plans with nothing arranged for it yet, or one only just
 * picked on Bill Selection. So they say so instead.
 *
 * Only the first stage is rewritten. Once a truck reaches the gate the booking
 * has plainly happened, whatever the plan's own status column still reads.
 */
export function statusLabel(row: DispatchSheetRow): string {
  if (row.vehicle_stage === 'BOOKED' && row.booking_status === 'PENDING') {
    return 'In plans';
  }
  return row.vehicle_stage_label;
}

/** The key under the sheet, so nobody has to guess what a colour means. */
export const STAGE_LEGEND: { tone: StageTone; label: string }[] = [
  { tone: 'waiting', label: 'Not in yet' },
  { tone: 'gate', label: 'At the gate' },
  { tone: 'loading', label: 'Loading' },
  { tone: 'gone', label: 'Dispatched' },
  { tone: 'rejected', label: 'Rejected' },
];

export function legendSwatchClass(tone: StageTone): string {
  return tone === 'waiting'
    ? 'border border-border bg-muted'
    : {
        gate: 'bg-amber-200 dark:bg-amber-500/40',
        loading: 'bg-sky-200 dark:bg-sky-500/40',
        gone: 'bg-emerald-200 dark:bg-emerald-500/40',
        rejected: 'bg-rose-200 dark:bg-rose-500/40',
      }[tone];
}
