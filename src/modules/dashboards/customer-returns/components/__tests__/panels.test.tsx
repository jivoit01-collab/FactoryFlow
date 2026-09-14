import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Recharts measures its container, which jsdom reports as 0x0, so the plot body
// renders nothing. Given a real box the chart mounts, which is what the trend
// test below is actually checking — that it mounts at all.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 260 }}>{children}</div>
    ),
  };
});

import { RETURNS_PALETTES } from '../../constants';
import type {
  ReturnsConditionRow,
  ReturnsCustomerRow,
  ReturnsReasonRow,
  ReturnsSkuRow,
} from '../../types';
import { ConditionSplit } from '../ConditionSplit';
import { ReasonBreakdown } from '../ReasonBreakdown';
import { RecentReturnsTable } from '../RecentReturnsTable';
import { ReturnsTrend } from '../ReturnsTrend';
import { TopCustomerTable } from '../TopCustomerTable';
import { TopSkuTable } from '../TopSkuTable';

const palette = RETURNS_PALETTES.light;

function conditionRow(
  condition: ReturnsConditionRow['condition'],
  quantity: number,
  share: number,
): ReturnsConditionRow {
  return { condition, label: condition, lines: 1, quantity, value: 0, share };
}

function reasonRow(
  reason: ReturnsReasonRow['reason'],
  label: string,
  quantity: number,
  lines = 1,
): ReturnsReasonRow {
  return { reason, label, lines, quantity, value: 0, share: quantity };
}

describe('ConditionSplit', () => {
  it('lists every condition, including the ones with nothing in them', () => {
    render(
      <ConditionSplit
        rows={[conditionRow('DAMAGED', 30, 75), conditionRow('GOOD', 10, 25)]}
        palette={palette}
      />,
    );

    expect(screen.getByText('Damaged')).toBeInTheDocument();
    // Not in the payload, but drawn at zero so the legend never changes shape.
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText('40 total')).toBeInTheDocument();
  });
});

describe('ConditionSplit — leaked', () => {
  it('draws Leaked as its own row, not folded into Damaged', () => {
    render(
      <ConditionSplit
        rows={[conditionRow('LEAKED', 12, 75), conditionRow('DAMAGED', 4, 25)]}
        palette={palette}
      />,
    );

    const rows = screen.getAllByRole('listitem').map((item) => item.textContent);
    // Worst first: leaked leads the legend because it points at one fixable cause.
    expect(rows[0]).toContain('Leaked');
    expect(rows[0]).toContain('12');
    expect(rows[1]).toContain('Damaged');
    expect(rows[1]).toContain('4');
  });

  it('gives Leaked a hue of its own', () => {
    expect(palette.condition.LEAKED).not.toBe(palette.condition.DAMAGED);
  });
});

describe('ReasonBreakdown', () => {
  it('ranks the buckets by quantity rather than the order they arrive in', () => {
    render(
      <ReasonBreakdown
        rows={[
          reasonRow('BREAKAGE', 'Breakage', 5),
          reasonRow('LEAKAGE', 'Leakage', 40),
          reasonRow('EXPIRY', 'Expiry / short shelf life', 12),
        ]}
        palette={palette}
      />,
    );

    const labels = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(labels[0]).toContain('Leakage');
    expect(labels[1]).toContain('Expiry');
    expect(labels[2]).toContain('Breakage');
  });

  it('drops a bucket nothing landed in rather than showing an empty rail', () => {
    render(
      <ReasonBreakdown
        rows={[reasonRow('LEAKAGE', 'Leakage', 40), reasonRow('QUALITY', 'Quality complaint', 0, 0)]}
        palette={palette}
      />,
    );

    expect(screen.queryByText('Quality complaint')).not.toBeInTheDocument();
  });

  it('calls out the lines nobody wrote a reason on', () => {
    render(
      <ReasonBreakdown
        rows={[
          reasonRow('LEAKAGE', 'Leakage', 40),
          reasonRow('UNSPECIFIED', 'No reason recorded', 10, 3),
        ]}
        palette={palette}
      />,
    );

    expect(screen.getByText(/no reason written on them at all/i)).toBeInTheDocument();
  });
});

