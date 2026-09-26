import {
  ROW_CLASSES,
  StatusPill,
  TABLE_CLASSES,
  TableEmpty,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';

/** A line to show: a tree SAP holds, or a request's asked-for lines. */
export interface ShownLine {
  item_type: string;
  item_code: string;
  item_name: string;
  quantity: number | string;
  warehouse: string;
  issue_method: string;
  unit_cost?: number | string;
  comment?: string;
  uom?: string;
}

const TYPE_TONE = { item: 'neutral', resource: 'info', text: 'warn' } as const;

function quantity(value: number | string): string {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString('en-IN', { maximumFractionDigits: 6 })
    : String(value);
}

/** Components and resources, read-only, in SAP's order. */
export function BomLinesTable({
  lines,
  showCost = true,
}: {
  lines: readonly ShownLine[];
  showCost?: boolean;
}) {
  const columns = showCost ? 8 : 7;
  return (
    <table className={TABLE_CLASSES}>
      <thead className={THEAD_CLASSES}>
        <tr>
          <Th>#</Th>
          <Th>Type</Th>
          <Th>Code</Th>
          <Th>Name</Th>
          <Th align="right">Quantity</Th>
          <Th>Warehouse</Th>
          <Th>Issue</Th>
          {showCost && <Th align="right">Unit cost</Th>}
        </tr>
      </thead>
      <tbody>
        {lines.length === 0 ? (
          <TableEmpty colSpan={columns} message="No lines" />
        ) : (
          lines.map((line, index) => (
            <tr key={`${line.item_code}-${index}`} className={ROW_CLASSES}>
              <Td className="text-muted-foreground">{index + 1}</Td>
              <Td>
                <StatusPill tone={TYPE_TONE[line.item_type as keyof typeof TYPE_TONE] ?? 'neutral'}>
                  {line.item_type === 'resource'
                    ? 'Resource'
                    : line.item_type === 'text'
                      ? 'Text'
                      : 'Item'}
                </StatusPill>
              </Td>
              <Td className="font-mono text-xs">{line.item_code || '—'}</Td>
              <Td>
                {line.item_name || (line.item_type === 'text' ? line.comment : '—')}
                {line.comment && line.item_type !== 'text' && (
                  <span className="block text-xs text-muted-foreground">{line.comment}</span>
                )}
              </Td>
              <Td numeric>
                {quantity(line.quantity)}
                {line.uom && <span className="ml-1 text-xs text-muted-foreground">{line.uom}</span>}
              </Td>
              <Td>{line.warehouse || '—'}</Td>
              <Td>{line.item_type === 'text' ? '—' : line.issue_method}</Td>
              {showCost && (
                <Td numeric>
                  {Number(line.unit_cost) > 0 ? Number(line.unit_cost).toFixed(2) : '—'}
                </Td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
