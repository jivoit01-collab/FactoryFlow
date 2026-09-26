/**
 * The decision dialog's handling of the typed SAP password: a password field
 * the browser does not autofill, sent only when typed, and gone when the
 * dialog closes. SAP and the confirmation are mocked.
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

import { SapActionDialog } from '../components/SapActionDialog';
import type { SapApprovalRequest } from '../types';

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
