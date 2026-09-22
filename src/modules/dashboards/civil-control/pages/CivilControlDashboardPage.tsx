import '../../logistics-control/styles/ops-board.css';
import '../styles/civil-board.css';

import { useMemo, useRef } from 'react';

import { useFullscreen } from '../../dispatch/hooks';
import { useFullBleed } from '../../logistics-control/hooks';
import { CivilProjectTable, CivilTopbar } from '../components';
import { CIVIL_SAMPLE_PROJECTS } from '../constants';
import type { CivilProject } from '../types';
import { money, num, whole } from '../utils';

/**
 * The civil control board: every ongoing building job on the campus, one row
 * each, in the six columns the site meeting already uses.
 *
 * WHAT THIS PAGE IS TODAY
 * The screen, and only the screen. There is no `/dashboards/civil-board/`
 * endpoint and no civil register behind one — the board was asked for before
 * the data existed, so that the columns could be argued about against something
 * that looks like the meeting rather than against a description of it. It draws
 * `CIVIL_SAMPLE_PROJECTS` and says so in three places: the header pill, a chip,
 * and the word `sample` on every row.
 *
 * THAT TRIPLE MARKING IS THE POINT, NOT DECORATION. Capex figures are the kind
 * a manager forwards, and a fictional ₹3.5 Cr that reads like a real one is the
 * one failure this board must not have. When the feed lands, the flag goes with
 * the sample rows and the pill turns green on its own.
 *
 * WHAT IT WILL NOT DO WHEN THE FEED LANDS
 * Compute a business figure. Progress is what the site engineer certified, not
 * a share of money spent; slippage is work against time, never work against
 * budget. Both of those are definitions the business argues about, and a screen
 * that derived them would let two readers of one payload reach two answers.
 * What this file decides is a bar's width and where a rule goes instead of a
 * number.
 */
export default function CivilControlDashboardPage() {
  const shellRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(shellRef);

  // Releases the shell's max-width and padding while the board is mounted —
  // every length here is a multiple of a unit read off this element's own
  // width, so without it the board lays itself out for a much narrower column.
  useFullBleed(shellRef);

  // THE ONE PLACE THE SAMPLE ROWS ARE NAMED. Swapping this line for
  // `useCivilBoard()` is the whole of wiring the feed up; everything below
  // reads `projects` and `sample` and nothing else.
  const projects: CivilProject[] = CIVIL_SAMPLE_PROJECTS;
  const sample = true;

  // Fixed for the render, so the elapsed bar and the "months left" beside it
  // cannot be computed a tick apart and disagree at a month boundary.
  const today = useMemo(() => new Date(), []);

  const totals = useMemo(() => summarise(projects), [projects]);

  return (
    <div ref={shellRef} className="civil-board ops-board">
      <div className="ops-board__inner">
        <CivilTopbar
          title="Civil Control"
          scope="Jivo Oil · Bhakharpur plant"
          sample={sample}
          chips={[
            { label: 'Feed', value: 'civil register not wired up' },
            { label: 'Rows', value: 'worked example, not the register' },
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

        {/* Said once in full, above the table, because the header pill has room
            for a word and this needs a sentence. It is a band of the board
            rather than a dismissible notice: there is nothing to dismiss until
            the register exists, and a warning somebody can close is a warning
            the next reader never sees. */}
        {sample && (
          <p className="civ-notice">
            <b>No civil feed yet.</b> These four projects are a worked example so the
            layout can be judged — every name, figure and date below was invented. The
            board fills itself the moment the civil register is wired up.
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
              <CivilProjectTable projects={projects} sample={sample} today={today} />
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
