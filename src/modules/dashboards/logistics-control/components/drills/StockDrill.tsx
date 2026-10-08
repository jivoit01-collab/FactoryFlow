import { useMemo } from 'react';

import type { LogisticsMeasure } from '../../constants';
import { rowBoxes, type SideStockRow, stockByWarehouse } from '../../utils';
import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { collect, companyLabel, count, decimal, money, shortDate, whole } from './format';
import { rowTonnes, varietyOf, type VarietyTotal, varietyTotals } from './varieties';

/**
 * Where a row stands. The company goes in front where the band has two: Oil
 * and Mart each have a BH-GR, and the code alone would not say whose.
 */
function whereOf(row: SideStockRow, named: boolean): string {
  const code = row.warehouse || '—';
  return named ? `${companyLabel(row.company_code)} ${code}` : code;
}

/** The SKUs behind one variety, largest first in the board's unit. */
function VarietyItems({
  variety,
  items,
  named,
  inBoxes,
}: {
  variety: string;
  items: SideStockRow[];
  named: boolean;
  inBoxes: boolean;
}) {
  // One figure per row in the board's unit, so the sort, the total and the
  // dashes all come from the same function the tile counted with.
  const figureOf = inBoxes ? rowBoxes : rowTonnes;
  const sorted = [...items].sort((a, b) => (figureOf(b) ?? -1) - (figureOf(a) ?? -1));
  const total = items.reduce((sum, row) => sum + (figureOf(row) ?? 0), 0);
  const value = items.reduce((sum, row) => sum + (row.stock_value ?? 0), 0);
  const missing = items.filter((row) => figureOf(row) === null).length;

  return (
    <DrillSub
      lede={`The items standing under ${variety}`}
      stats={
        <>
          <b>{whole(items.length)}</b> {items.length === 1 ? 'item' : 'items'} ·{' '}
          {inBoxes ? (
            <>
              <b>{whole(total)}</b> boxes
            </>
          ) : (
            <>
              <b>{decimal(total, 2)}</b> t
            </>
          )}{' '}
          · <b>{money(value)}</b>
          {/* Stated here as well as on the row above: a variety whose total
              is missing half its items is a floor, and the reader scanning
              these rows has to know which of them contributed nothing. */}
          {missing > 0 && (
            <>
              {' '}
              · {count(missing, 'item')} with no {inBoxes ? 'box size' : 'case weight'}
            </>
          )}
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
        /*
         * In boxes where the board counts boxes and the item is boxed at all.
         * An item with no pack factor stays in its own pieces and its own unit
         * rather than reading as a box a piece — the same rows the total above
         * leaves out, so the two never disagree about what was counted.
         */
        {
          label: 'On hand',
          cell: (row) => {
            const boxes = inBoxes ? rowBoxes(row) : null;
            return boxes === null ? whole(row.on_hand) : decimal(boxes, boxes % 1 ? 1 : 0);
          },
          numeric: true,
          width: '10%',
        },
        {
          label: 'Unit',
          cell: (row) => (inBoxes && rowBoxes(row) !== null ? 'BOX' : row.uom || '—'),
          dim: true,
          width: '6%',
        },
        ...(inBoxes
          ? []
          : [
              {
                label: 'Tonnes',
                numeric: true,
                width: '11%',
                // A dash, never a zero: an item SAP holds no case weight for did not
                // contribute nothing to the total, it could not be counted at all.
                cell: (row: SideStockRow) => {
                  const tonnesFor = rowTonnes(row);
                  return tonnesFor === null ? (
                    <span className="dim">no weight</span>
                  ) : (
                    decimal(tonnesFor, 2)
                  );
                },
              },
            ]),
        {
          label: 'Value',
          cell: (row) => money(row.stock_value),
          numeric: true,
          // The Tonnes column's room, where boxes have dropped it.
          width: inBoxes ? '29%' : '18%',
        },
      ]}
    />
  );
}

