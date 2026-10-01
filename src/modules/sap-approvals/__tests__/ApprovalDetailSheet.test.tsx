/**
 * The detail sheet offers "Change to …" only where the server says the reader
 * may change a decision they took, and hands the right action to the dialog.
 * The request read and the full-document panel are mocked.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let detail: unknown;
vi.mock('../api/sap-approvals.queries', () => ({
  useSapApprovalRequest: () => ({ data: detail, isLoading: false, isError: false }),
}));
vi.mock('../components/ApprovalDocument', () => ({ ApprovalDocument: () => null }));

import { ApprovalDetailSheet } from '../components/ApprovalDetailSheet';
import type { SapApprovalDetail } from '../types';

const DECIDED = {
  wdd_code: 75424,
  object_type: '14',
  object_type_label: 'A/R Credit Note',
  draft_entry: 57198,
  status: 'APPROVED',
  stale_pending: false,
  superseded: false,
  document: { party_name: 'ILAHI CO.', total_amount: '17455.00', currency: 'INR' },
  decided_by: 'USER37',
  decided_by_name: 'HONEY SINGH',
  decided_at: '2026-09-17T11:00:00',
  request_count: 1,
  pending_request_count: 0,
  sibling_requests: [],
  posted_duplicates: [],
  is_duplicate: false,
  can_decide: false,
  can_withdraw: false,
  can_change_decision: true,
  stages: [],
  lines: [],
  lines_available: true,
} as unknown as SapApprovalDetail;

function renderSheet(request: SapApprovalDetail) {
  detail = request;
  const onAction = vi.fn();
  render(<ApprovalDetailSheet wddCode={75424} onOpenChange={vi.fn()} onAction={onAction} />);
  return onAction;
}

describe('ApprovalDetailSheet', () => {
  it('lets the approver change an approval to a rejection', () => {
    const onAction = renderSheet(DECIDED);
    expect(screen.getByText(/You approved this request/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change to rejected' }));
    expect(onAction).toHaveBeenCalledWith('reject', DECIDED);
  });

  it('lets the rejecter change a rejection to an approval', () => {
    const rejected = { ...DECIDED, status: 'REJECTED' } as SapApprovalDetail;
    const onAction = renderSheet(rejected);
    fireEvent.click(screen.getByRole('button', { name: 'Change to approved' }));
    expect(onAction).toHaveBeenCalledWith('approve', rejected);
  });

  it('offers no change when the server does not allow one', () => {
    renderSheet({ ...DECIDED, can_change_decision: false });
    expect(screen.queryByRole('button', { name: /Change to/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/You approved this request/)).not.toBeInTheDocument();
  });
});
