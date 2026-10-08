import { useMemo } from 'react';

import {
  LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS,
  LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS,
  type LogisticsMeasure,
} from '../../constants';
import { countBoxes, idleByWarehouse, type SideIdleRow } from '../../utils';
import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { collect, companyLabel, decimal, money, shortDate, whole } from './format';
import { idleVarieties, type IdleVariety, varietyOf } from './varieties';

/**
 * The SKUs behind one idle variety, longest-standing first.
 *
 * Quantity and value rather than tonnes per row: the non-moving feed carries
 * no unit of measure, and weighing a single row would mean a second weight
 * chain beside the one the variety above it was totalled with. The variety
 * states the tonnage (or the boxes); these state what is in it and how long it
 * has stood.
 */
function IdleItems({
  variety,
  items,
  named,
}: {
  variety: string;
  items: SideIdleRow[];
  named: boolean;
}) {
  const sorted = [...items].sort(
    (a, b) => (b.days_since_last_movement ?? 0) - (a.days_since_last_movement ?? 0),
  );
  const value = items.reduce((total, row) => total + (row.value ?? 0), 0);
  const longest = items.reduce(
    (worst, row) => Math.max(worst, row.days_since_last_movement ?? 0),
    0,
  );

  return (
    <DrillSub
      lede={`What has been standing under ${variety}`}
      stats={
        <>
          <b>{whole(items.length)}</b> {items.length === 1 ? 'item' : 'items'} ·{' '}
          <b>{money(value)}</b> · oldest <b>{whole(longest)}</b> days
        </>
      }
      rows={sorted}
      // The same warehouse code can stand in both companies.
      rowKey={(row) => `${row.company_code}|${row.item_code}|${row.warehouse}`}
      empty="Nothing under this variety has been idle this long."
      columns={[
        { label: 'Code', cell: (row) => row.item_code, width: '13%' },
        { label: 'Item', cell: (row) => row.item_name, width: '33%' },
        {
          label: 'Warehouse',
          cell: (row) =>
            named
              ? `${companyLabel(row.company_code)} ${row.warehouse || '—'}`
              : row.warehouse || '—',
          dim: true,
          width: '11%',
        },
        { label: 'Quantity', cell: (row) => whole(row.quantity ?? 0), numeric: true, width: '11%' },
        { label: 'Value', cell: (row) => money(row.value), numeric: true, width: '13%' },
        {
          label: 'Idle',
          cell: (row) => `${whole(row.days_since_last_movement ?? 0)} days`,
          numeric: true,
          width: '10%',
        },
        {
          label: 'Last moved',
          // The date behind the age, so a reader can check it against a
          // document rather than take the day count on trust.
          cell: (row) => shortDate(row.last_movement_date),
          dim: true,
          width: '9%',
        },
      ]}
    />
  );
}

