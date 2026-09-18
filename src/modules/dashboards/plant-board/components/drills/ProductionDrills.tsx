import { DrillSub, OpsDrill, useExpandedRow } from '../../../logistics-control/components';
import type { DailyQty, PlantBoardProduction, WasteDay } from '../../types';
import { decimal, money, NO_ROWS, shortDate, whole } from './format';

/** Today on the lines. Totals only — the runs are on the execution screen. */
export function TodayLinesDrill({
  production,
  onClose,
}: {
  production: PlantBoardProduction | null;
  onClose: () => void;
}) {
  const today = production?.today;
  return (
    <OpsDrill<never>
      title="Today on the lines"
      subtitle="The supervisor's own register — SAP holds no plan for a single day"
      domain="production"
      onClose={onClose}
      stats={[
        { label: 'Planned', value: `${whole(today?.planned_cases)} cases` },
        { label: 'Produced', value: `${whole(today?.produced_cases)} cases` },
        { label: 'Runs', value: whole(today?.runs) },
        { label: 'Lines', value: whole(today?.lines) },
        { label: 'Completed', value: whole(today?.completed_runs) },
        { label: 'In pieces', value: `${whole(today?.produced_qty)} pcs` },
      ]}
      breakdown={{
        title: 'The same day in pieces',
        items: [
          {
            key: 'planned',
            label: 'Planned',
            value: `${whole(today?.planned_qty)} pcs`,
            sub: 'drafts counted as planned',
          },
          {
            key: 'produced',
            label: 'Produced',
            value: `${whole(today?.produced_qty)} pcs`,
            sub: 'open runs read from their segments',
          },
        ],
      }}
      rows={[]}
      rowKey={(_row, index) => String(index)}
      empty="The board carries the day's totals. The individual runs are on the Production Execution screen."
      columns={NO_ROWS}
    />
  );
}

/** The plan against production, day by day. */
export function MonthlyPlanningDrill({
  production,
  onClose,
}: {
  production: PlantBoardProduction | null;
  onClose: () => void;
}) {
  return (
    <OpsDrill<DailyQty>
      title="Monthly planning"
      subtitle="Plan against production, both in pieces, off SAP's own movement journal"
      domain="production"
      onClose={onClose}
      stats={[
        { label: 'Planned', value: `${whole(production?.planned_qty)} pcs` },
        { label: 'Produced', value: `${whole(production?.produced_qty)} pcs` },
        {
          label: 'Attainment',
          value: production?.attainment_pct == null ? '—' : `${production.attainment_pct}%`,
        },
        { label: 'Planned', value: `${whole(production?.planned_tons)} t` },
        { label: 'Produced', value: `${whole(production?.produced_tons)} t` },
        { label: 'Days that ran', value: whole(production?.active_days) },
      ]}
      rows={production?.daily ?? []}
      rowKey={(row) => row.date}
      empty="Nothing has been received from production this month."
      columns={[
        { label: 'Day', cell: (row) => shortDate(row.date) },
        { label: 'Pieces', cell: (row) => whole(row.qty), numeric: true },
      ]}
    />
  );
}

/** The floor by age band. The SKUs are on the Warehouse Control board. */
export function TotalStockDrill({
  production,
  onClose,
}: {
  production: PlantBoardProduction | null;
  onClose: () => void;
}) {
  const floor = production?.floor;
  const age = floor?.age;
  return (
    <OpsDrill<never>
      title="Total stock"
      subtitle={floor?.age_basis}
      domain="production"
      onClose={onClose}
      stats={[
        { label: 'At BH-PF', value: `${decimal(floor?.tons)} t` },
        { label: 'Value', value: money(floor?.stock_value) },
        { label: 'SKUs', value: whole(floor?.item_count) },
        { label: 'Pieces', value: whole(floor?.total_pieces) },
        { label: 'Never shipped', value: whole(age?.never_shipped.items) },
        { label: 'No litre volume', value: whole(floor?.unweighed_items) },
      ]}
      breakdown={{
        title: 'Aged on when stock last left',
        items: [
          {
            key: 'fresh',
            label: 'Up to 3 days',
            value: `${decimal(age?.fresh.tons)} t`,
            sub: money(age?.fresh.value),
          },
          {
            key: 'd4_7',
            label: '4–7 days',
            value: `${decimal(age?.d4_7.tons)} t`,
            sub: money(age?.d4_7.value),
          },
          {
            key: 'd7',
            label: 'Over 7 days',
            value: `${decimal(age?.d7_plus.tons)} t`,
            sub: money(age?.d7_plus.value),
          },
          {
            key: 'never',
            label: 'Never shipped',
            value: `${decimal(age?.never_shipped.tons)} t`,
            sub: money(age?.never_shipped.value),
          },
        ],
      }}
      rows={[]}
      rowKey={(_row, index) => String(index)}
      empty="The board carries the floor by age band. The individual SKUs are on the Warehouse Control board."
      columns={NO_ROWS}
    />
  );
}

