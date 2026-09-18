import { OpsDrill } from '../../../logistics-control/components';
import type { PlantBoardShifting, ShiftingRoute, ShiftingShipment } from '../../types';
import { clockTime, decimal, whole } from './format';

/**
 * The two shifting panels.
 *
 * Both stop at one level, and for the same reason: this response folds the
 * register onto routes and documents, and carries no item lines under either.
 * A chevron on these rows would open a blank.
 *
 * THE SHIPPED HALF NAMES ITS DOCUMENTS; THE DECLARED HALF CANNOT.
 *
 * A reader who opens "Shipped today" is usually on their way to look one of
 * these loads up, and neither the tile nor the route fold gave them anything to
 * type into the BST screen — "7 transfers out" and "48 t to Mart" are both true
 * and neither is a document. So the transfers are the table there and the
 * routes move up into the breakdown strip, which is what that strip is for: the
 * table answers "which ones", the strip answers "where".
 *
 * Declared keeps its routes as the table. A declaration is a keeper's statement
 * of intent off the Godown Stock Movements page — no BST exists for it yet, and
 * inventing an empty document column would suggest one does.
 */

/** The headline figures both stages share, so the wall reads them as a pair. */
function stageStats(stage: PlantBoardShifting['allocated'] | PlantBoardShifting['shipped'] | undefined, isDeclared: boolean) {
  return [
    {
      label: 'Total',
      value: stage?.tonnage_available
        ? `${decimal(stage?.total_tons)} t`
        : `${whole(stage?.total_pieces)} pcs`,
    },
    { label: 'Pieces', value: whole(stage?.total_pieces) },
    { label: 'Boxes', value: whole(stage?.boxes) },
    { label: isDeclared ? 'Declarations' : 'Transfers out', value: whole(stage?.transfers) },
    { label: 'No litre volume', value: whole(stage?.unweighed_items) },
  ];
}

/** One route as a line in the "where it went" strip. */
function routeItem(row: ShiftingRoute) {
  return {
    key: row.route,
    label: row.codes?.length ? `${row.name} · ${row.codes.join(', ')}` : row.name,
    value: row.tons === null ? `${whole(row.pieces)} pcs` : `${decimal(row.tons, 2)} t`,
    sub: `${whole(row.boxes)} boxes · ${whole(row.item_count)} SKUs`,
  };
}

/** What the keeper said would leave the floor today, by destination. */
export function DeclaredDrill({
  shifting,
  onClose,
}: {
  shifting: PlantBoardShifting | null;
  onClose: () => void;
}) {
  return (
    <OpsDrill<ShiftingRoute>
      title="Declared today"
      subtitle={shifting?.basis}
      domain="shifting"
      onClose={onClose}
      stats={stageStats(shifting?.allocated, true)}
      rows={shifting?.allocated?.routes ?? []}
      rowKey={(row) => row.route}
      empty="The keeper has declared nothing off the floor today."
      columns={[
        {
          label: 'Destination',
          cell: (row) => (row.codes?.length ? `${row.name} · ${row.codes.join(', ')}` : row.name),
        },
        { label: 'SKUs', cell: (row) => whole(row.item_count), numeric: true },
        { label: 'Boxes', cell: (row) => whole(row.boxes), numeric: true },
        { label: 'Pieces', cell: (row) => whole(row.pieces), numeric: true },
        {
          label: 'Tonnes',
          cell: (row) => (row.tons === null ? '—' : decimal(row.tons, 2)),
          numeric: true,
        },
      ]}
    />
  );
}

/** The BSTs that left the floor today, with the document that settles each. */
export function ShippedDrill({
  shifting,
  onClose,
}: {
  shifting: PlantBoardShifting | null;
  onClose: () => void;
}) {
  const shipped = shifting?.shipped;

  return (
    <OpsDrill<ShiftingShipment>
      title="Shipped today"
      subtitle={shifting?.basis}
      domain="shifting"
      onClose={onClose}
      stats={stageStats(shipped, false)}
      breakdown={{
        title: 'Where it went',
        items: (shipped?.routes ?? []).map(routeItem),
        empty: 'Nothing has left the floor today.',
      }}
      rows={shipped?.shipments ?? []}
      rowKey={(row) => row.entry_no}
      empty="Nothing has been dispatched off the floor today."
      columns={[
        { label: 'BST', cell: (row) => row.entry_no || '—' },
        {
          label: 'Destination',
          cell: (row) => (row.warehouse ? `${row.route_name} · ${row.warehouse}` : row.route_name),
        },
        {
          /*
           * SAP's own document first, and the typed one only as a fallback.
           * `sap_doc_num` is what SAP posted — the stock transfer, or the
           * invoice on a sale to Mart, which is the number Accounts asks for.
           * `invoice_no` is what a warehouse user typed to FIND the BST: on
           * live rows the two agree, but one is a record and the other is
           * somebody's search box, so the record leads.
           *
           * Neither exists until SAP posts, and a transfer still waiting says
           * so rather than showing a blank the reader takes for a dead feed.
           */
          label: 'SAP document',
          cell: (row) => row.sap_doc_num || row.invoice_no || 'Not posted yet',
          dim: true,
        },
        { label: 'Boxes', cell: (row) => whole(row.boxes), numeric: true },
        { label: 'Pieces', cell: (row) => whole(row.pieces), numeric: true },
        {
          label: 'Tonnes',
          cell: (row) => (row.tons === null ? '—' : decimal(row.tons, 2)),
          numeric: true,
        },
        { label: 'Out at', cell: (row) => clockTime(row.dispatched_at), dim: true },
      ]}
    />
  );
}