describe('TopSkuTable', () => {
  const sku: ReturnsSkuRow = {
    item_code: 'OIL-1L',
    item_name: 'Jivo Canola 1L',
    uom: 'CAS',
    lines: 3,
    returns: 2,
    customers: 2,
    quantity: 40,
    value: 6000,
    share: 80,
    conditions: { GOOD: 10, DAMAGED: 30, LEAKED: 0, EXPIRED: 0, OTHER: 0 },
    reasons: { LEAKAGE: 30 },
  };

  it('chips the leading reason when one bucket dominates the SKU', () => {
    render(<TopSkuTable rows={[sku]} palette={palette} />);
    expect(screen.getByText('Leakage')).toBeInTheDocument();
    expect(screen.getByText('Jivo Canola 1L')).toBeInTheDocument();
  });

  it('names no leading reason when the buckets are merely split', () => {
    render(
      <TopSkuTable
        rows={[{ ...sku, reasons: { LEAKAGE: 10, EXPIRY: 8, UNSOLD: 7 } }]}
        palette={palette}
      />,
    );
    // 10 of 40 is under a third — a tie, not a cause.
    expect(screen.queryByText('Leakage')).not.toBeInTheDocument();
  });
});

describe('TopCustomerTable', () => {
  it('shows a truck with no paperwork as a gap rather than a zero', () => {
    const customer: ReturnsCustomerRow = {
      customer_code: 'CUST009',
      customer_name: 'Bansal Stores',
      returns: 1,
      lines: 0,
      skus: 0,
      quantity: 0,
      value: 0,
      share: 0,
      conditions: { GOOD: 0, DAMAGED: 0, LEAKED: 0, EXPIRED: 0, OTHER: 0 },
    };
    render(<TopCustomerTable rows={[customer]} palette={palette} />);
    expect(screen.getByText('not keyed in')).toBeInTheDocument();
  });
});

describe('RecentReturnsTable', () => {
  it('says whether a row is the arrival date or only the booking date', () => {
    render(
      <MemoryRouter>
        <RecentReturnsTable
          rows={[
            {
              id: 1,
              entry_no: 'GR-20260914-0001',
              status: 'ARRIVED',
              status_label: 'Arrived',
              basis: 'INVOICE',
              customer_code: 'CUST001',
              customer_name: 'Sharma Traders',
              arrived_on: '2026-09-10T06:00:00Z',
              has_arrived: true,
              lines: 2,
              quantity: 14,
            },
            {
              id: 2,
              entry_no: 'GR-20260914-0002',
              status: 'AWAITING_ARRIVAL',
              status_label: 'Awaiting Arrival',
              basis: 'LETTER_PAD',
              customer_code: 'CUST002',
              customer_name: 'Bansal Stores',
              arrived_on: '2026-09-12T06:00:00Z',
              has_arrived: false,
              lines: 0,
              quantity: 0,
            },
          ]}
        />
      </MemoryRouter>,
    );

    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('arrived')).toBeInTheDocument();
    expect(within(rows[2]).getByText('booked')).toBeInTheDocument();
  });
});

describe('ReturnsTrend', () => {
  it('mounts with data and states the empty case plainly', () => {
    const { rerender } = render(
      <ReturnsTrend
        trend={[{ bucket: '2026-09-10', returns: 2, quantity: 40, damaged_quantity: 30 }]}
        window={{ from_date: '2026-09-01', to_date: '2026-09-14', days: 14, granularity: 'day' }}
        palette={palette}
      />,
    );
    expect(screen.getByText('Returns over time')).toBeInTheDocument();

    rerender(
      <ReturnsTrend
        trend={[]}
        window={{ from_date: '2026-09-01', to_date: '2026-09-14', days: 14, granularity: 'day' }}
        palette={palette}
      />,
    );
    expect(screen.getByText('Nothing came back in this window.')).toBeInTheDocument();
  });
});
