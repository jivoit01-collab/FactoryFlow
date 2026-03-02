import { Plus, Trash2 } from 'lucide-react';

import { Button, Input, Label } from '@/shared/components/ui';

import type { ExtraCharge } from '../types';

interface ExtraChargesSectionProps {
  charges: ExtraCharge[];
  onChange: (charges: ExtraCharge[]) => void;
  disabled?: boolean;
}

export function ExtraChargesSection({ charges, onChange, disabled }: ExtraChargesSectionProps) {
  const addCharge = () => {
    onChange([...charges, { expense_code: 0, amount: 0, remarks: '', tax_code: '' }]);
  };

  const removeCharge = (index: number) => {
    onChange(charges.filter((_, i) => i !== index));
  };

  const updateCharge = (index: number, field: keyof ExtraCharge, value: string | number) => {
    const updated = charges.map((charge, i) => {
      if (i !== index) return charge;
      return { ...charge, [field]: value };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Extra Charges</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCharge}
          disabled={disabled}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Charge
        </Button>
      </div>

      {charges.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No extra charges. Click "Add Charge" to add freight, handling, or other expenses.
        </p>
      )}

      {charges.map((charge, index) => (
        <div
          key={index}
          className="grid grid-cols-2 gap-2 p-3 rounded-md border bg-muted/20 sm:grid-cols-5 sm:items-end"
        >
          <div className="space-y-1">
            <Label className="text-xs">Expense Code</Label>
            <Input
              type="number"
              min={0}
              value={charge.expense_code || ''}
              onChange={(e) =>
                updateCharge(index, 'expense_code', parseInt(e.target.value) || 0)
              }
              placeholder="Code"
              className="h-8 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount</Label>
            <Input
              type="number"
              min={0}
              step="any"
              value={charge.amount || ''}
              onChange={(e) =>
                updateCharge(index, 'amount', parseFloat(e.target.value) || 0)
              }
              placeholder="0.00"
              className="h-8 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Remarks</Label>
            <Input
              value={charge.remarks || ''}
              onChange={(e) => updateCharge(index, 'remarks', e.target.value)}
              placeholder="e.g. Freight"
              className="h-8 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tax Code</Label>
            <Input
              value={charge.tax_code || ''}
              onChange={(e) => updateCharge(index, 'tax_code', e.target.value)}
              placeholder="e.g. GST18"
              className="h-8 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCharge(index)}
              disabled={disabled}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
