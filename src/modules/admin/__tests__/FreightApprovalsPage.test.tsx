import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DispatchFreightApproval } from '@/modules/dispatch/api/freightApproval.api';

import FreightApprovalsPage from '../pages/FreightApprovalsPage';

const approval = (patch: Partial<DispatchFreightApproval> = {}): DispatchFreightApproval => ({
  id: 41,
  company: 1,
  company_code: 'JIVO_OIL',
  company_name: 'Jivo Oil',
  vehicle: 9,
  vehicle_no: 'HR55AB1234',
  vehicle_capacity_kg: 9000,
  transporter_name: 'Om Logistics',
  destination: 7,
  destination_label: 'KHANNA, PUNJAB',
  slab: 3,
  slab_label: '15 MT',
  suggested_slab: 2,
  suggested_slab_label: '10 MT',
  rate_basis: 'PER_TRIP',
  rate_amount: 20250,
  load_kg: null,
  benchmark_freight: 20250,
  actual_freight: 22000,
  excess: 1750,
  bill_doc_nums: '626090001, 626090002',
  customer_names: 'Acme Foods',
  bill_count: 2,
  status: 'PENDING',
  reason: 'Festival rates',
  requested_by_name: 'Desk',
  requested_at: '2026-09-29T10:00:00+05:30',
  reviewed_by_name: '',
  reviewed_at: null,
  review_notes: '',
  ...patch,
});

const perms = vi.hoisted(() => ({ approve: true }));
const review = vi.hoisted(() => vi.fn());

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => perms.approve }),
}));

vi.mock('@/modules/dispatch/api/freightApproval.api', () => ({
  useFreightApprovals: () => ({
    data: [approval()],
    isLoading: false,
    isError: false,
    error: null,
  }),
  useReviewFreightApproval: () => ({ mutateAsync: review, isPending: false }),
}));

describe('FreightApprovalsPage', () => {
  beforeEach(() => {
    perms.approve = true;
    review.mockReset();
    review.mockResolvedValue(approval({ status: 'APPROVED' }));
  });

  it('shows what the approver is deciding: benchmark, actual, excess and the slab change', () => {
    render(<FreightApprovalsPage />);

    const card = screen.getByText('HR55AB1234').closest('article')!;
    expect(within(card).getByText('₹20,250')).toBeInTheDocument();
    expect(within(card).getByText('₹22,000')).toBeInTheDocument();
    expect(within(card).getByText('₹1,750')).toBeInTheDocument();
    expect(within(card).getByText('8.6% over')).toBeInTheDocument();
    expect(within(card).getByText(/capacity puts it in 10 MT/)).toBeInTheDocument();
    expect(within(card).getByText('Festival rates')).toBeInTheDocument();
  });

  it('refuses without a reason, and sends one when given', async () => {
    render(<FreightApprovalsPage />);

    fireEvent.click(screen.getByRole('button', { name: /refuse/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Refuse' }));
    expect(await within(dialog).findByText(/Say why it is refused/)).toBeInTheDocument();
    expect(review).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/why is it refused/i), {
      target: { value: 'Use Om at 20,250' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Refuse' }));
    await vi.waitFor(() =>
      expect(review).toHaveBeenCalledWith({ id: 41, approve: false, notes: 'Use Om at 20,250' }),
    );
  });

  it('approves with an optional note', async () => {
    render(<FreightApprovalsPage />);

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await vi.waitFor(() =>
      expect(review).toHaveBeenCalledWith({ id: 41, approve: true, notes: '' }),
    );
  });

  it('gives a viewer the queue but nothing to decide with', () => {
    perms.approve = false;
    render(<FreightApprovalsPage />);

    expect(screen.getByText('HR55AB1234')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /refuse/i })).not.toBeInTheDocument();
  });
});
