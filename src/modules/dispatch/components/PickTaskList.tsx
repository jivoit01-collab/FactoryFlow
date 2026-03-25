import { CheckCircle2, Loader2, MinusCircle, RotateCcw, ScanBarcode } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button, Input } from '@/shared/components/ui';

import { useScanBarcode, useUpdatePickTask } from '../api';
import type { PickTask } from '../types/dispatch.types';

const TASK_STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-600 dark:text-yellow-400',
  IN_PROGRESS: 'text-blue-600 dark:text-blue-400',
  COMPLETED: 'text-green-600 dark:text-green-400',
  SHORT: 'text-red-600 dark:text-red-400',
};

interface PickTaskListProps {
  shipmentId: number;
  tasks: PickTask[];
}

export default function PickTaskList({ shipmentId, tasks }: PickTaskListProps) {
  const [scanInput, setScanInput] = useState<Record<number, string>>({});
  const [qtyInput, setQtyInput] = useState<Record<number, string>>({});
  const [editingQty, setEditingQty] = useState<number | null>(null);
  const updateTask = useUpdatePickTask(shipmentId);
  const scanBarcode = useScanBarcode(shipmentId);

  const handleStartPick = (task: PickTask) => {
    // Pre-fill with full qty and show the quantity input
    setQtyInput((prev) => ({ ...prev, [task.id]: task.pick_qty }));
    setEditingQty(task.id);
  };

  const handleConfirmQty = (task: PickTask) => {
    const qty = parseFloat(qtyInput[task.id] ?? '0');
    const required = parseFloat(task.pick_qty);

    if (qty < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    if (qty === 0) {
      // Zero means fully short
      updateTask.mutate(
        { taskId: task.id, data: { status: 'SHORT', actual_qty: '0' } },
        {
          onSuccess: () => {
            toast.success(`Marked short: ${task.item_code}`);
            setEditingQty(null);
          },
          onError: (err) => toast.error(err.message || 'Failed to update task'),
        },
      );
    } else if (qty < required) {
      // Partial pick — mark as SHORT with partial qty
      updateTask.mutate(
        { taskId: task.id, data: { status: 'SHORT', actual_qty: String(qty) } },
        {
          onSuccess: () => {
            toast.success(`Partial pick: ${qty} of ${required} — ${task.item_code}`);
            setEditingQty(null);
          },
          onError: (err) => toast.error(err.message || 'Failed to update task'),
        },
      );
    } else {
      // Full pick or more
      updateTask.mutate(
        { taskId: task.id, data: { status: 'COMPLETED', actual_qty: String(qty) } },
        {
          onSuccess: () => {
            toast.success(`Task completed: ${task.item_code}`);
            setEditingQty(null);
          },
          onError: (err) => toast.error(err.message || 'Failed to update task'),
        },
      );
    }
  };

  const handleShort = (task: PickTask) => {
    updateTask.mutate(
      { taskId: task.id, data: { status: 'SHORT', actual_qty: '0' } },
      {
        onSuccess: () => toast.success(`Marked fully short: ${task.item_code}`),
        onError: (err) => toast.error(err.message || 'Failed to update task'),
      },
    );
  };

  const handleUndo = (task: PickTask) => {
    updateTask.mutate(
      { taskId: task.id, data: { status: 'PENDING', actual_qty: '0' } },
      {
        onSuccess: () => toast.success(`Task reset: ${task.item_code}`),
        onError: (err) => toast.error(err.message || 'Failed to reset task'),
      },
    );
  };

  const handleScan = (taskId: number) => {
    const barcode = scanInput[taskId];
    if (!barcode) return;
    scanBarcode.mutate(
      { taskId, data: { barcode } },
      {
        onSuccess: () => {
          toast.success('Barcode scanned');
          setScanInput((prev) => ({ ...prev, [taskId]: '' }));
        },
        onError: (err) => toast.error(err.message || 'Scan failed'),
      },
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-sm text-muted-foreground border rounded-lg">
        No pick tasks
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const isComplete = task.status === 'COMPLETED' || task.status === 'SHORT';
        const isEditingThis = editingQty === task.id;

        return (
          <div
            key={task.id}
            className="rounded-lg border bg-card p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-medium">{task.item_code}</span>
                <span className="text-sm text-muted-foreground truncate">{task.item_name}</span>
              </div>
              <span className={`text-xs font-medium ${TASK_STATUS_COLORS[task.status] ?? ''}`}>
                {task.status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Location: <strong>{task.pick_location}</strong></span>
              <span>Qty: <strong>{task.pick_qty}</strong></span>
              {task.actual_qty !== '0.000' && task.actual_qty !== '0' && (
                <span>
                  Actual: <strong className={
                    parseFloat(task.actual_qty) < parseFloat(task.pick_qty)
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }>{task.actual_qty}</strong>
                </span>
              )}
              {task.assigned_to_name && (
                <span>Assigned: <strong>{task.assigned_to_name}</strong></span>
              )}
            </div>

            {/* Completed/Short — show undo */}
            {isComplete && (
              <div className="flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => handleUndo(task)}
                  disabled={updateTask.isPending}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Undo
                </Button>
              </div>
            )}

            {/* Active — show scan + actions */}
            {!isComplete && !isEditingThis && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <ScanBarcode className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={scanInput[task.id] ?? ''}
                    onChange={(e) =>
                      setScanInput((prev) => ({ ...prev, [task.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && handleScan(task.id)}
                    placeholder="Scan barcode..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => handleScan(task.id)}
                  disabled={!scanInput[task.id] || scanBarcode.isPending}
                >
                  {scanBarcode.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Scan'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-green-600"
                  onClick={() => handleStartPick(task)}
                  disabled={updateTask.isPending}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Pick
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-red-600"
                  onClick={() => handleShort(task)}
                  disabled={updateTask.isPending}
                >
                  <MinusCircle className="h-3 w-3 mr-1" />
                  Short
                </Button>
              </div>
            )}

            {/* Quantity confirmation row */}
            {!isComplete && isEditingThis && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Actual qty:
                </span>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={qtyInput[task.id] ?? ''}
                  onChange={(e) =>
                    setQtyInput((prev) => ({ ...prev, [task.id]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmQty(task)}
                  className="h-8 w-32 text-sm text-right"
                  autoFocus
                />
                <span className="text-xs text-muted-foreground">
                  / {task.pick_qty}
                </span>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8"
                  onClick={() => handleConfirmQty(task)}
                  disabled={updateTask.isPending}
                >
                  {updateTask.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Confirm'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setEditingQty(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