/** What is standing in the ticked warehouses, by variety, and the SKUs under any one. */
export function StockDrill({
  caption,
  sides,
  stockTonnage,
  stockBoxes,
  stockRows,
  loading,
  measure = 'tonnes',
  onClose,
}: {
  /** The band's warehouses, as its rail names them. */
  caption: string;
  sides: Board['warehouse']['sides'];
  stockTonnage: Board['warehouse']['stockTonnage'];
  stockBoxes: Board['warehouse']['stockBoxes'];
  stockRows: Board['warehouse']['stockRows'];
  loading: boolean;
  /** The board's unit. Boxes on Beverages; every split and share follows it. */
  measure?: LogisticsMeasure;
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();
  const named = sides.length > 1;
  const inBoxes = measure === 'boxes';

  const groups = useMemo(() => varietyTotals(stockRows, measure), [stockRows, measure]);
  const itemsByVariety = useMemo(() => collect(stockRows, varietyOf), [stockRows]);
  const byWarehouse = useMemo(
    () =>
      inBoxes
        ? [...stockByWarehouse(sides)].sort((a, b) => b.boxes - a.boxes)
        : stockByWarehouse(sides),
    [sides, inBoxes],
  );
  /** The headline the shares are taken of, in the board's unit. */
  const total = inBoxes ? stockBoxes.boxes : stockTonnage.tonnes;
  const figureOf = (row: { tonnes: number; boxes: number }) => (inBoxes ? row.boxes : row.tonnes);

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
          value: inBoxes ? `${whole(row.boxes)} boxes` : `${decimal(row.tonnes)} T`,
          // Each floor against its own rating, and when it was last counted.
          // The rating is typed in tonnes, so a boxes board keeps the
          // percentage and drops the tonne figure it was taken of.
          sub: [
            row.fillPct === null
              ? 'no capacity set'
              : inBoxes
                ? `${decimal(row.fillPct, 0)}% full`
                : `${decimal(row.fillPct, 0)}% of ${whole(row.capacityTonnes ?? 0)} T`,
            row.lastAudit ? `audited ${shortDate(row.lastAudit)}` : 'never audited',
          ].join(' · '),
        })),
      }}
      stats={[
        inBoxes
          ? { label: 'Boxes', value: whole(stockBoxes.boxes) }
          : { label: 'Tonnes', value: decimal(stockTonnage.tonnes) },
        // Each company's half, where the band has two.
        ...(named
          ? sides.map((side) => ({
              label: companyLabel(side.companyCode),
              value: inBoxes
                ? `${whole(side.stockBoxes.boxes)} boxes`
                : `${decimal(side.stockTonnage.tonnes)} T`,
            }))
          : []),
        { label: 'Varieties', value: whole(groups.length) },
        {
          label: 'Items',
          value: whole(stockTonnage.weighedItems + stockTonnage.unweighedItems),
        },
        inBoxes
          ? { label: 'No box size', value: whole(stockBoxes.unboxedItems) }
          : { label: 'No case weight', value: whole(stockTonnage.unweighedItems) },
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
          inBoxes={inBoxes}
        />
      )}
      columns={[
        { label: 'Variety', cell: (row) => row.variety },
        { label: 'Items', cell: (row) => whole(row.items), numeric: true },
        inBoxes
          ? { label: 'Boxes', cell: (row: VarietyTotal) => whole(row.boxes), numeric: true }
          : {
              label: 'Tonnes',
              cell: (row: VarietyTotal) => decimal(row.tonnes, 1),
              numeric: true,
            },
        { label: 'Value', cell: (row) => money(row.value), numeric: true },
        {
          label: 'Share',
          numeric: true,
          cell: (row) => (total > 0 ? `${decimal((figureOf(row) / total) * 100, 1)}%` : '—'),
        },
        {
          label: inBoxes ? 'Unboxed' : 'Unweighed',
          numeric: true,
          dim: true,
          // Stated per variety, not just once at the top: a variety whose
          // total is missing half its items is a floor, and the total above
          // cannot say which variety that was.
          cell: (row) => {
            const missing = inBoxes ? row.unboxed : row.unweighed;
            return missing > 0 ? whole(missing) : '—';
          },
        },
      ]}
    />
  );
}
