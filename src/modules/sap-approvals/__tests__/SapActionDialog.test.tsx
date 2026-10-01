/**
 * The decision dialog's handling of the typed SAP password: a password field
 * the browser does not autofill, sent only when typed, and gone when the
 * dialog closes. Also changing a decision already taken. SAP and the
 * confirmation are mocked.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/components')>()),
  confirmSapPost: vi.fn().mockResolvedValue(true),
}));

const decide = vi.fn();
const withdraw = vi.fn();
const invalidate = vi.fn();
vi.mock('../api/sap-approvals.queries', () => ({
  useSapApprovalActions: () => ({ decide, withdraw, invalidate }),
}));

import { confirmSapPost } from '@/shared/components';

import { SapActionDialog } from '../components/SapActionDialog';
import type { SapApprovalRequest } from '../types';
import { changeMode } from '../utils/decision';

const REQUEST = {
  wdd_code: 75424,
  object_type: '14',
  object_type_label: 'A/R Credit Note',
  draft_entry: 57198,
  status: 'PENDING',
  document: { party_name: 'ILAHI CO.', total_amount: '17455.00', currency: 'INR' },
  request_count: 1,
  pending_request_count: 1,
  posted_duplicates: [],
  credentials_configured: true,
} as unknown as SapApprovalRequest;

function renderDialog(request = REQUEST, mode: 'approve' | 'reject' | 'withdraw' = 'approve') {
  const onClose = vi.fn();
  const onDone = vi.fn();
  const view = render(
    <SapActionDialog request={request} mode={mode} onClose={onClose} onDone={onDone} />,
  );
  return { ...view, onClose, onDone };
}

describe('SapActionDialog', () => {
  beforeEach(() => {
    decide.mockReset().mockResolvedValue({ message: 'Approved in SAP.', signed_as: 'USER37' });
    withdraw.mockReset().mockResolvedValue({ message: 'Withdrawn in SAP.', signed_as: 'USER37' });
  });

  it('asks for the password in a field the browser does not autofill', () => {
    renderDialog();
    const field = screen.getByLabelText(/Your SAP password/);
    expect(field).toHaveAttribute('type', 'password');
    expect(field).toHaveAttribute('autocomplete', 'off');
  });

  it('sends no password when none is typed and one is stored', async () => {
    const { onDone } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Approve in SAP' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(decide).toHaveBeenCalledWith(75424, {
      approve: true,
      remarks: '',
      sapPassword: undefined,
      confirmDuplicate: false,
    });
  });

  it('insists on a password when none is stored', async () => {
    renderDialog({ ...REQUEST, credentials_configured: false });
    fireEvent.click(screen.getByRole('button', { name: 'Approve in SAP' }));
    expect(await screen.findByText(/Type your SAP password/)).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });

  it('passes a typed password to SAP and forgets it when the dialog closes', async () => {
    const { rerender } = renderDialog({ ...REQUEST, credentials_configured: false }, 'withdraw');
    fireEvent.change(screen.getByLabelText(/Your SAP password/), { target: { value: 'pw-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw this request' }));
    await waitFor(() => expect(withdraw).toHaveBeenCalledWith(75424, 'pw-123'));

    rerender(<SapActionDialog request={null} mode={null} onClose={vi.fn()} onDone={vi.fn()} />);
    rerender(
      <SapActionDialog request={REQUEST} mode="withdraw" onClose={vi.fn()} onDone={vi.fn()} />,
    );
    expect(screen.getByLabelText(/Your SAP password/)).toHaveValue('');
  });

  it('clears a password SAP refused', async () => {
    withdraw.mockRejectedValue({
      status: 400,
      response: { data: { error: 'SAP refused the login' } },
    });
    renderDialog(REQUEST, 'withdraw');
    const field = screen.getByLabelText(/Your SAP password/);
    fireEvent.change(field, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw this request' }));
    expect(await screen.findByText('SAP refused the login')).toBeInTheDocument();
    expect(field).toHaveValue('');
  });

  it('needs a reason to reject', async () => {
    renderDialog(REQUEST, 'reject');
    fireEvent.click(screen.getByRole('button', { name: 'Reject in SAP' }));
    expect(await screen.findByText(/Say why this is being rejected/)).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });

  it('turns a 409 duplicate into an explicit tick, then approves with it', async () => {
    decide.mockRejectedValueOnce({
      status: 409,
      response: {
        data: {
          code: 'DUPLICATE_DOCUMENT',
          error: 'This document is already posted in SAP as A/R Credit Note #626096824.',
          duplicate_of: [{ doc_entry: 1963, doc_num: 626096824, doc_date: '2026-09-16' }],
        },
      },
    });
    const { onDone } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Approve in SAP' }));
    const tick = await screen.findByRole('checkbox', { name: 'Approve anyway' });
    fireEvent.click(tick);
    fireEvent.click(screen.getByRole('button', { name: 'Approve in SAP' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(decide).toHaveBeenLastCalledWith(
      75424,
      expect.objectContaining({ confirmDuplicate: true }),
    );
  });
});

describe('changing a decision already taken', () => {
  const APPROVED = {
    ...REQUEST,
    status: 'APPROVED',
    pending_request_count: 0,
    decided_by: 'USER37',
    decided_at: '2026-09-17T11:00:00',
    can_change_decision: true,
  } as unknown as SapApprovalRequest;
  const REJECTED = { ...APPROVED, status: 'REJECTED' } as SapApprovalRequest;

  beforeEach(() => {
    decide.mockReset().mockResolvedValue({
      message: 'A/R Credit Note changed to rejected in SAP.',
      signed_as: 'USER37',
      changed_from: 'APPROVED',
    });
    vi.mocked(confirmSapPost).mockClear();
  });

  it('offers the other decision only when the server allows a change', () => {
    expect(changeMode(APPROVED)).toBe('reject');
    expect(changeMode(REJECTED)).toBe('approve');
    expect(changeMode({ ...APPROVED, can_change_decision: false })).toBeNull();
    // Posted or withdrawn requests are final whatever the flag says.
    expect(changeMode({ ...APPROVED, status: 'GENERATED' } as SapApprovalRequest)).toBeNull();
    expect(changeMode({ ...APPROVED, status: 'CANCELLED' } as SapApprovalRequest)).toBeNull();
    expect(changeMode({ ...APPROVED, status: 'PENDING' } as SapApprovalRequest)).toBeNull();
  });

  it('says what it changes and needs a reason to change to rejected', async () => {
    renderDialog(APPROVED, 'reject');
    expect(screen.getByRole('heading', { name: 'Change to rejected in SAP' })).toBeInTheDocument();
    expect(screen.getByText(/You approved this request/)).toBeInTheDocument();
    expect(screen.getByText(/changes your\s+decision to rejected/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Change to rejected in SAP' }));
    expect(await screen.findByText(/Say why this is being rejected/)).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });

  it('sends the other decision through the same call and confirms the change first', async () => {
    const { onDone } = renderDialog(APPROVED, 'reject');
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'wrong party' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change to rejected in SAP' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());

    expect(decide).toHaveBeenCalledWith(75424, {
      approve: false,
      remarks: 'wrong party',
      sapPassword: undefined,
      confirmDuplicate: false,
    });
    const confirmation = vi.mocked(confirmSapPost).mock.calls[0][0];
    expect(confirmation.title).toBe('Change to rejected in SAP?');
    expect(confirmation.details).toContainEqual({ label: 'Change', value: 'Approved → Rejected' });
    expect(onDone).toHaveBeenCalledWith(
      'A/R Credit Note changed to rejected in SAP. Signed in SAP as USER37.',
    );
  });

  it('changes a rejection to an approval without asking for a reason', async () => {
    const { onDone } = renderDialog(REJECTED, 'approve');
    expect(screen.getByText(/You rejected this request/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change to approved in SAP' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(decide).toHaveBeenCalledWith(75424, expect.objectContaining({ approve: true }));
    expect(vi.mocked(confirmSapPost).mock.calls[0][0].details).toContainEqual({
      label: 'Change',
      value: 'Rejected → Approved',
    });
  });

  it('keeps the plain titles for a request still pending', () => {
    renderDialog(REQUEST, 'reject');
    expect(screen.getByRole('heading', { name: 'Reject in SAP' })).toBeInTheDocument();
    expect(screen.queryByText(/changes your/)).not.toBeInTheDocument();
  });
});
