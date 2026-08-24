import { Plus, Trash2 } from 'lucide-react';

import { Badge, Button, Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';

import type { ExpenseCodeOption, ExtraCharge } from '../types';

interface ExtraChargesSectionProps {
  charges: ExtraCharge[];
  onChange: (charges: ExtraCharge[]) => void;
  disabled?: boolean;
  expenseCodeOptions?: ExpenseCodeOption[];
}

const expenseCodeLabel = (option: ExpenseCodeOption) =>
  `${option.expense_code} - ${option.expense_name}`;

// A charge copied from the PO's own freight line. Purchase already chose the
// expense code and tax code, so those are shown rather than asked for — the
// codes are SAP master data and differ per company, and a GRPO operator has no
// way to know which one applies.
const isFromPO = (charge: ExtraCharge) => charge.base_doc_entry !== undefined;

const formatAmount = (value: number) =>
  value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ExtraChargesSection({
  charges,
  onChange,
  disabled,
  expenseCodeOptions = [],
}: ExtraChargesSectionProps) {
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

  const prefilledCount = charges.filter(isFromPO).length;

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

      {prefilledCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {prefilledCount} charge(s) came from the purchase order. The expense and tax codes are
          set by purchase — edit the amount only if this receipt carries part of the charge.
        </p>
      )}

      {charges.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No extra charges on the purchase order. Click "Add Charge" for anything billed only on
          this receipt.
        </p>
      )}

      {charges.map((charge, index) => {
        const fromPO = isFromPO(charge);
        return (
          <div
            key={
              fromPO ? `po-${charge.base_doc_entry}-${charge.base_doc_line}` : `manual-${index}`
            }
            className="grid grid-cols-2 gap-2 p-3 rounded-md border bg-muted/20 sm:grid-cols-5 sm:items-end"
          >
            <div className="space-y-1">
              <Label className="text-xs">Expense</Label>
              {fromPO ? (
                <div className="flex h-8 items-center gap-1.5 text-sm">
                  <span className="truncate font-medium" title={charge.expense_name}>
                    {charge.expense_name || `Expense ${charge.expense_code}`}
                  </span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    From PO
                  </Badge>
                </div>
              ) : expenseCodeOptions.length > 0 ? (
                <NativeSelect
                  value={charge.expense_code ? String(charge.expense_code) : ''}
                  onChange={(e) =>
                    updateCharge(index, 'expense_code', parseInt(e.target.value, 10) || 0)
                  }
                  placeholder="Select expense"
                  className="h-8 text-sm"
                  disabled={disabled}
                >
                  {expenseCodeOptions.map((option) => (
                    <SelectOption key={option.expense_code} value={String(option.expense_code)}>
                      {expenseCodeLabel(option)}
                    </SelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={charge.expense_code || ''}
                  onChange={(e) =>
                    updateCharge(index, 'expense_code', parseInt(e.target.value, 10) || 0)
                  }
                  placeholder="SAP code"
                  className="h-8 text-sm"
                  disabled={disabled}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                min={0.01}
                step="any"
                value={charge.amount || ''}
                onChange={(e) => updateCharge(index, 'amount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="h-8 text-sm"
                disabled={disabled}
              />
              {/* Flag a split charge so a part-receipt does not silently bill the
                  whole PO amount (or leave the balance behind unnoticed). */}
              {fromPO &&
                charge.po_line_amount !== undefined &&
                charge.po_line_amount !== charge.amount && (
                  <p className="text-[10px] text-muted-foreground">
                    PO total {formatAmount(charge.po_line_amount)}
                  </p>
                )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Input
                value={charge.remarks || ''}
                onChange={(e) => updateCharge(index, 'remarks', e.target.value)}
                placeholder={fromPO ? charge.source_po_number || 'e.g. Freight' : 'e.g. Freight'}
                className="h-8 text-sm"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tax Code</Label>
              {fromPO ? (
                <div className="flex h-8 items-center text-sm text-muted-foreground">
                  {charge.tax_code || '—'}
                </div>
              ) : (
                <Input
                  value={charge.tax_code || ''}
                  onChange={(e) => updateCharge(index, 'tax_code', e.target.value)}
                  placeholder="e.g. GST18"
                  className="h-8 text-sm"
                  disabled={disabled}
                />
              )}
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCharge(index)}
                disabled={disabled}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title={
                  fromPO
                    ? 'Remove this PO charge from the receipt'
                    : 'Remove this charge'
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
