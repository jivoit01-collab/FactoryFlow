import '../../logistics-control/styles/ops-board.css';
import '../styles/admin-board.css';
import '../styles/tank-farm.css';

import { useRef, useState } from 'react';

import { useFullscreen } from '../../dispatch/hooks';
import { OpsGroup, OpsMeter, OpsPair, OpsTopbar } from '../../logistics-control/components';
import { useFullBleed } from '../../logistics-control/hooks';
import { useAdminBoard } from '../api';
import {
  AdminActions,
  AdminBand,
  AdminCorner,
  AdminCostDrill,
  AdminDispatchDrill,
  AdminDonut,
  AdminFgDrill,
  AdminPmDrill,
  AdminProductionDrill,
  AdminTankFarm,
} from '../components';
import { ADMIN_BOARD_STALE_AFTER_MS } from '../constants';
import type {
  AdminDispatch,
  AdminFgStorage,
  AdminOilStorage,
  AdminPmStorage,
  AdminProduction,
} from '../types';
import {
  barPct,
  fillCondition,
  money,
  moneyParts,
  NO_VALUE,
  num,
  pct,
  pctRough,
  tons,
  whole,
} from '../utils';

/**
 * The admin control board.
 *
 * Three bands, in the order an owner asks about them: what the plant MADE and
 * SHIPPED, what is STANDING in it, and what it COST — then an action centre
 * that turns the first three into things to do.
 *
 * WHAT THIS PAGE DOES NOT DO
 * It computes no business figure. Every number, every percentage and every
 * alert arrives decided from `/dashboards/admin-board/board/`; this file
 * formats them and picks a bar width. That is deliberate: the metric
 * definitions are the part the business argues about — "average" alone has
 * three defensible denominators — and a screen that derived them would let two
 * consumers of one payload reach different conclusions.
 *
 * THE RULE EVERY TILE OBEYS
 * A figure with no source renders as a rule, never as a zero, and a capacity
 * nobody has rated draws a hatched track rather than an empty one. An unrated
 * warehouse and an empty one must not look the same.
 */
