import '../../logistics-control/styles/ops-board.css';
import '../styles/plant-board.css';

import { useRef } from 'react';

import { useFullscreen } from '../../dispatch/hooks';
import {
  OpsBand,
  OpsBars,
  OpsGroup,
  OpsMeter,
  OpsTopbar,
} from '../../logistics-control/components';
import type { WorkforceStrip } from '../../logistics-control/types';
import { usePlantBoard } from '../api';
import type {
  PlantBoardResponse,
  PlantBoardWorkforce,
  ShiftingRoute,
  ShiftingStage,
  TodayOnTheLines,
  WasteDay,
} from '../types';

/**
 * A usable number, or null.
 *
 * Every formatter below goes through this. The board is rendered from one API
 * response on a screen nobody is standing at, so a field the server did not
 * send — an older backend, a partial payload, a renamed key — must degrade to a
 * rule and not to `NaN`. "NaN pcs ordered" on a factory wall is worse than a
 * blank tile: it looks like a number and it survives until somebody notices.
 */
function num(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Whole number, Indian grouping. */
function whole(value: number | null | undefined): string {
  const n = num(value);
  return n === null ? '—' : Math.round(n).toLocaleString('en-IN');
}

/**
 * A quantity sized for a wall.
 *
 * Pieces run to the millions here, and a wall has no room for eight digits —
 * but it also must not round a figure into meaninglessness, so the break is at
 * a lakh, where Indian readers already switch units themselves.
 */
function qty(value: number | null | undefined): string {
  const raw = num(value);
  if (raw === null) return '—';
  const n = Math.round(raw);
  if (Math.abs(n) >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1_00_000) return `${(n / 1_00_000).toFixed(2)} L`;
  return n.toLocaleString('en-IN');
}

// NOTE: `qty()` compacts a lakh to "L", so never append a litre unit to its
// output — "8.23 L L" is a figure whose unit has eaten its own magnitude. Spell
// litres out in full if a tile ever needs them again.

/** Indian-grouped rupees, compacted. A board has no room for paise. */
function money(value: number | null | undefined): string {
  const n = num(value);
  if (n === null) return '—';
  if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)} L`;
  if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

/** One decimal, where the fraction still carries meaning — a tonnage does. */
function decimal(value: number | null | undefined, digits = 1): string {
  const n = num(value);
  return n === null
    ? '—'
    : n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * An ISO date as a short day, for naming which day a figure belongs to.
 *
 * Parsed by hand rather than through `new Date('2026-09-10')`, which the
 * browser reads as midnight UTC and then renders in local time — west of
 * Greenwich that shows the day before, which on a tile whose whole point is
 * "which day is this" would be the one error nobody would catch.
 */
function dayLabel(iso: string | null | undefined): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!parts) return '—';
  const month = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][Number(parts[2]) - 1];
  return month ? `${Number(parts[3])} ${month}` : '—';
}

/**
 * Share of a total, as a bar width.
 *
 * Guarded against both the zero denominator a quiet day produces and the
 * missing figure a stale backend produces — either way the bar renders empty
 * rather than at `NaN%`, which the browser silently drops to full width.
 */
function share(part: number | null | undefined, total: number | null | undefined): number {
  const p = num(part);
  const t = num(total);
  return p !== null && t !== null && t > 0 ? (p / t) * 100 : 0;
}

/** A share for a tag, which says nothing rather than 0% when it cannot be computed. */
function pct(part: number | null | undefined, total: number | null | undefined): string {
  const p = num(part);
  const t = num(total);
  return p !== null && t !== null && t > 0 ? `${Math.round((p / t) * 100)}%` : '—';
}

/**
 * Every band's workforce strip, for as long as the salary module is being built.
 *
 * Passed explicitly rather than left undefined: the shared component's own
 * fallback names the factory-expense permission, which is the Logistics board's
 * reason and not this one's. A wall that explains itself wrongly is worse than
 * one that does not explain itself at all.
 */
/**
 * A band nobody has staffed.
 *
 * Four rules, and no explanation on the strip itself: `OpsPeople` does not
 * render a note (the Logistics floor had that line removed), and repeating the
 * reason under all four bands would be four chances to read it as four
 * different problems. The header says it once instead — the same rule the
 * tonnage note follows.
 */
const PENDING_PEOPLE: WorkforceStrip = {
  employees: null,
  employeeCostPerDay: null,
  labour: null,
  labourCostPerDay: null,
};

/**
 * One band's people, from the figures an operator typed.
 *
 * MONTHLY IN, DAILY OUT. The wage bill is authored per month because that is
 * how it is paid; the strip shows a daily run rate so it sits on the same scale
 * as the day's output beside it. The division is by CALENDAR days, not working
 * days — a wage is paid for the Sunday too.
 *
 * A band with nothing configured falls back to the rule above rather than
 * rendering zeros. Purchase is permanently in that state by design: no
 * department maps to it.
 */
function peopleFor(
  workforce: PlantBoardWorkforce | null | undefined,
  band: string,
): WorkforceStrip {
  const row = workforce?.bands?.[band];
  if (!row) return PENDING_PEOPLE;
  if (row.employees === null && row.labour === null) return PENDING_PEOPLE;
  return {
    employees: row.employees,
    employeeCostPerDay: row.employee_cost_per_day,
    labour: row.labour,
    labourCostPerDay: row.labour_cost_per_day,
  };
}

/**
 * Plant Control — the whole plant on one wall screen.
 *
 * Four bands, top to bottom, in the order material actually moves: what we
 * bought, what the stores hold, what the lines made, and what left the floor.
 * That order is the design. An admin reads down it and the day assembles
 * itself, and a problem in one band explains the band under it — BH-PF filling
 * up is what happens when Production outruns Shifting, and the two are adjacent
 * for exactly that reason.
 *
 * Colour carries meaning and nothing else. Each band owns one hue and every bar
 * inside it is a tint of that same hue, so composition never introduces a second
 * palette. Green, amber and red are reserved for condition and never used as a
 * domain colour; grey is always the part that is not there. The vocabulary — the
 * rail, the four-row tile, the meters — is the Logistics board's, imported
 * rather than copied, because two boards inventing their own teal would be two
 * teals.
 *
 * Two hard rules, both about not lying at a glance:
 *
 *  - **A figure with no source does not look like a figure.** Those tiles draw a
 *    rule where the number goes and state what they are waiting on. An empty
 *    warehouse and an unreadable one must not look the same.
 *  - **A band that could not be read keeps its place and says so.** The runs come
 *    from Postgres and the stock from SAP HANA; they fail for different reasons
 *    and must fail separately.
 *
 * Built for a screen nobody is standing at: one viewport, nothing below the
 * fold, one composed request per refresh, and type that scales with the display.
 */
export default function PlantBoardDashboardPage() {
  const { data, isFetching, error, refetch } = usePlantBoard();
  const shellRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(shellRef);

  if (error && !data) {
    return (
      <div className="plant-board ops-board">
        <div className="ops-board__inner">
          <OpsTopbar
            title="Plant Control"
            scope="Jivo Oil"
            chips={[{ label: 'Feed', value: 'not answering' }]}
            totals={[]}
            busy
          />
          <main className="ops-stack">
            <section className="ops-band ops-b-purchase">
              <div className="ops-rail">
                <p>Plant Control</p>
              </div>
              <div className="ops-groups" style={{ gridTemplateColumns: '1fr' }}>
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

  const degraded = data?.meta.degraded ?? [];

  return (
    <div ref={shellRef} className="plant-board ops-board">
      <div className="ops-board__inner">
        <PlantTopbar
          data={data}
          isFetching={isFetching}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggle}
        />

        <main className="ops-stack">
          <PurchaseBand data={data} degraded={degraded} />
          <StoreBand data={data} degraded={degraded} />
          <ProductionBand data={data} degraded={degraded} />
          <ShiftingBand data={data} degraded={degraded} />
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// Header
// ============================================================================

/**
 * Who is in the plant, and which plan the bands below are measured against.
 *
 * The totals slot carries the WORKFORCE, not a summary of the bands. An earlier
 * version put produced cases, floor value and pieces shipped up here, and all
 * three already headline a tile forty pixels lower — a header that repeats the
 * body teaches a reader to stop reading the header. The rule for this board is
 * that a figure appears in exactly one place, and the place is its own band.
 *
 * The workforce is the one figure with no band of its own — it belongs to the
 * whole plant, which is where the original design put it too. It reads as three
 * rules until the salary module lands, and that is the honest state: nobody can
 * see the plant's wage bill on this screen yet, and a dash says so where a zero
 * would lie.
 *
 * The plan month is named rather than the calendar month, because that is the
 * window two of the four bands are measured over. A board reporting against last
 * month's plan while everyone assumes this month's is the worst failure
 * available to it.
 */
/**
 * How many departments the head count actually speaks for.
 *
 * A total that quietly leaves two departments out is worse than one that says
 * it does, because nobody can see the difference on a wall.
 */
function rollSub(workforce: PlantBoardWorkforce | null): string {
  if (workforce?.total_people == null) return 'nobody configured';
  const missing = workforce.unconfigured.length;
  return missing === 0
    ? 'every department counted'
    : `${whole(missing)} department${missing === 1 ? '' : 's'} not counted`;
}

/** The payroll split, or a rule when either half is unknown. */
function rollSplit(workforce: PlantBoardWorkforce | null): string {
  const staff = workforce?.bands
    ? Object.values(workforce.bands).reduce<number | null>(
        (sum, band) => (band.employees === null ? sum : (sum ?? 0) + band.employees),
        null,
      )
    : null;
  const hired = workforce?.bands
    ? Object.values(workforce.bands).reduce<number | null>(
        (sum, band) => (band.labour === null ? sum : (sum ?? 0) + band.labour),
        null,
      )
    : null;
  if (staff === null && hired === null) return '—';
  return `${whole(staff)} · ${whole(hired)}`;
}

function PlantTopbar({
  data,
  isFetching,
  isFullscreen,
  onToggleFullscreen,
}: {
  data: PlantBoardResponse | undefined;
  isFetching: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const meta = data?.meta;
  const plan = meta?.plan ?? null;
  const workforce = data?.workforce ?? null;

  const chips = [
    {
      label: 'Plan',
      value: plan
        ? `day ${plan.days_elapsed ?? '—'} of ${plan.days_total ?? '—'}${plan.is_current ? '' : ' · not this month'}`
        : 'none in SAP',
    },
    {
      // Stated ONCE, here, rather than on each tile that reads in tonnes. Two
      // tiles do now (Total stock and Monthly planning) and a third will when
      // the stores can be weighed; a rule repeated on every one of them is
      // three chances to read it as three different rules.
      label: 'Tonnage',
      value: '1000 L = 1 t · oil and FG only',
    },
    {
      label: 'Feed',
      value: meta?.degraded.length
        ? `${meta.degraded.length} band${meta.degraded.length === 1 ? '' : 's'} unread`
        : 'all bands current',
    },
  ];

  // The board admitting something about its own figures. Surfaced rather than
  // logged: the oil yield tile in particular rests on an assumption, and an
  // assumption nobody can see is indistinguishable from a fact.
  if (meta?.warnings.length) {
    chips.push({ label: 'Check', value: meta.warnings[0] });
  }

  return (
    <OpsTopbar
      title="Plant Control"
      scope={`${meta?.company_code ?? 'Jivo Oil'} · ${plan?.name || 'no production plan'}`}
      chips={chips}
      busy={isFetching}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      // The board's one clickable thing, and it is in the header rather than on
      // a tile: the two figures behind it describe the stores themselves, not
      // any single tile's question, and a wall board with a control on a tile
      // invites somebody to press the tile.
      settingsTo="/dashboards/plant-board/settings"
      // The factory-wide card. Every department counted once, whichever band
      // it reports under — and it names what it leaves out rather than quietly
      // totalling five departments and calling it six.
      totals={[
        {
          caption: 'Total wage bill',
          value: money(workforce?.total_salary_monthly),
          sub:
            workforce?.total_cost_per_day == null
              ? 'not configured'
              : `${money(workforce.total_cost_per_day)} a day`,
          missing: workforce?.total_salary_monthly == null,
        },
        {
          caption: 'People on roll',
          value: whole(workforce?.total_people),
          sub: rollSub(workforce),
          missing: workforce?.total_people == null,
        },
        {
          caption: 'Employees against labour',
          value: rollSplit(workforce),
          sub: 'on the payroll against hired in',
          missing: workforce?.total_people == null,
        },
      ]}
    />
  );
}

// ============================================================================
// Band 1 — Purchase
// ============================================================================

function PurchaseBand({
  data,
  degraded,
}: {
  data: PlantBoardResponse | undefined;
  degraded: string[];
}) {
  const purchase = data?.purchase ?? null;
  const people = peopleFor(data?.workforce, 'purchase');

  if (!purchase) {
    return (
      <OpsBand
        domain="purchase"
        title="Purchase"
        scope="BH-PM · BH-BS · BH-NM · BH-PC"
        columns="1fr"
        people={people}
        unavailable={
          degraded.includes('purchase')
            ? 'SAP did not answer for the requirement sheet on the last refresh. The board keeps trying.'
            : 'Reading the plan and the stores…'
        }
      >
        {null}
      </OpsBand>
    );
  }

  /**
   * The requirement in three parts, and they must not overlap.
   *
   * Used, then what reached the floor but has not been opened, then what has
   * not been drawn at all. Consumption can legitimately exceed what arrived
   * this month — at the start of a plan the line eats last month's stock — so
   * the bar is scaled against whichever is larger, the requirement or the parts
   * themselves. The figures stay real; only the widths are normalised, which
   * keeps an unusual month honest instead of overflowing the bar.
   */
  /**
   * What the plan still needs BOUGHT.
   *
   * The plan's value less two things that do not need buying: what has already
   * been drawn to the floor (bought, delivered, gone) and what the stores are
   * holding against it. Subtracting only the stock would ask the buyer to
   * re-buy everything the line has already taken.
   */
  const planToPurchase = Math.max(
    0,
    purchase.planning_value - purchase.issued_value - purchase.on_hand_value,
  );
  /**
   * The bar is the WHOLE requirement, in the three states it can be in:
   * already drawn to the floor, sitting in the stores, or still to buy. The
   * three add up to the headline by construction, so a reader can check the
   * tile against itself — which is the point, and which the old two-segment
   * bar could not offer: it left the drawn share as an unlabelled gap.
   *
   * Scaled against whichever is larger, the requirement or the parts. At the
   * start of a plan the line eats last month's stock, so drawn plus on hand can
   * legitimately exceed the month's own requirement. The figures stay real;
   * only the widths are normalised, which keeps an unusual month honest
   * instead of overflowing the bar.
   */
  const planScale = Math.max(
    purchase.planning_value,
    purchase.issued_value + purchase.on_hand_value + planToPurchase,
  );

  return (
    <OpsBand
      domain="purchase"
      title="Purchase"
      scope="BH-PM · BH-BS · BH-NM · BH-PC"
      columns="1.05fr 1.15fr 1fr 1fr"
      people={people}
    >
      <OpsGroup
        name="Plan this month"
        // The tag is the share, the figure is the absolute — never the same
        // number twice in different type sizes. Which plan month this is
        // already sits in the header chip.
        tag={{ label: `${pct(planToPurchase, purchase.planning_value)} still to buy`, tone: 'neut' }}
        // NO SUBTITLE. The tile is the plan, on hand and to purchase, and
        // that is all three of them: the headline and the bar say it without
        // help. What the subtitle used to carry has not moved anywhere -- the
        // already-drawn share and the piece count are simply not on this tile
        // any more, at the business's instruction.
        //
        // ONE EXCEPTION, AND IT IS NOT DECORATION. A component the item master
        // holds no price for is left out of every rupee figure here, so the
        // plan reads LOW and nothing on the tile would say why. That still
        // shows, because a silently understated buying figure is the one thing
        // this tile must never be.
        sub={
          purchase.unpriced_count > 0
            ? `${whole(purchase.unpriced_count)} components carry no price`
            : undefined
        }
        value={money(purchase.planning_value)}
        // "PM planned value", not "total plan". The figure is the PACKING
        // MATERIAL the month's plan needs, priced -- every BOM component
        // exploded off the plan and valued at the item master's last purchase
        // price. It is not what the month's output is worth, and "total plan"
        // read as though it were. "Plan this month" over "total plan" also said
        // the same thing twice and still left the important word out.
        unit="total PM required"
        viz={
          // Left to right is the requirement being worked through: what the
          // floor has already taken, what the stores are holding against it,
          // and what nobody has yet bought. The darkest tint is the last one
          // because it is the only one anybody can act on.
          <OpsMeter
            segments={[
              {
                fill: 'mute',
                pct: share(purchase.issued_value, planScale),
                label: 'Already drawn',
                figure: money(purchase.issued_value),
              },
              {
                fill: 'light',
                pct: share(purchase.on_hand_value, planScale),
                label: 'PM on hand',
                figure: money(purchase.on_hand_value),
              },
              {
                fill: 'main',
                pct: share(planToPurchase, planScale),
                label: 'PM to purchase',
                figure: money(planToPurchase),
              },
            ]}
          />
        }
      />

      {/* The month's buying: how many orders were placed, how much they
          ordered, and how much of it has arrived. The three tie by
          construction — ordered = received + still open — because all three
          come off the same purchase-order lines rather than from three
          registers that would each have their own idea of the month. */}
      <OpsGroup
        name="Purchased"
        tag={{ label: `${whole(purchase.po_count)} POs raised`, tone: 'neut' }}
        // The line count, and nothing else. How many of them are past due was
        // asked for and then dropped: the tile answers "what did we buy", and
        // lateness is a different question that belongs to whoever chases it.
        sub={`${whole(purchase.po_lines)} lines`}
        value={money(purchase.ordered_value)}
        unit="ordered"
        viz={
          <OpsMeter
            segments={[
              {
                fill: 'main',
                pct: share(purchase.po_received_value, purchase.ordered_value),
                label: 'Received',
                figure: money(purchase.po_received_value),
              },
              {
                fill: 'mute',
                pct: share(purchase.po_open_value, purchase.ordered_value),
                label: 'Still to come',
                figure: money(purchase.po_open_value),
              },
            ]}
          />
        }
      />

      <OpsGroup
        name="Against benchmark"
        tag={
          purchase.below_benchmark_count > 0
            ? {
                label: `${pct(purchase.below_benchmark_count, purchase.sku_count)} of the range`,
                tone: 'bad',
              }
            : { label: 'all covered', tone: 'ok' }
        }
        // NO SUBTITLE. The count below is the headline, the split is the bar,
        // and the share of the range is the pill -- the tonnage and the range
        // size came off at the business's instruction.
        value={whole(purchase.below_benchmark_count)}
        unit="SKUs below"
        viz={
          // Only the shortfall. The bar is the headline broken into its two
          // halves — scaled against the 15, not the 142 — so it answers the
          // one thing the headline cannot: which side the shortfall sits in.
          // The healthy SKUs are not drawn at all, because a tile about what is
          // missing should not spend most of its bar on what is fine.
          <OpsMeter
            segments={[
              {
                fill: 'light',
                pct: share(purchase.low_count, purchase.below_benchmark_count),
                label: 'Low',
                figure: whole(purchase.low_count),
              },
              {
                fill: 'main',
                pct: share(purchase.critical_count, purchase.below_benchmark_count),
                label: 'Critical',
                figure: whole(purchase.critical_count),
              },
            ]}
          />
        }
      />

      {/* The PM Requirement sheet's own answer, not a second one. Select its
          Over-purchased chip and add up Req after PO and this is the figure:
          the surplus those items will be holding once their open orders land.
          Recomputing it here gave two answers to one question, which is the
          one thing a wall board must not do. */}
      <OpsGroup
        name="Over purchased"
        tag={
          purchase.over_purchased_count > 0
            ? { label: `${whole(purchase.over_purchased_count)} SKUs over`, tone: 'warn' }
            : { label: 'nothing over', tone: 'ok' }
        }
        // IN MONEY, NOT PIECES. A surplus of 31 lakh pieces means nothing
        // next to the plan and the orders on the tiles beside it, which are
        // both in rupees; what the over-buying is WORTH is the figure that
        // compares. The pieces are still on the requirement sheet for anybody
        // who needs to go and count them.
        //
        // The count is in the pill, so the subtitle says only what the figure
        // is -- the requirement sheet's own Req-after-PO on its over-purchased
        // rows, priced. Not a second answer to the same question.
        // NO UNIT WORD. The rupee sign is the unit, and the tile is named
        // Over purchased -- "surplus" after the figure only said the heading
        // again.
        sub="Req after PO on the over-purchased rows"
        value={money(purchase.over_purchase_value)}
        // No visualisation. The tile is one figure off the requirement sheet,
        // and everything tried beside it was a restatement of that figure
        // rather than a second fact about it.
      />
    </OpsBand>
  );
}

// ============================================================================
// Band 2 — Store
// ============================================================================

function StoreBand({
  data,
  degraded,
}: {
  data: PlantBoardResponse | undefined;
  degraded: string[];
}) {
  const store = data?.store ?? null;
  const people = peopleFor(data?.workforce, 'store');

  if (!store) {
    return (
      <OpsBand
        domain="store"
        title="Store"
        scope="Packaging"
        columns="1fr"
        people={people}
        unavailable={
          degraded.includes('store')
            ? 'The stores could not be read on the last refresh. The board keeps trying.'
            : 'Reading the stores…'
        }
      >
        {null}
      </OpsBand>
    );
  }

  const space = store.stock_space;
  const area = space.area;
  const idle = store.non_moving;
  const idleSplit = idle.slow_moving_count + idle.non_moving_count;
  const vehicles = store.pm_vehicles_today;
  const blowing = store.blowing;
  const blowingTrend = blowing.daily;
  const blowingBest = Math.max(1, ...blowingTrend.map((row) => row.bottles));


  return (
    <OpsBand
      domain="store"
      title="Store"
      scope="Packaging"
      columns="1.05fr 1.15fr 1fr 1fr"
      people={people}
    >
      {/* First in the band, because how full the stores are is the question
          the other tiles qualify — ₹53 L standing idle reads differently in a
          store at 40% than one at 95%.

          Capacity and the last audit date are ONE tile because they are one
          answer: both describe the building rather than the stock in it, both
          are set on the same configuration page, and the mockup asked for the
          audit date underneath the space figure rather than beside it.

          Neither can be derived. Capacity exists in no system — not SAP's
          warehouse master, not the WMS layout, not this backend. And a clean
          stock count writes no movement row at all, so a date read off
          movements would actually mean "last count that found a discrepancy". */}
      <OpsGroup
        name="Stock space"
        tag={
          space.audit_days_ago == null
            ? { label: 'never counted', tone: 'nil' }
            : {
                // A store nobody has counted in a quarter is the condition
                // this tile exists to surface, and it qualifies every figure
                // on the tile: an uncounted store's stock is SAP's opinion.
                label: `counted ${whole(space.audit_days_ago)}d ago`,
                tone: space.audit_days_ago > 90 ? 'bad' : space.audit_days_ago > 45 ? 'warn' : 'ok',
              }
        }
        // THE FLOOR LEADS, AND THE COUNT DATE MOVED TO THE PILL. The tile is
        // called Stock space and the question is how much there is; how long
        // ago somebody counted it is a condition on that answer, which is what
        // a pill is for.
        // THE FLOOR IT HAS AND THE PART IN USE, once somebody has measured
        // the one factor that puts pieces and square feet on one scale. Until
        // then the headline falls back to the floor itself: both halves stay
        // reported, each in its own real unit, and nothing is guessed.
        sub={
          area.occupied_sqft == null
            ? `${whole(area.sqft)} sq ft · ${qty(area.held_pieces)} pcs · ${money(area.held_value)} held`
            : `${whole(area.sqft)} sq ft across ${whole(area.store_count)} stores · ${decimal(area.pallets)} pallets standing`
        }
        value={area.occupied_pct == null ? whole(area.sqft) : decimal(area.occupied_pct)}
        unit={area.occupied_pct == null ? 'sq ft of floor' : '% of the floor in use'}
        viz={
          area.occupied_sqft == null ? (
            // No factor yet, so the bar shows the floor divided the way it was
            // actually MEASURED -- the first block covers three warehouses as
            // one space and cannot be split -- and names what is missing. An
            // invented percentage here is the one thing this tile must not
            // show: somebody would plan a building against it.
            <OpsMeter
              segments={[
                ...area.blocks.map((block, index) => ({
                  fill: (['main', 'light', 'mute'] as const)[index] ?? 'mute',
                  pct: share(block.sqft, area.sqft),
                  label: block.label,
                  figure: `${whole(block.sqft)} sq ft`,
                })),
                {
                  fill: 'mute' as const,
                  pct: 0,
                  label: 'In use',
                  figure: 'set the floor a pallet takes',
                },
              ]}
            />
          ) : (
            // Used against free, on the floor's own scale. Two figures, which
            // is the question asked: how much space there is and how much of
            // it is gone.
            //
            // The two disclosures that used to sit here -- the pallet
            // footprint, and the items with no pallet figure -- came off at the
            // business's instruction. Neither is lost: the service still raises
            // a warning when stock cannot be measured, and the header's Check
            // chip carries it, so the tile can still be known to be a floor
            // rather than the whole truth.
            <OpsMeter
              segments={[
                {
                  fill: 'main',
                  pct: share(area.occupied_sqft, area.sqft),
                  label: 'In use',
                  figure: `${whole(area.occupied_sqft)} sq ft`,
                },
                {
                  fill: 'mute',
                  pct: share(area.free_sqft, area.sqft),
                  label: 'Free',
                  figure: `${whole(area.free_sqft)} sq ft`,
                },
              ]}
            />
          )
        }
      />

      {/* Read with the Non-Moving dashboard's own rules, so the two screens
          agree: over 45 idle days is non-moving, 30-45 is slow-moving, and a
          SKU in several stores keeps its FRESHEST movement — an item being
          consumed in one store must not read as dead because a pallet of it
          sits untouched in another.

          No percentage: with no age floor on the fetch almost every SKU has an
          idle day, and the endpoint returns no total-stock denominator to
          divide by. A count and a value need neither. */}
      <OpsGroup
        name="Non-moving stock"
        tag={{ label: `${whole(idle.item_count)} SKUs idle`, tone: 'neut' }}
        sub={`Oldest ${whole(idle.oldest_days)} days · ${whole(idle.recent_count)} SKUs still moving`}
        value={money(idle.total_value)}
        unit="idle in the stores"
        viz={
          <OpsMeter
            segments={[
              {
                fill: 'light',
                pct: share(idle.slow_moving_count, idleSplit),
                label: `Slow 30-45d`,
                figure: whole(idle.slow_moving_count),
              },
              {
                fill: 'main',
                pct: share(idle.non_moving_count, idleSplit),
                label: 'Non-moving 45d +',
                figure: whole(idle.non_moving_count),
              },
            ]}
          />
        }
      />

      {/* Trucks, the orders they carried, and what QC made of the pieces.
          There is no PACKING_MATERIAL gate entry type — the five are
          RAW_MATERIAL, DAILY_NEED, MAINTENANCE, CONSTRUCTION and FIXED_ASSET —
          so a packaging truck arrives as a raw-material entry and is
          identified by where its order lines land: a packaging PO lands in a
          packaging store. */}
      <OpsGroup
        name="Packing material in"
        tag={{
          label: `${whole(vehicles.po_count)} POs · ${whole(vehicles.line_count)} lines`,
          tone: 'neut',
        }}
        // The total, and nothing else. What it is made of is the bar
        // underneath, and where it came from is the tile's own name.
        sub={`Total ${qty(vehicles.received_qty)} pcs`}
        value={whole(vehicles.count)}
        unit="vehicles"
        viz={
          <OpsMeter
            segments={[
              {
                fill: 'main',
                pct: share(vehicles.accepted_qty, vehicles.received_qty),
                label: 'Booked to SAP',
                figure: qty(vehicles.accepted_qty),
              },
              {
                fill: 'light',
                pct: share(vehicles.rejected_qty, vehicles.received_qty),
                label: 'Rejected',
                figure: qty(vehicles.rejected_qty),
              },
              // Received at the gate with no GRPO posted yet. NOT a quality
              // question: accepted and rejected are only written when the
              // goods receipt is posted to SAP, so on a today board this is
              // normally most of the intake. Drawn only when it is non-zero.
              ...(vehicles.awaiting_grpo_qty > 0
                ? [
                    {
                      fill: 'mute' as const,
                      pct: share(vehicles.awaiting_grpo_qty, vehicles.received_qty),
                      label: 'Awaiting GRPO',
                      figure: qty(vehicles.awaiting_grpo_qty),
                    },
                  ]
                : []),
            ]}
          />
        }
      />

      {/* Bottles lead, money follows. Both averages divide by the days that
          actually BLEW rather than the days in the month — the same rule the
          Production band uses, because a Sunday is not a bad day and dividing
          by it reports one. */}
      <OpsGroup
        name="Blowing this month"
        // What is turning right now, and what it has cost so far. A different
        // question from the two monthly figures below it, which is why it sits
        // in the tag rather than beside them.
        tag={
          blowing.running_runs === 0
            ? { label: 'no line running', tone: 'nil' }
            : {
                label: `${whole(blowing.running_runs)} running · ${money(blowing.running_cost)} so far`,
                tone: 'ok',
              }
        }
        // Two figures only: the bottles and what the month has cost. The
        // per-day averages and the per-bottle rate are all derivable from
        // these two and the day count, and each one added a number a reader
        // had to work out how to combine.
        sub={`${money(blowing.cost)} this month`}
        value={qty(blowing.bottles_made)}
        unit="bottles"
        viz={
          // Heights are a share of the best day in the window, not of a
          // target: the shape answers "is today normal for this week", which
          // is the only question seven bars can honestly answer at this size.
          // The totals above cover the whole month; these bars are the last
          // week of it.
          <OpsBars
            days={blowingTrend.map((row) => ({
              label: row.date.slice(8, 10),
              pct: share(row.bottles, blowingBest),
              // A day that blew nothing shows no figure — the empty column
              // already says it, and a "0" above it reads as a measurement.
              value: row.bottles > 0 ? qty(row.bottles) : undefined,
            }))}
          />
        }
      />

      {/* Neither of these can be derived. Capacity exists in no system, and a
          clean stock count writes no movement row at all — so a date read off
          movements would actually mean "last count that found a discrepancy". */}
    </OpsBand>
  );
}

// ============================================================================
// Band 3 — Production
// ============================================================================

function ProductionBand({
  data,
  degraded,
}: {
  data: PlantBoardResponse | undefined;
  degraded: string[];
}) {
  const production = data?.production ?? null;
  const people = peopleFor(data?.workforce, 'production');

  if (!production) {
    return (
      <OpsBand
        domain="production"
        title="Production"
        scope="FG · BH-PF"
        columns="1fr"
        people={people}
        unavailable={
          degraded.includes('production')
            ? 'SAP did not answer for the plan and the floor on the last refresh. The board keeps trying.'
            : 'Reading the lines and the floor…'
        }
      >
        {null}
      </OpsBand>
    );
  }

  // On the TONNAGE, because that is what the Monthly planning tile reads in.
  // The piece ratio is a differently weighted number and would not match the
  // figures printed beside it.
  const attainment = production.attainment_tons_pct;
  const attainmentTone = attainment == null ? 'nil' : attainment >= 90 ? 'ok' : attainment >= 70 ? 'warn' : 'bad';
  const tonsLeft = Math.max(0, production.planned_tons - production.produced_tons);
  const floor = production.floor;
  const age = floor.age;
  /**
   * Stock that has never left BH-PF folds into the oldest bucket.
   *
   * It is the worse case, not a lighter one -- "has never shipped" beats "has
   * not shipped for eight days" -- so it belongs at that end rather than in a
   * fourth segment nobody has room to read. The count is named in the subtitle
   * when it is non-zero.
   */
  const oldestTons = age.d7_plus.tons + age.never_shipped.tons;
  /**
   * The bar is scaled to the bucketed pieces, not to the warehouse total.
   * They differ: the total sums every ledger row while the buckets only count
   * rows actually holding stock, and BH-PF carries 68 zero-quantity rows. A
   * bar scaled to the larger figure would never fill and the gap would mean
   * nothing.
   */
  const agedTons = age.fresh.tons + age.d4_7.tons + oldestTons;
  const waste = production.wastage;

  // The waste register, read day by day on the RUN's date. The headline is the
  // last day anything was logged against, not today: waste is written up one to
  // eight days after the shift, so today is nearly always empty and a tile that
  // headlined it would report a clean shift every evening on the strength of
  // missing paperwork.
  const wasteDay = waste.logged_latest as WasteDay | undefined | null;
  const wasteWeek = waste.logged_daily ?? [];
  const wasteBest = Math.max(1, ...wasteWeek.map((row) => row.total_value));
  const wasteBehind = num(waste.logged_days_behind);

  // Today's own plan and output, from the lines' register rather than SAP.
  // In CASES, the unit the run is planned in, so the figure on the wall is the
  // one the supervisor typed. Read through `num` so a backend that has not been
  // deployed yet — the band answers, without this block — draws rules instead
  // of NaN, which is the rule every other tile here follows.
  const today = production.today as TodayOnTheLines | undefined;
  const todayPlanned = num(today?.planned_cases);
  const todayProduced = num(today?.produced_cases);
  const todayRuns = num(today?.runs);
  const todayLeft =
    todayPlanned === null || todayProduced === null
      ? null
      : Math.max(0, todayPlanned - todayProduced);

  return (
    <OpsBand
      domain="production"
      title="Production"
      scope="BH-PF"
      columns="1.1fr 1.1fr 1.05fr 1.05fr"
      people={people}
    >
      {/* Two figures and no third: what the supervisor planned for today and
          what the lines have packed so far. Both from Production Execution —
          SAP holds no single-day plan, and posts the receipt after the shift,
          so neither half exists in the journal while the day is still running.
          A day runs many runs on many lines; both halves are summed across all
          of them.

          In CASES, alone on this band. Every tile beside it reads SAP and so
          speaks in pieces, but this one reads the run register, where the
          quantity is typed in cases — and a wall figure the floor cannot find
          on its own screen is a figure it stops trusting. The pieces are in the
          payload for anyone who wants them; they are not a second headline. */}
      <OpsGroup
        name="Today on the lines"
        tag={{
          label:
            todayRuns === null
              ? '—'
              : todayRuns === 0
                ? 'nothing planned'
                : `${whole(todayRuns)} runs · ${whole(today?.lines)} lines`,
          tone: todayRuns ? 'neut' : 'nil',
        }}
        // A run not yet started is still a plan, so drafts are counted on the
        // planned side; saying so stops the morning's gap reading as a fault.
        // No "left out" caveat here as there is on a piece total: a case count
        // needs no pack factor, so no run can be missing from this one.
        sub={`Planned ${qty(todayPlanned)} cases · drafts counted as planned`}
        value={qty(todayProduced)}
        unit="cases"
        viz={
          <OpsMeter
            segments={[
              { fill: 'main', pct: share(todayProduced, todayPlanned) },
              {
                fill: 'mute',
                pct: share(todayLeft, todayPlanned),
                label: 'Left to make',
                figure: qty(todayLeft),
              },
            ]}
          />
        }
      />

      {/* The plan leads and output measures itself against it. BOTH SIDES COME
          FROM SAP: the plan off the monthly forecast it is authored as (`OFCT`
          header, `FCT1` lines) and the output off the movement journal (`OINM`
          TransType 59, the goods receipt from production). SAP holds both in
          `OITM.InvntryUom`, so the comparison itself needs no conversion — the
          tons are one step off those pieces, at the business's 1000 L = 1 t,
          and a SKU SAP carries no litre volume for is in neither ton figure,
          which is what the note under the bar counts. */}
      <OpsGroup
        name="Monthly planning"
        tag={{
          label: attainment == null ? 'no plan' : `${attainment}% produced`,
          tone: attainmentTone,
        }}
        sub={`${whole(production.produced_tons)} t produced · ${qty(production.produced_qty)} pcs`}
        value={whole(production.planned_tons)}
        unit="t planned"
        viz={
          <OpsMeter
            segments={[
              // Unlabelled: the subtitle already names the produced figure,
              // and the legend exists for what it does not.
              { fill: 'main', pct: share(production.produced_tons, production.planned_tons) },
              {
                fill: 'mute',
                pct: share(tonsLeft, production.planned_tons),
                label: 'Left to make',
                figure: `${whole(tonsLeft)} t`,
              },
              ...(production.unweighed_lines > 0
                ? [
                    {
                      // Zero width: a disclosure, not a slice. These SKUs are
                      // in the plan and in the pieces, and in neither ton.
                      fill: 'mute' as const,
                      pct: 0,
                      label: 'No litre volume',
                      figure: `${whole(production.unweighed_lines)} SKUs`,
                    },
                  ]
                : []),
            ]}
          />
        }
      />

      {/* Everything standing in BH-PF, and how long it has stood. Aged on
          when stock last LEFT, never on any movement: this is the floor goods
          are produced INTO, so a receipt is arrival rather than movement, and
          a batch that has sat for ten days would otherwise read as fresh the
          moment a new pallet of the same SKU lands beside it. */}
      <OpsGroup
        name="Total stock"
        // The value as the pill: a different measure from the pieces above it,
        // and the one a reader quotes.
        tag={{ label: money(floor.stock_value), tone: 'neut' }}
        sub={
          floor.unweighed_items > 0
            ? `${whole(floor.item_count)} SKUs · ${whole(floor.unweighed_items)} carry no litre volume, so are absent from the tonnage`
            : `${whole(floor.item_count)} SKUs · ${whole(age.never_shipped.items)} have never shipped from here`
        }
        value={decimal(floor.tons)}
        unit="tonnes at BH-PF"
        viz={
          <OpsMeter
            segments={[
              {
                fill: 'mute',
                pct: share(age.fresh.tons, agedTons),
                label: 'Up to 3 days',
                figure: `${decimal(age.fresh.tons)} t`,
              },
              {
                fill: 'light',
                pct: share(age.d4_7.tons, agedTons),
                label: '4–7 days',
                figure: `${decimal(age.d4_7.tons)} t`,
              },
              {
                fill: 'main',
                pct: share(oldestTons, agedTons),
                label: 'Over 7 days',
                figure: `${decimal(oldestTons)} t`,
              },
            ]}
          />
        }
      />

      {/* What the floor wrote down, day by day, off the production runs.

          Dated by the RUN, never by when the row was typed: on live records
          only 8 of 795 rows were entered the same day, so a register read on
          its typing date piles two shifts onto whichever morning somebody did
          the paperwork. Bars are the week, so "per day" is on the face of it
          rather than implied by one total.

          IN MONEY, because the register holds pieces, kilos and metres and a
          quantity total across them measures nothing — 10,498 pieces plus 40
          metres is 10,538 of no unit at all. Rupees are also the scale the
          waste matters on: a spoiled 5 L bottle at ₹45.51 is not the same
          event as a spoiled label at ₹0.30. Each row is valued at the price
          its own run was costed at.

          Packing material leads because it is what the register actually
          holds; raw material sits beside it and reads ₹0 until the floor
          starts logging oil waste against runs. */}
      <OpsGroup
        name="Wastage"
        tag={{
          label:
            wasteBehind == null
              ? 'nothing logged'
              : wasteBehind === 0
                ? `logged today · ${whole(wasteDay?.logs)} rows`
                : `${dayLabel(waste.logged_latest_date)} · ${whole(wasteBehind)}d behind`,
          tone: wasteBehind == null ? 'nil' : wasteBehind > 2 ? 'warn' : 'neut',
        }}
        // Both halves named in money, and the packing quantity behind the
        // rupees given too — a value with no quantity cannot be checked
        // against anything the floor saw.
        sub={
          `Raw material ${money(wasteDay?.rm_value ?? 0)} · ` +
          `packing ${qty(wasteDay?.pm_pieces)} pcs` +
          (wasteDay?.pm_other?.length
            ? `, ${wasteDay.pm_other
                .map((row) => `${whole(row.qty)} ${row.uom}`)
                .join(', ')}`
            : '')
        }
        value={money(wasteDay?.pm_value)}
        unit="packing material"
        viz={
          // A share of the worst day in the window, not of a target: there is
          // no waste target in any system, and seven bars can only honestly
          // answer "is this day normal for the week".
          <OpsBars
            days={wasteWeek.map((row) => ({
              label: row.date.slice(8, 10),
              pct: share(row.total_value, wasteBest),
              // A day nobody logged against shows no figure — the empty column
              // says it, and a "₹0" above it reads as a measured clean shift.
              value: row.total_value > 0 ? money(row.total_value) : undefined,
            }))}
          />
        }
      />
    </OpsBand>
  );
}

// ============================================================================
// Band 4 — Shifting
// ============================================================================

function ShiftingBand({
  data,
  degraded,
}: {
  data: PlantBoardResponse | undefined;
  degraded: string[];
}) {
  const shifting = data?.shifting ?? null;
  const people = peopleFor(data?.workforce, 'shifting');

  if (!shifting) {
    return (
      <OpsBand
        domain="shifting"
        title="Shifting"
        scope="Off BH-PF"
        columns="1fr"
        people={people}
        unavailable={
          degraded.includes('shifting')
            ? 'The transfer register could not be read on the last refresh. The board keeps trying.'
            : 'Reading the transfer register\u2026'
        }
      >
        {null}
      </OpsBand>
    );
  }

  return (
    <OpsBand
      domain="shifting"
      title="Shifting"
      scope="Off BH-PF"
      columns="1fr 1fr"
      people={people}
    >
      {/* TWO REGISTERS, READ DOWN THE SAME THREE ROWS, AND NEVER NETTED.
          Declared is the keeper's own note off the Godown Stock Movements page;
          shipped is what BST says was scanned and dispatched. A declaration and
          a posting answer different questions and the gap between them is
          usually just the hours in between, so the band shows both and
          subtracts neither — a variance would invent a problem on every
          morning of every day. Sharing the route order is what lets a reader
          compare them by eye instead. */}
      <OpsGroup
        name="Declared today"
        // No SAP branch on this half: the register snapshots its own litres per
        // piece as each line is typed, so its tonnage stands whatever HANA is
        // doing. What it can report that nothing else can is a WITHDRAWN
        // declaration, which is why that leads the pill when there is one.
        tag={
          shifting.allocated.retracted_movements > 0
            ? {
                label: `${whole(shifting.allocated.retracted_movements)} retracted`,
                tone: 'warn',
              }
            : shifting.allocated.transfers === 0
              ? { label: 'nothing declared', tone: 'nil' }
              : {
                  label: `${whole(shifting.allocated.transfers)} declaration${
                    shifting.allocated.transfers === 1 ? '' : 's'
                  }`,
                  tone: 'neut',
                }
        }
        sub={`${qty(shifting.allocated.total_pieces)} pcs in ${whole(shifting.allocated.boxes)} boxes · the keeper's own note`}
        value={stageValue(shifting.allocated)}
        unit={stageUnit(shifting.allocated)}
        viz={<RouteMeter stage={shifting.allocated} />}
      />

      <OpsGroup
        name="Shipped today"
        tag={
          (shifting.shipped.rejected_pieces ?? 0) > 0
            ? {
                label: shifting.shipped.tonnage_available
                  ? `${decimal(shifting.shipped.rejected_tons)} t rejected`
                  : `${qty(shifting.shipped.rejected_pieces)} pcs rejected`,
                tone: 'bad',
              }
            : { label: `${whole(shifting.shipped.transfers)} transfers out`, tone: 'neut' }
        }
        sub={`${qty(shifting.shipped.total_pieces)} pcs in ${whole(shifting.shipped.boxes)} boxes · scanned onto a BST`}
        value={stageValue(shifting.shipped)}
        unit={stageUnit(shifting.shipped)}
        viz={<RouteMeter stage={shifting.shipped} />}
      />
    </OpsBand>
  );
}

