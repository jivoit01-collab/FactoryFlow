import { AlertTriangle, HardHat, Users } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { cn } from '@/shared/utils';

import { BoardPanel, PanelBadge, PanelEmpty } from '../../dispatch/components';
import { useWallPalette } from '../../dispatch/constants/wall.palette';
import { useAutoScroll } from '../../dispatch/hooks';
import { count } from '../../dispatch/utils/format';
import { GATE_AUTO_SCROLL_FROM } from '../constants/gate-dashboard.constants';
import type { GateBoard, LabourDepartmentSlice } from '../hooks/useGateBoard';

/**
 * Who is on site, and which department the day's labour went to.
 *
 * Two registers, stacked, and they are not interchangeable. The chips across
 * the top are the person-gate register — visitors and contractors signed in
 * individually, counted *right now*, the number that matters when the fire
 * alarm goes. The list underneath is the labour-gate register — a contractor
 * arrives with thirty people at the barrier and an HOD later splits those
 * thirty across departments, so it answers "who is working where today".
 *
 * They are shown together and never added together: the same labourer can
 * appear in both, once as a head at the gate and once as an allocation.
 *
 * The unallocated row is the point of the list. Labour that came through the
 * gate and that no department has claimed is labour the plant is paying for
 * without having decided what it is doing — it sits last, in amber, and
 * disappears entirely once the split is complete.
 */
export function GatePeoplePanel({
  board,
  isSingleDay,
  className,
}: {
  board: GateBoard;
  /** False when the header's From→To spans more than one day. */
  isSingleDay: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const palette = useWallPalette();
  const hex = palette.hue('inside');
  const labourHex = palette.hue('labour');
  const listRef = useRef<HTMLUListElement>(null);

  // The unallocated remainder is a row rather than a footnote, so it is drawn
  // against the same bar scale as the departments and can be compared by eye.
  const rows: LabourDepartmentSlice[] = [...board.labourDepartments];
  if (board.labourUnallocated > 0) {
    rows.push({
      id: null,
      name: 'Not yet allocated',
      allocated: board.labourUnallocated,
      contractors: 0,
    });
  }
  useAutoScroll(listRef, rows.length >= GATE_AUTO_SCROLL_FROM);
  const max = Math.max(...rows.map((row) => row.allocated), 1);

  const personTypes = [...board.personTypes].sort((a, b) => b.inside_count - a.inside_count);

  // The split is made on the Labour module and read on the gate's own board.
  // Send each viewer to the one they can actually open — a row that lands on an
  // access-denied screen is worse than a row that does nothing.
  const labourRoute = hasPermission(GATE_PERMISSIONS.LABOUR_GATE.ALLOCATE)
    ? '/labour'
    : '/gate/labour-in';

  return (
    <BoardPanel
      title="People on site"
      icon={Users}
      hex={hex}
      className={className}
      flush
      aside={
        <>
          <PanelBadge>{count(board.insideNow)} inside</PanelBadge>
          {board.longStay > 0 && (
            <PanelBadge tone="bad">{count(board.longStay)} long stay</PanelBadge>
          )}
        </>
      }
    >
      {board.longStay > 0 && (
        <div className="mx-4 mb-2 flex shrink-0 items-center gap-2 rounded-xl border border-rose-600/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {count(board.longStay)} {board.longStay === 1 ? 'person has' : 'people have'} been inside
          past the long-stay limit
        </div>
      )}

      {/* Person-gate register: who is signed in at this second. */}
      <div className="flex shrink-0 flex-wrap gap-2 px-4 pb-3">
        {personTypes.length === 0 ? (
          <span className="text-xs text-muted-foreground/70">
            {board.peopleLoading ? 'Reading the person register…' : 'Nobody is signed in.'}
          </span>
        ) : (
          personTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => navigate('/gate/visitor-labour')}
              className="flex items-center gap-2 rounded-full border border-black/[0.09] bg-black/[0.02] px-3 py-1 transition-colors hover:bg-black/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:border-white/10 dark:bg-white/[0.035] dark:hover:bg-white/[0.07]"
            >
              <span className="text-xs font-semibold capitalize text-muted-foreground">
                {type.name}
              </span>
              <span className="text-sm font-bold leading-none tabular-nums text-foreground">
                {count(type.inside_count)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                inside
              </span>
            </button>
          ))
        )}
      </div>

      {/* Labour-gate register: where the day's contractor labour was put. */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-black/[0.06] px-4 py-2 dark:border-white/5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `${labourHex}24` }}
          >
            <HardHat className="h-3.5 w-3.5" style={{ color: labourHex }} />
          </span>
          <h3 className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
            Labour by department
          </h3>
        </div>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {count(board.labourAllocated)} of {count(board.laboursIn)} allocated
          {/* The labour endpoint takes one date, not a range, so a multi-day
              board shows its last day and has to name it. Everything else on
              this screen spans the full From→To. */}
          {!isSingleDay && (
            <span className="ml-1 font-normal text-muted-foreground/70">
              · {board.labourDate} only
            </span>
          )}
        </span>
      </div>

      {rows.length === 0 ? (
        <PanelEmpty>
          {board.labourLoading
            ? 'Reading the labour register…'
            : board.laboursIn > 0
              ? 'No contractor labour has been split across departments yet.'
              : 'No contractor labour came through the gate on this day.'}
        </PanelEmpty>
      ) : (
        <ul
          ref={listRef}
          className="wall-scroll min-h-0 flex-1 divide-y divide-black/[0.06] overflow-y-auto dark:divide-white/5"
        >
          {rows.map((row) => {
            const unallocated = row.id === null;
            const rowHex = unallocated ? palette.hue('backlog') : labourHex;
            return (
              <li key={row.id ?? 'unallocated'}>
                <button
                  type="button"
                  onClick={() => navigate(labourRoute)}
                  className="relative flex w-full items-center gap-3 overflow-hidden px-4 py-2.5 text-left transition-colors hover:bg-black/[0.035] focus:outline-none focus-visible:bg-black/[0.05] dark:hover:bg-white/[0.05] dark:focus-visible:bg-white/[0.07]"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-500"
                    style={{
                      width: `${(row.allocated / max) * 100}%`,
                      backgroundColor: rowHex,
                      opacity: unallocated ? 0.16 : 0.12,
                    }}
                  />

                  <span className="relative z-10 min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-sm font-bold',
                        unallocated ? 'text-amber-700 dark:text-amber-300' : 'text-foreground',
                      )}
                    >
                      {row.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
                      {unallocated
                        ? 'Through the gate, no department yet'
                        : `${count(row.contractors)} contractor${row.contractors === 1 ? '' : 's'}`}
                    </span>
                  </span>

                  <span className="relative z-10 shrink-0 text-right">
                    <span className="block text-lg font-bold leading-none tabular-nums text-foreground">
                      {count(row.allocated)}
                    </span>
                    <span className="mt-0.5 block text-[9px] uppercase tracking-wider text-muted-foreground/60">
                      labour
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </BoardPanel>
  );
}