export default function AdminControlDashboardPage() {
  const shellRef = useRef<HTMLDivElement>(null);
  const { data, error, isFetching, dataUpdatedAt } = useAdminBoard();

  const { isFullscreen, toggle } = useFullscreen(shellRef);

  // Which tile has been opened out, by name rather than a boolean — which is
  // what let the other four join the oil and cost tiles here without a rewrite.
  // Each opens its own view: the oil tile a tank farm, the cost tile the rows
  // behind the four cost lines, and the rest the rows behind their own figure.
  //
  // ONE AT A TIME, and deliberately so. Every panel covers the board, so a
  // second one open behind the first would be a board the reader cannot get
  // back to in one Escape.
  const [openTile, setOpenTile] = useState<
    'production' | 'dispatch' | 'fg' | 'pm' | 'oil' | 'cost' | null
  >(null);
  // Releases the shell's max-width and padding while the board is mounted. Every
  // length here is a multiple of a unit read off this element's own width, so
  // without it the board is laid out for a column several hundred pixels
  // narrower than it believes.
  useFullBleed(shellRef);

  // A board that has been failing for longer than a few refreshes must stop
  // saying LIVE. Nobody is standing at it to notice a frozen tab.
  const stale = dataUpdatedAt > 0 && Date.now() - dataUpdatedAt > ADMIN_BOARD_STALE_AFTER_MS;

  if (error && !data) {
    return (
      <div ref={shellRef} className="admin-board ops-board">
        <div className="ops-board__inner">
          <OpsTopbar
            title="Admin Control"
            scope="Feed unavailable"
            chips={[{ label: 'Feed', value: 'not answering' }]}
            totals={[]}
            busy
          />
          <main className="ops-stack">
            <section className="ops-band adm-band ops-b-dispatch">
              <div className="ops-rail">
                <p>Admin Control</p>
              </div>
              <div className="ops-groups" style={{ gridTemplateColumns: '1fr' }}>
                <div className="ops-grp" style={{ gridTemplateRows: 'auto auto' }}>
                  <b className="ops-nm">The board could not be read</b>
                  <p className="ops-note">
                    Nothing is shown rather than a stale figure. The board keeps
                    retrying on its own.
                  </p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  const production = data?.output?.production ?? null;
  const dispatch = data?.output?.dispatch ?? null;
  const fg = data?.storage?.fg ?? null;
  const pm = data?.storage?.pm ?? null;
  const oil = data?.storage?.oil ?? null;
  const cost = data?.cost ?? null;
  const meta = data?.meta;
  const loading = !data;

  const criticals = (data?.alerts ?? []).filter((alert) => alert.severity === 'critical').length;

  // "1–21 Sept". Computed once: the donut prints it in its hole and the drill
  // panel repeats it in its subtitle, and the two must be the same window.
  const periodLabel = meta ? shortWindow(meta.period.from, meta.period.to) : '';
  // How much there is to open. Zero means the drill would be four empty lines,
  // so the tile neither offers nor opens.
  // A slice with no `rows` at all counts as nothing to open, exactly like a
  // slice with an empty one: a server that predates the drill and a line with
  // nothing behind it both mean "there is no detail here", and the tile has one
  // way of saying that. See `AdminCostSlice.rows`.
  const costRows = (cost?.slices ?? []).reduce(
    (total, slice) => total + (slice.rows?.length ?? 0),
    0,
  );

  return (
    <div ref={shellRef} className="admin-board ops-board">
      <div className="ops-board__inner">
        <OpsTopbar
          title="Admin Control"
          scope={`${meta?.company_code?.replace('JIVO_', 'Jivo ') ?? 'Jivo Oil'} · Bhakharpur plant`}
          chips={[
            {
              label: 'Window',
              value: meta ? `${meta.period.from} to ${meta.period.to}` : '—',
            },
            {
              label: 'Month',
              value: meta
                ? `day ${meta.period.day_of_month} of ${meta.period.days_in_month}`
                : '—',
            },
          ]}
          totals={[
            {
              caption: 'Produced',
              value: `${tons(production?.mtd_tons)} T`,
              sub:
                production?.plan_pct != null
                  ? `${pctRough(production.plan_pct)} of plan`
                  : 'no plan filed',
              missing: !production,
            },
            {
              caption: 'Dispatched',
              value: `${tons(dispatch?.mtd_tons)} T`,
              // Names the basis, not the companies. "Oil + Mart" was true and
              // useless; which EVENT this counts is the thing a reader needs to
              // know before comparing it with anything.
              sub: 'left the gate',
              missing: !dispatch,
            },
            {
              caption: 'Open alerts',
              value: String(data?.alerts?.length ?? 0),
              sub: criticals ? `${criticals} need a decision` : 'none critical',
              missing: loading,
            },
          ]}
          busy={isFetching || stale}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggle}
        />

        <main className="ops-stack">
          {/* ═════ OUTPUT ═════ */}
          <AdminBand domain="output" title="Output" scope="month to date">
            <ProductionTile
              production={production}
              elapsedPct={meta?.period.elapsed_pct}
              loading={loading}
              onOpen={() => setOpenTile('production')}
            />
            <DispatchTile
              dispatch={dispatch}
              loading={loading}
              onOpen={() => setOpenTile('dispatch')}
            />
          </AdminBand>

          {/* ═════ STORAGE ═════ */}
          <AdminBand
            domain="storage"
            title="Storage"
            scope="on hand now"
            columns="minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1fr)"
          >
            <FgTile fg={fg} loading={loading} onOpen={() => setOpenTile('fg')} />
            <PmTile pm={pm} loading={loading} onOpen={() => setOpenTile('pm')} />
            <OilTile oil={oil} loading={loading} onOpen={() => setOpenTile('oil')} />
          </AdminBand>

          {/* ═════ COST & ACTION ═════ */}
          <AdminBand
            domain="cost"
            title="Cost"
            scope="& action centre"
            columns="minmax(0, 1.05fr) minmax(0, 1.55fr)"
          >
            <OpsGroup
              // NO CORNER BADGE ON THIS TILE, unlike the other five. It carried
              // today's labour and was taken off on 2026-09-21: the same figure
              // is on the Labour legend line, where it sits beside the month it
              // should be compared with instead of floating over the tile's
              // top-right corner. So no `adm-has-corner` either — the name row
              // gets its full width back.
              //
              // Every figure on this tile is a roll-up of something countable —
              // departments, meters, payroll lines — and "which ones" is the
              // question that follows all of them. `OpsGroup` turns a tile with
              // this into a keyboard-reachable button and marks it drillable, so
              // the affordance is the one the oil tile already taught.
              onOpen={cost && costRows > 0 ? () => setOpenTile('cost') : undefined}
              name="Factory cost"
              tag={
                cost
                  ? (() => {
                      // NOT "reads zero" — a line can be nil from a source
                      // that works, and maintenance usually is. Unsourced means
                      // nothing is configured behind it, which is the same test
                      // the action centre applies; counting nils instead put a
                      // red badge on the tile that its own alert list denied.
                      const nil = cost.slices.filter((slice) => !slice.has_source).length;
                      return nil
                        ? { label: `${nil} of ${cost.slices.length} unsourced`, tone: 'bad' as const }
                        : { label: 'all four sourced', tone: 'ok' as const };
                    })()
                  : undefined
              }
              sub=""
              tallViz
              loading={loading}
              missing={!loading && !cost ? 'The expense registers could not be read.' : undefined}
              viz={
                cost && (
                  <AdminDonut
                    slices={cost.slices}
                    total={cost.total}
                    period={periodLabel}
                    // What the per-line "today" figures are read against. A
                    // day's spend answers nothing on its own — ₹35,750 of
                    // labour is either a quiet day or a heavy one depending
                    // entirely on this.
                    foot={
                      cost.avg_per_day != null
                        ? `${money(cost.avg_per_day)} a day on average this month`
                        : undefined
                    }
                    // Counted, not asserted. "Open the detail" is worth a click
                    // only if there is some, and on a month where nothing is
                    // booked to any line there is none — then the tile stays
                    // silent and `onOpen` above is what decides whether it
                    // opens at all.
                    openHint={
                      costRows > 0
                        ? `${costRows} rows behind the four lines — open the detail →`
                        : undefined
                    }
                  />
                )
              }
            />

            <AdminActions alerts={data?.alerts ?? []} degraded={meta?.degraded ?? []} />
          </AdminBand>
        </main>

        {openTile === 'production' && production && (
          <AdminProductionDrill
            production={production}
            period={periodLabel}
            onClose={() => setOpenTile(null)}
          />
        )}

        {openTile === 'dispatch' && dispatch && (
          <AdminDispatchDrill
            dispatch={dispatch}
            period={periodLabel}
            onClose={() => setOpenTile(null)}
          />
        )}

        {openTile === 'fg' && fg && <AdminFgDrill fg={fg} onClose={() => setOpenTile(null)} />}

        {openTile === 'pm' && pm && <AdminPmDrill pm={pm} onClose={() => setOpenTile(null)} />}

        {openTile === 'oil' && oil && (
          <AdminTankFarm oil={oil} onClose={() => setOpenTile(null)} />
        )}

        {openTile === 'cost' && cost && (
          <AdminCostDrill cost={cost} period={periodLabel} onClose={() => setOpenTile(null)} />
        )}
      </div>
    </div>
  );
}

/** "1–15 Sep" — the window, short enough for a donut's hole. */
function shortWindow(from: string, to: string): string {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  return `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString('en-IN', { month: 'short' })}`;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function ProductionTile({
  production,
  elapsedPct,
  loading,
  onOpen,
}: {
  production: AdminProduction | null;
  elapsedPct: number | undefined;
  loading: boolean;
  onOpen: () => void;
}) {
  const planPct = num(production?.plan_pct);
  const elapsed = num(elapsedPct);

  // The tag is the tile's condition, and the condition is the GAP against the
  // month already spent — not the raw percentage. 27% of plan is alarming on
  // the 15th and unremarkable on the 4th, and a tile that cannot tell those
  // apart is a tile that cries wolf every month.
  const tag =
    planPct == null
      ? { label: 'no plan filed', tone: 'nil' as const }
      : elapsed != null && elapsed - planPct >= 10
        ? { label: `${pctRough(planPct)} of plan`, tone: 'bad' as const }
        : elapsed != null && elapsed > planPct
          ? { label: `${pctRough(planPct)} of plan`, tone: 'warn' as const }
          : { label: `${pctRough(planPct)} of plan`, tone: 'ok' as const };

  const avg = production?.avg_tons_per_producing_day;

  // Counted, not asserted — the rule the cost tile already follows. The panel's
  // table is the trend window, so a payload carrying no days would open onto a
  // stated emptiness, and a tile that offers to show nothing is worse than one
  // that never offered.
  const trendDays = production?.trend.length ?? 0;

  return (
    <OpsGroup
      className="adm-has-corner"
      // Every figure on this tile is a roll-up of something countable, and
      // "which days" is the question that follows all of them. `OpsGroup` turns
      // a tile with this into a keyboard-reachable button and marks it
      // drillable — the affordance the oil tile taught the board.
      onOpen={production && trendDays > 0 ? onOpen : undefined}
      name="Total production"
      tag={production ? tag : undefined}
      sub=""
      value={tons(production?.mtd_tons)}
      unit="tonnes"
      loading={loading}
      missing={!loading && !production ? 'SAP movements could not be read.' : undefined}
      corner={
        production && (
          <AdminCorner
            label="Today"
            value={tons(production.today_tons)}
            unit="T"
            note={avg != null ? `against a ${tons(avg)} T average` : undefined}
          />
        )
      }
      viz={
        production && (
          <>
          <OpsMeter
            segments={[
              {
                fill: 'main',
                pct: barPct(planPct),
              },
              {
                fill: 'mute',
                pct: barPct(planPct == null ? 0 : 100 - planPct),
                label: 'Plan',
                figure: production.plan_tons != null ? `${tons(production.plan_tons)} T` : NO_VALUE,
              },
              // Not a segment of the bar — a legend entry with no width, so the
              // reader can compare "how much of the plan is done" against "how
              // much of the month is gone" without a second chart. The two
              // percentages sharing one row is the whole point of the tile.
              {
                fill: 'mute',
                pct: 0,
                label: 'Month gone',
                figure: pct(elapsed),
              },
              // OUTPUT THE PLAN NEVER LISTED, named rather than buried. The
              // headline counts it — it is tonnage the plant made — but the
              // target beside it cannot speak for it, and a reader comparing
              // the two deserves to know which part the plan never saw.
              ...(production.unplanned_tons
                ? [
                    {
                      fill: 'mute' as const,
                      pct: 0,
                      label: 'Unplanned',
                      figure: `${tons(production.unplanned_tons)} T`,
                    },
                  ]
                : []),
            ]}
          />
          {trendDays > 0 && (
            <p className="adm-open-hint">{trendDays} days of output — open the detail →</p>
          )}
          </>
        )
      }
    />
  );
}

function DispatchTile({
  dispatch,
  loading,
  onOpen,
}: {
  dispatch: AdminDispatch | null;
  loading: boolean;
  onOpen: () => void;
}) {
  const total = dispatch?.mtd_tons ?? 0;
  const oilCo = dispatch?.companies.find((company) => company.company_code === 'JIVO_OIL');
  const martCo = dispatch?.companies.find((company) => company.company_code === 'JIVO_MART');

  const share = (value: number | undefined) =>
    total > 0 && value != null ? (value / total) * 100 : 0;

  // The billed figure alongside the shipped one. Not a discrepancy to reconcile
  // away: the two answer different questions, and the difference between them
  // is how much of this month's billing is still sitting in the warehouse.
  const invoiced = num(dispatch?.invoiced_tons);

  // A month on which nothing left the gate has no companies under it, and a
  // tile that opened onto an empty table would be promising a list that cannot
  // exist.
  const shippers = dispatch?.companies.length ?? 0;

  return (
    <OpsGroup
      className="adm-has-corner"
      onOpen={dispatch && shippers > 0 ? onOpen : undefined}
      name="Total dispatch"
      tag={
        dispatch?.avg_tons_per_dispatch_day != null
          ? { label: `${tons(dispatch.avg_tons_per_dispatch_day)} T a day`, tone: 'neut' }
          : undefined
      }
      sub={
        dispatch
          ? // "Left the gate" said out loud, because the neighbouring production
            // tile is measured against the plan and a reader is entitled to know
            // these two are not on the same kind of clock.
            `${whole(dispatch.trucks)} trucks · ${whole(dispatch.bills)} bills left the gate over ${dispatch.dispatch_days} days`
          : ''
      }
      value={tons(dispatch?.mtd_tons)}
      unit="tonnes"
      loading={loading}
      missing={!loading && !dispatch ? 'The gate register could not be read.' : undefined}
      corner={
        dispatch && (
          <AdminCorner
            label="Today"
            value={tons(dispatch.today_tons)}
            unit="T"
            note={dispatch.today_tons > 0 ? undefined : 'nothing out yet'}
          />
        )
      }
      viz={
        dispatch && (
          <div>
            <OpsMeter
              segments={[
                {
                  fill: 'main',
                  pct: share(oilCo?.tons),
                  label: 'Oil',
                  figure: `${tons(oilCo?.tons)} T`,
                },
                {
                  fill: 'light',
                  pct: share(martCo?.tons),
                  label: 'Mart',
                  figure: `${tons(martCo?.tons)} T`,
                },
              ]}
            />
            {/* The billing side, and what it implies is still unshipped. A
                negative would mean more shipped than billed this month, which is
                normal here — earlier months' bills moving — so it is stated as a
                plain comparison rather than as a shortfall. */}
            <p className="ops-note">
              {invoiced === null
                ? 'Billed this month could not be read from SAP.'
                : `${tons(invoiced)} T billed this month · ${
                    invoiced > total
                      ? `${tons(invoiced - total)} T of it still to ship`
                      : `${tons(total - invoiced)} T of what shipped was billed earlier`
                  }`}
            </p>
            {shippers > 0 && (
              <p className="adm-open-hint">
                {shippers} {shippers === 1 ? 'company' : 'companies'} — open the detail →
              </p>
            )}
          </div>
        )
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function FgTile({
  fg,
  loading,
  onOpen,
}: {
  fg: AdminFgStorage | null;
  loading: boolean;
  onOpen: () => void;
}) {
  // The fullest rated store decides the tile's condition. A combined percentage
  // can sit comfortably at 52% while one of its two stores has half a day of
  // headroom left, and the headroom is the thing somebody acts on.
  const fullest = (fg?.rows ?? [])
    .filter((row) => row.used_pct != null)
    .sort((a, b) => (b.used_pct ?? 0) - (a.used_pct ?? 0))[0];

  const condition = fillCondition(fullest?.used_pct);

  // The unrated stores count too: they are the ones the headline leaves out,
  // which makes them the reason to open the panel rather than a reason not to.
  const stores = (fg?.rows.length ?? 0) + (fg?.unrated.length ?? 0);

  return (
    <OpsGroup
      className="adm-has-corner"
      onOpen={fg && stores > 0 ? onOpen : undefined}
      name="Total FG storage"
      tag={
        fullest
          ? {
              label: `${fullest.label} ${pctRough(fullest.used_pct)}`,
              tone: condition === 'bad' ? 'bad' : condition === 'warn' ? 'warn' : 'ok',
            }
          : undefined
      }
      sub={
        fg
          ? // Names the scope, then the completeness. "Finished goods" is not
            // decoration: this tile counts item group 102 only, and BH-BT also
            // holds 230 T of other groups that a reader would otherwise assume
            // were in the number.
            `Finished goods · ${fg.capacity_tons != null ? `${tons(fg.capacity_tons)} T rated` : 'not every store is rated'}${
              fg.unweighed_items > 0 ? ` · ${fg.unweighed_items} SKUs have no case weight` : ''
            }`
          : ''
      }
      value={tons(fg?.total_tons)}
      unit="tonnes"
      loading={loading}
      missing={!loading && !fg ? 'SAP stock could not be read.' : undefined}
      corner={
        fg && (
          <AdminCorner
            label="Space used"
            value={fg.used_pct != null ? pct(fg.used_pct) : NO_VALUE}
            note={
              fg.free_tons != null
                ? `${tons(fg.free_tons)} T still free`
                : 'a store here has no rating'
            }
          />
        )
      }
      viz={
        fg && (
          <>
          <OpsPair
            rows={fg.rows.map((row, index) => ({
              label: row.label,
              // Capacity beside the stock, not instead of it: "444.5 T" alone
              // cannot be read as nearly full, and the percentage alone hides
              // how much room is actually left.
              figure:
                row.capacity_tons != null
                  ? `${tons(row.tons)} / ${tons(row.capacity_tons)} T`
                  : `${tons(row.tons)} T`,
              pct: barPct(row.used_pct),
              fill: index === 0 ? 'main' : 'light',
            }))}
            note={
              // Stock standing where nobody rated the building. Named on the
              // tile because the total above deliberately excludes it, and a
              // tonnage that appears in no total is a tonnage nobody manages.
              fg.unrated.length
                ? {
                    fill: 'mute',
                    label: `Outside the rating: ${fg.unrated.map((row) => row.warehouse).join(', ')}`,
                    figure: `${tons(fg.unrated.reduce((sum, row) => sum + row.tons, 0))} T`,
                  }
                : undefined
            }
          />
          {stores > 0 && (
            <p className="adm-open-hint">
              {stores} {stores === 1 ? 'store' : 'stores'} — open the detail →
            </p>
          )}
          </>
        )
      }
    />
  );
}

function PmTile({
  pm,
  loading,
  onOpen,
}: {
  pm: AdminPmStorage | null;
  loading: boolean;
  onOpen: () => void;
}) {
  const headline = moneyParts(pm?.total_value);
  const used = num(pm?.used_pct);
  const stores = pm?.rows.length ?? 0;

  return (
    <OpsGroup
      className="adm-has-corner"
      onOpen={pm && stores > 0 ? onOpen : undefined}
      name="Total PM storage"
      // No subtitle: the meter under the figure already names the filled and
      // free floor, which is what the pallet count was standing in for. The row
      // still renders (OpsGroup always draws it) so this tile's figure keeps
      // the same baseline as its neighbours'.
      sub=""
      value={headline.value}
      unit={headline.unit}
      loading={loading}
      missing={!loading && !pm ? 'SAP stock could not be read.' : undefined}
      corner={
        pm && (
          <AdminCorner
            label="Space used"
            value={used === null ? NO_VALUE : pct(used)}
            note={
              pm.free_sqft !== null
                ? `${whole(pm.free_sqft)} sq ft free`
                : 'pallet footprint not set'
            }
          />
        )
      }
      viz={
        pm && (
          <div>
            {used === null ? (
              <div className="ops-meter adm-unknown" />
            ) : (
              <OpsMeter
                segments={[
                  {
                    fill: 'main',
                    pct: barPct(used),
                    label: 'Filled',
                    figure: `${whole(pm.occupied_sqft)} sq ft`,
                  },
                  {
                    fill: 'mute',
                    pct: barPct(100 - used),
                    label: 'Free',
                    figure: `${whole(pm.free_sqft)} sq ft`,
                  },
                ]}
              />
            )}
            {stores > 0 && (
              <p className="adm-open-hint">
                {stores} {stores === 1 ? 'store' : 'stores'} — open the detail →
              </p>
            )}
          </div>
        )
      }
    />
  );
}

function OilTile({
  oil,
  loading,
  onOpen,
}: {
  oil: AdminOilStorage | null;
  loading: boolean;
  onOpen: () => void;
}) {
  const top = (oil?.rows ?? []).slice(0, 3);
  const rated = oil?.used_pct != null;
  // Openable only once there are vessels to draw. A tile that invites a click
  // and then shows an empty room is worse than one that does not invite it.
  const openable = (oil?.tank_rows?.length ?? 0) > 0;

  // EMPTY, not used. Space used is the same fact read the other way round, but
  // the question an owner asks a tank farm is "how much more will it take" —
  // and 24.5% empty is the number that answers it without arithmetic.
  const emptyPct = rated ? Math.round((100 - (oil?.used_pct ?? 0)) * 10) / 10 : null;
  const freeTons =
    oil?.capacity_tons != null && oil?.total_tons != null
      ? Math.round((oil.capacity_tons - oil.total_tons) * 10) / 10
      : null;

  // The headline counts the fixed tanks; the totes are real oil but sit outside
  // the tank-farm percentage, so the tile says both counts rather than one
  // number that matches neither.
  const tankCount = (oil?.by_type?.TANK?.vessels ?? 0) || (oil?.tank_rows?.length ?? 0);
  const toteCount = (oil?.tank_rows?.length ?? 0) - tankCount;

  return (
    <OpsGroup
      className="adm-has-corner"
      // OpsGroup already turns a tile with `onOpen` into a keyboard-reachable
      // button and styles it as drillable — no new affordance needed here.
      onOpen={openable ? onOpen : undefined}
      name="Oil storage"
      tag={oil ? { label: `loose oil, ${oil.warehouse}`, tone: 'neut' } : undefined}
      // No subtitle once the farm is rated: the key under the bar already
      // carries what it holds, and the line here was saying it a second time.
      // The row itself still renders (OpsGroup always draws it), so this tile's
      // figure stays on the same baseline as its neighbours'.
      //
      // Unrated is the exception — with no capacity to state, the litres and
      // the 1,000 L = 1 T rule are the only basis a reader has, and this tile's
      // basis DIFFERS from the finished-goods tiles beside it.
      sub={oil && !rated ? `${whole(oil.total_litres)} litres in tank · 1,000 L = 1 T` : ''}
      value={tons(oil?.total_tons)}
      unit="tonnes"
      loading={loading}
      missing={!loading && !oil ? 'SAP stock could not be read.' : undefined}
      corner={
        oil && (
          <AdminCorner
            label="Empty"
            value={emptyPct != null ? pct(emptyPct) : NO_VALUE}
            note={rated ? undefined : 'no tank rating yet'}
          />
        )
      }
      viz={
        oil && (
          <div>
            {rated ? (
              <div className="ops-meter">
                <i className="ops-f-main" style={{ width: `${barPct(oil.used_pct)}%` }} />
              </div>
            ) : (
              <div className="ops-meter adm-unknown" />
            )}
            {/* Free and rated only. What is FILLED is the tile's own headline
                figure two lines up, and a key that repeats the number above it
                spends a line saying nothing — these two are the pair the bar
                cannot show on its own. */}
            {rated && (
              <div className="ops-mkey">
                <span className="ops-k-light">
                  Free <b>{tons(freeTons)} T</b>
                </span>
                <span className="ops-k-mute">
                  Rated <b>{tons(oil.capacity_tons)} T</b>
                </span>
              </div>
            )}
            <div className="ops-mkey">
              {top.map((row, index) => (
                <span
                  key={row.label}
                  className={index === 0 ? 'ops-k-main' : index === 1 ? 'ops-k-light' : 'ops-k-mute'}
                >
                  {shortOil(row.label)} <b>{tons(row.tons)} T</b>
                </span>
              ))}
            </div>
            {/* `no_capacity_reason` is deliberately NOT printed here.
                Unconfigured, it reads "set EXIM_DB_NAME, EXIM_DB_HOST, …" —
                server environment variables on a factory wall, which is noise
                to everyone standing in front of it and actionable by nobody:
                whoever can set them reads the log, where the reader already
                puts it. The tile still refuses to look like a rated farm at
                zero — the track is hatched rather than empty and the corner
                says "no tank rating yet", which is the board's rule about an
                absent source honoured without the paragraph. The field stays in
                the payload for the API's other readers. */}
            {openable && (
              <p className="adm-open-hint">
                {tankCount} tanks
                {toteCount > 0 && ` + ${toteCount} totes`} — open the tank farm →
              </p>
            )}
          </div>
        )
      }
    />
  );
}

/**
 * "SOYABEAN REFINED LOOSE OIL" -> "Soyabean".
 *
 * The legend has room for a word, not a SAP item name. The first token carries
 * the variety, which is the only part that distinguishes one tank line from
 * another, and the full name stays in the tile's own data for anyone drilling.
 */
function shortOil(name: string | null | undefined): string {
  if (!name) return NO_VALUE;
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.charAt(0) + first.slice(1).toLowerCase();
}
