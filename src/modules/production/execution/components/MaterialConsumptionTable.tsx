import { Pencil } from 'lucide-react';
import { useState } from 'react';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import type { MaterialUsage } from '../types';

interface MaterialConsumptionTableProps {
  materials: MaterialUsage[];
  onUpdateClosingQty?: (materialId: number, closingQty: string) => void;
  readOnly?: boolean;
  actualProduction?: number;
  requiredQty?: number;
}

const toNumber = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatQuantity = (value?: string | number) => toNumber(String(value ?? '0')).toFixed(3);
const formatPercentage = (value?: string) => toNumber(value).toFixed(2);

function getConsumptionValues(material: MaterialUsage) {
  const bomQuantity = material.bom_quantity ?? material.opening_qty;
  const wastageQuantity = material.wastage_quantity ?? '0';
  const wastagePercentage = material.wastage_percentage
    ?? (toNumber(bomQuantity) > 0
      ? ((toNumber(wastageQuantity) / toNumber(bomQuantity)) * 100).toString()
      : '0');
  const finalConsumptionQuantity = material.final_consumption_quantity
    ?? (toNumber(bomQuantity) + toNumber(wastageQuantity)).toString();

  return {
    bomQuantity,
    wastageQuantity,
    wastagePercentage,
    finalConsumptionQuantity,
  };
}

function calcExpectedClosing(m: MaterialUsage, actualProduction: number, requiredQty: number): number | null {
  if (requiredQty <= 0) return null;
  const opening = toNumber(m.opening_qty);
  const bomQuantity = toNumber(m.bom_quantity ?? m.opening_qty);
  const expectedConsumed = (actualProduction / requiredQty) * bomQuantity;
  return opening - expectedConsumed;
}

function getWarehouseApprovalDisplay(m: MaterialUsage) {
  if (!m.warehouse_request_id) {
    return {
      className: 'bg-slate-50 dark:bg-muted/40 text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border',
      detail: '',
      label: 'Not Requested',
    };
  }

  if (!m.warehouse_line_status) {
    return {
      className: 'bg-slate-50 dark:bg-muted/40 text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border',
      detail: 'Not in request',
      label: m.warehouse_request_status?.replace(/_/g, ' ') ?? 'Submitted',
    };
  }

  const requested = parseFloat(m.warehouse_requested_qty || m.opening_qty || '0');
  const approved = parseFloat(m.warehouse_approved_qty || '0');
  const qtyDetail = m.warehouse_line_status === 'PENDING'
    ? ''
    : `${approved.toLocaleString()} / ${requested.toLocaleString()} ${m.uom}`;

  if (m.warehouse_line_status === 'REJECTED') {
    return {
      className: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
      detail: qtyDetail,
      label: 'Rejected',
    };
  }

  if (m.warehouse_line_status === 'PENDING') {
    return {
      className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
      detail: '',
      label: 'Pending',
    };
  }

  if (approved < requested) {
    return {
      className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
      detail: qtyDetail,
      label: 'Partially Approved',
    };
  }

  return {
    className: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
    detail: qtyDetail,
    label: 'Approved',
  };
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
  const editingConsumption = editingMaterial ? getConsumptionValues(editingMaterial) : null;

  const canCalcExpected = actualProduction != null && actualProduction > 0 && requiredQty != null && requiredQty > 0;
  const showExpected = canCalcExpected;
  const columnCount = 9 + (showExpected ? 1 : 0) + (!readOnly && onUpdateClosingQty ? 1 : 0);

  const openEdit = (m: MaterialUsage) => {
    setEditingMaterial(m);
    const existing = m.closing_qty && toNumber(m.closing_qty) > 0 ? m.closing_qty : '';
    if (existing) {
      setClosingValue(existing);
    } else if (canCalcExpected) {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Material Consumption</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium">Code</th>
              <th className="text-left p-2 font-medium">Material</th>
              <th className="text-left p-2 font-medium">Warehouse Approval</th>
              <th className="text-right p-2 font-medium">BOM Qty</th>
              <th className="text-right p-2 font-medium">Wastage %</th>
              <th className="text-right p-2 font-medium">Wastage Qty</th>
              <th className="text-right p-2 font-medium">Final Consumption</th>
              {showExpected && <th className="text-right p-2 font-medium">Expected Closing</th>}
              <th className="text-right p-2 font-medium">Closing</th>
              <th className="text-left p-2 font-medium">UoM</th>
              {!readOnly && onUpdateClosingQty && <th className="p-2 w-10" />}
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              const closingEmpty = !m.closing_qty || toNumber(m.closing_qty) === 0;
              const expected = showExpected ? calcExpectedClosing(m, actualProduction!, requiredQty!) : null;
              const consumption = getConsumptionValues(m);
              const approval = getWarehouseApprovalDisplay(m);

              return (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="p-2 font-mono text-xs">{m.material_code}</td>
                  <td className="p-2">{m.material_name}</td>
                  <td className="p-2">
                    <Badge variant="outline" className={approval.className}>
                      {approval.label}
                    </Badge>
                    {approval.detail && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {approval.detail}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-right">{formatQuantity(consumption.bomQuantity)}</td>
                  <td className="p-2 text-right">{formatPercentage(consumption.wastagePercentage)}%</td>
                  <td className="p-2 text-right text-red-600 dark:text-red-400">
                    {formatQuantity(consumption.wastageQuantity)}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {formatQuantity(consumption.finalConsumptionQuantity)}
                  </td>
                  {showExpected && (
                    <td className="p-2 text-right text-muted-foreground">
                      {expected != null ? expected.toFixed(3) : '-'}
                    </td>
                  )}
                  <td className="p-2 text-right">
                    {closingEmpty ? (
                      <span className="text-amber-600 dark:text-amber-400 italic text-xs">Not entered</span>
                    ) : (
                      formatQuantity(m.closing_qty)
                    )}
                  </td>
                  <td className="p-2">{m.uom}</td>
                  {!readOnly && onUpdateClosingQty && (
                    <td className="p-2">
                      <button
                        type="button"
                        title="Edit closing quantity"
                        onClick={() => openEdit(m)}
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {materials.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="p-4 text-center text-muted-foreground">
                  No materials recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editingMaterial} onOpenChange={(open) => { if (!open) setEditingMaterial(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Material</DialogTitle></DialogHeader>
          {editingMaterial && editingConsumption && (() => {
            const expected = canCalcExpected
              ? calcExpectedClosing(editingMaterial, actualProduction!, requiredQty!)
              : null;

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
                    <span className="text-muted-foreground">BOM Qty</span>
                    <p className="font-medium">{formatQuantity(editingConsumption.bomQuantity)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Wastage Qty</span>
                    <p className="font-medium">{formatQuantity(editingConsumption.wastageQuantity)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Final Consumption</span>
                    <p className="font-medium">{formatQuantity(editingConsumption.finalConsumptionQuantity)}</p>
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
