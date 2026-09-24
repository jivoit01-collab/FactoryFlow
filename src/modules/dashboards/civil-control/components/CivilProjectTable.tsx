import { CIVIL_SLIP_BAD_PCT, CIVIL_SLIP_WARN_PCT, CIVIL_STAGE_LABEL } from '../constants';
import type { CivilProject } from '../types';
import {
  barPct,
  elapsedPct,
  money,
  monthYear,
  NO_VALUE,
  num,
  pctRough,
  remainingLabel,
  slipAgainstCalendar,
  sqft,
} from '../utils';
import { CivilRing } from './CivilRing';

export interface CivilProjectTableProps {
  projects: CivilProject[];
  /**
   * The register has not answered yet.
   *
   * Changes nothing but the empty row, and that one line is the point: with no
   * rows and no flag, "no project is on the board" is what a board still
   * waiting for its first read would say about a campus it has not seen.
   */
  loading?: boolean;
  /** Fixed, so two renders a second apart cannot disagree about "today". */
  today?: Date;
}

/**
 * The whiteboard, as a table.
 *
 * SIX COLUMNS, IN THE ORDER THEY WERE DRAWN — number, project, area, budget,
 * progress, timeline. That order is not arbitrary and was not improved on: it
 * is how the site meeting runs, and a board that reorders its own columns makes
 * everyone in that meeting re-find their place every week.
 *
 * WHAT EACH COLUMN ADDS OVER THE MARKER PEN
 *  - Budget carries the spend under it and a bar between them, because "₹3.5
 *    Cr / ₹1.5 Cr" written one over the other is two numbers a reader has to
 *    divide in their head before it says anything.
 *  - Progress is a ring, and beside it the only judgement on this screen: work
 *    certified against time gone. 38% is neither good nor bad until you know
 *    what month it is.
 *  - Timeline carries the ORIGINAL committed date where it differs from
 *    today's. A programme that is re-baselined every time it slips is a
 *    programme that has never slipped.
 *
 * NO FIGURE HERE IS COMPUTED FROM ANOTHER. Spend does not imply progress and
 * progress does not imply spend — an advance against steel is a fifth of the
 * bill and none of the building — so the two columns are read from the register
 * separately and never fall back to each other.
 */
