import { AlertTriangle, Factory, Gauge } from 'lucide-react';

import {
  ControlEmpty,
  ControlError,
  ControlScrollList,
  ControlSection,
  ControlSkeletonRows,
} from '@/modules/dashboards/warehouse-control/components';
import { ACCENTS } from '@/modules/dashboards/warehouse-control/constants/warehouse-control.theme';
import { formatCount } from '@/modules/dashboards/warehouse-control/utils/format';
import { cn } from '@/shared/utils';

import { PANEL_ACCENT } from '../constants';
import {
  isLineAlarming,
  LINE_STATE_DOT,
  LINE_STATE_LABEL,
  LINE_STATE_TONE,
  type LineBoard,
  type LineRow,
  lineSpeedReason,
} from '../utils';
import { Beacon, LineAlarmBanner } from './LineAlarm';

export interface LinesPanelProps {
  board: LineBoard;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
}

const accent = ACCENTS[PANEL_ACCENT.speed];

/**
 * One row per line: what state it is in, and how fast it is going.
 *
 * A line that has stopped producing takes the whole row's colour rather than a
 * small badge, because it is the one thing on the board that should be
 * impossible to scroll past. Stopped and broken down share that alarm — both are
 * output the plant is not making — and stay told apart by their label and the
 * warning icon a breakdown carries.
 */
function LineRowItem({ row }: { row: LineRow }) {
  const alarming = isLineAlarming(row.state);
  const broken = row.state === 'BREAKDOWN';
  const speed = row.speed;
  const width = speed.percent ?? 0;

  return (
    <li
      className={cn(
        'py-2.5 pr-3 transition-colors',
        // A stopped line takes a thick red edge and a filled tint, so the row is
        // recognisable as a problem from across the room and not just on close
        // reading. The border sits inside the padding so calm rows keep their
        // left alignment with it.
        alarming
          ? 'border-l-4 border-rose-500 bg-rose-500/10 pl-2 hover:bg-rose-500/20 dark:bg-rose-500/15'
          : 'border-l-4 border-transparent pl-2 hover:bg-muted/40',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="mt-1">
            {alarming ? (
              <Beacon tone={LINE_STATE_DOT[row.state]} />
            ) : (
              <span
                className={cn('block h-2.5 w-2.5 rounded-full', LINE_STATE_DOT[row.state])}
                aria-hidden
              />
            )}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                'truncate text-sm',
                alarming ? 'font-semibold text-rose-700 dark:text-rose-300' : 'font-medium',
              )}
            >
              {row.lineName}
              {row.runs.length > 1 && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {formatCount(row.runs.length)} runs
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.product || 'No product set'}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {alarming ? (
            /* A filled pill rather than coloured text: at a glance the eye finds
               a block of colour long before it reads a word. */
            <p className="inline-flex items-center gap-1 rounded bg-rose-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
              {broken && <AlertTriangle className="h-3.5 w-3.5" />}
              {LINE_STATE_LABEL[row.state]}
            </p>
          ) : (
            <p className={cn('text-sm font-semibold', LINE_STATE_TONE[row.state])}>
              {LINE_STATE_LABEL[row.state]}
            </p>
          )}
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {speed.percent != null
              ? `${Math.round(speed.percent)}% of rated`
              : lineSpeedReason(speed.reason)}
          </p>
        </div>
      </div>

      {/* Speed against rated. Drawn only when there is a figure — an empty bar
          reads as a stopped line, which is a different thing from an unbooked
          one. */}
      {speed.percent != null && (
        <div className="mt-2 flex items-center gap-2">
          <div className={cn('h-1.5 flex-1 overflow-hidden rounded-full', accent.track)}>
            <div
              className={cn('h-full rounded-full transition-all', accent.fill)}
              style={{ width: `${width}%` }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatCount(speed.actual ?? 0)} / {formatCount(speed.rated ?? 0)} bph
          </span>
        </div>
      )}

      {row.breakdownMinutes > 0 && (
        <p className="mt-1.5 text-xs tabular-nums text-rose-600 dark:text-rose-400">
          {formatCount(row.breakdownMinutes)} min downtime logged today
        </p>
      )}
    </li>
  );
}

/** A count that only draws when there is something to count. */
function StateCount({ n, label, tone }: { n: number; label: string; tone: string }) {
  if (n === 0) return null;
  return (
    <span className={cn('text-xs font-medium tabular-nums', tone)}>
      {formatCount(n)} {label}
    </span>
  );
}

/**
 * Which lines are running, which are down, and how fast they are going.
 *
 * "Running" is an open production segment, never the run's own status — seven
 * runs read IN_PROGRESS on 2026-09-08 while only three were actually producing.
 * The four stopped mid-run are their own state here, because a line that has
 * quietly stopped is exactly what a supervisor opens this board to find.
 */
export function LinesPanel({
  board,
  loading,
  isFetching,
  error,
  onRetry,
  className,
}: LinesPanelProps) {
  const meta = loading
    ? undefined
    : `${formatCount(board.rows.length)} line${board.rows.length === 1 ? '' : 's'} today · ${formatCount(board.cases)} cases`;

  return (
    <ControlSection
      className={className}
      id="lines"
      title="Production Lines"
      description="Live state per line, and speed against rated"
      meta={meta}
      icon={Factory}
      accent={PANEL_ACCENT.speed}
      isFetching={isFetching && !loading}
      action={{ label: 'Runs', to: '/production/execution' }}
    >
      {error ? (
        <ControlError
          error={error}
          fallback="Today's production runs could not be read."
          onRetry={onRetry}
        />
      ) : loading ? (
        <ControlSkeletonRows rows={5} />
      ) : board.rows.length === 0 ? (
        <ControlEmpty message="No production runs have been created for today." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Above the list, not in it — the alert must be visible without
              anyone scrolling to look for it. */}
          <LineAlarmBanner board={board} />

          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
            <StateCount n={board.brokenDown} label="down" tone={LINE_STATE_TONE.BREAKDOWN} />
            <StateCount n={board.running} label="running" tone={LINE_STATE_TONE.RUNNING} />
            <StateCount n={board.stopped} label="stopped" tone={LINE_STATE_TONE.STOPPED} />
            <StateCount n={board.completed} label="finished" tone={LINE_STATE_TONE.COMPLETED} />
            <StateCount n={board.notStarted} label="not started" tone={LINE_STATE_TONE.DRAFT} />
            {board.breakdownMinutes > 0 && (
              <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                <Gauge className="h-3 w-3" />
                {formatCount(board.breakdownMinutes)} min downtime
              </span>
            )}
          </div>

          <ControlScrollList grow>
            {board.rows.map((row) => (
              <LineRowItem key={row.lineId} row={row} />
            ))}
          </ControlScrollList>

          {/* The breakdown feed is only as good as what gets logged, and 73% of
              breakdowns are typed in after the fact. A board that says "all
              green" without saying "nothing was logged" is comforting and
              wrong. */}
          {board.brokenDown === 0 && board.breakdownMinutes === 0 && (
            <p className="shrink-0 text-xs text-muted-foreground">
              No downtime logged today. Breakdowns are usually entered after the event, so a clear
              board is not proof no line stopped.
            </p>
          )}
        </div>
      )}
    </ControlSection>
  );
}
