import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Mocks — the component's only inputs are the tracking summary and
// the router, so both are stubbed and the tiles are asserted directly.
// ═══════════════════════════════════════════════════════════════

const summary = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries', () => ({
  useDispatchTrackingSummary: () => summary.current,
}));

import { DispatchDeliveryKpis } from '../components/dashboard/DispatchDeliveryKpis';

const DATA = {
  range: { from: '2026-07-11', to: '2026-08-11' },
  total_dispatched: 40,
  status_counts: {
    DISPATCHED: 5,
    IN_TRANSIT: 12,
    REACHED_DESTINATION: 3,
    UNLOADING: 2,
    DELIVERED: 14,
    PARTIALLY_DELIVERED: 2,
    RETURNED: 1,
    DELAYED: 1,
    CLOSED: 0,
  },
  active: 24,
  completed: 16,
  no_update_yet: 5,
  funnel: [],
  late: {
    count: 3,
    trucks: [
      { arrival: 1, arrival_no: 'A-1', vehicle_number: 'HR55', driver_name: '', driver_mobile: '', expected_reach_date: '2026-08-05', days_overdue: 6 },
      { arrival: 2, arrival_no: 'A-2', vehicle_number: 'HR56', driver_name: '', driver_mobile: '', expected_reach_date: '2026-08-09', days_overdue: 2 },
    ],
  },
  delivered_today: 4,
  avg_transit_days: 2.5,
  on_time_rate: 0.82,
};

/** The tile value sits next to its label, so assert on the tile as a whole. */
function tile(label: string): HTMLElement {
  const node = screen.getByText(label).closest('div[class*="rounded"]');
  expect(node, `no tile found for "${label}"`).toBeTruthy();
  return node as HTMLElement;
}

describe('DispatchDeliveryKpis', () => {
  it('shows a skeleton while loading', () => {
    summary.current = { isLoading: true, isError: false, data: undefined };
    const { container } = render(<DispatchDeliveryKpis />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5);
  });

  it('shows the error message when the summary fails', () => {
    summary.current = { isLoading: false, isError: true, error: new Error('boom'), data: undefined };
    render(<DispatchDeliveryKpis />);
    expect(screen.getByText(/failed to load delivery tracking|boom/i)).toBeTruthy();
  });

  it('counts overdue deliveries and names the worst delay', () => {
    summary.current = { isLoading: false, isError: false, data: DATA };
    render(<DispatchDeliveryKpis />);
    const overdue = tile('Overdue deliveries');
    expect(overdue.textContent).toContain('3');
    expect(overdue.textContent).toContain('worst 6 days past reach-by');
  });

  it('counts unloading trucks as reached — they have arrived but are not signed off', () => {
    summary.current = { isLoading: false, isError: false, data: DATA };
    render(<DispatchDeliveryKpis />);
    // REACHED_DESTINATION 3 + UNLOADING 2
    expect(tile('Reached destination').textContent).toContain('5');
  });

  it('shows partial, returned and delivered separately', () => {
    summary.current = { isLoading: false, isError: false, data: DATA };
    render(<DispatchDeliveryKpis />);
    expect(tile('Partially delivered').textContent).toContain('2');
    expect(tile('Returned').textContent).toContain('1');
    const delivered = tile('Delivered');
    expect(delivered.textContent).toContain('14');
    expect(delivered.textContent).toContain('4 today');
  });

  it('renders on-time rate as a percentage and transit as days', () => {
    summary.current = { isLoading: false, isError: false, data: DATA };
    render(<DispatchDeliveryKpis />);
    expect(tile('On-time rate').textContent).toContain('82%');
    expect(tile('Avg transit').textContent).toContain('2.5 d');
  });

  it('renders an em dash — not a zero — when a rate has no answer yet', () => {
    summary.current = {
      isLoading: false,
      isError: false,
      data: { ...DATA, on_time_rate: null, avg_transit_days: null },
    };
    render(<DispatchDeliveryKpis />);
    expect(tile('On-time rate').textContent).toContain('—');
    expect(tile('On-time rate').textContent).not.toContain('0%');
    expect(tile('Avg transit').textContent).toContain('—');
  });

  it('surfaces trucks with nothing logged since they left the gate', () => {
    summary.current = { isLoading: false, isError: false, data: DATA };
    render(<DispatchDeliveryKpis />);
    expect(tile('No update yet').textContent).toContain('5');
  });

  it('reads "None past their reach-by date" when nothing is overdue', () => {
    summary.current = {
      isLoading: false,
      isError: false,
      data: { ...DATA, late: { count: 0, trucks: [] } },
    };
    render(<DispatchDeliveryKpis />);
    expect(tile('Overdue deliveries').textContent).toContain('None past their reach-by date');
  });
});
