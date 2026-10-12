import { NOT_SET } from '../constants';
import {
  dispatchShare,
  fmtPallet,
  fmtShare,
  fmtTon,
  fmtWhole,
  type ItemRow,
  type Measure,
} from '../utils';
import { MovementPill } from './MovementPill';
import type { SheetColumn } from './SheetTable';

/**
 * The columns Summary and Items share, in the workbook's order, so the two
 * sheets read alike: Summary is Items with a date in front.
 */

/** Item No. (opens its documents) through Pcs per Box. */
export function skuColumns<Row extends ItemRow>(onOpen: (row: Row) => void): SheetColumn<Row>[] {
  const text = (key: string, label: string, pick: (row: Row) => string | null, wide = false) => ({
    key,
    label,
    value: (row: Row) => pick(row) ?? NOT_SET,
    wide,
  });
  return [
    {
      key: 'item_code',
      label: 'Item No.',
      value: (row) => row.item.item_code,
      mono: true,
      render: (row) => (
        <button
          type="button"
          className="font-mono text-xs text-primary hover:underline"
          onClick={() => onOpen(row)}
          title="Show the documents"
        >
          {row.item.item_code}
        </button>
      ),
    },
    text('item_name', 'Item Description', (row) => row.item.item_name, true),
    text('variety', 'VARIETY', (row) => row.item.variety),
    text('subgroup', 'SUBGROUP', (row) => row.item.subgroup),
    text('sku', 'SKU', (row) => row.item.sku),
    text('packing_type', 'Packing Type', (row) => row.item.packing_type),
    {
      key: 'pieces_per_box',
      label: 'Pcs per Box',
      value: (row) => fmtWhole(row.item.pieces_per_box),
      sort: (row) => row.item.pieces_per_box,
      align: 'right',
    },
  ];
}

/** The unit the sheets show production and dispatch in, picked at the top of the page. */
export type MeasureKey = keyof Measure;

export const MEASURES: { key: MeasureKey; label: string }[] = [
  { key: 'qty', label: 'Qty' },
  { key: 'box', label: 'Box' },
  { key: 'litres', label: 'Liter' },
  { key: 'ton', label: 'Ton' },
  { key: 'pallet', label: 'PALLET' },
];

const FORMAT: Record<MeasureKey, [(value: number) => string, number]> = {
  qty: [fmtWhole, 0],
  box: [fmtWhole, 0],
  litres: [fmtWhole, 0],
  ton: [fmtTon, 2],
  pallet: [fmtPallet, 2],
};

/**
 * Production, dispatch and NET in the chosen unit, then Dispatch / Production %.
 *
 * One unit at a time: the workbook showed each flow five times over, which
 * made the sheet too wide to read. The Excel export still carries them all.
 */
export function flowColumns<Row extends ItemRow>(unit: MeasureKey): SheetColumn<Row>[] {
  const [format, decimals] = FORMAT[unit];
  const label = MEASURES.find((measure) => measure.key === unit)?.label ?? unit;
  const net = (row: Row) => row.production[unit] - row.dispatch[unit];
  return [
    {
      key: `production_${unit}`,
      label: `Prod ${label}`,
      value: (row) => format(row.production[unit]),
      number: (row) => row.production[unit],
      align: 'right',
      decimals,
    },
    {
      key: `dispatch_${unit}`,
      label: `Dispatch ${label}`,
      value: (row) => format(row.dispatch[unit]),
      number: (row) => row.dispatch[unit],
      align: 'right',
      decimals,
      strong: true,
    },
    {
      key: `net_${unit}`,
      label: `NET ${label}`,
      value: (row) => format(net(row)),
      number: net,
      align: 'right',
      decimals,
    },
    {
      key: 'share',
      label: 'Dispatch / Production %',
      value: (row) => fmtShare(dispatchShare(row)),
      number: (row) => dispatchShare(row),
      align: 'right',
      // A share's foot is worked out over the rows, never summed.
      footer: (rows) => {
        const made = rows.reduce((sum, row) => sum + row.production.pallet, 0);
        const sent = rows.reduce((sum, row) => sum + row.dispatch.pallet, 0);
        return fmtShare(made > 0 ? sent / made : null);
      },
    },
  ];
}

/** The SKU's FAST / SLOW over the movement window. */
export function movementColumn<Row extends ItemRow>(): SheetColumn<Row> {
  return {
    key: 'movement',
    label: 'MOVEMENT',
    value: (row) => row.item.movement,
    render: (row) => <MovementPill movement={row.item.movement} />,
  };
}

/** What went to group companies: shown, never counted. */
export function groupQtyColumn<Row extends ItemRow>(): SheetColumn<Row> {
  return {
    key: 'group_qty',
    label: 'Group Qty (not counted)',
    value: (row) => fmtWhole(row.groupDispatch.qty),
    number: (row) => row.groupDispatch.qty,
    align: 'right',
  };
}
