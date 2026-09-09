import { AlertTriangle } from 'lucide-react';

import { formatCount } from '@/modules/dashboards/warehouse-control/utils/format';
import { cn } from '@/shared/utils';

import type { LineBoard } from '../utils';

/**
 * A blinking warning light.
 *
 * Two sizes, so the same lamp serves as a row marker and as the banner's. The
 * ring is a second circle expanding out of the first — a beacon rather than a
 * dot that merely fades, because a fade at this size is invisible from more than
 * a foot away, which is the distance a board like this is actually read from.
 *
 * `motion-safe:` holds it still for a reader who has asked for reduced motion.
 * Nothing is lost: every state this marks is also carried by colour, a label and
 * a border, and the animation only amplifies.
 */
export function Beacon({ tone, size = 'sm' }: { tone: string; size?: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  return (
    <span className={cn('relative flex shrink-0', box)} aria-hidden>
      <span
        className={cn(
          'absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping',
          tone,
        )}
      />
      <span className={cn('relative inline-flex rounded-full', box, tone)} />
    </span>
  );
}

/** "2 lines down · 1 stopped" — what is wrong, in the fewest words. */
function alarmText(board: LineBoard): string {
  const parts: string[] = [];
  if (board.brokenDown > 0) {
    parts.push(`${formatCount(board.brokenDown)} line${board.brokenDown === 1 ? '' : 's'} down`);
  }
  if (board.stopped > 0) {
    parts.push(`${formatCount(board.stopped)} stopped`);
  }
  return parts.join(' · ');
}

/**
 * The banner that says the plant has a problem.
 *
 * It sits above the list rather than inside it, so it is visible without
 * scrolling — the whole point is that nobody has to go looking. Solid fill with
 * a blinking lamp, deliberately not a pulsing background: fading the panel would
 * take the text with it, and an alert that is periodically unreadable is worse
 * than one that simply sits there being red.
 */
export function LineAlarmBanner({ board }: { board: LineBoard }) {
  const count = board.brokenDown + board.stopped;
  if (count === 0) return null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-3 rounded-lg border-2 border-rose-500 bg-rose-500/15 px-3 py-2.5 dark:bg-rose-500/20"
    >
      <Beacon tone="bg-rose-500" size="lg" />
      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
      <div className="min-w-0">
        <p className="text-sm font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">
          {alarmText(board)}
        </p>
        <p className="truncate text-xs text-rose-700/80 dark:text-rose-300/80">
          Production is not running on{' '}
          {count === 1 ? 'this line' : `these ${formatCount(count)} lines`}
        </p>
      </div>
    </div>
  );
}
