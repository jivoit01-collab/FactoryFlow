import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FillingCostPage from '../pages/FillingCostPage';

/** 25 September's sheet, as the factory wrote it and the API hands it back. */
const SEP_25 = {
  id: 4,
  line: null,
  line_name: '',
  date: '2026-09-25',
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
  created_at: '2026-09-25T10:00:00Z',
  updated_at: '2026-09-25T10:00:00Z',
};

const createSheet = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const updateSheet = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const perms = vi.hoisted(() => ({ canEdit: true }));
const askedFor = vi.hoisted(() => [] as unknown[]);

vi.mock('../api', () => ({
  useLines: () => ({ data: [{ id: 1, name: 'Line 1' }] }),
  useFillingCostSheets: (params: unknown) => {
    askedFor.push(params);
    return { data: [SEP_25], isLoading: false };
  },
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

/** The page opens on today; every test picks its own day. */
const openDay = (date: string) => {
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: date } });
};

const row = (head: string) =>
  within((screen.getByDisplayValue(head).closest('tr') as HTMLElement) ?? document.body);

describe('Filling cost sheet', () => {
  beforeEach(() => {
    createSheet.mockClear();
    updateSheet.mockClear();
    askedFor.length = 0;
  });

  it('shows the day as it was written, per case', () => {
    render(<FillingCostPage />);
    openDay('2026-09-25');

    expect(screen.getByText('Filling Cost — 25 September 2026')).toBeInTheDocument();
    expect(screen.getByText(/Per 1,60,000 Cases/)).toBeInTheDocument();
    expect(row('Salary').getByDisplayValue('1200000')).toBeInTheDocument();
    expect(row('Salary').getByText('7.50')).toBeInTheDocument();
    // 0.375 a case, rounded up, exactly as the sheet writes it.
    expect(row('Batch Coding').getByText('0.38')).toBeInTheDocument();
    expect(row('Miscellaneous').getByText('0.63')).toBeInTheDocument();

    // The total row: the day over the cases. Adding the rounded column above
    // would read 15.56.
    const total = screen.getByText('Total').closest('tr') as HTMLElement;
    expect(within(total).getByText('24,88,400.00')).toBeInTheDocument();
    expect(within(total).getByText('15.55')).toBeInTheDocument();
  });

  it('asks only for the day picked and the newest two, not every day entered', () => {
    render(<FillingCostPage />);
    openDay('2026-09-25');

    expect(askedFor).toContainEqual({ line_id: 'none', date: '2026-09-25' });
    expect(askedFor).toContainEqual({ line_id: 'none', limit: 2 });
    expect(askedFor).not.toContainEqual(undefined);
  });

  it('reprices every head when the case count changes', () => {
    render(<FillingCostPage />);
    openDay('2026-09-25');

    fireEvent.change(screen.getByLabelText('Cases'), { target: { value: '80000' } });

    expect(row('Salary').getByText('15.00')).toBeInTheDocument();
    const total = screen.getByText('Total').closest('tr') as HTMLElement;
    expect(within(total).getByText('31.11')).toBeInTheDocument();
  });

  it('starts a day nobody has entered from the last day’s heads', () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    expect(
      screen.getByText(
        /No sheet for this day yet — the heads are carried over from 25 September 2026/,
      ),
    ).toBeInTheDocument();
    // The heads carry over; the amounts and the case count do not.
    expect(screen.getByDisplayValue('Salary')).toBeInTheDocument();
    expect(row('Salary').getByPlaceholderText('0')).toHaveValue('');
    expect(screen.getByLabelText('Cases')).toHaveValue('');
  });

  it('saves a new day as a sheet of its own', async () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    fireEvent.change(screen.getByLabelText('Cases'), { target: { value: '5200' } });
    fireEvent.change(row('Salary').getByPlaceholderText('0'), { target: { value: '40000' } });
    fireEvent.change(row('Electricity').getByPlaceholderText('0'), { target: { value: '27000' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(createSheet).toHaveBeenCalled());
    const payload = createSheet.mock.calls[0][0];
    expect(payload).toMatchObject({ date: '2026-09-26', cases: '5200', line_id: null });
    // Heads left blank are still part of the sheet, at zero.
    expect(payload.entries.slice(0, 2)).toEqual([
      { head: 'Salary', amount: '40000' },
      { head: 'Electricity', amount: '27000' },
    ]);
    expect(payload.entries).toContainEqual({ head: 'Lab', amount: '0' });
  });

  it('will not save a new day until its cases are entered', () => {
    render(<FillingCostPage />);
    openDay('2026-09-26');

    fireEvent.change(row('Salary').getByPlaceholderText('0'), { target: { value: '40000' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(createSheet).not.toHaveBeenCalled();
  });

  it('is read-only without the entry permission', () => {
    perms.canEdit = false;
    try {
      render(<FillingCostPage />);
      openDay('2026-09-25');

      expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('Salary')).toBeDisabled();
      // The figures are still there to read.
      expect(row('Salary').getByText('7.50')).toBeInTheDocument();
    } finally {
      perms.canEdit = true;
    }
  });
});
