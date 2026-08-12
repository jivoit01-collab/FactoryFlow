import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const summary = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('../../api', () => ({
  useServiceGRPOSummary: () => summary.current,
}));

import { ServiceGRPOInsights } from '../../components/ServiceGRPOInsights';

const DATA = {
  period: { year: 2026, month: 8 },
  queue: {
    total: 39,
    ready: 30,
    awaiting_bilty: 9,
    oldest_days: 54,
    freight_known: 0,
    freight_value: '0.00',
    age_buckets: { '0-7': 31, '8-30': 7, '31-90': 1, '90+': 0, undated: 0 },
  },
  postings: { posted: 12, posted_value: '245000.00', failed: 3, pending: 0 },
  by_transporter: [
    { transporter_name: 'Arnav Transport Service', count: 12 },
    { transporter_name: 'Abhiman Express', count: 5 },
  ],
  by_state: [
    { state: 'HR', count: 15 },
    { state: 'Unknown', count: 1 },
  ],
};

const ok = (data: unknown = DATA) => ({ data, isLoading: false, isError: false });

/** Tile values sit beside their label, so assert on the whole tile. */
function tile(label: string): HTMLElement {
  return screen.getByText(label).closest('div[class*="rounded"]') as HTMLElement;
}

describe('ServiceGRPOInsights', () => {
  it('splits the queue into ready and awaiting rather than one opaque total', () => {
    summary.current = ok();
    render(<ServiceGRPOInsights year={2026} month={8} />);
    expect(tile('In queue').textContent).toContain('39');
    expect(tile('Ready to post').textContent).toContain('30');
    expect(tile('Awaiting bilty').textContent).toContain('9');
  });

  it('describes awaiting-bilty as a stage, not a failure', () => {
    summary.current = ok();
    render(<ServiceGRPOInsights year={2026} month={8} />);
    expect(tile('Awaiting bilty').textContent).toContain('Truck gone, note not back yet');
  });

  it('abbreviates the posted value and counts the postings', () => {
    summary.current = ok();
    render(<ServiceGRPOInsights year={2026} month={8} />);
    const posted = tile('Posted this month');
    expect(posted.textContent).toContain('₹2.5 L');
    expect(posted.textContent).toContain('12 GRPOs');
  });

  it('points at History when something failed, and says so plainly when nothing did', () => {
    summary.current = ok();
    render(<ServiceGRPOInsights year={2026} month={8} />);
    expect(tile('Failed').textContent).toContain('Check History for the reason');
  });

  it('reads "None this month" when there were no failures', () => {
    summary.current = ok({ ...DATA, postings: { ...DATA.postings, failed: 0 } });
    render(<ServiceGRPOInsights year={2026} month={8} />);
    expect(tile('Failed').textContent).toContain('None this month');
  });

  it('shows an em dash for oldest when nothing is queued', () => {
    summary.current = ok({
      ...DATA,
      queue: { ...DATA.queue, total: 0, ready: 0, awaiting_bilty: 0, oldest_days: 0 },
    });
    render(<ServiceGRPOInsights year={2026} month={8} />);
    expect(tile('Oldest in queue').textContent).toContain('—');
  });

  it('clicking a stage tile filters the queue, and clicking it again clears', () => {
    const onStageChange = vi.fn();
    summary.current = ok();
    const { rerender } = render(
      <ServiceGRPOInsights year={2026} month={8} onStageChange={onStageChange} />,
    );
    tile('Ready to post').click();
    expect(onStageChange).toHaveBeenCalledWith('READY');

    rerender(
      <ServiceGRPOInsights year={2026} month={8} stage="READY" onStageChange={onStageChange} />,
    );
    tile('Ready to post').click();
    expect(onStageChange).toHaveBeenLastCalledWith('');
  });

  it('breakdown rows hand their own label back as a filter', () => {
    const onStateChange = vi.fn();
    summary.current = ok();
    render(<ServiceGRPOInsights year={2026} month={8} onStateChange={onStateChange} />);
    screen.getByText('HR').click();
    expect(onStateChange).toHaveBeenCalledWith('HR');
  });

  it('renders a skeleton while loading', () => {
    summary.current = { data: undefined, isLoading: true, isError: false };
    const { container } = render(<ServiceGRPOInsights year={2026} month={8} />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(6);
  });

  it('renders nothing on error so a failed header cannot take the queue down', () => {
    summary.current = { data: undefined, isLoading: false, isError: true };
    const { container } = render(<ServiceGRPOInsights year={2026} month={8} />);
    expect(container.firstChild).toBeNull();
  });
});
