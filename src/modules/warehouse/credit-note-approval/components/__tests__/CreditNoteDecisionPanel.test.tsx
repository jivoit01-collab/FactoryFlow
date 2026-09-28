/**
 * The credit-note decision panel: SAP Portal's duplicate warning and override,
 * the typed SAP password for approvers with none stored, and the comment. The
 * query hooks and the SAP confirmation are mocked.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/components', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/components')>()),
  confirmSapPost: vi.fn().mockResolvedValue(true),
}));

const decide = vi.fn();
const actions = vi.fn();
vi.mock('../../api/creditNoteApproval.queries', () => ({
  useCreditNoteActions: () => actions(),
  useDecideCreditNoteApproval: () => ({ mutateAsync: decide, isPending: false }),
}));

import type { CreditNoteApproval } from '../../types';
import { CreditNoteDecisionPanel } from '../CreditNoteDecisionPanel';

const ROW = {
  id: 75424,
  doc_type_label: 'A/R Credit Note',
  party_name: 'ILAHI CO.',
  total_amount: '17455.00',
  currency: 'INR',
  moves_stock: true,
  stock_direction: 'IN',
  status: 'PENDING',
  credentials_configured: true,
} as unknown as CreditNoteApproval;

const POSTED = [{ doc_entry: 41202, doc_num: 626092650, doc_date: '2026-09-16' }];

function renderPanel(row = ROW, mode: 'approve' | 'reject' = 'approve', initialReason?: string) {
  const onModeChange = vi.fn();
  const onDecided = vi.fn();
  render(
    <CreditNoteDecisionPanel
      row={row}
      mode={mode}
      initialReason={initialReason}
      withoutQty={undefined}
      onModeChange={onModeChange}
      onCancel={vi.fn()}
      onDecided={onDecided}
    />,
  );
  return { onModeChange, onDecided };
}

describe('CreditNoteDecisionPanel', () => {
  beforeEach(() => {
    decide.mockReset().mockResolvedValue({ message: 'Credit note approved in SAP.', signed_as: 'USER37' });
    actions.mockReturnValue({ data: { posted_duplicates: [], duplicate_check_failed: false } });
  });

  it('asks for no password when one is stored, and sends none', async () => {
    const { onDecided } = renderPanel();
    expect(screen.queryByLabelText(/Your SAP password/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve in SAP' }));
    await waitFor(() => expect(onDecided).toHaveBeenCalled());
    expect(decide.mock.calls[0][0].payload).toEqual({ status: 'APPROVED' });
  });

  it('requires a typed password when none is stored, in a field that does not autofill', async () => {
    renderPanel({ ...ROW, credentials_configured: false } as CreditNoteApproval);
    const field = screen.getByLabelText(/Your SAP password/);
    expect(field).toHaveAttribute('type', 'password');
    expect(field).toHaveAttribute('autocomplete', 'off');
    const approve = screen.getByRole('button', { name: 'Approve in SAP' });
    expect(approve).toBeDisabled();
    fireEvent.change(field, { target: { value: 'typed-once' } });
    expect(approve).toBeEnabled();
    fireEvent.click(approve);
    await waitFor(() => expect(decide).toHaveBeenCalled());
    expect(decide.mock.calls[0][0].payload.sap_password).toBe('typed-once');
  });

  it('warns about a posted duplicate and approves only after the tick', async () => {
    actions.mockReturnValue({ data: { posted_duplicates: POSTED, duplicate_check_failed: false } });
    renderPanel();
    expect(screen.getByText(/already posted this credit note as #626092650/)).toBeInTheDocument();
    const approve = screen.getByRole('button', { name: 'Approve in SAP' });
    expect(approve).toBeDisabled();
    fireEvent.click(screen.getByLabelText('This is a separate credit note'));
    fireEvent.click(approve);
    await waitFor(() => expect(decide).toHaveBeenCalled());
    expect(decide.mock.calls[0][0].payload.confirm_duplicate).toBe(true);
  });

  it('turns into a rejection naming the duplicate in one click', () => {
    actions.mockReturnValue({ data: { posted_duplicates: POSTED, duplicate_check_failed: false } });
    const { onModeChange } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Reject as duplicate' }));
    expect(onModeChange).toHaveBeenCalledWith('reject', expect.stringContaining('#626092650'));
  });

  it('starts a rejection from the reason it was handed', () => {
    renderPanel(ROW, 'reject', 'Duplicate of credit note #626092650');
    expect(screen.getByLabelText('Reason')).toHaveValue('Duplicate of credit note #626092650');
    expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeEnabled();
  });

  it('asks for the tick when SAP finds a duplicate the panel was not shown', async () => {
    decide.mockRejectedValueOnce({
      response: { data: { code: 'DUPLICATE_CREDIT_NOTE', error: 'Already posted as #626092650.', duplicate_of: POSTED } },
    });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Approve in SAP' }));
    expect(await screen.findByText('Already posted as #626092650.')).toBeInTheDocument();
    expect(screen.getByLabelText('This is a separate credit note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve in SAP' })).toBeDisabled();
  });

  it('carries the comment into the approval', async () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/Comment for SAP/), { target: { value: ' Checked vs invoice 4411 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve in SAP' }));
    await waitFor(() => expect(decide).toHaveBeenCalled());
    expect(decide.mock.calls[0][0].payload.approval_comment).toBe('Checked vs invoice 4411');
  });
});
