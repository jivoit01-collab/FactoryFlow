import type { PickTask, ShipmentOrderItem } from '../types/dispatch.types';

interface ShipmentItemsTableProps {
  items: ShipmentOrderItem[];
  pickTasks?: PickTask[];
}

const PICK_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  PICKED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  SHORT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function ShipmentItemsTable({ items, pickTasks = [] }: ShipmentItemsTableProps) {
  // Build a map of item_code → sum of actual_qty from pick tasks
  const pickedByItem = pickTasks.reduce<Record<string, { qty: number; allDone: boolean; hasShort: boolean }>>(
    (acc, task) => {
      const key = task.item_code;
      if (!acc[key]) acc[key] = { qty: 0, allDone: true, hasShort: false };
      const actual = parseFloat(task.actual_qty) || 0;
      acc[key].qty += actual;
      if (task.status === 'PENDING' || task.status === 'IN_PROGRESS') acc[key].allDone = false;
      if (task.status === 'SHORT') acc[key].hasShort = true;
      return acc;
    },
    {},
  );

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-sm text-muted-foreground border rounded-lg">
        No items
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">Item Code</th>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-right font-medium">Ordered</th>
            <th className="px-3 py-2 text-right font-medium">Picked</th>
            <th className="px-3 py-2 text-right font-medium">Packed</th>
            <th className="px-3 py-2 text-right font-medium">Loaded</th>
            <th className="px-3 py-2 text-center font-medium">UOM</th>
            <th className="px-3 py-2 text-center font-medium">Pick Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const taskInfo = pickedByItem[item.item_code];
            // Use pick task actual qty if available, otherwise use backend picked_qty
            const displayPickedQty = taskInfo
              ? taskInfo.qty.toFixed(3)
              : item.picked_qty;
            // Determine effective pick status from tasks if available
            const effectivePickStatus = taskInfo
              ? taskInfo.hasShort
                ? 'SHORT'
                : taskInfo.allDone
                  ? 'PICKED'
                  : 'PENDING'
              : item.pick_status;

            return (
              <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{item.item_code}</td>
                <td className="px-3 py-2">{item.item_name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{item.ordered_qty}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span className={
                    taskInfo && taskInfo.qty > 0 && taskInfo.qty < parseFloat(item.ordered_qty)
                      ? 'text-orange-600 dark:text-orange-400 font-medium'
                      : ''
                  }>
                    {displayPickedQty}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{item.packed_qty}</td>
                <td className="px-3 py-2 text-right tabular-nums">{item.loaded_qty}</td>
                <td className="px-3 py-2 text-center">{item.uom}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${PICK_STATUS_COLORS[effectivePickStatus] ?? ''}`}
                  >
                    {effectivePickStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
