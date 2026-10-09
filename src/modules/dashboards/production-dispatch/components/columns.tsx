import { NOT_SET } from '../constants';
import {
  dispatchShare,
  fmtPallet,
  fmtShare,
  fmtTon,
  fmtWhole,
  type ItemRow,
  type Measure,
  netPallet,
} from '../utils';
import { MovementPill } from './MovementPill';
import type { SheetColumn } from './SheetTable';

/**
 * The columns Summary and Items share, in the workbook's order, so the two
 * sheets read alike: Summary is Items with a date in front.
 */

/** Item No. (opens its documents) through Liter Factor. */
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
    {
      key: 'litres_per_unit',
      label: 'Liter Factor',
      value: (row) => String(row.item.litres_per_unit),
      sort: (row) => row.item.litres_per_unit,
      align: 'right',
    },
  ];
}

/** A flow's Qty, Box, Liter, Ton and PALLET, headed the workbook's way ("Prod Box"). */
function measureColumns<Row>(
  prefix: string,
  key: string,
  pick: (row: Row) => Measure,
): SheetColumn<Row>[] {
  const figure = (
    part: keyof Measure,
    label: string,
    format: (value: number) => string,
    decimals: number,
  ): SheetColumn<Row> => ({
    key: `${key}_${part}`,
    label: `${prefix} ${label}`,
    value: (row) => format(pick(row)[part]),
    number: (row) => pick(row)[part],
    align: 'right',
    decimals,
    strong: part === 'pallet',
  });
  return [
    figure('qty', 'Qty', fmtWhole, 0),
    figure('box', 'Box', fmtWhole, 0),
    figure('litres', 'Liter', fmtWhole, 0),
    figure('ton', 'Ton', fmtTon, 2),
    figure('pallet', 'PALLET', fmtPallet, 2),
  ];
}

/** Production, dispatch, NET PALLET and Dispatch / Production %. */
export function flowColumns<Row extends ItemRow>(): SheetColumn<Row>[] {
  return [
    ...measureColumns<Row>('Prod', 'production', (row) => row.production),
    ...measureColumns<Row>('Dispatch', 'dispatch', (row) => row.dispatch),
    {
      key: 'net_pallet',
      label: 'NET PALLET',
      value: (row) => fmtPallet(netPallet(row)),
      number: (row) => netPallet(row),
      align: 'right',
      decimals: 2,
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
