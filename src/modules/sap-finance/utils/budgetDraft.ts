import type { Budget, BudgetPayload } from '../api';

/** One month line as the editor holds it: text fields, the month as `YYYY-MM`. */
export interface LineDraft {
  month: string;
  fixed_amount: string;
  variable_amount: string;
  sub_budget: string;
}

export interface BudgetDraft {
  budget: string;
  subBudget: string;
  lines: LineDraft[];
}

export function thisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function blankLine(): LineDraft {
  return { month: thisMonth(), fixed_amount: '0', variable_amount: '0', sub_budget: '' };
}

/** The editor's starting state: the budget being edited, or one blank month. */
export function toDraft(budget: Budget | null): BudgetDraft {
  if (!budget) return { budget: '', subBudget: '', lines: [blankLine()] };
  return {
    budget: budget.budget,
    subBudget: budget.sub_budget,
    lines: budget.lines.map((line) => ({
      month: (line.month ?? '').slice(0, 7),
      fixed_amount: String(line.fixed_amount),
      variable_amount: String(line.variable_amount),
      sub_budget: line.sub_budget,
    })),
  };
}

/** The error to show, or null when the draft can be sent. Mirrors the server's checks. */
export function budgetDraftError(budget: string, lines: LineDraft[]): string | null {
  if (!budget) return 'Choose a budget head.';
  if (lines.length === 0) return 'Add at least one month.';
  const months = lines.map((line) => line.month);
  if (months.some((month) => !/^\d{4}-\d{2}$/.test(month))) return 'Every line needs a month.';
  if (new Set(months).size !== months.length) return 'Each month may appear only once.';
  for (const line of lines) {
    for (const value of [line.fixed_amount, line.variable_amount]) {
      if (value === '' || Number.isNaN(Number(value)) || Number(value) < 0) {
        return 'Amounts must be numbers of zero or more.';
      }
    }
  }
  return null;
}

export function draftTotal(lines: LineDraft[]): number {
  return lines.reduce(
    (sum, line) => sum + (Number(line.fixed_amount) || 0) + (Number(line.variable_amount) || 0),
    0,
  );
}

export function toPayload(draft: BudgetDraft): BudgetPayload {
  return {
    budget: draft.budget,
    sub_budget: draft.subBudget,
    lines: draft.lines.map((line) => ({
      month: `${line.month}-01`,
      fixed_amount: Number(line.fixed_amount),
      variable_amount: Number(line.variable_amount),
      sub_budget: line.sub_budget,
    })),
  };
}

/** The earliest month on the draft, as `YYYY-MM-01`, for the confirmation line. */
export function firstMonth(lines: LineDraft[]): string {
  const months = lines.map((line) => line.month).filter(Boolean).sort();
  return months.length ? `${months[0]}-01` : '';
}
