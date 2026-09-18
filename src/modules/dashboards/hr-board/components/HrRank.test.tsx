import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { HrCapped } from '../types';
import { HrCappedRank, HrRank } from './HrRank';

const capped = (over: Partial<HrCapped> = {}): HrCapped => ({
  rows: [
    { label: 'Canola (Production)', count: 80 },
    { label: 'Water Production', count: 16 },
  ],
  other: 85,
  other_count: 35,
  ...over,
});

describe('HrRank', () => {
  it('names every row in full, so identity is never colour alone', () => {
    render(<HrRank rows={[{ label: 'Oil', count: 132 }, { label: 'Bev', count: 37 }]} />);

    expect(screen.getByText('Oil')).toBeInTheDocument();
    expect(screen.getByText('Bev')).toBeInTheDocument();
  });

  it('groups the Indian way, because the wall reads lakhs', () => {
    render(<HrRank rows={[{ label: 'Everyone', count: 124_500 }]} />);

    expect(screen.getByText('1,24,500')).toBeInTheDocument();
  });

  it('measures each bar against the largest row, so the top row fills', () => {
    const { container } = render(
      <HrRank rows={[{ label: 'Big', count: 80 }, { label: 'Small', count: 20 }]} />,
    );
    const rows = container.querySelectorAll('li');

    expect(rows[0].getAttribute('style')).toContain('100%');
    expect(rows[1].getAttribute('style')).toContain('25%');
  });

  it('does not paint an empty list as if it were full', () => {
    /** A zero denominator makes `NaN%`, which the browser drops — and a
        dropped stop paints the whole row as the largest there is. */
    const { container } = render(<HrRank rows={[{ label: 'Nobody', count: 0 }]} />);

    expect(container.querySelector('li')?.getAttribute('style')).toContain('0%');
  });

  it('keeps the tail row so the rows still add up to the headline', () => {
    render(<HrCappedRank data={capped()} />);

    const rest = screen.getByText('35 more').closest('li');
    expect(rest).toBeTruthy();
    expect(within(rest as HTMLElement).getByText('85')).toBeInTheDocument();
  });

  it('drops the tail row when nothing was cut', () => {
    render(<HrCappedRank data={capped({ other: 0, other_count: 0 })} />);

    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });
});