export function CivilProjectTable({ projects, loading = false, today }: CivilProjectTableProps) {
  const now = today ?? new Date();

  return (
    <div className="civ-tablewrap">
      <table className="civ-table">
        <colgroup>
          <col className="civ-c-no" />
          <col className="civ-c-name" />
          <col className="civ-c-area" />
          <col className="civ-c-money" />
          <col className="civ-c-prog" />
          <col className="civ-c-time" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">S. No</th>
            <th scope="col">Ongoing project</th>
            <th scope="col">Area</th>
            <th scope="col">Budget / spent</th>
            <th scope="col">Progress</th>
            <th scope="col">Timeline</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => (
            <ProjectRow key={project.id} project={project} serial={index + 1} now={now} />
          ))}

          {projects.length === 0 && (
            <tr className="civ-empty">
              <td colSpan={6}>
                {loading
                  ? 'Reading the construction register…'
                  : 'No project is on the board. Nothing is shown rather than a row standing in for one.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProjectRow({
  project,
  serial,
  now,
}: {
  project: CivilProject;
  serial: number;
  now: Date;
}) {
  const { money: cost, schedule } = project;

  const elapsed = elapsedPct(schedule.start, schedule.end, now);
  const { slip, tone } = slipAgainstCalendar(
    project.progress_pct,
    elapsed,
    CIVIL_SLIP_WARN_PCT,
    CIVIL_SLIP_BAD_PCT,
  );

  const budget = num(cost.budget);
  const spent = num(cost.spent);
  // Only a sanctioned budget can be drawn against. Spend with no budget behind
  // it is a real state — work started on a verbal approval — and it gets the
  // figure without a share, rather than a share of nothing.
  const drawnPct = budget !== null && budget > 0 && spent !== null ? (spent / budget) * 100 : null;

  const remaining = remainingLabel(schedule.end, now);
  const overrun = remaining?.endsWith('over') ?? false;
  // The date first committed to, kept only where it differs. Equal dates would
  // print a second identical date under the first and say nothing.
  const rebaselined =
    schedule.baseline_end && schedule.baseline_end !== schedule.end
      ? monthYear(schedule.baseline_end)
      : null;

  return (
    <tr>
      <td className="civ-no">{serial}</td>

      <td className="civ-name">
        <b>
          {project.name}
          {/* The register's own code for the job. It sits beside the name
              rather than in the first column because the serial there is a
              position on this board and changes as projects finish, while
              PRJ-2026-004 is what a site office quotes down the phone. */}
          {project.code && <u className="civ-code">{project.code}</u>}
        </b>
        <span className={`ops-tag civ-stage ${project.stage === 'on-hold' ? 'ops-t-nil' : 'ops-t-neut'}`}>
          {CIVIL_STAGE_LABEL[project.stage]}
        </span>
        {/* Where it is, and who answers for it. The register records a manager
            and does NOT record a contractor, so the second half names the
            manager and the missing contractor is reported as unrecorded — not
            as "not awarded", which would claim a tender state that nobody has
            entered anywhere. */}
        <small>
          {[
            project.location,
            project.manager,
            project.contractor ?? 'contractor not recorded',
          ]
            .filter(Boolean)
            .join(' · ')}
        </small>
        {/* The one line the columns cannot hold — why a job is stopped, what is
            waiting on what. It sits under the name rather than in a column of
            its own because it is the row's exception, not a field of it. */}
        {project.note && <em className="civ-note">{project.note}</em>}
      </td>

      <td className="civ-area">
        <b>{sqft(project.area_sqft)}</b>
        {/* The plot as the site office writes it, in feet whatever unit the
            project was filed in. Kept beside the area because "will it fit
            against the boundary" is the question the total area cannot
            answer. */}
        <small>
          {project.plot
            ? `${project.plot.length_ft.toLocaleString('en-IN')} × ${project.plot.width_ft.toLocaleString('en-IN')} ft`
            : 'no dimensions filed'}
        </small>
      </td>

      <td className="civ-money">
        <b>{money(cost.budget)}</b>
        <small>sanctioned</small>

        <div className="ops-meter civ-meter">
          {drawnPct === null ? (
            // No budget, or nothing billed against one. A hatched track, never
            // an empty one: an unfunded project and an unspent one are
            // different problems and must not look alike.
            <i className="civ-unknown" style={{ width: '100%' }} />
          ) : (
            <i className="ops-f-main" style={{ width: `${barPct(drawnPct)}%` }} />
          )}
        </div>

        <div className="civ-mline">
          <span>
            {spent === null ? NO_VALUE : money(spent)} <em>spent</em>
          </span>
          <span>
            {drawnPct === null
              ? spent === null
                ? 'nothing billed yet'
                : 'no sanction behind it'
              : `${pctRough(drawnPct)} drawn`}
          </span>
        </div>
      </td>

      <td className="civ-prog">
        <CivilRing pct={project.progress_pct} label={`${project.name} progress`} />
        {/* THE ONLY JUDGEMENT ON THE ROW, and it compares work with time rather
            than work with money. `nil` is not a quiet pass: a project nobody has
            measured is not a project going well. */}
        <span className={`ops-tag ops-t-${tone === 'nil' ? 'nil' : tone}`}>
          {slip === null
            ? 'not certified'
            : slip >= CIVIL_SLIP_WARN_PCT
              ? `${Math.round(slip)} pts behind`
              : slip <= -CIVIL_SLIP_WARN_PCT
                ? `${Math.round(-slip)} pts ahead`
                : 'on programme'}
        </span>
      </td>

      <td className="civ-time">
        <b>
          {monthYear(schedule.start)} <u>→</u> {monthYear(schedule.end)}
        </b>

        <div className="ops-meter civ-meter">
          {elapsed === null ? (
            <i className="civ-unknown" style={{ width: '100%' }} />
          ) : (
            <i className="ops-f-light" style={{ width: `${barPct(elapsed)}%` }} />
          )}
        </div>

        <div className="civ-mline">
          <span className={overrun ? 'civ-over' : undefined}>{remaining ?? NO_VALUE}</span>
          <span>{elapsed === null ? 'dates not filed' : `${pctRough(elapsed)} of the time gone`}</span>
        </div>

        {rebaselined && (
          // The date first committed to. Printed only where it differs, because
          // a programme re-baselined at every slip is a programme that has
          // never slipped.
          <em className="civ-base">first committed {rebaselined}</em>
        )}
      </td>
    </tr>
  );
}
