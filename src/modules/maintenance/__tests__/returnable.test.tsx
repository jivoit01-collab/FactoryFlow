import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReturnableStatusBadge } from '../components/returnable/ReturnableStatusBadge';
import { OUTSTANDING_STATUSES, RETURNABLE_STATUS_LABELS } from '../constants/returnable.constants';
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

  it('labels every status', () => {
    expect(Object.keys(RETURNABLE_STATUS_LABELS)).toHaveLength(7);
  });
});

describe('returnableGatePassSchema', () => {
  const validPass = {
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

describe('reasonSchema', () => {
  it('demands a substantive reason for reject / cancel / short-close', () => {
    expect(reasonSchema.safeParse({ reason: 'ok' }).success).toBe(false);
    expect(reasonSchema.safeParse({ reason: 'Vendor scrapped the motor.' }).success).toBe(true);
  });
});
