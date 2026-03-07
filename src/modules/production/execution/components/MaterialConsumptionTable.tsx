import { useMemo } from 'react';

import { cn } from '@/shared/utils';
import { Input } from '@/shared/components/ui';

import { STANDARD_MATERIALS } from '../constants';
import type { CreateMaterialUsageRequest, ProductionMaterialUsage } from '../types';

interface MaterialConsumptionTableProps {
  materials: ProductionMaterialUsage[];
  batchNumber: number;
  disabled?: boolean;
  onSave: (data: CreateMaterialUsageRequest[]) => void;
}

export function MaterialConsumptionTable({
  materials,
  batchNumber,
  disabled = false,
  onSave,
}: MaterialConsumptionTableProps) {
  const rows = useMemo(() => {
    return STANDARD_MATERIALS.map((name) => {
      const existing = materials.find(
        (m) => m.material_name === name && m.batch_number === batchNumber,
      );
      const opening = Number(existing?.opening_qty ?? 0);
      const issued = Number(existing?.issued_qty ?? 0);
      const closing = Number(existing?.closing_qty ?? 0);
      const wastage = opening + issued - closing;
      return {
        name,
        opening,
        issued,
        closing,
        wastage: Math.max(0, wastage),
        existingId: existing?.id,
      };
    });
  }, [materials, batchNumber]);

  const handleChange = (
    materialName: string,
    field: 'opening' | 'issued' | 'closing',
    value: number,
  ) => {
    const updated = rows.map((row) =>
      row.name === materialName ? { ...row, [field]: value } : row,
    );
    onSave(
      updated.map((row) => ({
        material_name: row.name,
        opening_qty: row.opening,
        issued_qty: row.issued,
        closing_qty: row.closing,
        batch_number: batchNumber,
      })),
    );
  };

  const totalWastage = rows.reduce((sum, r) => sum + r.wastage, 0);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2.5 text-left font-medium">Material</th>
            <th className="w-32 px-3 py-2.5 text-right font-medium">Opening Qty</th>
            <th className="w-32 px-3 py-2.5 text-right font-medium">Issue Qty</th>
            <th className="w-32 px-3 py-2.5 text-right font-medium">Closing Qty</th>
            <th className="w-32 px-3 py-2.5 text-right font-medium">Wastage Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = row.opening + row.issued;
            const wastePct = total > 0 ? (row.wastage / total) * 100 : 0;
            const isHighWaste = wastePct > 2;

            return (
              <tr key={row.name} className="border-b last:border-0">
                <td className="px-3 py-1.5 font-medium text-muted-foreground bg-muted/30">
                  {row.name}
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    type="number"
                    min={0}
                    value={row.opening || ''}
                    disabled={disabled}
                    placeholder="0"
                    className="h-8 text-right font-mono text-xs w-full"
                    onChange={(e) =>
                      handleChange(row.name, 'opening', parseInt(e.target.value) || 0)
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    type="number"
                    min={0}
                    value={row.issued || ''}
                    disabled={disabled}
                    placeholder="0"
                    className="h-8 text-right font-mono text-xs w-full"
                    onChange={(e) =>
                      handleChange(row.name, 'issued', parseInt(e.target.value) || 0)
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    type="number"
                    min={0}
                    value={row.closing || ''}
                    disabled={disabled}
                    placeholder="0"
                    className="h-8 text-right font-mono text-xs w-full"
                    onChange={(e) =>
                      handleChange(row.name, 'closing', parseInt(e.target.value) || 0)
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <div
                    className={cn(
                      'h-8 flex items-center justify-end px-3 rounded-md border bg-muted/50 font-mono text-xs font-bold',
                      isHighWaste ? 'text-red-600' : row.wastage > 0 ? 'text-green-600' : '',
                    )}
                  >
                    {row.wastage.toLocaleString()}
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="bg-blue-50 dark:bg-blue-900/20 font-bold">
            <td className="px-3 py-2.5" colSpan={4}>
              TOTAL WASTAGE
            </td>
            <td className="px-3 py-2.5 text-right font-mono">
              {totalWastage.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
