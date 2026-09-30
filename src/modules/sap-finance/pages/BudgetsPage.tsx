/**
 * Budgets — SAP's BUDGET user-defined object, read and edited here.
 *
 * Ported from SAP Portal's budget page. Each budget is a head (cost dimension
 * 3), an optional sub-budget (dimension 4) and a fixed plus a variable amount
 * per month. Changes go straight to SAP; the log below records who made each
 * one from this app, because SAP stamps only the shared service account.
 *
 * Buttons that write show only with `can_manage_sap_budgets`, the right those
 * endpoints check.
 */
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SAP_FINANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { confirmSapPost } from '@/shared/components';
import {
  PageHeader,
  PageSection,
  ROW_CLASSES,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button } from '@/shared/components/ui';
import { formatDateTimeShort } from '@/shared/utils';

import { type Budget, useBudgetChanges, useBudgets, useDeleteBudget, useFetchBudget } from '../api';
import { BudgetEditorDialog } from '../components/BudgetEditorDialog';
import { BudgetViewDialog } from '../components/BudgetViewDialog';
import { money, monthLabel, sapDate } from '../utils/format';

function monthsCovered(budget: Budget): string {
  const months = budget.lines.map((line) => line.month).filter(Boolean).sort() as string[];
  if (months.length === 0) return '-';
  const first = monthLabel(months[0]);
  const last = monthLabel(months[months.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}

function total(budget: Budget): number {
  return budget.lines.reduce((sum, line) => sum + line.fixed_amount + line.variable_amount, 0);
}

const ACTION_TONE = { CREATE: 'done', UPDATE: 'info', DELETE: 'blocked' } as const;

export default function BudgetsPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(SAP_FINANCE_PERMISSIONS.MANAGE_BUDGETS);
  const budgets = useBudgets();
  const changes = useBudgetChanges();
  const remove = useDeleteBudget();
  const fetchBudget = useFetchBudget();
  const [editing, setEditing] = useState<Budget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const rows = budgets.data ?? [];

  const openEditor = (budget: Budget | null) => {
    setEditing(budget);
    setDialogOpen(true);
  };

  const confirmDelete = async (row: Budget) => {
    // The list row has no lines; read them so the confirmation shows what goes.
    let budget: Budget;
    try {
      budget = await fetchBudget(row.doc_entry);
    } catch {
      toast.error(`Budget ${row.doc_num ?? row.doc_entry} could not be read from SAP, so it was not deleted.`);
      return;
    }
    const ok = await confirmSapPost({
      title: `Delete budget ${budget.doc_num ?? budget.doc_entry} from SAP?`,
      description: 'The budget and all its month lines are removed from SAP. This cannot be undone from here.',
      details: [
        { label: 'Budget head', value: budget.budget },
        !!budget.sub_budget && { label: 'Sub-budget', value: budget.sub_budget },
        { label: 'Months', value: monthsCovered(budget) },
        { label: 'Total', value: money(total(budget)) },
      ],
      confirmLabel: 'Delete in SAP',
      destructive: true,
    });
    if (!ok) return;
    await remove.mutateAsync(budget.doc_entry);
    toast.success('Budget deleted from SAP');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Budgets">
        <Button variant="outline" onClick={() => budgets.refetch()} disabled={budgets.isFetching} aria-label="Reload budgets from SAP">
          <RefreshCw className={`mr-2 h-4 w-4 ${budgets.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        {canManage && (
          <Button onClick={() => openEditor(null)}>
            <Plus className="mr-2 h-4 w-4" />
            New budget
          </Button>
        )}
      </PageHeader>

      <TableCard summary={`${rows.length} ${rows.length === 1 ? 'budget' : 'budgets'}`}>
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>No.</Th>
              <Th>Budget head</Th>
              <Th>Sub-budget</Th>
              <Th>Created</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {budgets.isLoading ? (
              <TableLoading colSpan={5} />
            ) : rows.length === 0 ? (
              <TableEmpty colSpan={5} message={budgets.isError ? 'SAP could not be read' : 'No budgets in SAP yet'} />
            ) : (
              rows.map((budget) => (
                <tr key={budget.doc_entry} className={ROW_CLASSES}>
                  <Td numeric>{budget.doc_num ?? budget.doc_entry}</Td>
                  <Td className="font-medium">{budget.budget}</Td>
                  <Td>{budget.sub_budget || '-'}</Td>
                  <Td>{sapDate(budget.created_at)}</Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditor(budget)} aria-label={`Open budget ${budget.doc_entry}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(budget)}
                          disabled={remove.isPending}
                          aria-label={`Delete budget ${budget.doc_entry}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <PageSection title="Changes made from this app" description="Who created, edited or deleted which budget, newest first">
        <TableCard>
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th>When</Th>
                <Th>Change</Th>
                <Th>Budget</Th>
                <Th align="right">Lines</Th>
                <Th>By</Th>
              </tr>
            </thead>
            <tbody>
              {changes.isLoading ? (
                <TableLoading colSpan={5} />
              ) : (changes.data ?? []).length === 0 ? (
                <TableEmpty colSpan={5} message="No changes recorded yet" />
              ) : (
                (changes.data ?? []).map((change) => (
                  <tr key={change.id} className={ROW_CLASSES}>
                    <Td>{formatDateTimeShort(change.created_at)}</Td>
                    <Td>
                      <StatusPill tone={ACTION_TONE[change.action]} dot>
                        {change.action_label}
                      </StatusPill>
                    </Td>
                    <Td>
                      {change.budget_code || '-'}
                      {change.doc_entry && <span className="ml-1 text-xs text-muted-foreground">#{change.doc_entry}</span>}
                    </Td>
                    <Td numeric>{change.line_count}</Td>
                    <Td>{change.changed_by || '-'}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>
      </PageSection>

      {/* The dialog doubles as the read-only view for someone who can only look. */}
      {canManage ? (
        <BudgetEditorDialog open={dialogOpen} budget={editing} onOpenChange={setDialogOpen} />
      ) : (
        <BudgetViewDialog open={dialogOpen} budget={editing} onOpenChange={setDialogOpen} />
      )}
    </div>
  );
}
