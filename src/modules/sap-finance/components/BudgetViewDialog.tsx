/**
 * One SAP budget, read-only — what someone with only the view right sees when
 * they open a budget from the list.
 */
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import type { Budget } from '../api';
import { money, monthLabel } from '../utils/format';

export function BudgetViewDialog({
  open,
  budget,
  onOpenChange,
}: {
  open: boolean;
  budget: Budget | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!budget) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[90vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Budget {budget.doc_num ?? budget.doc_entry}</DialogTitle>
          <DialogDescription>
            {budget.budget}
            {budget.sub_budget && ` · sub-budget ${budget.sub_budget}`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">Month</th>
                <th className="py-1 text-right font-medium">Fixed</th>
                <th className="py-1 text-right font-medium">Variable</th>
                <th className="py-1 text-left font-medium">Sub-budget</th>
              </tr>
            </thead>
            <tbody>
              {budget.lines.map((line, index) => (
                <tr key={line.line_id ?? index} className="border-t">
                  <td className="py-1">{monthLabel(line.month)}</td>
                  <td className="py-1 text-right tabular-nums">{money(line.fixed_amount)}</td>
                  <td className="py-1 text-right tabular-nums">{money(line.variable_amount)}</td>
                  <td className="py-1">{line.sub_budget || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
