/**
 * The rejection register: the sheet's columns, where each entry stands now,
 * the per-user ranking, narrowing to one user or stage without losing
 * everybody else's counts, and the all-companies switch. SAP is mocked.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SapRejection, SapRejectionFilters, SapRejectionHistory } from '../types';

const row = (overrides: Partial<SapRejection>): SapRejection => ({
  wdd_code: 1,
  object_type: '18',
  object_type_label: 'A/P Invoice',
  draft_entry: 1,
  raised_on: '2026-10-07',
  rejected_at: '2026-10-08T13:25:00',
  rejected_by: 'USER03',
  rejected_by_name: 'BHAWANI',
  remarks: null,
  reason: '',
  originator_code: 'USER39',
  originator_name: 'MUQEEM',
  doc_num: 1,
  doc_date: '2026-09-26',
  card_code: 'V1',
  party_name: 'SUSHIL KUMAR IMPREST',
  reference: 'INV-1',
  total_amount: '2052.00',
  gl_account: '5680022',
  gl_account_name: 'COMPUTER AND HARDWARE',
  category: '',
  category_label: 'COMPUTER AND HARDWARE',
  category_source: 'gl',
  now: { stage: 'STILL_REJECTED', via: null, doc_num: null, posted: false },
  company_code: 'JIVO_OIL',
  company_name: 'Jivo Oil',
  ...overrides,
});

const HISTORY: SapRejectionHistory = {
  date_from: '2026-10-01',
  date_to: '2026-10-09',
  companies: [{ code: 'JIVO_OIL', name: 'Jivo Oil' }],
  unavailable: [],
  count: 3,
  truncated: false,
  categories: [],
  results: [
    row({
      wdd_code: 1,
      reason: 'GL',
      category: 'IMPREST',
      category_label: 'Imprest',
      category_source: 'app',
    }),
    row({
      wdd_code: 2,
      reason: 'Wrong vendor',
      party_name: 'ARVIND TULI',
      now: { stage: 'POSTED', via: 'reference', doc_num: 726093200, posted: true },
    }),
    row({
      wdd_code: 3,
      reason: 'GL & Budget',
      party_name: 'ABHIMAN EXPRESS',
      originator_code: 'USER07',
      originator_name: 'HARSH',
      total_amount: '1161061.00',
      now: { stage: 'PENDING', via: 'reference', doc_num: 609264366, posted: false },
    }),
  ],
  by_originator: [
    {
      originator_code: 'USER39',
      originator_name: 'MUQEEM',
      count: 2,
      still_rejected: 1,
      amount: '4104.00',
    },
    {
      originator_code: 'USER07',
      originator_name: 'HARSH',
      count: 1,
      still_rejected: 0,
      amount: '1161061.00',
    },
  ],
};

const asked: SapRejectionFilters[] = [];
vi.mock('../api/sap-approvals.queries', () => ({
  useSapRejectionHistory: (filters: SapRejectionFilters) => {
    asked.push(filters);
    const data = filters.all_companies
      ? {
          ...HISTORY,
          companies: [
            { code: 'JIVO_MART', name: 'Jivo Mart' },
            { code: 'JIVO_OIL', name: 'Jivo Oil' },
          ],
          unavailable: [{ code: 'JIVO_BEVERAGES', name: 'Jivo Beverages' }],
        }
      : HISTORY;
    return { data, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() };
  },
}));

import RejectionHistoryPage from '../pages/RejectionHistoryPage';

describe('RejectionHistoryPage', () => {
  it('lists each rejection in the register format, with where it stands now', () => {
    render(<RejectionHistoryPage />);
    expect(screen.getByText('3 rejections')).toBeInTheDocument();
    const first = screen.getByText('GL').closest('tr')!;
    expect(within(first).getByText('08-10-2026')).toBeInTheDocument();
    expect(within(first).getByText('Imprest')).not.toHaveClass('italic');
    expect(within(first).getByText('Still rejected')).toBeInTheDocument();
    const second = screen.getByText('Wrong vendor').closest('tr')!;
    expect(within(second).getByText('COMPUTER AND HARDWARE')).toHaveClass('italic');
    expect(within(second).getByText('Corrected, posted')).toBeInTheDocument();
    expect(within(second).getByText('doc #726093200')).toBeInTheDocument();
    const third = screen.getByText('GL & Budget').closest('tr')!;
    expect(within(third).getByText('draft #609264366')).toBeInTheDocument();
  });

  it('ranks users by rejections and narrows to one when picked', () => {
    render(<RejectionHistoryPage />);
    fireEvent.click(screen.getByText('USER07 (HARSH)'));
    expect(screen.getByText('1 rejection')).toBeInTheDocument();
    expect(screen.getByText('GL & Budget')).toBeInTheDocument();
    expect(screen.queryByText('Wrong vendor')).not.toBeInTheDocument();
    // The ranking still shows everybody.
    expect(screen.getByText('USER39 (MUQEEM)')).toBeInTheDocument();
  });

  it('narrows to the ones still open, or the corrected ones', () => {
    render(<RejectionHistoryPage />);
    fireEvent.change(screen.getByLabelText('Now'), { target: { value: 'open' } });
    expect(screen.getByText('1 rejection')).toBeInTheDocument();
    expect(screen.getByText('GL')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Now'), { target: { value: 'corrected' } });
    expect(screen.getByText('2 rejections')).toBeInTheDocument();
    expect(screen.queryByText('GL')).not.toBeInTheDocument();
  });

  it('reads every company on request, shows which, and names one SAP could not answer for', () => {
    render(<RejectionHistoryPage />);
    expect(asked.at(-1)?.all_companies).toBe(false);
    expect(screen.queryByRole('columnheader', { name: 'Company' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All companies' }));
    expect(asked.at(-1)?.all_companies).toBe(true);
    expect(screen.getByText('Jivo Mart, Jivo Oil')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Company' })).toBeInTheDocument();
    expect(screen.getByText(/SAP could not be read for Jivo Beverages/)).toBeInTheDocument();
  });
});
