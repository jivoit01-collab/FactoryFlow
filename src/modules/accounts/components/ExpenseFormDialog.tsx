import { Loader2, Paperclip, Save, Send, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth/hooks/useAuth';
import type { ExpenseClaim, SapGLAccount } from '@/modules/accounts/api';
import {
  useAttachToExpense,
  useExpenseBudgets,
  useExpenseCompanies,
  useRemoveExpenseAttachment,
  useSapGLAccounts,
  useSubmitExpense,
  useUpdateExpense,
} from '@/modules/accounts/api';
import { SearchableSelect } from '@/shared/components';
import {
  Button,
  Checkbox,
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
import { getErrorMessage, resolveFileUrl } from '@/shared/utils';

/** What the server takes as an attachment: a photograph or a PDF, 15 MB at most. */
const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif';
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

function acceptable(file: File) {
  const dot = file.name.lastIndexOf('.');
  const suffix = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  return (
    ATTACHMENT_ACCEPT.split(',').includes(suffix) &&
    file.size > 0 &&
    file.size <= MAX_ATTACHMENT_BYTES
  );
}

export interface ExpenseFormDialogProps {
  /** The expense to change. Null for a new one. */
  claim: ExpenseClaim | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * One expense, whole: a new one, or one already sent, filled in.
 *
 * **Branch** is the company (Oil, Mart or Beverages) and decides whose SAP the
 * next two are read from. **Budget** is SAP's budget (dimension 3), starting on
 * Factory. **G/L account** is searched among that company's expense accounts —
 * or, for somebody who does not know it, skipped for a line saying what the
 * expense is for. Changing the branch resets the budget and the account,
 * since they belong to its SAP.
 *
 * **Attachments** are the bill behind it: photographs or PDFs, several at once.
 * Files picked, and saved files crossed off, change nothing until it is saved:
 * the expense goes first, then the files, so Cancel leaves everything as it was.
 *
 * It goes to the expense approvers. It can be changed until it is approved;
 * saving a rejected one sends it again. An approved one opens read-only.
 *
 * Mounted only while open, so every opening starts from the expense as saved.
 */
export function ExpenseFormDialog({ claim, onOpenChange }: ExpenseFormDialogProps) {
  const { currentCompany } = useAuth();
  const submit = useSubmitExpense();
  const update = useUpdateExpense();
  const attach = useAttachToExpense();
  const removeAttachment = useRemoveExpenseAttachment();
  const saving =
    submit.isPending || update.isPending || attach.isPending || removeAttachment.isPending;
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
  // on its own Factory again.
  const [budgetPick, setBudgetPick] = useState<{ company: string; code: string } | null>(
    claim?.budget_code ? { company: claim.company_code, code: claim.budget_code } : null,
  );
  const budgetCode =
    budgetPick?.company === company
      ? budgetPick.code
      : (budgets.data?.find((row) => row.is_default)?.budget_code ?? '');

  const [glSearch, setGlSearch] = useState('');
  const glAccounts = useSapGLAccounts(company, glSearch);
  const [glPick, setGlPick] = useState<{ company: string; code: string; name: string } | null>(
    claim?.gl_account_code
      ? { company: claim.company_code, code: claim.gl_account_code, name: claim.gl_account_name }
      : null,
  );
  const gl = glPick?.company === company ? glPick : null;
  // "I don't know the G/L account": the account is skipped for a line saying
  // what the expense is for, so accounts can find the account later.
  const [glUnknown, setGlUnknown] = useState(claim != null && !claim.gl_account_code);
  const [glDescription, setGlDescription] = useState(claim?.gl_description ?? '');

  const [comment, setComment] = useState(claim?.comment ?? '');
  const [amount, setAmount] = useState(claim ? String(Number(claim.amount)) : '');

  // Saved files crossed off, and new ones picked: both wait for Save.
  const [dropped, setDropped] = useState<number[]>([]);
  const kept = (claim?.attachments ?? []).filter((file) => !dropped.includes(file.id));
  const [waiting, setWaiting] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  function pickFiles(files: FileList | null) {
    const picked = Array.from(files ?? []);
    const refused = picked.filter((file) => !acceptable(file));
    if (refused.length > 0) {
      toast.error(
        `Not attached: ${refused.map((file) => file.name).join(', ')}. ` +
          'Attach photographs or PDFs of up to 15 MB.',
      );
    }
    const fresh = picked.filter((file) => !refused.includes(file));
    setWaiting((current) => [
      ...current,
      ...fresh.filter(
        (file) => !current.some((had) => had.name === file.name && had.size === file.size),
      ),
    ]);
    // Cleared, so picking the same file again after removing it still fires.
    if (fileInput.current) fileInput.current.value = '';
  }

  const ready =
    company !== '' &&
    budgetCode !== '' &&
    (glUnknown ? glDescription.trim() !== '' : gl != null) &&
    comment.trim() !== '' &&
    Number(amount) > 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (locked || !ready) return;
    const payload = {
      company,
      budget_code: budgetCode,
      gl_account_code: glUnknown ? '' : (gl?.code ?? ''),
      gl_description: glUnknown ? glDescription.trim() : '',
      comment: comment.trim(),
      amount: String(amount),
    };
    let claimId: number;
    try {
      if (claim) {
        await update.mutateAsync({ id: claim.id, payload });
        claimId = claim.id;
        toast.success(
          claim.status === 'REJECTED' ? 'Expense sent for approval again' : 'Expense updated',
        );
      } else {
        claimId = (await submit.mutateAsync(payload)).id;
        toast.success('Expense sent for approval');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'That expense could not be saved.'));
      return;
    }

    // The files follow the expense. A failure here is reported on its own:
    // the expense is saved either way, and can be opened to try again.
    const removals = await Promise.allSettled(
      dropped.map((id) => removeAttachment.mutateAsync(id)),
    );
    if (removals.some((result) => result.status === 'rejected')) {
      toast.error('The expense is saved, but a file could not be removed from it.');
    }
    if (waiting.length > 0) {
      try {
        const result = await attach.mutateAsync({ id: claimId, files: waiting });
        if (result.refused.length > 0) {
          toast.error(
            `${result.refused.length} of ${waiting.length} files could not be attached: ` +
              result.refused.map((row) => row.filename).join(', '),
          );
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'The expense is saved, but the files did not attach.'));
      }
    }
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* The whole dialog scrolls, not an inner body: the G/L picker's list is
          absolutely positioned and an inner scroller would clip it. */}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{claim ? `Expense #${claim.id}` : 'New expense'}</DialogTitle>
          <DialogDescription>
            {!claim
              ? 'It goes to the expense approvers.'
              : locked
                ? `Approved by ${claim.decided_by_name ?? 'an approver'}, so it can no longer be changed.`
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

        <form id="expense-form" onSubmit={onSubmit}>
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
                  value={budgetCode}
                  disabled={budgets.isError}
                  onChange={(e) => setBudgetPick({ company, code: e.target.value })}
                >
                  <SelectOption value="">
                    {budgets.isLoading ? 'Reading SAP…' : 'Pick a budget…'}
                  </SelectOption>
                  {(budgets.data ?? []).map((row) => (
                    <SelectOption key={row.budget_code} value={row.budget_code}>
                      {row.budget_name}
                    </SelectOption>
                  ))}
                </NativeSelect>
                {budgets.isError && (
                  <p className="text-xs text-destructive">SAP could not be reached right now.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {glUnknown ? (
                <div className="space-y-1">
                  <Label htmlFor="expense-gl-description">What is it for?</Label>
                  <Input
                    id="expense-gl-description"
                    maxLength={500}
                    placeholder="Repairs to the boiler feed pump"
                    value={glDescription}
                    onChange={(e) => setGlDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Accounts will pick the G/L account from this.
                  </p>
                </div>
              ) : (
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
                  placeholder="Search SAP expense accounts…"
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
                  emptyText="Type to search SAP's expense accounts"
                  notFoundText="No expense account matches that"
                  errorText="SAP could not be reached, so accounts cannot be searched right now."
                />
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="expense-gl-unknown"
                  checked={glUnknown}
                  disabled={locked}
                  onCheckedChange={(checked) => setGlUnknown(checked === true)}
                />
                <Label htmlFor="expense-gl-unknown" className="text-sm font-normal">
                  I don't know the G/L account
                </Label>
              </div>
            </div>

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

            <div className="space-y-1">
              <Label htmlFor={locked ? undefined : 'expense-attachments'}>Attachments</Label>
              {!locked && (
                <Input
                  id="expense-attachments"
                  ref={fileInput}
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
                  onChange={(e) => pickFiles(e.target.files)}
                />
              )}
              {kept.length + waiting.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {kept.map((file) => (
                    <span
                      key={file.id}
                      className="inline-flex items-center gap-1 rounded border bg-muted/40 px-2 py-0.5 text-xs"
                    >
                      <Paperclip className="h-3 w-3" />
                      <a
                        href={resolveFileUrl(file.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="max-w-[200px] truncate hover:underline"
                      >
                        {file.original_filename}
                      </a>
                      {!locked && (
                        <button
                          type="button"
                          aria-label={`Remove ${file.original_filename}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDropped((ids) => [...ids, file.id])}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {waiting.map((file) => (
                    <span
                      key={`${file.name}-${file.size}`}
                      className="inline-flex items-center gap-1 rounded border border-dashed px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="max-w-[200px] truncate">{file.name}</span>
                      <span>· on save</span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        className="hover:text-destructive"
                        onClick={() => setWaiting((files) => files.filter((had) => had !== file))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                locked && <p className="text-sm text-muted-foreground">None</p>
              )}
              {!locked && (
                <p className="text-xs text-muted-foreground">
                  Photographs or PDFs of the bill — optional, and more than one is fine.
                </p>
              )}
            </div>
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
