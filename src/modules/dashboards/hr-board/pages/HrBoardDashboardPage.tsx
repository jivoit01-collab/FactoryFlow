import '../../logistics-control/styles/ops-board.css';
import '../styles/hr-board.css';

import { useRef } from 'react';

import { useAuth } from '@/core/auth';

import { useFullscreen } from '../../dispatch/hooks';
import { OpsBars, OpsGroup, OpsMeter, OpsTopbar } from '../../logistics-control/components';
import { useFullBleed } from '../../logistics-control/hooks';
import { useHrBoard } from '../api';
import { HrBand, HrCappedRank, HrRank } from '../components';
import { HR_BOARD_TREND_COLUMNS } from '../constants';
import type { HrBoardResponse, HrHeadcount, HrLabour } from '../types';

/**
 * The HR control board.
 *
 * TWO BANDS, AND THEY DO NOT MEAN THE SAME BY "HERE"
 * ---------------------------------------------------
 * The rolls band is the whole group's directory; the gate band is this
 * company's labour. Switching company changes the second and not the first.
 * That is a property of the data, not a bug — the employee directory is one
 * directory for the entire factory, split by the plant a person is costed to
 * rather than by company — and the board states it in two places rather than
 * leaving a reader to discover it: each band's rail carries its own scope, and
 * the API sends a `scope` field per tile so the two can never drift apart.
 *
 * WHAT THIS BOARD DOES NOT SHOW, AND WHY
 * ---------------------------------------
 * **No pay, anywhere.** Not a total, not an average. Salary is a separate and
 * narrower family of rights in `employee_hierarchy`, and the API reads none of
 * them, which is what makes it safe to gate this screen on the widely-held
 * directory right.
 *
 * **Nobody is named.** Every figure is a count over a group. A wall screen in a
 * corridor is the wrong place for a person's record, and a board that cannot
 * name anybody cannot be walked past and read for gossip.
 *
 * **No attendance, joiners, leavers or attrition.** Those would each render a
 * confident zero today: the punch machines' sync has never run, and every
 * joining date in the directory is the date of the bulk import. A tile that
 * says nothing is better than one that says zero, which gets believed for a
 * week and then ignored forever.
 */

