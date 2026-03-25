import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { useLoadShipment } from '../api';
import type { ShipmentOrderItem } from '../types/dispatch.types';

interface LoadingFormProps {
  shipmentId: number;
  items: ShipmentOrderItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LoadingForm({ shipmentId, items, open, onOpenChange }: LoadingFormProps) {
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const loadShipment = useLoadShipment(shipmentId);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Pre-fill with packed quantities
      const initial: Record<number, string> = {};
      items.forEach((item) => {
        initial[item.id] = item.packed_qty;
      });
      setQuantities(initial);
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const loadItems = items.map((item) => ({
      item_id: item.id,
      loaded_qty: quantities[item.id] ?? '0',
    }));

    loadShipment.mutate(
      { items: loadItems },
      {
        onSuccess: () => {
          toast.success('Loading recorded');
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message || 'Failed to record loading'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Truck</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Packed</th>
                  <th className="px-3 py-2 text-right font-medium">Load Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs">{item.item_code}</div>
                      <div className="text-xs text-muted-foreground">{item.item_name}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.packed_qty}</td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={quantities[item.id] ?? ''}
                        onChange={(e) =>
                          setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="h-8 w-28 text-right ml-auto"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loadShipment.isPending}>
              {loadShipment.isPending ? 'Loading...' : 'Confirm Loading'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
