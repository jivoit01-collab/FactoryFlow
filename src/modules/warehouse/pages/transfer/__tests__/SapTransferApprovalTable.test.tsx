/**
 * The approval queue's readability contract.
 *
 * The table was rewritten because every cell used to be a stack of prose, so
 * no two rows were the same height and the columns could not be scanned. These
 * assert the shape that fixed it: ONE row per approval, item lines only after
 * the row is opened, and the posted number — never the draft's — offered as the
 * thing to carry into the Awaiting transfer tab.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SapTransferApproval } from '../../../types';
import { SapTransferApprovalTable } from '../SapTransferApprovalTable';

const PENDING: SapTransferApproval = {
  id: 75059,
  obj_type: '67',
  doc_type_label: 'Stock Transfer',
  draft_entry: 56947,
  // Provisional: this number is on other open drafts too, and already belongs
  // to a different posted transfer.
  doc_num: 926676729,
  posted_doc_entry: null,
  posted_doc_num: null,
  from_warehouse: 'BH-BS',
  to_warehouse: 'BH-PC',
  doc_date: '2026-09-12',
  comments: 'Shift 2 top-up',
  status: 'PENDING',
  rejection_reason: null,
  current_step: 9,
  approver_code: 'USER24',
  approver_name: 'Gautam CHanana',
  decided_by: null,
  decided_by_name: null,
  decided_at: null,
  credentials_configured: false,
  is_mine: false,
  can_decide: false,
  lines: [
    {
      line_num: 0,
      item_code: 'PM0000594',
      item_name: 'PREFORM 40 GMS 36 MM',
      quantity: 50400,
      from_warehouse: 'BH-BS',
      to_warehouse: 'BH-PC',
      source_stock: 12000,
    },
    {
      line_num: 1,
      item_code: 'PM0000235',
      item_name: 'CAPS 1 LTR WHITE AND YELLOW SMALL PLAIN',
      quantity: 12000,
      from_warehouse: 'BH-BS',
      to_warehouse: 'BH-PC',
      source_stock: 80000,
    },
  ],
  created_at: '2026-09-12T16:33:00',
  created_by: 'SHAHRUKH',
};

const APPROVED: SapTransferApproval = {
  ...PENDING,
  id: 74976,
  obj_type: '1250000001',
  doc_type_label: 'Transfer Request',
  draft_entry: 56872,
  doc_num: 926656516,
  posted_doc_entry: 2742,
  // Deliberately NOT the draft's number — that divergence is the whole point.
  posted_doc_num: 926656521,
  status: 'APPROVED',
  approver_code: null,
  approver_name: null,
  decided_by: 'USER06',
  decided_by_name: 'LOVPREET SINGH',
  decided_at: '2026-09-11T17:17:00',
  lines: [{ ...PENDING.lines[0], source_stock: 90000 }],
};

function renderTable(props: Partial<Parameters<typeof SapTransferApprovalTable>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SapTransferApprovalTable rows={[PENDING]} isLoading={false} isError={false} {...props} />
    </QueryClientProvider>,
  );
}

describe('SapTransferApprovalTable', () => {
  it('gives each approval exactly one row, with the lines hidden until asked for', () => {
    renderTable();
    // One header row + one body row. Item lines are not in the grid.
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.queryByText('PREFORM 40 GMS 36 MM')).not.toBeInTheDocument();
    // The grid summarises them instead: 2 lines, 62,400 in total.
    expect(screen.getByText('2 lines')).toBeInTheDocument();
    expect(screen.getByText('62,400')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Stock Transfer'));
    expect(screen.getByText('PREFORM 40 GMS 36 MM')).toBeInTheDocument();
    expect(screen.getByText('Shift 2 top-up', { exact: false })).toBeInTheDocument();
  });

  it('warns in the grid when the sending warehouse is short, because that changes the decision', () => {
    renderTable();
    // One of the two lines is short (12,000 on hand against 50,400 asked).
    expect(screen.getByText('1 short')).toBeInTheDocument();
  });

  it('leads a decided row with the number SAP gave the document, not the draft it came from', () => {
    renderTable({ rows: [APPROVED], view: 'APPROVED' });
    const row = screen.getAllByRole('row')[1];
    // The posted number is the prominent one and is copyable.
    expect(within(row).getByRole('button', { name: /926656521/ })).toBeInTheDocument();
    // The draft's own provisional number is not offered at all.
    expect(within(row).queryByText(/926656516/)).not.toBeInTheDocument();
    expect(within(row).getByText('draft 56872')).toBeInTheDocument();
  });

  it('swaps the person column from the authorizer to whoever decided it', () => {
    const { unmount } = renderTable();
    expect(screen.getByText('Waiting on')).toBeInTheDocument();
    expect(screen.getByText('USER24')).toBeInTheDocument();
    unmount();

    renderTable({ rows: [APPROVED], view: 'APPROVED' });
    expect(screen.getByText('Decided by')).toBeInTheDocument();
    expect(screen.getByText('USER06')).toBeInTheDocument();
  });
});
