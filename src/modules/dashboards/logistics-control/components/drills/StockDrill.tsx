import { useMemo } from 'react';

import { type SideStockRow, stockByWarehouse } from '../../utils';
import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { collect, companyLabel, count, decimal, money, shortDate, whole } from './format';
import { rowTonnes, varietyOf, varietyTotals } from './varieties';

/**
 * Where a row stands. The company goes in front where the band has two: Oil
 * and Mart each have a BH-GR, and the code alone would not say whose.
 */
function whereOf(row: SideStockRow, named: boolean): string {
  const code = row.warehouse || '—';
  return named ? `${companyLabel(row.company_code)} ${code}` : code;
}

/** The SKUs behind one variety, heaviest first. */
function VarietyItems({
  variety,
  items,
  named,
}: {
  variety: string;
  items: SideStockRow[];
  named: boolean;
}) {
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
      // One item stands in several warehouses, and in both companies.
      rowKey={(row) => `${row.company_code}|${row.warehouse ?? ''}|${row.item_code}`}
      empty="SAP reported no items under this variety."
      columns={[
        { label: 'Code', cell: (row) => row.item_code, width: '12%' },
        { label: 'Item', cell: (row) => row.item_name, width: '30%' },
        { label: 'Warehouse', cell: (row) => whereOf(row, named), dim: true, width: '13%' },
        { label: 'On hand', cell: (row) => whole(row.on_hand), numeric: true, width: '10%' },
        { label: 'Unit', cell: (row) => row.uom || '—', dim: true, width: '6%' },
        {
          label: 'Tonnes',
          numeric: true,
          width: '11%',
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
        { label: 'Value', cell: (row) => money(row.stock_value), numeric: true, width: '18%' },
      ]}
    />
  );
}

/** What is standing in the ticked warehouses, by variety, and the SKUs under any one. */
export function StockDrill({
  caption,
  sides,
  stockTonnage,
  stockRows,
  loading,
  onClose,
}: {
  /** The band's warehouses, as its rail names them. */
  caption: string;
  sides: Board['warehouse']['sides'];
  stockTonnage: Board['warehouse']['stockTonnage'];
  stockRows: Board['warehouse']['stockRows'];
  loading: boolean;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();
  const named = sides.length > 1;

  const groups = useMemo(() => varietyTotals(stockRows), [stockRows]);
  const itemsByVariety = useMemo(() => collect(stockRows, varietyOf), [stockRows]);
  const byWarehouse = useMemo(() => stockByWarehouse(sides), [sides]);

  return (
    <OpsDrill
      title="Stock on hand"
      subtitle={`${caption} · finished goods by variety — open one for its items`}
      domain="warehouse"
      onClose={onClose}
      breakdown={{
        title: 'By warehouse',
        empty: 'No warehouse is ticked for this board.',
        items: byWarehouse.map((row) => ({
          key: `${row.companyCode}|${row.warehouse}`,
          label: named ? `${companyLabel(row.companyCode)} ${row.warehouse}` : row.warehouse,
          value: `${decimal(row.tonnes)} T`,
          // Each floor against its own rating, and when it was last counted.
          sub: [
            row.fillPct === null
              ? 'no capacity set'
              : `${decimal(row.fillPct, 0)}% of ${whole(row.capacityTonnes ?? 0)} T`,
            row.lastAudit ? `audited ${shortDate(row.lastAudit)}` : 'never audited',
          ].join(' · '),
        })),
      }}
      stats={[
        { label: 'Tonnes', value: decimal(stockTonnage.tonnes) },
        // Each company's half, where the band has two.
        ...(named
          ? sides.map((side) => ({
              label: companyLabel(side.companyCode),
              value: `${decimal(side.stockTonnage.tonnes)} T`,
            }))
          : []),
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
        <VarietyItems
          variety={row.variety}
          items={itemsByVariety.get(row.variety) ?? []}
          named={named}
        />
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
