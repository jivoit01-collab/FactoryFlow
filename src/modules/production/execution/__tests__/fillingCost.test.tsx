import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FillingCostPage from '../pages/FillingCostPage';

/** September's sheet, as the factory wrote it and the API hands it back. */
const SEPTEMBER = {
  id: 4,
  line: null,
  line_name: '',
  period: '2026-09-01',
  cases: '160000.00',
  notes: '',
  entries: [
    { id: 1, head: 'Salary', amount: '1200000.00', sort_order: 0, per_case: '7.50' },
    { id: 2, head: 'Electricity', amount: '800000.00', sort_order: 1, per_case: '5.00' },
    { id: 3, head: 'Maintenance', amount: '250000.00', sort_order: 2, per_case: '1.56' },
    { id: 4, head: 'Batch Coding', amount: '60000.00', sort_order: 3, per_case: '0.38' },
    {
      id: 5,
      head: 'Ground Water Extraction Bill',
      amount: '16000.00',
      sort_order: 4,
      per_case: '0.10',
    },
    { id: 6, head: 'Briquette', amount: '25000.00', sort_order: 5, per_case: '0.16' },
    { id: 7, head: 'Lubrication', amount: '32400.00', sort_order: 6, per_case: '0.20' },
    { id: 8, head: 'Lab', amount: '5000.00', sort_order: 7, per_case: '0.03' },
    { id: 9, head: 'Miscellaneous', amount: '100000.00', sort_order: 8, per_case: '0.63' },
  ],
  total_amount: '2488400.00',
  total_per_case: '15.55',
  created_by_name: 'Anurag',
  updated_by_name: '',
  created_at: '2026-09-30T10:00:00Z',
  updated_at: '2026-09-30T10:00:00Z',
};

const createSheet = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const updateSheet = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const perms = vi.hoisted(() => ({ canEdit: true }));

vi.mock('../api', () => ({
  useLines: () => ({ data: [{ id: 1, name: 'Line 1' }] }),
  useFillingCostSheets: () => ({ data: [SEPTEMBER], isLoading: false }),
  useCreateFillingCostSheet: () => ({ mutateAsync: createSheet, isPending: false }),
  useUpdateFillingCostSheet: () => ({ mutateAsync: updateSheet, isPending: false }),
  useDeleteFillingCostSheet: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/core/auth', () => ({
  usePermission: () => ({
    hasPermission: () => perms.canEdit,
    hasAnyPermission: () => true,
  }),
}));

/** The page opens on the current month; every test picks its own. */
const openMonth = (month: string) => {
  fireEvent.change(screen.getByLabelText('Month'), { target: { value: month } });
};

const row = (head: string) =>
  within((screen.getByDisplayValue(head).closest('tr') as HTMLElement) ?? document.body);

describe('Filling cost sheet', () => {
  it('shows the month as it was written, per case', () => {
    render(<FillingCostPage />);
    openMonth('2026-09');

    expect(screen.getByText(/Per 1,60,000 Cases/)).toBeInTheDocument();
    expect(row('Salary').getByDisplayValue('1200000')).toBeInTheDocument();
    expect(row('Salary').getByText('7.50')).toBeInTheDocument();
    // 0.375 a case, rounded up, exactly as the sheet writes it.
    expect(row('Batch Coding').getByText('0.38')).toBeInTheDocument();
    expect(row('Miscellaneous').getByText('0.63')).toBeInTheDocument();

    // The total row: the month over the cases. Adding the rounded column above
    // would read 15.56.
    const total = screen.getByText('Total').closest('tr') as HTMLElement;
    expect(within(total).getByText('24,88,400.00')).toBeInTheDocument();
    expect(within(total).getByText('15.55')).toBeInTheDocument();
  });

  it('reprices every head when the case count changes', () => {
    render(<FillingCostPage />);
    openMonth('2026-09');

    fireEvent.change(screen.getByLabelText('Cases'), { target: { value: '80000' } });

    expect(row('Salary').getByText('15.00')).toBeInTheDocument();
    const total = screen.getByText('Total').closest('tr') as HTMLElement;
    expect(within(total).getByText('31.11')).toBeInTheDocument();
  });

  it('starts a month nobody has entered from the last month’s heads', () => {
    render(<FillingCostPage />);
    openMonth('2026-10');

    expect(screen.getByText(/No sheet for this month yet/)).toBeInTheDocument();
    // The heads carry over; the amounts do not.
    expect(screen.getByDisplayValue('Salary')).toBeInTheDocument();
    expect(row('Salary').getByPlaceholderText('0')).toHaveValue('');
  });

  it('saves a new month as a sheet of its own', async () => {
    render(<FillingCostPage />);
    openMonth('2026-10');

    fireEvent.change(row('Salary').getByPlaceholderText('0'), { target: { value: '1250000' } });
    fireEvent.change(row('Electricity').getByPlaceholderText('0'), { target: { value: '810000' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(createSheet).toHaveBeenCalled());
    const payload = createSheet.mock.calls[0][0];
    expect(payload).toMatchObject({ period: '2026-10-01', cases: '160000', line_id: null });
    // Heads left blank are still part of the sheet, at zero.
    expect(payload.entries.slice(0, 2)).toEqual([
      { head: 'Salary', amount: '1250000' },
      { head: 'Electricity', amount: '810000' },
    ]);
    expect(payload.entries).toContainEqual({ head: 'Lab', amount: '0' });
  });

  it('is read-only without the entry permission', () => {
    perms.canEdit = false;
    try {
      render(<FillingCostPage />);
      openMonth('2026-09');

      expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('Salary')).toBeDisabled();
      // The figures are still there to read.
      expect(row('Salary').getByText('7.50')).toBeInTheDocument();
    } finally {
      perms.canEdit = true;
    }
  });
});
