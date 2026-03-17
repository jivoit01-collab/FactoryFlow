import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import type { MaterialUsage } from '../types';

interface MaterialConsumptionTableProps {
  materials: MaterialUsage[];
  onAdd?: () => void;
  onEdit?: (m: MaterialUsage) => void;
  readOnly?: boolean;
}

export function MaterialConsumptionTable({ materials, onAdd, onEdit, readOnly }: MaterialConsumptionTableProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Material Consumption</h3>
        {!readOnly && onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Material
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium">Code</th>
              <th className="text-left p-2 font-medium">Material</th>
              <th className="text-right p-2 font-medium">Opening</th>
              <th className="text-right p-2 font-medium">Issued</th>
              <th className="text-right p-2 font-medium">Closing</th>
              <th className="text-right p-2 font-medium">Wastage</th>
              <th className="text-left p-2 font-medium">UoM</th>
              <th className="text-center p-2 font-medium">Batch</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => onEdit?.(m)}>
                <td className="p-2 font-mono text-xs">{m.material_code}</td>
                <td className="p-2">{m.material_name}</td>
                <td className="p-2 text-right">{m.opening_qty}</td>
                <td className="p-2 text-right">{m.issued_qty}</td>
                <td className="p-2 text-right">{m.closing_qty}</td>
                <td className="p-2 text-right font-medium text-red-600">{m.wastage_qty}</td>
                <td className="p-2">{m.uom}</td>
                <td className="p-2 text-center">{m.batch_number}</td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No materials recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
