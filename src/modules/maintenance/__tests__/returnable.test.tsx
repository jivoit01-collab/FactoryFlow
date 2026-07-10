import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReturnableStatusBadge } from '../components/returnable/ReturnableStatusBadge';
import { ReturnableTypeBadge } from '../components/returnable/ReturnableTypeBadge';
import {
  OUTSTANDING_STATUSES,
  RETURNABLE_STATUS_LABELS,
  RETURNABLE_STATUS_OPTIONS,
} from '../constants/returnable.constants';
import {
  reasonSchema,
  returnableGateOutSchema,
  returnableGatePassSchema,
} from '../schemas/returnable.schema';

describe('ReturnableStatusBadge', () => {
  it('renders a readable label for every status', () => {
    render(<ReturnableStatusBadge status="PARTIALLY_RETURNED" />);
    expect(screen.getByText('Partially Returned')).toBeInTheDocument();
  });

  it('shows overdue alongside the real status, not instead of it', () => {
    render(<ReturnableStatusBadge status="OUT" isOverdue daysOverdue={4} />);
    expect(screen.getByText('Out')).toBeInTheDocument();
    expect(screen.getByText('4d overdue')).toBeInTheDocument();
  });

  it('omits the overdue marker when the pass is on time', () => {
    render(<ReturnableStatusBadge status="OUT" />);
    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
  });
});

describe('returnable constants', () => {
  it('treats OUT and PARTIALLY_RETURNED as outstanding, matching the backend', () => {
    expect(OUTSTANDING_STATUSES).toEqual(['OUT', 'PARTIALLY_RETURNED']);
    expect(OUTSTANDING_STATUSES).not.toContain('RETURNED');
  });

  it('labels every status, including the approval stage', () => {
    expect(Object.keys(RETURNABLE_STATUS_LABELS)).toHaveLength(8);
    expect(RETURNABLE_STATUS_LABELS.PENDING_APPROVAL).toBe('Pending Approval');
  });
});

describe('approval stage', () => {
  it('renders the pending-approval badge', () => {
    render(<ReturnableStatusBadge status="PENDING_APPROVAL" />);
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
  });

  it('offers pending approval as a filter option ahead of pending gate out', () => {
    const values = RETURNABLE_STATUS_OPTIONS.map((option) => option.value);
    expect(values.indexOf('PENDING_APPROVAL')).toBeLessThan(values.indexOf('PENDING_GATE_OUT'));
  });
});

describe('returnableGatePassSchema', () => {
  const validPass = {
    is_returnable: true,
    purpose: 'REPAIR' as const,
    party_name: 'Sharma Motors',
    expected_return_date: '2026-08-01',
    items_input: [{ item_name: 'Gear Motor', quantity_out: '2' }],
  };

  it('accepts a well-formed pass', () => {
    expect(returnableGatePassSchema.safeParse(validPass).success).toBe(true);
  });

  it('rejects a pass with no items', () => {
    const result = returnableGatePassSchema.safeParse({ ...validPass, items_input: [] });
    expect(result.success).toBe(false);
  });

  it('rejects a zero or negative quantity', () => {
    const zero = returnableGatePassSchema.safeParse({
      ...validPass,
      items_input: [{ item_name: 'Gear Motor', quantity_out: '0' }],
    });
    expect(zero.success).toBe(false);

    const negative = returnableGatePassSchema.safeParse({
      ...validPass,
      items_input: [{ item_name: 'Gear Motor', quantity_out: '-1' }],
    });
    expect(negative.success).toBe(false);
  });

  it('requires an expected return date — the whole module hangs off it', () => {
    const result = returnableGatePassSchema.safeParse({ ...validPass, expected_return_date: '' });
    expect(result.success).toBe(false);
  });
});

describe('returnableGateOutSchema', () => {
  it('accepts either a selected vehicle or a typed vehicle number', () => {
    expect(
      returnableGateOutSchema.safeParse({ vehicle: 3, driver: 5 }).success,
    ).toBe(true);
    expect(
      returnableGateOutSchema.safeParse({
        vehicle_number_manual: 'GJ01AB1234',
        driver_name_manual: 'Ramesh',
      }).success,
    ).toBe(true);
  });

  it('rejects gate out with no vehicle identified at all', () => {
    const result = returnableGateOutSchema.safeParse({ driver_name_manual: 'Ramesh' });
    expect(result.success).toBe(false);
  });

  it('rejects gate out with no driver identified at all', () => {
    const result = returnableGateOutSchema.safeParse({ vehicle_number_manual: 'GJ01AB1234' });
    expect(result.success).toBe(false);
  });
});

describe('returnable vs non-returnable', () => {
  const items = [{ item_name: 'Crude Palm Oil', quantity_out: '5' }];

  it('renders the type badge for both kinds', () => {
    const { unmount } = render(<ReturnableTypeBadge isReturnable />);
    expect(screen.getByText('Returnable')).toBeInTheDocument();
    unmount();

    render(<ReturnableTypeBadge isReturnable={false} />);
    expect(screen.getByText('Non-returnable')).toBeInTheDocument();
  });

  it('accepts a non-returnable pass with a recipient and no return date', () => {
    const result = returnableGatePassSchema.safeParse({
      is_returnable: false,
      purpose: 'OTHER',
      recipient_name: 'Suresh Patel',
      items_input: items,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-returnable pass with no recipient', () => {
    const result = returnableGatePassSchema.safeParse({
      is_returnable: false,
      purpose: 'OTHER',
      items_input: items,
    });
    expect(result.success).toBe(false);
  });

  it('does not demand a party or return date on a non-returnable pass', () => {
    const result = returnableGatePassSchema.safeParse({
      is_returnable: false,
      purpose: 'OTHER',
      recipient_name: 'Suresh Patel',
      party_name: '',
      expected_return_date: '',
      items_input: items,
    });
    expect(result.success).toBe(true);
  });

  it('still demands a party and return date on a returnable pass', () => {
    const missingDate = returnableGatePassSchema.safeParse({
      is_returnable: true,
      purpose: 'REPAIR',
      party_name: 'Sharma Motors',
      items_input: items,
    });
    expect(missingDate.success).toBe(false);

    const missingParty = returnableGatePassSchema.safeParse({
      is_returnable: true,
      purpose: 'REPAIR',
      expected_return_date: '2026-08-01',
      items_input: items,
    });
    expect(missingParty.success).toBe(false);
  });

  it('does not require a recipient on a returnable pass', () => {
    const result = returnableGatePassSchema.safeParse({
      is_returnable: true,
      purpose: 'REPAIR',
      party_name: 'Sharma Motors',
      expected_return_date: '2026-08-01',
      items_input: items,
    });
    expect(result.success).toBe(true);
  });
});

describe('reasonSchema', () => {
  it('demands a substantive reason for reject / cancel / short-close', () => {
    expect(reasonSchema.safeParse({ reason: 'ok' }).success).toBe(false);
    expect(reasonSchema.safeParse({ reason: 'Vendor scrapped the motor.' }).success).toBe(true);
  });
});
