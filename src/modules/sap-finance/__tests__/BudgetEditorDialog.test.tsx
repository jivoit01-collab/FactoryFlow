/**
 * The budget editor must build its form from SAP's full copy of a budget, never
 * from the list row: the list carries no lines, and saving replaces every line
 * in SAP (`B1S-ReplaceCollectionsOnPatch`), so a form built from the row would
 * delete all the budget's months. The query hooks are mocked.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Budget } from '../api';

const detail = vi.fn();
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  useBudget: (...args: unknown[]) => detail(...args),
  useCostingCodes: () => ({ data: [], isLoading: false }),
  useCreateBudget: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateBudget: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { BudgetEditorDialog } from '../components/BudgetEditorDialog';

/** What the list endpoint returns: header fields only. */
const LIST_ROW: Budget = {
  doc_entry: 12,
  doc_num: 7,
  budget: 'MKT',
  sub_budget: '',
  created_at: '2026-04-01',
  lines: [],
};

const FULL: Budget = {
  ...LIST_ROW,
  lines: [
    { line_id: 1, month: '2026-04-01', fixed_amount: 1000, variable_amount: 0, sub_budget: '' },
    { line_id: 2, month: '2026-05-01', fixed_amount: 2000, variable_amount: 50, sub_budget: '' },
  ],
};

function openEditor() {
  render(<BudgetEditorDialog open budget={LIST_ROW} onOpenChange={vi.fn()} />);
}

describe('BudgetEditorDialog on an existing budget', () => {
  beforeEach(() => detail.mockReset());

  it('reads the budget by its DocEntry', () => {
    detail.mockReturnValue({ data: undefined, isFetchedAfterMount: false, isError: false });
    openEditor();
    expect(detail).toHaveBeenCalledWith(12);
  });

  it('shows no form, and nothing to save, until SAP has answered', () => {
    detail.mockReturnValue({ data: undefined, isFetchedAfterMount: false, isError: false });
    openEditor();
    expect(screen.getByText(/Reading the budget from SAP/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update in SAP' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Month of line/)).not.toBeInTheDocument();
  });

  it('does not trust a cached copy that was not re-read on opening', () => {
    detail.mockReturnValue({ data: FULL, isFetchedAfterMount: false, isError: false });
    openEditor();
    expect(screen.queryByRole('button', { name: 'Update in SAP' })).not.toBeInTheDocument();
  });

  it('builds the form from every month SAP holds', () => {
    detail.mockReturnValue({ data: FULL, isFetchedAfterMount: true, isError: false });
    openEditor();
    expect(screen.getAllByLabelText(/Month of line/)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Update in SAP' })).toBeEnabled();
  });

  it('offers a retry, not a form, when SAP cannot be read', () => {
    detail.mockReturnValue({ data: undefined, isFetchedAfterMount: true, isError: true, refetch: vi.fn() });
    openEditor();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update in SAP' })).not.toBeInTheDocument();
  });
});
