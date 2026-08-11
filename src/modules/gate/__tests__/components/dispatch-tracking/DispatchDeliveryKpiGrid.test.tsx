import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type DispatchTrackingSummary } from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.api';
import { DispatchDeliveryKpiGrid } from '@/modules/gate/components/dispatch-tracking';

// ═══════════════════════════════════════════════════════════════
// The grid is presentational — it takes a summary and renders tiles —
// so it is exercised directly, with no query or router to stub.
// Both the dispatch module dashboard and the Dispatch Tracking
// dashboard render this component, so these assertions pin what
// both screens show.
// ═══════════════════════════════════════════════════════════════

const DATA: DispatchTrackingSummary = {
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

const renderGrid = (data: DispatchTrackingSummary = DATA, onOpen = vi.fn()) => {
  render(<DispatchDeliveryKpiGrid data={data} onOpen={onOpen} />);
  return onOpen;
};

/** The tile value sits next to its label, so assert on the tile as a whole. */
function tile(label: string): HTMLElement {
  const node = screen.getByText(label).closest('div[class*="rounded"]');
  expect(node, `no tile found for "${label}"`).toBeTruthy();
  return node as HTMLElement;
}

describe('DispatchDeliveryKpiGrid', () => {
  it('counts overdue deliveries and names the worst delay', () => {
    renderGrid();
    const overdue = tile('Overdue deliveries');
    expect(overdue.textContent).toContain('3');
    expect(overdue.textContent).toContain('worst 6 days past reach-by');
  });

  it('counts unloading trucks as reached — they have arrived but are not signed off', () => {
    renderGrid();
    // REACHED_DESTINATION 3 + UNLOADING 2
    expect(tile('Reached destination').textContent).toContain('5');
  });

  it('keeps partially delivered out of Delivered so a short delivery is not hidden', () => {
    renderGrid();
    const delivered = tile('Delivered');
    expect(delivered.textContent).toContain('14'); // not 16
    expect(delivered.textContent).toContain('4 today');
    expect(tile('Partially delivered').textContent).toContain('2');
  });

  it('shows returned trucks on their own tile', () => {
    renderGrid();
    expect(tile('Returned').textContent).toContain('1');
  });

  it('renders on-time rate as a percentage and transit as days', () => {
    renderGrid();
    expect(tile('On-time rate').textContent).toContain('82%');
    expect(tile('Avg transit').textContent).toContain('2.5 d');
  });

  it('renders an em dash — not a zero — when a rate has no answer yet', () => {
    renderGrid({ ...DATA, on_time_rate: null, avg_transit_days: null });
    expect(tile('On-time rate').textContent).toContain('—');
    expect(tile('On-time rate').textContent).not.toContain('0%');
    expect(tile('Avg transit').textContent).toContain('—');
  });

  it('surfaces trucks with nothing logged since they left the gate', () => {
    renderGrid();
    expect(tile('No update yet').textContent).toContain('5');
  });

  it('shows open trips against how many are closed', () => {
    renderGrid();
    const trips = tile('Trips open');
    expect(trips.textContent).toContain('24');
    expect(trips.textContent).toContain('16 of 40 closed');
  });

  it('reads "None past their reach-by date" when nothing is overdue', () => {
    renderGrid({ ...DATA, late: { count: 0, trucks: [] } });
    expect(tile('Overdue deliveries').textContent).toContain('None past their reach-by date');
  });

  it('opens the board unfiltered for overdue — no single status reproduces that count', () => {
    const onOpen = renderGrid();
    tile('Overdue deliveries').click();
    expect(onOpen).toHaveBeenCalledWith();
  });

  it('deep-links each status tile to its own board filter', () => {
    const onOpen = renderGrid();
    tile('In transit').click();
    expect(onOpen).toHaveBeenCalledWith('IN_TRANSIT');
    tile('Partially delivered').click();
    expect(onOpen).toHaveBeenCalledWith('PARTIALLY_DELIVERED');
    tile('No update yet').click();
    expect(onOpen).toHaveBeenCalledWith('DISPATCHED');
  });
});
