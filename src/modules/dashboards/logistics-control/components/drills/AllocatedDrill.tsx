import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { decimal, shortDate, whole } from './format';

type Movement = Board['warehouse']['allocated']['rows'][number];
type Line = Movement['lines'][number];

/** Whole boxes and the pieces left over, or a rule where SAP has no pack size. */
function boxesCell(line: Line): React.ReactNode {
  if (line.full_boxes === null || line.full_boxes === undefined) {
    return <span className="dim">no pack size</span>;
  }
  return line.loose_pieces
    ? `${whole(line.full_boxes)} + ${whole(line.loose_pieces)}`
    : whole(line.full_boxes);
}

/**
 * What one declared consignment actually held.
 *
 * The register's row says how many pieces came off the floor; this says what
 * they were. Litres are the feed's own string, converted here and nowhere
 * else — the factor has six decimal places, and a second conversion would
 * round a 0.8242-litre pouch differently from the register.
 */
function MovementLines({ movement }: { movement: Movement }) {
  const lines = movement.lines ?? [];
  const pieces = lines.reduce((total, line) => total + (line.pieces ?? 0), 0);
  const litres = lines.reduce((total, line) => total + Number(line.litres ?? 0), 0);

  return (
    <DrillSub
      lede={`What ${movement.entry_no} carried into ${movement.destination_display}`}
      stats={
        <>
          <b>{whole(lines.length)}</b> {lines.length === 1 ? 'item' : 'items'} ·{' '}
          <b>{whole(pieces)}</b> pieces · <b>{decimal(litres, 1)}</b> litres
        </>
      }
      rows={lines}
      rowKey={(line) => String(line.id)}
      empty="This consignment was declared with no lines on it."
      columns={[
        { label: 'Code', cell: (line) => line.item_code, width: '14%' },
        { label: 'Item', cell: (line) => line.item_name, width: '38%' },
        { label: 'Pieces', cell: (line) => whole(line.pieces ?? 0), numeric: true, width: '11%' },
        { label: 'Boxes', cell: boxesCell, numeric: true, width: '13%' },
        {
          label: 'Litres',
          numeric: true,
          width: '11%',
          // A dash, not a zero: `litres` is null for an item SAP does not
          // measure in litres at all — a carton, a preform — and a zero there
          // would read as an empty line.
          cell: (line) =>
            line.litres === null || line.litres === undefined ? (
              <span className="dim">—</span>
            ) : (
              decimal(Number(line.litres), 1)
            ),
        },
        { label: 'Remarks', cell: (line) => line.remarks || '—', dim: true, width: '13%' },
      ]}
    />
  );
}

/** What the floor declared into the warehouse today, and what each load held. */
export function AllocatedDrill({
  warehouse,
  allocated,
  onClose,
}: {
  warehouse: string;
  allocated: Board['warehouse']['allocated'];
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();

  return (
    <OpsDrill
      title="Allocated stock"
      subtitle={`Declared by the production floor into ${warehouse} today — open one for its items`}
      domain="warehouse"
      onClose={onClose}
      stats={[
        { label: 'Consignments', value: whole(allocated.movements) },
        { label: 'Pieces', value: whole(allocated.pieces) },
        { label: 'Litres', value: whole(allocated.litres) },
      ]}
      rows={allocated.rows}
      rowKey={(row) => String(row.id)}
      empty="The floor has declared nothing into this warehouse today."
      loading={allocated.loading}
      onRowClick={(row) => toggle(String(row.id))}
      expandedKey={openKey}
      renderExpanded={(row) => <MovementLines movement={row} />}
      columns={[
        { label: 'Entry', cell: (row) => row.entry_no },
        { label: 'From', cell: (row) => row.from_warehouse, dim: true },
        { label: 'To', cell: (row) => row.destination_display, dim: true },
        { label: 'Vehicle', cell: (row) => row.vehicle_no || '—' },
        { label: 'Reference', cell: (row) => row.reference || '—', dim: true },
        { label: 'Items', cell: (row) => whole(row.line_count ?? 0), numeric: true },
        { label: 'Pieces', cell: (row) => whole(row.total_pieces), numeric: true },
        { label: 'Litres', cell: (row) => whole(Number(row.total_litres)), numeric: true },
        { label: 'Date', cell: (row) => shortDate(row.movement_date), dim: true },
      ]}
    />
  );
}
