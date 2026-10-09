/**
 * The rejection register: the sheet's columns, the per-user ranking, and
 * narrowing to one user without losing everybody else's counts. SAP is mocked.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SapRejection, SapRejectionHistory } from '../types';

const row = (overrides: Partial<SapRejection>): SapRejection => ({
  wdd_code: 1,
  object_type: '18',
  object_type_label: 'A/P Invoice',
  draft_entry: 1,
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
  total_amount: '2052.00',
  gl_account: '5680022',
  gl_account_name: 'COMPUTER AND HARDWARE',
  category: '',
  category_label: 'COMPUTER AND HARDWARE',
  category_source: 'gl',
  ...overrides,
});

const HISTORY: SapRejectionHistory = {
  date_from: '2026-10-01',
  date_to: '2026-10-09',
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
    row({ wdd_code: 2, reason: 'Wrong vendor', party_name: 'ARVIND TULI' }),
    row({
      wdd_code: 3,
      reason: 'GL & Budget',
      party_name: 'ABHIMAN EXPRESS',
      originator_code: 'USER07',
      originator_name: 'HARSH',
      total_amount: '1161061.00',
    }),
  ],
  by_originator: [
    { originator_code: 'USER39', originator_name: 'MUQEEM', count: 2, amount: '4104.00' },
    { originator_code: 'USER07', originator_name: 'HARSH', count: 1, amount: '1161061.00' },
  ],
};

vi.mock('../api/sap-approvals.queries', () => ({
  useSapRejectionHistory: () => ({
    data: HISTORY,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import RejectionHistoryPage from '../pages/RejectionHistoryPage';

describe('RejectionHistoryPage', () => {
  it('lists each rejection in the register format, picked categories plain and GL names in italics', () => {
    render(<RejectionHistoryPage />);
    expect(screen.getByText('3 rejections')).toBeInTheDocument();
    const first = screen.getByText('GL').closest('tr')!;
    expect(within(first).getByText('08-10-2026')).toBeInTheDocument();
    expect(within(first).getByText('Imprest')).not.toHaveClass('italic');
    const second = screen.getByText('Wrong vendor').closest('tr')!;
    expect(within(second).getByText('COMPUTER AND HARDWARE')).toHaveClass('italic');
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
});
