import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from '@/shared/components/ui';
import type { MaterialUsage } from '../types';

interface MaterialConsumptionTableProps {
  materials: MaterialUsage[];
  onUpdateClosingQty?: (materialId: number, closingQty: string) => void;
  readOnly?: boolean;
  /** Actual production cases (from segments or final total) */
  actualProduction?: number;
  /** BOM target quantity (required_qty on the run) */
  requiredQty?: number;
}

function calcExpectedClosing(m: MaterialUsage, actualProduction: number, requiredQty: number): number | null {
  if (requiredQty <= 0) return null;
  const opening = parseFloat(m.opening_qty || '0');
  const issued = parseFloat(m.issued_qty || '0');
  const expectedConsumed = (actualProduction / requiredQty) * opening;
  return opening + issued - expectedConsumed;
}

export function MaterialConsumptionTable({
  materials,
  onUpdateClosingQty,
  readOnly,
  actualProduction,
  requiredQty,
}: MaterialConsumptionTableProps) {
  const [editingMaterial, setEditingMaterial] = useState<MaterialUsage | null>(null);
  const [closingValue, setClosingValue] = useState('');

  const canCalcExpected = actualProduction != null && actualProduction > 0 && requiredQty != null && requiredQty > 0;

  const openEdit = (m: MaterialUsage) => {
    setEditingMaterial(m);
    const existing = m.closing_qty && parseFloat(m.closing_qty) > 0 ? m.closing_qty : '';
    if (existing) {
      setClosingValue(existing);
    } else if (canCalcExpected) {
      // Auto-fill with expected closing
      const expected = calcExpectedClosing(m, actualProduction!, requiredQty!);
      setClosingValue(expected != null && expected >= 0 ? expected.toFixed(3) : '');
    } else {
      setClosingValue('');
    }
  };

  const handleSave = () => {
    if (editingMaterial && closingValue.trim() && onUpdateClosingQty) {
      onUpdateClosingQty(editingMaterial.id, closingValue.trim());
    }
    setEditingMaterial(null);
    setClosingValue('');
  };

  const showExpected = canCalcExpected;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Material Consumption</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium">Code</th>
              <th className="text-left p-2 font-medium">Material</th>
              <th className="text-right p-2 font-medium">Opening</th>
              <th className="text-right p-2 font-medium">Issued</th>
              {showExpected && <th className="text-right p-2 font-medium">Expected Closing</th>}
              <th className="text-right p-2 font-medium">Closing</th>
              <th className="text-left p-2 font-medium">UoM</th>
              {!readOnly && onUpdateClosingQty && <th className="p-2 w-10" />}
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              const closingEmpty = !m.closing_qty || parseFloat(m.closing_qty) === 0;
              const expected = showExpected ? calcExpectedClosing(m, actualProduction!, requiredQty!) : null;
              return (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="p-2 font-mono text-xs">{m.material_code}</td>
                  <td className="p-2">{m.material_name}</td>
                  <td className="p-2 text-right">{m.opening_qty}</td>
                  <td className="p-2 text-right">{m.issued_qty}</td>
                  {showExpected && (
                    <td className="p-2 text-right text-muted-foreground">
                      {expected != null ? expected.toFixed(3) : '-'}
                    </td>
                  )}
                  <td className="p-2 text-right">
                    {closingEmpty ? (
                      <span className="text-amber-600 dark:text-amber-400 italic text-xs">Not entered</span>
                    ) : (
                      m.closing_qty
                    )}
                  </td>
                  <td className="p-2">{m.uom}</td>
                  {!readOnly && onUpdateClosingQty && (
                    <td className="p-2">
                      <button onClick={() => openEdit(m)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {materials.length === 0 && (
              <tr><td colSpan={showExpected ? 8 : 7} className="p-4 text-center text-muted-foreground">No materials recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Material Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={(open) => { if (!open) setEditingMaterial(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Closing Qty</DialogTitle></DialogHeader>
          {editingMaterial && (() => {
            const expected = canCalcExpected ? calcExpectedClosing(editingMaterial, actualProduction!, requiredQty!) : null;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Code</span>
                    <p className="font-medium font-mono">{editingMaterial.material_code}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Material</span>
                    <p className="font-medium">{editingMaterial.material_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Opening Qty</span>
                    <p className="font-medium">{editingMaterial.opening_qty}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Issued Qty</span>
                    <p className="font-medium">{editingMaterial.issued_qty}</p>
                  </div>
                  {expected != null && (
                    <div>
                      <span className="text-muted-foreground">Expected Closing</span>
                      <p className="font-medium text-blue-600">{expected.toFixed(3)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">UoM</span>
                    <p className="font-medium">{editingMaterial.uom}</p>
                  </div>
                </div>
                <div>
                  <Label>Actual Closing Qty</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={closingValue}
                    onChange={(e) => setClosingValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder={expected != null ? `Expected: ${expected.toFixed(3)}` : 'Enter closing quantity'}
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingMaterial(null)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={!closingValue.trim()}>Save</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
