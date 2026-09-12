import '../styles/ops-board.css';

import { format } from 'date-fns';
import { useRef } from 'react';

import { usePermission } from '@/core/auth';

import { useFullscreen } from '../../dispatch/hooks';
import { useWarehouseSettings } from '../api';
import {
  OpsBand,
  OpsBars,
  OpsGroup,
  OpsMatrix,
  OpsMeter,
  OpsPair,
  OpsTopbar,
} from '../components';
import {
  LOGISTICS_CONTROL_DISPATCH_PERMISSIONS,
  LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS,
  LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS,
  LOGISTICS_CONTROL_TRANSPORT_PERMISSIONS,
  LOGISTICS_CONTROL_WAREHOUSE,
  LOGISTICS_CONTROL_WAREHOUSE_PERMISSIONS,
  LOGISTICS_CONTROL_WORKFORCE_PERMISSIONS,
} from '../constants';
import { useLogisticsControlBoard } from '../hooks';

/** Whole number, Indian grouping. */
function whole(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

/** Indian-grouped rupees, compacted. A board has no room for paise. */
function money(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  if (Math.abs(value) >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

/** `JIVO_OIL` reads as "Oil" on a board where every company shares the prefix. */
function companyLabel(code: string): string {
  return code.replace(/^JIVO[_\s-]*/i, '').replace(/_/g, ' ') || code;
}

/** One decimal — where the fraction still carries meaning. */
function decimal(value: number, digits = 1): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Operations board — warehouse, dispatch and transportation on one screen.
 *
 * Three bands in the order the plant works: what is standing in BH-BT, what left
 * it today and this month, and the fleet and paperwork trailing behind. Each
 * band closes with who is on shift, because "612 tonnes on 34 vehicles" and
 * "118 labour on the floor" are read together.
 *
 * Colour carries meaning and nothing else. Each band owns one hue — warehouse
 * teal, dispatch blue, transport violet — and every bar inside it is a tint of
 * that same hue, so composition never introduces a second palette. Green, amber
 * and red are reserved for condition and never used as a domain colour; grey is
 * always the part that is not there.
 *
 * The board's one hard rule is that a figure with no source behind it does not
 * look like a figure. Those tiles draw a rule where the number goes and state
 * the reason underneath — an empty warehouse and an unreadable one must not look
 * the same, which is the convention the sibling control boards already use.
 *
 * Built for a screen nobody is standing at: one viewport, nothing below the
 * fold, and type that scales with the display. See `ops-board.css` for why every
 * length is a `calc()` against a board-local unit rather than a `rem`.
 */
export function LogisticsControlDashboardPage() {
  const { hasAnyPermission } = usePermission();
  const canSeeWarehouse = hasAnyPermission(LOGISTICS_CONTROL_WAREHOUSE_PERMISSIONS);
  const canSeeDispatch = hasAnyPermission(LOGISTICS_CONTROL_DISPATCH_PERMISSIONS);
  const canSeeFreight = hasAnyPermission(LOGISTICS_CONTROL_TRANSPORT_PERMISSIONS);
  const canSeeWorkforce = hasAnyPermission(LOGISTICS_CONTROL_WORKFORCE_PERMISSIONS);

  const board = useLogisticsControlBoard();

  // Fullscreen targets the board itself, not the document, so the app shell
  // drops away and the `--u` clamp gets the real viewport to scale against.
  const boardRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(boardRef);

  // The two facts SAP does not hold, typed in on the settings screen.
  const settings = useWarehouseSettings(LOGISTICS_CONTROL_WAREHOUSE, canSeeWarehouse);

  const stock = board.warehouse.stockTonnage;
  const space = board.warehouse.space;
  const nonMoving = board.warehouse.nonMoving;
  const pending = board.warehouse.pendingDispatch;
  const allocated = board.warehouse.allocated;
  const unscanned = board.warehouse.unscanned;
  const fleet = board.fleet;
  const account = board.freight.account;
  const costLitre = board.dispatch.costPerLitre;
  const transit = board.transit;
  /** A band's share of the tonnage on the road. */
  const transitShare = (tonnes: number) =>
    transit.totals.tonnes > 0 ? (tonnes / transit.totals.tonnes) * 100 : 0;
  /** Anything the registers show as working — transfer, dispatch or at the gate. */
  const onDuty = fleet.onBst + fleet.onDispatch + fleet.atPlant + fleet.out;
  /** A state's share of the fleet, for the duty meter. */
  const share = (count: number) => (fleet.owned ? (count / fleet.owned) * 100 : 0);
  const mtd = board.dispatch.monthToDate;
  const trend = board.dispatch.trend;
  const todayDispatch = board.dispatch.today;
  /**
   * Today's tonnage as a share of the day's booked plan.
   *
   * Capped at 100: a day that beats its plan fills the bar and says so in the
   * figure beside it, rather than drawing a segment wider than the bar it sits
   * in. Null where no plan is booked — the tile draws a note instead.
   */
  const planPct =
    todayDispatch.plan.configured && todayDispatch.plan.tonnes > 0
      ? Math.min(100, (todayDispatch.tonnes / todayDispatch.plan.tonnes) * 100)
      : null;

  const hasTonnage = stock.weighedItems > 0;
  const targetPct =
    mtd.targetTonnes && mtd.targetTonnes > 0 ? (mtd.tonnes / mtd.targetTonnes) * 100 : null;

  /**
   * The last seven calendar days, ending today.
   *
   * The hook carries the whole month — the headline total and the average need
   * it — but seven bars is what fits legibly, and a fortnight of thin columns
   * answers no question this tile asks. Sliced from the zero-filled series, so
   * a day nothing moved is still a gap in the row rather than being closed up.
   */
  const bars = trend.slice(-7);

  // Bars are a share of the best day shown, so the shape answers "is today
  // normal for this week" rather than pretending to a target.
  const peakTonnes = bars.reduce((peak, day) => Math.max(peak, day.tonnes), 0);

  const capacityTonnes = settings.data?.capacity_tonnes ?? null;
  /**
   * How full, by tonnage against the rated capacity.
   *
   * Null until somebody sets a capacity — the tile then says so rather than
   * falling back to a percentage of something else and labelling it "full".
   * Deliberately not clamped: a warehouse over its rating is a real and
   * interesting state, and capping it at 100% would hide exactly the situation
   * worth seeing.
   */
  const fillPct =
    capacityTonnes !== null && capacityTonnes > 0 && hasTonnage
      ? (stock.tonnes / capacityTonnes) * 100
      : null;

  /**
   * How much of the warehouse the idle stock is occupying.
   *
   * Capacity first: "9% of space" is the question a floor asks. Where no
   * capacity is configured, the share of stock on hand is the nearest honest
   * answer. Null when neither is known, and the tile falls back to a count.
   */
  const nonMovingSpaceBasis =
    capacityTonnes !== null && capacityTonnes > 0
      ? capacityTonnes
      : stock.tonnes > 0
        ? stock.tonnes
        : null;
  const nonMovingSpacePct =
    nonMovingSpaceBasis === null ? null : (nonMoving.tonnes / nonMovingSpaceBasis) * 100;

  const lastAudit = settings.data?.last_audit_date
    ? format(new Date(settings.data.last_audit_date), 'd MMM')
    : null;

  return (
    <div className="ops-board" ref={boardRef}>
      <div className="ops-board__inner">
        <OpsTopbar
          title="Operations board"
          scope={
            board.dispatch.companies.length > 0
              ? `${LOGISTICS_CONTROL_WAREHOUSE} · ${board.dispatch.companies.join(' | ')}`
              : `${LOGISTICS_CONTROL_WAREHOUSE} terminal`
          }
          busy={board.isFetching}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggle}
          settingsTo="/dashboards/logistics-control/settings"
          chips={[
            { label: 'Month', value: format(new Date(board.monthStart), 'MMMM yyyy') },
            {
              label: 'Dispatching days',
              value: mtd.activeDays > 0 ? `${mtd.activeDays} so far` : 'none yet',
            },
          ]}
          /* Stock on hand and Dispatched this month were dropped from here:
             both are headline tiles on the bands below, and a wall that prints
             the same tonnage twice spends its scarcest row repeating itself. */
          totals={[
            {
              caption: 'Employees on roll',
              // The standing payroll, both companies, straight from the
              // directory — everyone still employed, including somebody on
              // leave. Never added to the labour figure beside it: a permanent
              // storekeeper and a day's casual hand are not one population.
              value: whole(board.workforce.roll.headcount ?? 0),
              missing: board.workforce.roll.headcount === null,
              sub:
                board.workforce.roll.unread.length > 0
                  ? `${board.workforce.roll.unread.join(' and ')} unread`
                  : `${board.dispatch.companies.length || 2} companies`,
            },
            {
              caption: 'Workforce cost today',
              // Labour priced off the gate's head count, plus the configured
              // section salaries. Null — not zero — when neither half is
              // priced: an unpriced workforce must not read as a free one.
              value: money(board.workforce.totalCostPerDay),
              missing: board.workforce.totalCostPerDay === null,
              sub:
                board.workforce.total.labour === null
                  ? 'head count unavailable'
                  : `${whole(board.workforce.total.labour)} labour on shift`,
            },
          ]}
        />

        <main className="ops-stack">
          {/* ═════ WAREHOUSE · teal ═════ */}
          <OpsBand
            domain="warehouse"
            title="Warehouse"
            scope={LOGISTICS_CONTROL_WAREHOUSE}
            columns="1.1fr 1.1fr .95fr .95fr"
            people={canSeeWorkforce ? board.workforce.warehouse : undefined}
            unavailable={canSeeWarehouse ? undefined : 'No access to warehouse stock.'}
          >
            <OpsGroup
              name="Stock on hand"
              tag={
                fillPct !== null
                  ? { label: `${decimal(fillPct, 0)}% full`, tone: 'neut' }
                  : { label: 'capacity not set', tone: 'nil' }
              }
              sub={[
                capacityTonnes === null ? null : `${whole(capacityTonnes)} T capacity`,
                lastAudit ? `last audit ${lastAudit}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              value={hasTonnage ? whole(stock.tonnes) : undefined}
              unit="tonnes"
              missing={hasTonnage ? undefined : 'No weighable stock rows in this warehouse'}
              viz={
                // Tonnage against the rated capacity someone typed in, which is
                // the question the tile asks. Pallet slots answer a different
                // one — a half-empty pallet still occupies a whole slot — so
                // they are the fallback, not the preference.
                fillPct !== null && capacityTonnes !== null ? (
                  <OpsMeter
                    segments={[
                      { fill: 'main', pct: fillPct, label: 'Stored' },
                      {
                        fill: 'mute',
                        pct: Math.max(0, 100 - fillPct),
                        label: 'Free',
                        figure: `${whole(Math.max(0, capacityTonnes - stock.tonnes))} T`,
                      },
                    ]}
                  />
                ) : space && space.total > 0 ? (
                  <OpsMeter
                    segments={[
                      { fill: 'main', pct: space.utilisationPct, label: 'Slots used' },
                      {
                        fill: 'mute',
                        pct: 100 - space.utilisationPct,
                        label: 'Free',
                        figure: `${whole(space.total - space.used)} slots`,
                      },
                    ]}
                  />
                ) : (
                  <p className="ops-note">
                    No rated capacity set — add one in board settings to show how full
                    this warehouse is.
                  </p>
                )
              }
            />

            <OpsGroup
              name="Non-moving stock"
              tag={
                // Share of the warehouse this stock is sitting on. Against the
                // rated capacity where one is set — that is the space it
                // occupies — falling back to a share of stock on hand, which
                // answers a near enough question when capacity is unknown.
                nonMovingSpacePct === null
                  ? { label: `${whole(nonMoving.items)} items`, tone: 'neut' }
                  : {
                      label: `${decimal(nonMovingSpacePct)}% of space`,
                      tone: nonMovingSpacePct >= 10 ? 'warn' : 'neut',
                    }
              }
              sub={`${LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS}+ days`}
              value={decimal(nonMoving.tonnes)}
              unit="tonnes"
              viz={
                <>
                  <OpsMeter
                    segments={[
                      {
                        fill: 'light',
                        pct:
                          nonMoving.tonnes > 0
                            ? (nonMoving.recentTonnes / nonMoving.tonnes) * 100
                            : 0,
                        label: `${LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS}–${LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS} days`,
                        figure: `${decimal(nonMoving.recentTonnes)} T`,
                      },
                      {
                        fill: 'main',
                        pct:
                          nonMoving.tonnes > 0
                            ? (nonMoving.ageingTonnes / nonMoving.tonnes) * 100
                            : 0,
                        label: `${LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS}+ days`,
                        figure: `${decimal(nonMoving.ageingTonnes)} T`,
                      },
                    ]}
                  />
                  {nonMoving.unweighed > 0 && (
                    <p className="ops-note">
                      {whole(nonMoving.unweighed)} of {whole(nonMoving.items)} items have no
                      case weight in SAP, so this is a floor.
                    </p>
                  )}
                </>
              }
            />

            <OpsGroup
              name="Pending dispatch"
              tag={{ label: `${whole(pending.invoices)} invoices`, tone: 'neut' }}
              value={decimal(pending.tonnes)}
              unit="tonnes"
              loading={pending.loading}
              // An empty answer from a failed SAP read is not an empty day.
              missing={pending.error ? 'SAP unreachable — bills not read' : undefined}
              viz={
                <>
                  {/* The total is the headline; the split is what somebody
                      standing at the board actually acts on, because the two
                      companies load from different floors. */}
                  <div className="ops-duo">
                    {pending.byCompany.map((company) => (
                      <div key={company.companyCode}>
                        <span className="k">{companyLabel(company.companyCode)}</span>
                        <span className="v">{decimal(company.tonnes)} T</span>
                      </div>
                    ))}
                  </div>
                  {pending.truncated && (
                    <p className="ops-note" style={{ marginTop: 'calc(0.5 * var(--u))' }}>
                      Feed truncated — it drops the oldest bills first, so this understates.
                    </p>
                  )}
                </>
              }
            />

            <OpsGroup
              name="Allocated stock"
              tag={
                allocated.movements > 0
                  ? { label: `${whole(allocated.movements)} consignments`, tone: 'neut' }
                  : { label: 'none today', tone: 'ok' }
              }
              value={whole(allocated.pieces)}
              unit="pieces"
              viz={
                allocated.error ? (
                  <p className="ops-note">Could not read the godown movement register.</p>
                ) : (
                  // Pieces and litres, never weight: the Godown Movements
                  // register carries no per-item weight, so this tile cannot be
                  // stated in tonnes the way the rest of the band is.
                  <div className="ops-duo">
                    <div>
                      <span className="k">Pieces</span>
                      <span className="v">{whole(allocated.pieces)}</span>
                    </div>
                    <div>
                      <span className="k">Litres</span>
                      <span className="v">{whole(allocated.litres)}</span>
                    </div>
                  </div>
                )
              }
            />
          </OpsBand>

          {/* ═════ DISPATCH · blue ═════ */}
          <OpsBand
            domain="dispatch"
            title="Dispatch"
            scope={
              board.dispatch.companies.length > 0
                ? board.dispatch.companies.join(' | ')
                : 'Oil | Mart'
            }
            columns="1fr 1.1fr 1.05fr .95fr"
            people={canSeeWorkforce ? board.workforce.dispatch : undefined}
            unavailable={canSeeDispatch ? undefined : 'No access to dispatch plans.'}
          >
            <OpsGroup
              name="Dispatched today"
              /* Yesterday, not a target: the day plan is already the bar
                 underneath, and a tile carrying the same comparison twice
                 wastes the one pill it has. Green for up and amber for down —
                 condition colours, which is what a day-on-day move is. */
              tag={
                todayDispatch.vsYesterday === null
                  ? { label: 'no day to compare', tone: 'nil' }
                  : todayDispatch.vsYesterday.direction === 'flat'
                    ? { label: 'level with yesterday', tone: 'neut' }
                    : {
                        label: `${todayDispatch.vsYesterday.direction === 'up' ? '↑' : '↓'} ${decimal(
                          todayDispatch.vsYesterday.pct,
                          0,
                        )}% vs yesterday`,
                        tone: todayDispatch.vsYesterday.direction === 'up' ? 'ok' : 'warn',
                      }
              }
              /* No subtitle by choice. `sub` is still rendered empty by
                 OpsGroup, which is what keeps this tile's figure on the same
                 baseline as its neighbours' — dropping the row instead would
                 let the tonnage ride higher than the tiles beside it. */
              value={decimal(todayDispatch.tonnes)}
              unit="tonnes"
              viz={
                todayDispatch.plan.loading ? null : todayDispatch.plan.error ? (
                  <p className="ops-note">Could not read today&apos;s dispatch plan.</p>
                ) : planPct === null ? (
                  <p className="ops-note">
                    No bill is booked onto a truck for today, so there is no day plan to
                    measure against.
                  </p>
                ) : (
                  <>
                    <OpsMeter
                      segments={[
                        {
                          fill: 'main',
                          pct: planPct,
                          label: 'Dispatched',
                        },
                        {
                          fill: 'mute',
                          pct: 100 - planPct,
                          label: 'Day plan',
                          figure: `${decimal(todayDispatch.plan.tonnes, 0)} T`,
                        },
                      ]}
                    />
                    {/* Why the bar can read full while trucks are still loading,
                        and what is NOT in the target. */}
                    <p className="ops-note">
                      {todayDispatch.plan.unread.length > 0
                        ? `Plan missing ${todayDispatch.plan.unread.join(' and ')} — could not read it.`
                        : `Booked bills ${whole(todayDispatch.plan.bills)}${
                            todayDispatch.plan.unbookedBills > 0
                              ? ` · Awaiting a truck ${whole(todayDispatch.plan.unbookedBills)}`
                              : ''
                          }`}
                    </p>
                  </>
                )
              }
            />

            <OpsGroup
              name="Month to date"
              tag={
                targetPct === null
                  ? { label: 'no target set', tone: 'nil' }
                  : { label: `${decimal(targetPct, 0)}% of target`, tone: 'neut' }
              }
              sub={`${format(new Date(board.monthStart), 'd MMM')} – ${format(
                new Date(board.today),
                'd MMM',
              )}${
                mtd.averagePerActiveDay === null
                  ? ''
                  : ` · avg ${decimal(mtd.averagePerActiveDay)} T day`
              }`}
              value={whole(mtd.tonnes)}
              unit="tonnes"
              viz={
                bars.length > 0 ? (
                  <OpsBars
                    days={bars.map((day) => ({
                      label: format(new Date(day.date), 'dd'),
                      pct: peakTonnes > 0 ? (day.tonnes / peakTonnes) * 100 : 0,
                      // Nothing above a day that moved nothing — the empty
                      // column already says it.
                      value: day.tonnes > 0 ? decimal(day.tonnes, 0) : undefined,
                    }))}
                  />
                ) : (
                  <p className="ops-note">No dispatching days yet this month.</p>
                )
              }
            />

            <OpsGroup
              name="Planned against booked"
              tag={
                pending.plannedBills === 0
                  ? { label: 'nothing planned', tone: 'ok' }
                  : pending.bookedBills < pending.plannedBills
                    ? {
                        label: `${whole(pending.plannedBills - pending.bookedBills)} awaiting a truck`,
                        tone: 'warn',
                      }
                    : { label: 'all booked', tone: 'ok' }
              }
              tallViz
              viz={
                <OpsPair
                  rows={[
                    {
                      label: 'Planned',
                      figure: `${whole(pending.plannedBills)} bills`,
                      pct: 100,
                      fill: 'mute',
                    },
                    {
                      label: 'Booked',
                      figure: `${whole(pending.bookedBills)} bills`,
                      // Scaled against planned, which is the larger by
                      // construction — booked is a subset of it.
                      pct:
                        pending.plannedBills > 0
                          ? (pending.bookedBills / pending.plannedBills) * 100
                          : 0,
                      fill: 'main',
                    },
                  ]}
                  note={{
                    fill: 'main',
                    label: 'Booked',
                    figure: `${decimal(pending.bookedTonnes)} T of ${decimal(
                      pending.plannedTonnes,
                    )} T`,
                  }}
                />
              }
            />

            <OpsGroup
              name="Sent without barcodes"
              tag={
                unscanned.approvals === 0
                  ? { label: 'none this month', tone: 'ok' }
                  : { label: `${whole(unscanned.approvals)} approvals`, tone: 'bad' }
              }
              value={whole(unscanned.shortfallBoxes)}
              unit="boxes"
              viz={
                unscanned.error ? (
                  <p className="ops-note">Could not read the partial dispatch register.</p>
                ) : (
                  <OpsMeter
                    segments={[
                      {
                        fill: 'main',
                        pct:
                          unscanned.expectedBoxes > 0
                            ? (unscanned.shortfallBoxes / unscanned.expectedBoxes) * 100
                            : 0,
                      },
                      {
                        fill: 'mute',
                        pct:
                          unscanned.expectedBoxes > 0
                            ? (unscanned.scannedBoxes / unscanned.expectedBoxes) * 100
                            : 100,
                        label: 'Scanned',
                        figure: whole(unscanned.scannedBoxes),
                      },
                    ]}
                  />
                )
              }
            />
          </OpsBand>

          {/* ═════ TRANSPORTATION · violet ═════ */}
          <OpsBand
            domain="transport"
            title="Transportation"
            columns="1fr 1.15fr .95fr 1.1fr"
            people={canSeeWorkforce ? board.workforce.transport : undefined}
            unavailable={canSeeFreight ? undefined : 'No access to dispatch linking.'}
          >
            <OpsGroup
              name="Owned vehicles"
              tag={
                !fleet.configured && fleet.owned === null
                  ? { label: 'not set', tone: 'nil' }
                  : !fleet.configured
                    ? { label: 'count only', tone: 'neut' }
                    : fleet.outOfService > 0
                      ? { label: `${whole(fleet.outOfService)} out of service`, tone: 'bad' }
                      : { label: `${whole(onDuty)} on duty`, tone: 'neut' }
              }
              value={fleet.owned === null ? undefined : whole(fleet.owned)}
              unit="vehicles"
              // Ownership is not a field on the vehicle master, so the fleet is
              // the registration list from board settings.
              missing={
                fleet.owned === null
                  ? 'List the owned registrations in board settings'
                  : undefined
              }
              viz={
                fleet.configured ? (
                  <>
                    <OpsMeter
                      segments={[
                        {
                          fill: 'main',
                          pct: share(fleet.onBst),
                          label: 'On transfer',
                          figure: whole(fleet.onBst),
                        },
                        {
                          fill: 'light',
                          pct: share(fleet.onDispatch + fleet.atPlant + fleet.out),
                          label: 'On dispatch',
                          figure: whole(fleet.onDispatch + fleet.atPlant + fleet.out),
                        },
                        {
                          fill: 'mute',
                          pct: share(fleet.free + fleet.outOfService),
                          label: 'Idle',
                          figure: whole(fleet.free + fleet.outOfService),
                        },
                      ]}
                    />
                    {fleet.outOfService > 0 && (
                      <p className="ops-note">
                        {whole(fleet.outOfService)} of the idle trucks are out of service.
                      </p>
                    )}
                  </>
                ) : fleet.owned === null ? undefined : (
                  <p className="ops-note">
                    Only a count is configured — list the registrations to see which
                    trucks are working.
                  </p>
                )
              }
            />

            <OpsGroup
              name="Transport account"
              /* The oldest unpaid freight invoice, which is the fact that
                 decides whether this tile needs acting on today. Amber past a
                 month, red past a quarter — condition colours, earned. */
              tag={
                account.oldestDays === null
                  ? { label: 'nothing outstanding', tone: 'ok' }
                  : {
                      label: `oldest ${whole(account.oldestDays)} days`,
                      tone: account.oldestDays >= 90 ? 'bad' : account.oldestDays >= 30 ? 'warn' : 'neut',
                    }
              }
              /* No subtitle. The matrix under it is four rows of two lines
                 and needs the whole card; the totals it summarised are all
                 present in the table itself. */
              tallViz
              viz={
                <>
                  <OpsMatrix columns={board.freight.funnel} money={money} />
                  {/* Only ever a warning now. The explanatory note is gone, but
                      a column missing a company's documents still has to say
                      so — a short queue reads as a queue somebody has been
                      working, and a short payable as a healthy one. */}
                  {(account.unread.length > 0 || board.freight.queueUnread.length > 0) && (
                    <p className="ops-note">
                      {[
                        account.unread.length > 0
                          ? `Freight account missing ${account.unread
                              .map(companyLabel)
                              .join(' and ')}`
                          : null,
                        board.freight.queueUnread.length > 0
                          ? `receipt queue missing ${board.freight.queueUnread
                              .map(companyLabel)
                              .join(' and ')}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}{' '}
                      — could not be read.
                    </p>
                  )}
                </>
              }
            />

            <OpsGroup
              name="Cost per litre"
              /* Coverage, not a condition. The freight half is divided over
                 only the litres whose bilty carries an amount, so the pill says
                 how much of the month the rate speaks for — under half and it
                 is a sample worth distrusting. */
              tag={
                costLitre === null
                  ? { label: 'no source', tone: 'nil' }
                  : {
                      label: `${whole(costLitre.documents)} freight GRPOs`,
                      tone: 'neut' as const,
                    }
              }
              sub={
                costLitre === null
                  ? 'Freight and litres from the same bilties'
                  : `${format(new Date(costLitre.windowStart), 'd MMM')} – ${format(
                      new Date(board.today),
                      'd MMM',
                    )} · ${whole(costLitre.coveredLitres)} L dispatched`
              }
              value={costLitre === null ? undefined : `₹${costLitre.total.toFixed(2)}`}
              unit={costLitre === null ? undefined : 'per litre'}
              missing={
                costLitre === null
                  ? 'No bilty carries a freight figure this month, so there is nothing to divide.'
                  : undefined
              }
              viz={
                costLitre === null ? undefined : (
                  /*
                   * The two halves of the rate, and nothing else.
                   *
                   * The per-haulier rows went because SAP cannot say which
                   * dispatch a freight document paid for — those bars were
                   * spend, not a rate, and the vendor names clipped to
                   * "ABHIMAN E…". The explanatory note went because a wall
                   * board is read at a distance: the caveats about freight
                   * lagging the truck belong with whoever maintains this, not
                   * in four lines of small print on the tile.
                   */
                  <div className="ops-duo">
                    <div>
                      <span className="k">Freight</span>
                      <span className="v">₹{costLitre.freight.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="k">Loading</span>
                      <span className="v">₹{costLitre.loading.toFixed(2)}</span>
                    </div>
                  </div>
                )
              }
            />

            <OpsGroup
              name="Stock in transit"
              tag={
                transit.bands === null
                  ? { label: 'no data', tone: 'nil' }
                  : transit.bands.stale.loads > 0
                    ? { label: `${whole(transit.bands.stale.loads)} over 7 days`, tone: 'bad' }
                    : { label: `${whole(transit.totals.loads)} loads`, tone: 'neut' }
              }
              sub="Dispatched, no SAP receipt"
              value={
                transit.bands === null || !transit.weightsAvailable
                  ? undefined
                  : decimal(transit.totals.tonnes)
              }
              unit="tonnes"
              loading={transit.loading}
              // Every no-data case needs its own reason. Leaving this undefined
              // rendered an empty value beside a live "tonnes" unit, which reads
              // as a broken tile rather than an absent figure. Both sides of the
              // figure come from SAP now — the invoices out and the receipts
              // against them — so an outage leaves nothing to show at all.
              missing={
                transit.error
                  ? 'Could not read dispatches from SAP'
                  : transit.bands === null
                    ? 'SAP did not answer'
                    : !transit.weightsAvailable
                      ? 'SAP unreachable — dispatches not read'
                      : undefined
              }
              viz={
                transit.bands === null || !transit.weightsAvailable ? undefined : (
                  <>
                    <OpsMeter
                      segments={[
                        {
                          fill: 'mute',
                          pct: transitShare(transit.bands.fresh.tonnes),
                          label: 'Up to 3 days',
                          figure: `${decimal(transit.bands.fresh.tonnes)} T`,
                        },
                        {
                          fill: 'light',
                          pct: transitShare(transit.bands.ageing.tonnes),
                          label: '4 - 7 days',
                          figure: `${decimal(transit.bands.ageing.tonnes)} T`,
                        },
                        {
                          fill: 'main',
                          pct: transitShare(transit.bands.stale.tonnes),
                          label: 'Over 7 days',
                          figure: `${decimal(transit.bands.stale.tonnes)} T`,
                        },
                      ]}
                    />
                    {transit.unweighedLines > 0 && (
                      <p className="ops-note">
                        {whole(transit.unweighedLines)} lines have no case weight, so this
                        is a floor.
                      </p>
                    )}
                  </>
                )
              }
            />
          </OpsBand>
        </main>
      </div>
    </div>
  );
}

export default LogisticsControlDashboardPage;