/** What has not moved, by variety, and the SKUs under any one. */
export function NonMovingDrill({
  caption,
  sides,
  nonMoving,
  stockRows,
  loading,
  measure = 'tonnes',
  onClose,
}: {
  /** The band's warehouses, as its rail names them. */
  caption: string;
  sides: Board['warehouse']['sides'];
  nonMoving: Board['warehouse']['nonMoving'];
  stockRows: Board['warehouse']['stockRows'];
  loading: boolean;
  /** The board's unit. Boxes on Beverages; every split and share follows it. */
  measure?: LogisticsMeasure;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();
  const inBoxes = measure === 'boxes';

  const groups = useMemo(
    () => idleVarieties(nonMoving.rows, stockRows, measure),
    [nonMoving.rows, stockRows, measure],
  );
  const itemsByVariety = useMemo(() => collect(nonMoving.rows, varietyOf), [nonMoving.rows]);
  const named = sides.length > 1;
  /*
   * Each floor's idle stock, counted in boxes beside its tonnes.
   *
   * Boxed here against the side's own stock rows, the way `idleByWarehouse`
   * weighs them, so the strip adds to the tile's idle boxes. The warehouse is
   * matched on its trimmed, upper-cased code, as the weighing matches it.
   */
  const byWarehouse = useMemo(() => {
    const code = (raw: string | null | undefined) => (raw ?? '').trim().toUpperCase();
    const rows = idleByWarehouse(sides).map((row) => {
      const side = sides.find((candidate) => candidate.companyCode === row.companyCode);
      const idle = (side?.nonMoving.rows ?? []).filter(
        (idleRow) => code(idleRow.warehouse) === code(row.warehouse),
      );
      return { ...row, boxes: countBoxes(idle, side?.stockRows ?? []).boxes };
    });
    return inBoxes ? rows.sort((a, b) => b.boxes - a.boxes) : rows;
  }, [sides, inBoxes]);
  /** The headline the shares are taken of, in the board's unit. */
  const total = inBoxes ? nonMoving.boxes : nonMoving.tonnes;
  const figureOf = (row: { tonnes: number; boxes: number }) => (inBoxes ? row.boxes : row.tonnes);

  return (
    <OpsDrill
      title="Non-moving stock"
      subtitle={`${caption} · idle ${LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS}+ days, by variety — open one for its items`}
      domain="warehouse"
      onClose={onClose}
      breakdown={{
        title: 'By warehouse',
        empty: 'No warehouse is ticked for this board.',
        items: byWarehouse.map((row) => ({
          key: `${row.companyCode}|${row.warehouse}`,
          label: named ? `${companyLabel(row.companyCode)} ${row.warehouse}` : row.warehouse,
          value: inBoxes ? `${whole(row.boxes)} boxes` : `${decimal(row.tonnes)} T`,
          sub: `${whole(row.items)} ${row.items === 1 ? 'item' : 'items'}`,
        })),
      }}
      stats={[
        inBoxes
          ? { label: 'Boxes', value: whole(nonMoving.boxes) }
          : { label: 'Tonnes', value: decimal(nonMoving.tonnes) },
        ...(named
          ? sides.map((side) => ({
              label: companyLabel(side.companyCode),
              value: inBoxes
                ? `${whole(side.nonMoving.boxes)} boxes`
                : `${decimal(side.nonMoving.tonnes)} T`,
            }))
          : []),
        { label: 'Varieties', value: whole(groups.length) },
        { label: 'Items', value: whole(nonMoving.items) },
        {
          label: `${LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS}+ days`,
          value: inBoxes
            ? `${whole(nonMoving.ageingBoxes)} boxes`
            : `${decimal(nonMoving.ageingTonnes)} T`,
        },
        // Said once at the top on a boxes board: the per-variety column below
        // says where, this says how much of the total is a floor.
        ...(inBoxes ? [{ label: 'No box size', value: whole(nonMoving.uncounted) }] : []),
      ]}
      rows={groups}
      rowKey={(row) => row.variety}
      empty="Nothing has been idle this long."
      loading={loading}
      onRowClick={(row) => toggle(row.variety)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <IdleItems
          variety={row.variety}
          items={itemsByVariety.get(row.variety) ?? []}
          named={named}
        />
      )}
      columns={[
        { label: 'Variety', cell: (row) => row.variety },
        { label: 'Items', cell: (row) => whole(row.items), numeric: true },
        { label: 'Quantity', cell: (row) => whole(row.quantity), numeric: true },
        inBoxes
          ? { label: 'Boxes', cell: (row: IdleVariety) => whole(row.boxes), numeric: true }
          : {
              label: 'Tonnes',
              cell: (row: IdleVariety) => decimal(row.tonnes, 1),
              numeric: true,
            },
        { label: 'Value', cell: (row) => money(row.value), numeric: true },
        {
          label: 'Share',
          numeric: true,
          cell: (row) => (total > 0 ? `${decimal((figureOf(row) / total) * 100, 1)}%` : '—'),
        },
        {
          label: 'Longest idle',
          numeric: true,
          // The worst row in the variety, not its average: the question a
          // variety raises is how long the oldest of it has been standing.
          cell: (row) => `${whole(row.longestIdle)} days`,
        },
        {
          label: inBoxes ? 'Unboxed' : 'Unweighed',
          numeric: true,
          dim: true,
          cell: (row) => {
            const missing = inBoxes ? row.uncounted : row.unweighed;
            return missing > 0 ? whole(missing) : '—';
          },
        },
      ]}
    />
  );
}
