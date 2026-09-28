/**
 * One SAP budget, read-only — what someone with only the view right sees when
 * they open a budget from the list. The list row has no lines, so the budget is
 * read from SAP (`useBudget`) when the dialog opens.
 */
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import { type Budget, useBudget } from '../api';
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
        <BudgetLines row={budget} />
      </DialogContent>
    </Dialog>
  );
}

function BudgetLines({ row }: { row: Budget }) {
  const detail = useBudget(row.doc_entry);
  const budget = detail.data ?? row;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Budget {budget.doc_num ?? budget.doc_entry}</DialogTitle>
        <DialogDescription>
          {budget.budget}
          {budget.sub_budget && ` · sub-budget ${budget.sub_budget}`}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        {!detail.data ? (
          <p className="text-sm text-muted-foreground">
            {detail.isError ? 'SAP could not be read.' : 'Reading the months from SAP…'}
          </p>
        ) : (
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
        )}
      </DialogBody>
    </>
  );
}
