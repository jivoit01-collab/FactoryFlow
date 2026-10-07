import { Loader2, Save, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth/hooks/useAuth';
import type { ExpenseApprover, ExpenseClaim, SapGLAccount } from '@/modules/accounts/api';
import {
  useExpenseApprovers,
  useExpenseBudgets,
  useExpenseCompanies,
  useSapGLAccounts,
  useSubmitExpense,
  useUpdateExpense,
} from '@/modules/accounts/api';
import { SearchableSelect } from '@/shared/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

export interface ExpenseFormDialogProps {
  /** The expense to change. Null for a new one. */
  claim: ExpenseClaim | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * One expense, whole: a new one, or one already sent, filled in.
 *
 * **Branch** is the company (Oil, Mart or Beverages) and decides whose SAP the
 * next two are read from. **Budget** is SAP's business place, starting on
 * FACTORY. **G/L account** is searched in that company's chart of accounts.
 * Changing the branch resets both, since they belong to its SAP.
 *
 * An expense can be changed until it is approved; saving a rejected one sends
 * it again. An approved one opens read-only.
 *
 * Mounted only while open, so every opening starts from the expense as saved.
 */
export function ExpenseFormDialog({ claim, onOpenChange }: ExpenseFormDialogProps) {
  const { currentCompany } = useAuth();
  const submit = useSubmitExpense();
  const update = useUpdateExpense();
  const saving = submit.isPending || update.isPending;
  const locked = claim?.status === 'APPROVED';

  const { data: companies = [] } = useExpenseCompanies();
  // Starts on the company selected in the header, when it is one of the three.
  const [companyPick, setCompanyPick] = useState(claim?.company_code ?? '');
  const company =
    companyPick ||
    companies.find((row) => row.code === currentCompany?.company_code)?.code ||
    companies[0]?.code ||
    '';

  const budgets = useExpenseBudgets(company);
  // A pick belongs to the company it was made under; another company starts
  // on its own FACTORY again.
  const [budgetPick, setBudgetPick] = useState<{ company: string; id: string } | null>(
    claim ? { company: claim.company_code, id: String(claim.budget_id) } : null,
  );
  const budgetId =
    budgetPick?.company === company
      ? budgetPick.id
      : String(budgets.data?.find((row) => row.is_default)?.budget_id ?? '');

  const [glSearch, setGlSearch] = useState('');
  const glAccounts = useSapGLAccounts(company, glSearch);
  const [glPick, setGlPick] = useState<{ company: string; code: string; name: string } | null>(
    claim
      ? { company: claim.company_code, code: claim.gl_account_code, name: claim.gl_account_name }
      : null,
  );
  const gl = glPick?.company === company ? glPick : null;

  const [comment, setComment] = useState(claim?.comment ?? '');
  const [amount, setAmount] = useState(claim ? String(Number(claim.amount)) : '');

  // Every active user but you: nobody approves their own expense.
  const approvers = useExpenseApprovers();
  const [approver, setApprover] = useState<ExpenseApprover | null>(
    claim ? { id: claim.approver, name: claim.approver_name ?? '', email: '' } : null,
  );

  const ready =
    company !== '' &&
    budgetId !== '' &&
    gl != null &&
    comment.trim() !== '' &&
    Number(amount) > 0 &&
    approver != null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (locked || !ready || gl == null || approver == null) return;
    const payload = {
      company,
      budget_id: Number(budgetId),
      gl_account_code: gl.code,
      comment: comment.trim(),
      amount: String(amount),
      approver: approver.id,
    };
    try {
      if (claim) {
        await update.mutateAsync({ id: claim.id, payload });
        toast.success(
          claim.status === 'REJECTED'
            ? `Expense sent to ${approver.name} again`
            : 'Expense updated',
        );
      } else {
        await submit.mutateAsync(payload);
        toast.success(`Expense sent to ${approver.name} for approval`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That expense could not be saved.'));
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* The whole dialog scrolls, not an inner body: the pickers' lists are
          absolutely positioned and an inner scroller would clip them. */}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{claim ? `Expense #${claim.id}` : 'New expense'}</DialogTitle>
          <DialogDescription>
            {!claim
              ? 'It goes straight to the person you choose to approve it.'
              : locked
                ? `Approved by ${claim.decided_by_name ?? 'the approver'}, so it can no longer be changed.`
                : claim.status === 'REJECTED'
                  ? 'Rejected. Change what is needed and save to send it again.'
                  : 'Waiting for approval. You can change it until it is approved.'}
          </DialogDescription>
        </DialogHeader>

        {claim?.status === 'REJECTED' && claim.decision_note && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {claim.decided_by_name}: {claim.decision_note}
          </p>
        )}

        <form id="expense-form" onSubmit={onSubmit} className="space-y-4">
          {/* A disabled fieldset locks every native field at once. */}
          <fieldset disabled={locked} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="expense-company">Branch</Label>
                <NativeSelect
                  id="expense-company"
                  value={company}
                  onChange={(e) => setCompanyPick(e.target.value)}
                >
                  {companies.map((row) => (
                    <SelectOption key={row.code} value={row.code}>
                      {row.name}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1">
                <Label htmlFor="expense-budget">Budget</Label>
                <NativeSelect
                  id="expense-budget"
                  value={budgetId}
                  disabled={budgets.isError}
                  onChange={(e) => setBudgetPick({ company, id: e.target.value })}
                >
                  <SelectOption value="">
                    {budgets.isLoading ? 'Reading SAP…' : 'Pick a budget…'}
                  </SelectOption>
                  {(budgets.data ?? []).map((row) => (
                    <SelectOption key={row.budget_id} value={String(row.budget_id)}>
                      {row.budget_name}
                    </SelectOption>
                  ))}
                </NativeSelect>
                {budgets.isError && (
                  <p className="text-xs text-destructive">SAP could not be reached right now.</p>
                )}
              </div>
            </div>

            <SearchableSelect<SapGLAccount>
              // Remounted per company, so a box still showing another
              // company's account cannot survive the switch.
              key={company}
              inputId="expense-gl-account"
              label="G/L account"
              disabled={locked}
              value={gl ? `${gl.code} · ${gl.name}` : ''}
              defaultDisplayText={gl ? `${gl.code} · ${gl.name}` : undefined}
              items={glAccounts.data ?? []}
              isLoading={glAccounts.isLoading}
              isError={glAccounts.isError}
              placeholder="Search SAP accounts…"
              getItemKey={(account) => account.account_code}
              getItemLabel={(account) => `${account.account_code} · ${account.account_name}`}
              // Focusing the box puts the picked account's own label in it,
              // which matches nothing as a search; search on the code alone.
              onSearchChange={(text) => setGlSearch(text.split(' · ')[0])}
              onItemSelect={(account) =>
                setGlPick({ company, code: account.account_code, name: account.account_name })
              }
              onClear={() => setGlPick(null)}
              loadingText="Reading the chart of accounts…"
              emptyText="Type to search SAP's chart of accounts"
              notFoundText="No account matches that"
              errorText="SAP could not be reached, so accounts cannot be searched right now."
            />

            <div className="space-y-1">
              <Label htmlFor="expense-comment">Comment</Label>
              <Textarea
                id="expense-comment"
                rows={3}
                maxLength={2000}
                placeholder="Tea and snacks for the night shift"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="space-y-1 sm:w-1/2">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <SearchableSelect<ExpenseApprover>
              inputId="expense-approver"
              label="Approval goes to"
              disabled={locked}
              value={approver?.name ?? ''}
              defaultDisplayText={approver?.name}
              items={approvers.data ?? []}
              isLoading={approvers.isLoading}
              isError={approvers.isError}
              placeholder="Search by name or email…"
              getItemKey={(person) => person.id}
              getItemLabel={(person) => person.name}
              filterFn={(person, search) => {
                const needle = search.toLowerCase();
                return (
                  person.name.toLowerCase().includes(needle) ||
                  person.email.toLowerCase().includes(needle)
                );
              }}
              renderItem={(person) => (
                <div className="min-w-0">
                  <p className="truncate">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                </div>
              )}
              onItemSelect={setApprover}
              onClear={() => setApprover(null)}
              loadingText="Loading people…"
              emptyText="Nobody to send it to"
              notFoundText="Nobody matches that"
              errorText="The list of people could not be loaded."
            />
          </fieldset>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {locked ? 'Close' : 'Cancel'}
          </Button>
          {!locked && (
            <Button type="submit" form="expense-form" disabled={saving || !ready}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : claim ? (
                <Save className="mr-2 h-4 w-4" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {!claim ? 'Submit' : claim.status === 'REJECTED' ? 'Save and send again' : 'Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExpenseFormDialog;