/** A usable number, or null. */
function num(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Whole number, Indian grouping. */
function whole(value: number | null | undefined): string {
  const n = num(value);
  return n === null ? '—' : Math.round(n).toLocaleString('en-IN');
}

/** One decimal, where the fraction still carries meaning — an average does. */
function decimal(value: number | null | undefined): string {
  const n = num(value);
  return n === null ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

/**
 * An ISO date as a day of the month.
 *
 * Parsed by hand rather than through `new Date('2026-09-10')`, which the
 * browser reads as midnight UTC and renders in local time — west of Greenwich
 * that shows the day before, which on an axis whose whole job is "which day"
 * would be the one error nobody would catch.
 */
function dayOfMonth(iso: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return parts ? String(Number(parts[3])) : '—';
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function dayLabel(iso: string | null | undefined): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!parts) return '—';
  const month = MONTHS[Number(parts[2]) - 1];
  return month ? `${Number(parts[3])} ${month}` : '—';
}

/** Why a band is empty, in the words that send the reader to the right person. */
function absence(
  key: string,
  meta: HrBoardResponse['meta'] | undefined,
  subject: string,
): string | undefined {
  if (meta?.withheld?.includes(key)) {
    return `${subject} needs a permission you do not hold. Ask an administrator.`;
  }
  if (meta?.degraded?.includes(key)) {
    return `${subject} could not be read just now. The board keeps trying on its own.`;
  }
  return undefined;
}

// ───────────────────────────── the rolls band ─────────────────────────────

function RollsBand({ data }: { data: HrBoardResponse | undefined }) {
  const headcount: HrHeadcount | null | undefined = data?.headcount;
  const unavailable = absence('headcount', data?.meta, 'The employee directory');
  const loading = !data;

  // The caveat that travels with the number. Not a warning — a person whose
  // department was never typed in is a gap in a record, not a problem with the
  // plant, and amber would claim otherwise.
  const unassigned = num(headcount?.unassigned) ?? 0;

  return (
    <HrBand
      domain="rolls"
      title="On the rolls"
      // Spelled out because this band, alone on the board, ignores the company
      // switcher. Two words is the whole explanation a wall reader needs.
      scope="All plants"
      columns="repeat(3, minmax(0, 1fr))"
      unavailable={unavailable}
    >
      <OpsGroup
        name="Head count"
        sub="In service — including probation, leave and suspension"
        value={whole(headcount?.total)}
        unit="people"
        loading={loading}
        tag={
          headcount
            ? { label: `${whole(headcount.managers)} manage a team`, tone: 'neut' }
            : undefined
        }
        viz={
          headcount ? (
            <>
              {/* One row per status, so "249 in service" can always be taken
                  apart into what those people actually are. A single ACTIVE
                  status renders one row, which is honest rather than empty. */}
              <HrRank rows={headcount.statuses.map((s) => ({ label: s.label, count: s.count }))} />
              {unassigned > 0 && (
                <p className="hr-caveat">
                  {whole(unassigned)} have no department on their record and are grouped as
                  Unassigned.
                </p>
              )}
            </>
          ) : null
        }
      />

      <OpsGroup
        name="By plant"
        sub="Which plant each person is costed to in SAP"
        value={whole(headcount?.segments?.length)}
        unit="segments"
        loading={loading}
        viz={headcount ? <HrRank rows={headcount.segments} /> : null}
      />

      <OpsGroup
        name="By department"
        sub={
          headcount
            ? `Largest of ${whole(headcount.department_count)} departments`
            : 'Largest departments'
        }
        value={whole(headcount?.departments?.rows?.[0]?.count)}
        unit="in the largest"
        loading={loading}
        viz={headcount ? <HrCappedRank data={headcount.departments} /> : null}
      />
    </HrBand>
  );
}

// ───────────────────────────── the gate band ──────────────────────────────

function GateBand({ data, company }: { data: HrBoardResponse | undefined; company: string }) {
  const labour: HrLabour | null | undefined = data?.labour;
  const unavailable = absence('labour', data?.meta, 'The labour gate');
  const loading = !data;

  const trend = labour?.trend ?? [];
  // The API sends a month; the wall draws a fortnight. Thirty labelled columns
  // at this width are thirty unreadable labels — but the average and the peak
  // below are still read off the whole window, server-side, so nothing is lost
  // except the part of the axis nobody could have read.
  const drawn = trend.slice(-HR_BOARD_TREND_COLUMNS);
  const tallest = Math.max(...drawn.map((day) => day.count), 0);
  const peakDate = labour?.peak?.date;

  const days = drawn.map((day) => ({
    label: dayOfMonth(day.date),
    pct: tallest > 0 ? (day.count / tallest) * 100 : 0,
    // Selective direct labels, never one per bar: at wall distance fourteen
    // numbers over fourteen columns is noise that hides the shape it sits on.
    // Today and the month's peak are the two a reader actually looks for.
    value:
      day.date === peakDate || day === drawn[drawn.length - 1]
        ? whole(day.count)
        : undefined,
  }));

  const pending = num(labour?.pending_allocation) ?? 0;

  return (
    <HrBand
      domain="gate"
      title="At the gate"
      scope={company}
      columns="repeat(4, minmax(0, 1fr))"
      unavailable={unavailable}
    >
      <OpsGroup
        name="Labour in today"
        sub={labour ? `Gate intake, ${dayLabel(labour.work_date)}` : 'Gate intake'}
        value={whole(labour?.today_in)}
        unit="people"
        loading={loading}
        tag={
          labour
            ? pending > 0
              ? { label: `${whole(pending)} not yet allocated`, tone: 'warn' }
              : { label: 'All allocated', tone: 'ok' }
            : undefined
        }
        viz={
          labour ? (
            <OpsMeter
              segments={[
                {
                  fill: 'main',
                  pct: labour.today_in > 0 ? (labour.shifts[0].count / labour.today_in) * 100 : 0,
                  label: 'Day',
                  figure: whole(labour.shifts[0].count),
                },
                {
                  fill: 'light',
                  pct: labour.today_in > 0 ? (labour.shifts[1].count / labour.today_in) * 100 : 0,
                  label: 'Night',
                  figure: whole(labour.shifts[1].count),
                },
              ]}
            />
          ) : null
        }
      />

      <OpsGroup
        name="By contractor"
        sub={labour ? `${whole(labour.contractor_count)} supplying today` : 'Supplying today'}
        value={whole(labour?.contractors?.rows?.[0]?.count)}
        unit="from the largest"
        loading={loading}
        viz={labour ? <HrCappedRank data={labour.contractors} /> : null}
      />

      <OpsGroup
        name="Where they went"
        sub="As allocated by the HODs"
        value={whole(labour?.today_allocated)}
        unit="placed"
        loading={loading}
        viz={labour ? <HrCappedRank data={labour.departments} /> : null}
      />

      <OpsGroup
        name="Last fortnight"
        sub={
          labour
            ? `Average ${decimal(labour.average_per_working_day)} a working day · peak ${whole(
                labour.peak?.count,
              )} on ${dayLabel(labour.peak?.date)}`
            : 'Daily intake'
        }
        tallViz
        loading={loading}
        missing={labour && drawn.length === 0 ? 'No labour booked in this window.' : undefined}
        viz={labour ? <OpsBars days={days} /> : null}
      />
    </HrBand>
  );
}

// ─────────────────────────────── the board ────────────────────────────────

export default function HrBoardDashboardPage() {
  const { data, isFetching, error, refetch } = useHrBoard();
  const { currentCompany } = useAuth();
  const shellRef = useRef<HTMLDivElement>(null);

  const { isFullscreen, toggle } = useFullscreen(shellRef);
  // Releases the shell's max-width and padding for the duration, the same way
  // its neighbours do. Without it the board is laid out for the viewport while
  // living in a much narrower column, and every length inside is a multiple of
  // a unit that believed the wider figure.
  useFullBleed(shellRef);

  const company = currentCompany?.company_name ?? data?.meta?.company ?? '—';

  if (error && !data) {
    return (
      <div className="hr-board ops-board">
        <div className="ops-board__inner">
          <OpsTopbar
            title="HR Control"
            scope={company}
            chips={[{ label: 'Feed', value: 'not answering' }]}
            totals={[]}
            busy
          />
          <main className="ops-stack">
            <section className="ops-band ops-b-production">
              <div className="ops-rail">
                <p>HR Control</p>
              </div>
              <div className="ops-groups" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <div className="ops-grp" style={{ gridTemplateRows: 'auto auto' }}>
                  <p className="ops-note">
                    The board could not be read. It keeps trying on its own.
                  </p>
                  <button type="button" className="ops-note" onClick={() => void refetch()}>
                    Retry now
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  // Prose caveats for a band that DID render — kept as chips rather than on the
  // tile, because they qualify the board rather than any one figure.
  const chips = (data?.meta?.warnings ?? []).map((warning, index) => ({
    label: index === 0 ? 'Note' : ' ',
    value: warning,
  }));

  return (
    <div ref={shellRef} className="hr-board ops-board">
      <div className="ops-board__inner">
        <OpsTopbar
          title="HR Control"
          // The header carries the COMPANY, because the gate band follows it.
          // The rolls band says "All plants" on its own rail rather than here,
          // so the two scopes are never read as one.
          scope={company}
          chips={chips}
          totals={[
            {
              caption: 'On the rolls',
              value: whole(data?.headcount?.total),
              sub: 'all plants',
              missing: !data?.headcount,
            },
            {
              caption: 'Labour in today',
              value: whole(data?.labour?.today_in),
              sub: company,
              missing: !data?.labour,
            },
            {
              caption: 'Avg a working day',
              value: decimal(data?.labour?.average_per_working_day),
              sub: `last ${data?.labour?.window_days ?? 30} days`,
              missing: !data?.labour,
            },
          ]}
          busy={isFetching}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggle}
        />

        <main className="ops-stack">
          <RollsBand data={data} />
          <GateBand data={data} company={company} />
        </main>
      </div>
    </div>
  );
}
