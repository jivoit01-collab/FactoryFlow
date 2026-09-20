import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { HrCapped } from '../types';
import { HrCappedCards, HrCards } from './HrCards';

const capped = (over: Partial<HrCapped> = {}): HrCapped => ({
  rows: [
    { label: 'Canola (Production)', count: 80 },
    { label: 'Water Production', count: 16 },
  ],
  other: 85,
  other_count: 35,
  ...over,
});

describe('HrCards', () => {
  it('names every card in full, so identity is never colour alone', () => {
    render(
      <HrCards
        rows={[
          { label: 'Oil', count: 132 },
          { label: 'Bev', count: 37 },
        ]}
      />,
    );

    expect(screen.getByText('Oil')).toBeInTheDocument();
    expect(screen.getByText('Bev')).toBeInTheDocument();
  });

  it('groups the Indian way, because the wall reads lakhs', () => {
    render(<HrCards rows={[{ label: 'Everyone', count: 124_500 }]} />);

    expect(screen.getByText('1,24,500')).toBeInTheDocument();
  });

  it('measures each bar against the largest card, so the top card fills', () => {
    const { container } = render(
      <HrCards
        rows={[
          { label: 'Big', count: 80 },
          { label: 'Small', count: 20 },
        ]}
      />,
    );
    const cards = container.querySelectorAll('.hr-cards__grid > li');

    expect(cards[0].getAttribute('style')).toContain('100%');
    expect(cards[1].getAttribute('style')).toContain('25%');
  });

  it('does not paint an empty group as if it were the largest', () => {
    /** A zero denominator makes `NaN%`, which the browser drops — and a
        dropped stop paints the whole bar as if it were full. */
    const { container } = render(<HrCards rows={[{ label: 'Nobody', count: 0 }]} />);

    expect(container.querySelector('.hr-cards__grid > li')?.getAttribute('style')).toContain('0%');
  });

  it('draws no bar for a lone card, because a share of itself says nothing', () => {
    const { container } = render(<HrCards rows={[{ label: 'Active', count: 249 }]} />);

    expect(container.querySelector('.hr-cards__grid i')).toBeNull();
  });

  it('keeps the tail line so the cards still add up to the headline', () => {
    render(<HrCappedCards data={capped()} />);

    const rest = screen.getByText('35 more').closest('p');
    expect(rest).toBeTruthy();
    expect(rest).toHaveTextContent('85');
  });

  it('drops the tail line when nothing was cut', () => {
    render(<HrCappedCards data={capped({ other: 0, other_count: 0 })} />);

    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });

  it('folds the cards past the limit into the tail rather than dropping them', () => {
    /** The grid holds six. A seventh group must still be counted somewhere, or
        the cards sum to less than the figure above them and the tile reads as
        broken rather than as shortened. */
    render(
      <HrCappedCards
        data={capped({
          rows: Array.from({ length: 8 }, (_, i) => ({ label: `D${i}`, count: 10 - i })),
          other: 5,
          other_count: 2,
        })}
      />,
    );

    expect(screen.getByText('D5')).toBeInTheDocument();
    expect(screen.queryByText('D6')).not.toBeInTheDocument();
    // 2 folded by the API + 2 cut here; 5 + (4 + 3)
    const rest = screen.getByText('4 more').closest('p');
    expect(rest).toHaveTextContent('12');
  });
});
