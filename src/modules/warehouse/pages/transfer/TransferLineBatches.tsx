import type { TransferRequestLine } from '../../types';
import { qty } from './transferFormat';

/**
 * A request line's batches: what was sent to SAP once it is posted, what the
 * requester picked until then, and otherwise that posting will choose.
 */
export function TransferLineBatches({ line }: { line: TransferRequestLine }) {
  if (!line.is_batch_managed) return <span>not batch-tracked</span>;

  if (line.batch_allocation.length) {
    return (
      <>
        {line.batch_allocation.map((b) => (
          <div key={b.BatchNumber} className="tabular-nums">
            {b.BatchNumber} × {qty(b.Quantity)}
          </div>
        ))}
      </>
    );
  }

  const picked = line.chosen_batches ?? [];
  if (picked.length) {
    return (
      <>
        <div>picked when raised</div>
        {picked.map((b) => (
          <div key={b.batch_number} className="tabular-nums text-foreground">
            {b.batch_number} × {qty(b.quantity)}
          </div>
        ))}
      </>
    );
  }

  return <span>chosen at posting</span>;
}