/**
 * The three routes off the floor, always in the same order and the same tint.
 *
 * COLOUR FOLLOWS THE DESTINATION, NEVER ITS SIZE. The backend returns the
 * routes in a fixed order and this maps each to a fixed tint, so a route does
 * not change place or colour on the day it happens to be the biggest — a wall
 * figure that moves is a figure nobody trusts. A day with nothing on a route
 * still shows the row, at zero, for the same reason.
 */
const ROUTE_FILL: Record<string, 'main' | 'light' | 'mute'> = {
  'BH-BT': 'main',
  DISPATCH: 'light',
  ELSEWHERE: 'mute',
};

/**
 * Tonnes when SAP answered, pieces when it did not.
 *
 * The box scans are Postgres and the litres are SAP, so an outage costs this
 * band its UNIT, not its figures. Printing a zero tonnage instead would be the
 * one thing a wall board must never do: look like a quiet day.
 */
function stageValue(stage: ShiftingStage): string {
  return stage.tonnage_available ? decimal(stage.total_tons) : qty(stage.total_pieces);
}

function stageUnit(stage: ShiftingStage): string {
  return stage.tonnage_available ? 'tonnes' : 'pcs, SAP not answering';
}

/**
 * There is no Gupta row.
 *
 * The Gupta godown holds Mart's stock, so a load going there is the same event
 * as the dispatch to Mart — but SAP booked it as an Oil internal transfer, so
 * the board carried it as a third godown beside a Dispatch row that meant the
 * same thing. Mart's stock there is now its own warehouse (GP-FGM) and reaches
 * this board as a sale. A load still posted to the retired GP-FG code falls
 * into Elsewhere, which names the codes it folded rather than swallowing them.
 */
