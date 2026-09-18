import { useMemo } from 'react';

import type { WarehouseOccupancyItem } from '../../../production-control/types';
import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { collect, count, decimal, money, whole } from './format';
import { rowTonnes, varietyOf, varietyTotals } from './varieties';

/** The SKUs behind one variety, heaviest first. */
function VarietyItems({ variety, items }: { variety: string; items: WarehouseOccupancyItem[] }) {
  const sorted = [...items].sort((a, b) => (rowTonnes(b) ?? -1) - (rowTonnes(a) ?? -1));
  const tonnes = items.reduce((total, row) => total + (rowTonnes(row) ?? 0), 0);
  const value = items.reduce((total, row) => total + (row.stock_value ?? 0), 0);
  const unweighed = items.filter((row) => rowTonnes(row) === null).length;

  return (
    <DrillSub
      lede={`The items standing under ${variety}`}
      stats={
        <>
          <b>{whole(items.length)}</b> {items.length === 1 ? 'item' : 'items'} ·{' '}
          <b>{decimal(tonnes, 2)}</b> t · <b>{money(value)}</b>
          {/* Stated here as well as on the row above: a variety whose tonnage
              is missing half its items is a floor, and the reader scanning
              these rows has to know which of them contributed nothing. */}
          {unweighed > 0 && <> · {count(unweighed, 'item')} with no case weight</>}
        </>
      }
      rows={sorted}
      rowKey={(row) => row.item_code}
      empty="SAP reported no items under this variety."
      columns={[
        { label: 'Code', cell: (row) => row.item_code, width: '13%' },
        { label: 'Item', cell: (row) => row.item_name, width: '35%' },
        { label: 'On hand', cell: (row) => whole(row.on_hand), numeric: true, width: '12%' },
        { label: 'Unit', cell: (row) => row.uom || '—', dim: true, width: '8%' },
        {
          label: 'Tonnes',
          numeric: true,
          width: '12%',
          // A dash, never a zero: an item SAP holds no case weight for did not
          // contribute nothing to the total, it could not be counted at all.
          cell: (row) => {
            const tonnesFor = rowTonnes(row);
            return tonnesFor === null ? (
              <span className="dim">no weight</span>
            ) : (
              decimal(tonnesFor, 2)
            );
          },
        },
        { label: 'Value', cell: (row) => money(row.stock_value), numeric: true, width: '20%' },
      ]}
    />
  );
}

/** What is standing in the warehouse, by variety, and the SKUs under any one. */
export function StockDrill({
  warehouse,
  stockTonnage,
  stockRows,
  loading,
  onClose,
}: {
  warehouse: string;
  stockTonnage: Board['warehouse']['stockTonnage'];
  stockRows: Board['warehouse']['stockRows'];
  loading: boolean;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();

  const groups = useMemo(() => varietyTotals(stockRows), [stockRows]);
  const itemsByVariety = useMemo(() => collect(stockRows, varietyOf), [stockRows]);

  return (
    <OpsDrill
      title="Stock on hand"
      subtitle={`${warehouse} · finished goods by variety — open one for its items`}
      domain="warehouse"
      onClose={onClose}
      stats={[
        { label: 'Tonnes', value: decimal(stockTonnage.tonnes) },
        { label: 'Varieties', value: whole(groups.length) },
        {
          label: 'Items',
          value: whole(stockTonnage.weighedItems + stockTonnage.unweighedItems),
        },
        { label: 'No case weight', value: whole(stockTonnage.unweighedItems) },
      ]}
      rows={groups}
      rowKey={(row) => row.variety}
      empty="SAP reported no stock in this warehouse."
      loading={loading}
      onRowClick={(row) => toggle(row.variety)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <VarietyItems variety={row.variety} items={itemsByVariety.get(row.variety) ?? []} />
      )}
      columns={[
        { label: 'Variety', cell: (row) => row.variety },
        { label: 'Items', cell: (row) => whole(row.items), numeric: true },
        { label: 'Tonnes', cell: (row) => decimal(row.tonnes, 1), numeric: true },
        { label: 'Value', cell: (row) => money(row.value), numeric: true },
        {
          label: 'Share',
          numeric: true,
          cell: (row) =>
            stockTonnage.tonnes > 0
              ? `${decimal((row.tonnes / stockTonnage.tonnes) * 100, 1)}%`
              : '—',
        },
        {
          label: 'Unweighed',
          numeric: true,
          dim: true,
          // Stated per variety, not just once at the top: a variety whose
          // tonnage is missing half its items is a floor, and the total above
          // cannot say which variety that was.
          cell: (row) => (row.unweighed > 0 ? whole(row.unweighed) : '—'),
        },
      ]}
    />
  );
}