/** One quantity of a day's waste, in the unit it was logged in. */
interface WasteQuantity {
  key: string;
  material: string;
  qty: number;
  uom: string;
}

/**
 * A day's waste in the units it was actually logged in.
 *
 * Pieces, kilos, metres and litres are four scales and none of them add to
 * another, which is why the row above prices the day instead. Opened, the day
 * gives each unit its own line rather than the comma-joined string a single
 * cell can hold — which is what the Quantity column used to be.
 */
function WasteQuantities({ day }: { day: WasteDay }) {
  const quantities: WasteQuantity[] = [
    ...(day.pm_pieces > 0
      ? [{ key: 'pm-pcs', material: 'Packing material', qty: day.pm_pieces, uom: 'pcs' }]
      : []),
    ...day.pm_other.map((entry) => ({
      key: `pm-${entry.uom}`,
      material: 'Packing material',
      qty: entry.qty,
      uom: entry.uom,
    })),
    ...(day.rm_litres > 0
      ? [{ key: 'rm-ltr', material: 'Raw material', qty: day.rm_litres, uom: 'L' }]
      : []),
    ...day.rm_other.map((entry) => ({
      key: `rm-${entry.uom}`,
      material: 'Raw material',
      qty: entry.qty,
      uom: entry.uom,
    })),
  ];

  return (
    <DrillSub
      lede={`What was logged against ${shortDate(day.date)}`}
      stats={
        <>
          <b>{whole(day.logs)}</b> {day.logs === 1 ? 'row' : 'rows'} ·{' '}
          <b>{money(day.total_value)}</b>
          {/* The money above is short by these, and saying so here is the only
              place a reader can see which day was under-priced. */}
          {day.unpriced > 0 && (
            <>
              {' '}
              · <b>{whole(day.unpriced)}</b> could not be priced
            </>
          )}
        </>
      }
      rows={quantities}
      rowKey={(row) => row.key}
      empty="The day carries money but no quantity — every row was logged unpriced or in no unit."
      columns={[
        { label: 'Material', cell: (row) => row.material, width: '32%' },
        { label: 'Quantity', cell: (row) => whole(row.qty), numeric: true, width: '22%' },
        { label: 'Unit', cell: (row) => row.uom, dim: true, width: '16%' },
        {
          // Which half of the money the line sits under, so the quantities and
          // the rupees on the row above can be read together.
          label: 'Costed under',
          cell: (row) =>
            row.material === 'Packing material'
              ? `Packing · ${money(day.pm_value)}`
              : `Raw material · ${money(day.rm_value)}`,
          dim: true,
          width: '30%',
        },
      ]}
    />
  );
}

/** The waste register, day by day, and a day's quantities by unit. */
export function WastageDrill({
  production,
  onClose,
}: {
  production: PlantBoardProduction | null;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();
  const waste = production?.wastage;

  return (
    <OpsDrill<WasteDay>
      title="Wastage"
      subtitle={waste?.logged_basis}
      domain="production"
      onClose={onClose}
      stats={[
        { label: 'Packing this month', value: money(waste?.pm_logged_value) },
        { label: 'Raw material', value: money(waste?.rm_logged_value) },
        { label: 'Rows logged', value: whole(waste?.pm_log_count) },
        { label: 'Approved', value: whole(waste?.pm_approved_count) },
        {
          label: 'Paperwork behind',
          value:
            waste?.logged_days_behind == null ? '—' : `${whole(waste.logged_days_behind)} days`,
        },
        { label: 'Could not be priced', value: whole(waste?.logged_unpriced_count) },
      ]}
      rows={waste?.logged_daily ?? []}
      rowKey={(row) => row.date}
      empty="Nothing has been logged against a run in the window."
      onRowClick={(row) => toggle(row.date)}
      // A day nothing was logged against has no quantities to break out.
      canOpenRow={(row) => row.logs > 0}
      expandedKey={openKey}
      renderExpanded={(row) => <WasteQuantities day={row} />}
      columns={[
        { label: 'Run day', cell: (row) => shortDate(row.date) },
        { label: 'Rows', cell: (row) => whole(row.logs), numeric: true },
        { label: 'Packing', cell: (row) => money(row.pm_value), numeric: true },
        { label: 'Raw material', cell: (row) => money(row.rm_value), numeric: true },
        {
          // The quantities behind the money, each in its own unit — pieces,
          // kilos and metres are never added together. Opened, the day gives
          // each unit a line of its own.
          label: 'Quantity',
          cell: (row) =>
            [
              row.pm_pieces > 0 ? `${whole(row.pm_pieces)} pcs` : null,
              ...row.pm_other.map((o) => `${whole(o.qty)} ${o.uom}`),
              row.rm_litres > 0 ? `${whole(row.rm_litres)} L` : null,
            ]
              .filter(Boolean)
              .join(', ') || '—',
          dim: true,
        },
        { label: 'Total', cell: (row) => money(row.total_value), numeric: true },
      ]}
    />
  );
}
