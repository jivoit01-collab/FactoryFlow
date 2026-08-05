import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MaintenanceFireIssuePage from '../pages/MaintenanceFireIssuePage';

/** One issue, carrying every field the Issue Equipment form captures. */
const ISSUE = {
  id: 7,
  company: 1,
  issued_to_name: 'Ramesh Kumar',
  employee_code: 'E1042',
  department: 'Bottling',
  contact: '9876543210',
  issued_at: '2026-08-05T09:30:00Z',
  expected_return: '2026-08-06T09:30:00Z',
  returned_at: null,
  purpose: 'Night shift fire duty',
  status: 'ISSUED' as const,
  status_display: 'Issued',
  issued_by: 3,
  issued_by_name: 'Fire Head',
  remarks: 'Gear handed over at the fire post',
  is_overdue: false,
  total_items: 1,
  pending_items: 1,
  is_active: true,
  created_by: 3,
  created_by_name: 'Fire Head',
  updated_by: null,
  updated_by_name: '',
  created_at: '2026-08-05T09:31:00Z',
  updated_at: '2026-08-05T09:31:00Z',
  items: [
    {
      id: 11,
      company: 1,
      issue: 7,
      fire_item: 2,
      fire_item_name: 'Fire Helmet',
      fire_item_part_number: 'FR-HLM-01',
      equipment_name: 'Helmet',
      quantity_issued: '2.000',
      quantity_returned: '0.000',
      pending_return_qty: '2.000',
      return_condition: 'OK' as const,
      return_condition_display: 'OK',
      remarks: 'Size L',
      is_active: true,
      created_by: 3,
      created_by_name: 'Fire Head',
      updated_by: null,
      updated_by_name: '',
      created_at: '2026-08-05T09:31:00Z',
      updated_at: '2026-08-05T09:31:00Z',
    },
  ],
};

vi.mock('../api', () => ({
  useFireIssues: () => ({ data: [ISSUE], isLoading: false, isFetching: false, refetch: vi.fn() }),
  useFireIssue: () => ({ data: ISSUE, isLoading: false }),
  useFireItems: () => ({ data: [] }),
  useCreateFireIssue: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteFireIssue: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReturnFireIssue: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

function openIssue() {
  render(<MaintenanceFireIssuePage />);
  fireEvent.click(screen.getByLabelText('Open issue for Ramesh Kumar'));
}

describe('fire equipment issue detail', () => {
  it('opens the issue from the row itself', () => {
    render(<MaintenanceFireIssuePage />);
    expect(screen.queryByText('Night shift fire duty')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Open issue for Ramesh Kumar'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows every field captured when the issue was created', () => {
    openIssue();
    const dialog = screen.getByRole('dialog');

    for (const value of [
      'E1042',
      'Bottling',
      '9876543210',
      'Night shift fire duty',
      'Fire Head',
      'Gear handed over at the fire post',
    ]) {
      expect(dialog).toHaveTextContent(value);
    }
  });

  it('shows each equipment line with its store item and remarks', () => {
    openIssue();
    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveTextContent('Helmet');
    expect(dialog).toHaveTextContent('FR-HLM-01');
    expect(dialog).toHaveTextContent('Size L');
  });

  it('still offers the return action on an outstanding issue', () => {
    openIssue();
    expect(screen.getByRole('button', { name: /record return/i })).toBeInTheDocument();
  });
});
