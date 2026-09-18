import { useMemo } from 'react';

import type { NonMovingItem } from '../../../non-moving/types';
import {
  LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS,
  LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS,
} from '../../constants';
import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { collect, decimal, money, shortDate, whole } from './format';
import { idleVarieties, varietyOf } from './varieties';

/**
 * The SKUs behind one idle variety, longest-standing first.
 *
 * Quantity and value rather than tonnes per row: the non-moving feed carries
 * no unit of measure, and weighing a single row would mean a second weight
 * chain beside the one the variety above it was totalled with. The variety
 * states the tonnage; these state what is in it and how long it has stood.
 */
function IdleItems({ variety, items }: { variety: string; items: NonMovingItem[] }) {
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
      rowKey={(row) => `${row.item_code}|${row.warehouse}`}
      empty="Nothing under this variety has been idle this long."
      columns={[
        { label: 'Code', cell: (row) => row.item_code, width: '13%' },
        { label: 'Item', cell: (row) => row.item_name, width: '33%' },
        { label: 'Warehouse', cell: (row) => row.warehouse || '—', dim: true, width: '11%' },
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
  warehouse,
  nonMoving,
  stockRows,
  loading,
  onClose,
}: {
  warehouse: string;
  nonMoving: Board['warehouse']['nonMoving'];
  stockRows: Board['warehouse']['stockRows'];
  loading: boolean;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();

  const groups = useMemo(
    () => idleVarieties(nonMoving.rows, stockRows),
    [nonMoving.rows, stockRows],
  );
  const itemsByVariety = useMemo(() => collect(nonMoving.rows, varietyOf), [nonMoving.rows]);

  return (
    <OpsDrill
      title="Non-moving stock"
      subtitle={`${warehouse} · idle ${LOGISTICS_CONTROL_NON_MOVING_FROM_DAYS}+ days, by variety — open one for its items`}
      domain="warehouse"
      onClose={onClose}
      stats={[
        { label: 'Tonnes', value: decimal(nonMoving.tonnes) },
        { label: 'Varieties', value: whole(groups.length) },
        { label: 'Items', value: whole(nonMoving.items) },
        {
          label: `${LOGISTICS_CONTROL_NON_MOVING_AGEING_DAYS}+ days`,
          value: `${decimal(nonMoving.ageingTonnes)} T`,
        },
      ]}
      rows={groups}
      rowKey={(row) => row.variety}
      empty="Nothing has been idle this long."
      loading={loading}
      onRowClick={(row) => toggle(row.variety)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <IdleItems variety={row.variety} items={itemsByVariety.get(row.variety) ?? []} />
      )}
      columns={[
        { label: 'Variety', cell: (row) => row.variety },
        { label: 'Items', cell: (row) => whole(row.items), numeric: true },
        { label: 'Quantity', cell: (row) => whole(row.quantity), numeric: true },
        { label: 'Tonnes', cell: (row) => decimal(row.tonnes, 1), numeric: true },
        { label: 'Value', cell: (row) => money(row.value), numeric: true },
        {
          label: 'Share',
          numeric: true,
          cell: (row) =>
            nonMoving.tonnes > 0 ? `${decimal((row.tonnes / nonMoving.tonnes) * 100, 1)}%` : '—',
        },
        {
          label: 'Longest idle',
          numeric: true,
          // The worst row in the variety, not its average: the question a
          // variety raises is how long the oldest of it has been standing.
          cell: (row) => `${whole(row.longestIdle)} days`,
        },
        {
          label: 'Unweighed',
          numeric: true,
          dim: true,
          cell: (row) => (row.unweighed > 0 ? whole(row.unweighed) : '—'),
        },
      ]}
    />
  );
}
