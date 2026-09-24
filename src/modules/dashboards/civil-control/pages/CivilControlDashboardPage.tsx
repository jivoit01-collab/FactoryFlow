import '../../logistics-control/styles/ops-board.css';
import '../styles/civil-board.css';

import { useMemo, useRef } from 'react';

import { useAppSelector } from '@/core/store';

import { useFullscreen } from '../../dispatch/hooks';
import { useFullBleed } from '../../logistics-control/hooks';
import { CivilProjectTable, CivilTopbar } from '../components';
import { useCivilBoard } from '../hooks';
import type { CivilProject } from '../types';
import { money, num, whole } from '../utils';

/**
 * The civil control board: every ongoing building job on the campus, one row
 * each, in the six columns the site meeting already uses.
 *
 * WHERE THE ROWS COME FROM
 * The construction register — `/construction/projects/`, the same rows the
 * Construction module writes — filtered to the three statuses a project is
 * live at. Not a board endpoint: an aggregate that restated the register would
 * be a second answer to "what is being built", and two answers to a capex
 * question hanging in one building is the failure this board was always most
 * at risk of. The whole feed is `useCivilBoard()`.
 *
 * The board used to draw four invented projects because the screen was asked
 * for before the data existed. Those are gone, along with the sample pill and
 * the row marking that made them safe to look at.
 *
 * WHAT IT STILL WILL NOT DO
 * Compute a business figure. Progress is what the site engineer certified in
 * the daily log, not a share of money spent; slippage is work against time,
 * never work against budget. Both are definitions the business argues about,
 * and a screen that derived them would let two readers of one payload reach
 * two answers. What this file decides is a bar's width and where a rule goes
 * instead of a number.
 *
 * WHAT IT SAYS WHEN IT CANNOT READ
 * An unreachable register and a campus with nothing being built draw the same
 * empty table. The pill and the notice below exist to separate them, and the
 * board never falls back to rows of its own to fill the gap.
 */
export default function CivilControlDashboardPage() {
  const shellRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(shellRef);

  // Releases the shell's max-width and padding while the board is mounted —
  // every length here is a multiple of a unit read off this element's own
  // width, so without it the board lays itself out for a much narrower column.
  useFullBleed(shellRef);

  const { projects, state, refreshing, stale, baselinesMissing, error, refetch } =
    useCivilBoard();

  // The register is read per company, so the header names the company whose
  // register this is rather than a plant hardcoded into the page. A board
  // headed with the wrong company is a board reporting somebody else's capex.
  const company = useAppSelector((store) => store.auth.currentCompany);

  // Fixed for the render, so the elapsed bar and the "months left" beside it
  // cannot be computed a tick apart and disagree at a month boundary.
  const today = useMemo(() => new Date(), []);

  const totals = useMemo(() => summarise(projects), [projects]);

  return (
    <div ref={shellRef} className="civil-board ops-board">
      <div className="ops-board__inner">
        <CivilTopbar
          title="Civil Control"
          scope={`${company?.company_name ?? 'This company'} · construction register`}
          state={state}
          chips={[
            {
              label: 'Feed',
              value: refreshing ? 'construction register, reading' : 'construction register',
            },
            { label: 'Rows', value: 'approved, under way and on hold' },
          ]}
          totals={[
            {
              caption: 'Ongoing projects',
              value: whole(projects.length),
              sub: totals.onHold ? `${totals.onHold} on hold` : 'none on hold',
            },
            {
              caption: 'Sanctioned',
              value: money(totals.budget),
              // Says how much of the column the figure speaks for. A total over
              // a half-filled register looks identical to a complete one.
              sub:
                totals.budgeted === projects.length
                  ? 'all projects costed'
                  : `${totals.budgeted} of ${projects.length} costed`,
              missing: totals.budget === null,
            },
            {
              caption: 'Spent to date',
              value: money(totals.spent),
              sub:
                totals.drawnPct === null
                  ? 'nothing billed yet'
                  : `${Math.round(totals.drawnPct)}% of sanction drawn`,
              missing: totals.spent === null,
            },
          ]}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggle}
        />

        {/* A band of the board rather than a dismissible notice: a warning
            somebody can close is a warning the next reader never sees, and
            this one is about whether the table below means anything. */}
        {state === 'error' && (
          <p className="civ-notice" data-tone="bad">
            <b>The construction register did not answer.</b>{' '}
            {stale
              ? // The rows are still drawn, so the warning's job is to date
                // them rather than to deny them.
                'The projects below are from the last read that worked — treat every figure on them as of that moment, not of now.'
              : 'Nothing is shown below, because the board has no rows it can vouch for.'}
            {error?.message ? ` (${error.message})` : ''}
            <button type="button" onClick={refetch}>
              Try again
            </button>
          </p>
        )}

        {/* Said only where it changes how a date should be read. The original
            committed date comes from each project's revisions, read one
            project at a time; where that read failed, a programme extended
            three times looks exactly like one that has never moved. */}
        {state === 'live' && baselinesMissing && projects.length > 0 && (
          <p className="civ-notice">
            <b>Some original dates could not be read.</b> The timeline column
            shows each project's current committed date. Where a project's
            revisions did not load, the date it first promised is missing from
            under it — so a programme that has been extended reads here as one
            that has not.
          </p>
        )}

        <main className="ops-stack">
          <section className="ops-band civ-band ops-b-warehouse">
            <div className="ops-rail">
              <p>
                Projects <em>ongoing</em>
              </p>
            </div>

            <div className="civ-sheet">
              <CivilProjectTable
                projects={projects}
                loading={state === 'loading'}
                today={today}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/**
 * The header's three figures.
 *
 * NULL SURVIVES THE ADDITION. A project with no sanctioned budget contributes
 * nothing to the total and is counted in `budgeted` instead, so the header can
 * say how much of the register its own total speaks for. Summing with `?? 0`
 * would produce a confident figure that silently omits the projects nobody has
 * costed — which on a capex board is precisely the set somebody is looking for.
 */
function summarise(projects: CivilProject[]): {
  budget: number | null;
  spent: number | null;
  budgeted: number;
  drawnPct: number | null;
  onHold: number;
} {
  let budget: number | null = null;
  let spent: number | null = null;
  let budgeted = 0;

  for (const project of projects) {
    const projectBudget = num(project.money.budget);
    const projectSpent = num(project.money.spent);
    if (projectBudget !== null) {
      budget = (budget ?? 0) + projectBudget;
      budgeted += 1;
    }
    if (projectSpent !== null) spent = (spent ?? 0) + projectSpent;
  }

  return {
    budget,
    spent,
    budgeted,
    drawnPct: budget !== null && budget > 0 && spent !== null ? (spent / budget) * 100 : null,
    onHold: projects.filter((project) => project.stage === 'on-hold').length,
  };
}
