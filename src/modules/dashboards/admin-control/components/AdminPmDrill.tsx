import { OpsDrill } from '../../logistics-control/components';
import type { AdminPmRow, AdminPmStorage } from '../types';
import { money, NO_VALUE, num, pct, pctRough, whole } from '../utils';

export interface AdminPmDrillProps {
  pm: AdminPmStorage;
  onClose: () => void;
}

/**
 * What the packaging material is worth, and how much floor it stands on.
 *
 * TWO UNITS, AND THEY DO NOT CONVERT. The headline is money; the space figures
 * are square feet bridged pieces → pallets → floor by the factory's own
 * stacking sheet. Packaging has no litre volume and no case weight, so neither
 * of this board's tonnage bases applies to it and nothing here should be read
 * as a weight.
 *
 * THE ITEM WITH NO PALLET FIGURE IS THE FAILURE MODE. It is counted in the
 * value and in the pieces and left out of the floor, so every one of them makes
 * the stores read emptier than they are — and an emptier store looks like good
 * news. That count sits above the table, not in a footnote.
 */
export function AdminPmDrill({ pm, onClose }: AdminPmDrillProps) {
  const used = num(pm.used_pct);
  const share = (value: number) => (pm.total_value > 0 ? (value / pm.total_value) * 100 : null);

  return (
    <OpsDrill
      title="Total PM storage"
      domain="warehouse"
      subtitle={pm.basis}
      onClose={onClose}
      stats={[
        { label: 'On hand', value: money(pm.total_value) },
        { label: 'Pieces', value: whole(pm.total_pieces) },
        {
          label: 'Floor used',
          // A rule and the reason, never 0%: the footprint being unset and the
          // stores being empty are opposite conditions.
          value: used === null ? 'pallet footprint not set' : pct(used),
        },
        {
          label: 'Free',
          value: pm.free_sqft === null ? NO_VALUE : `${whole(pm.free_sqft)} sq ft`,
        },
      ]}
      breakdown={[
        {
          title: 'The floor, block by block',
          empty: 'The stacking sheet carries no blocks.',
          items: pm.blocks.map((block) => ({
            key: block.label,
            label: block.label,
            value: `${whole(block.sqft)} sq ft`,
          })),
        },
        {
          title: 'What the floor figure misses',
          empty: 'Every item carries a pallet figure.',
          items:
            pm.unmeasured_items > 0
              ? [
                  {
                    key: 'items',
                    label: 'Items with no pallet figure',
                    value: whole(pm.unmeasured_items),
                    // Which way the error runs, said out loud. "Some items are
                    // unmeasured" is a caveat; "the stores read emptier than
                    // they are" is the thing to act on.
                    sub: 'in the value, out of the floor — the stores read emptier',
                  },
                  {
                    key: 'pieces',
                    label: 'Pieces behind them',
                    value: whole(pm.unmeasured_pieces),
                    sub: `pallets are ${whole(pm.sqft_per_pallet)} sq ft on the ${pm.stacking_measured_on} sheet`,
                  },
                ]
              : [],
        },
      ]}
      rows={pm.rows}
      rowKey={(row: AdminPmRow) => row.warehouse}
      empty="SAP returned no packaging material in these stores."
      columns={[
        { label: 'Store', cell: (row: AdminPmRow) => row.label },
        { label: 'Value', cell: (row: AdminPmRow) => money(row.value), numeric: true },
        {
          label: 'Share',
          cell: (row: AdminPmRow) => pctRough(share(row.value)),
          numeric: true,
          dim: true,
        },
        { label: 'Pieces', cell: (row: AdminPmRow) => whole(row.pieces), numeric: true },
        {
          label: 'Pallets',
          // Zero pallets on a store holding stock is the unmeasured-item
          // problem showing up per store, so it says so rather than printing a
          // bare 0 that reads as an empty floor.
          cell: (row: AdminPmRow) =>
            row.pallets > 0 ? whole(row.pallets) : row.pieces > 0 ? 'not measured' : '0',
          numeric: true,
          dim: true,
        },
      ]}
    />
  );
}