const ROUTE_LABEL: Record<string, string> = {
  'BH-BT': 'BH-BT basement',
  DISPATCH: 'Dispatch to Mart',
  ELSEWHERE: 'Elsewhere',
};

/** The Elsewhere row says what it folded; every other row is just its name. */
function routeLabel(row: ShiftingRoute): string {
  const base = ROUTE_LABEL[row.route] ?? row.name ?? row.route;
  return row.codes?.length ? `${base} · ${row.codes.join(', ')}` : base;
}

function RouteMeter({ stage }: { stage: ShiftingStage }) {
  return (
    <OpsMeter
      segments={[
        ...stage.routes.map((row) => ({
          fill: ROUTE_FILL[row.route] ?? 'mute',
          // Scaled on whichever unit the tile is reading in, so the bar and the
          // headline can never disagree about what the whole is.
          pct: stage.tonnage_available
            ? share(row.tons, stage.total_tons)
            : share(row.pieces, stage.total_pieces),
          label: routeLabel(row),
          figure: stage.tonnage_available ? `${decimal(row.tons)} t` : `${qty(row.pieces)} pcs`,
        })),
        // Zero width: a disclosure, not a slice. These SKUs moved, in pieces,
        // and SAP holds no litre volume for them, so they are in none of the
        // tonnes above.
        ...(stage.unweighed_items > 0
          ? [
              {
                fill: 'mute' as const,
                pct: 0,
                label: 'No litre volume',
                figure: `${whole(stage.unweighed_items)} SKUs`,
              },
            ]
          : []),
      ]}
    />
  );
}
