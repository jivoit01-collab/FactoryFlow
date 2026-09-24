import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminFgStorage } from '../types';
import { AdminFgDrill } from './AdminFgDrill';

function fg(over: Partial<AdminFgStorage> = {}): AdminFgStorage {
  return {
    unit: 'tonnes',
    total_tons: 999.7,
    capacity_tons: 1_622.0,
    used_pct: 61.6,
    free_tons: 622.4,
    rows: [
      {
        warehouse: 'BH-BT',
        label: 'BH-BT',
        company_code: 'JIVO_OIL',
        tons: 484.5,
        capacity_tons: 502.0,
        used_pct: 96.5,
        free_tons: 17.5,
        last_audit_date: '2026-08-02',
        unweighed_items: 0,
      },
      {
        warehouse: 'GP-FG',
        label: 'Gupta',
        company_code: 'JIVO_OIL',
        tons: 515.1,
        capacity_tons: 1_120.0,
        used_pct: 46.0,
        free_tons: 604.9,
        last_audit_date: null,
        unweighed_items: 14,
      },
    ],
    unrated: [
      { warehouse: 'GP-FG-B', label: 'Gupta basement', company_code: 'JIVO_OIL', tons: 13.1 },
    ],
    unweighed_items: 14,
    non_piece_items: 3,
    basis: 'Item group 102 only, converted by case weight.',
    ...over,
  };
}

function row(label: string) {
  const node = screen.getByText(label).closest('tr');
  if (!node) throw new Error(`no row for ${label}`);
  return node as HTMLTableRowElement;
}

const stats = () => document.querySelector('.ops-drill__stats') as HTMLElement;
const cut = () => document.querySelector('.ops-drill__cut') as HTMLElement;

describe('AdminFgDrill', () => {
  beforeEach(() => {
    // `daysSince` measures against the clock, so the "last counted" column is
    // only assertable with the clock held still.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens with the tile’s own figures above the stores that make them up', () => {
    render(<AdminFgDrill fg={fg()} onClose={vi.fn()} />);

    expect(within(stats()).getByText('999.7 T')).toBeInTheDocument();
    expect(within(stats()).getByText('1,622.0 T')).toBeInTheDocument();
    expect(within(stats()).getByText('61.6%')).toBeInTheDocument();
    expect(screen.getByText(/Item group 102 only/)).toBeInTheDocument();
  });

  it('lists the unrated store too, and marks it as outside the total', () => {
    // A tonnage that appears in no total is a tonnage nobody manages, so the
    // store the headline excludes is the one most worth listing.
    render(<AdminFgDrill fg={fg()} onClose={vi.fn()} />);

    const basement = row('Gupta basement');
    expect(within(basement).getByText('13.1 T')).toBeInTheDocument();
    expect(basement).toHaveTextContent('outside the rating');
  });

  it('never prints a rating of zero on a store nobody has rated', () => {
    // Zero capacity and no capacity look the same in a column of figures and
    // mean opposite things.
    render(<AdminFgDrill fg={fg()} onClose={vi.fn()} />);

    const cells = within(row('Gupta basement')).getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('says how old each floor count is, and names one that never happened', () => {
    render(<AdminFgDrill fg={fg()} onClose={vi.fn()} />);

    expect(within(row('BH-BT')).getByText('53 days ago')).toBeInTheDocument();
    expect(within(row('Gupta')).getByText('never counted')).toBeInTheDocument();
  });

  it('hangs the unweighed count on the store it belongs to', () => {
    render(<AdminFgDrill fg={fg()} onClose={vi.fn()} />);

    expect(row('Gupta')).toHaveTextContent('14 SKUs unweighed');
    expect(row('BH-BT')).not.toHaveTextContent('unweighed');
  });

  it('states what the tonnage cannot speak for above the table', () => {
    // A confident total over a half-weighed warehouse looks exactly like a
    // correct one, so this cut is the panel's whole reason for existing.
    render(<AdminFgDrill fg={fg()} onClose={vi.fn()} />);

    expect(within(cut()).getByText('SKUs with no case weight')).toBeInTheDocument();
    expect(within(cut()).getByText('Not stocked in pieces')).toBeInTheDocument();
  });

  it('says so plainly when every SKU does convert', () => {
    render(
      <AdminFgDrill fg={fg({ unweighed_items: 0, non_piece_items: 0 })} onClose={vi.fn()} />,
    );

    expect(
      within(cut()).getByText('Every SKU in these stores converts to a tonnage.'),
    ).toBeInTheDocument();
  });

  it('states a rating that is not complete rather than adding up half of one', () => {
    // Adding the stores that happen to be rated and calling it the capacity is
    // how a board reports 61% of a warehouse it has only half measured.
    render(
      <AdminFgDrill
        fg={fg({ capacity_tons: null, used_pct: null, free_tons: null })}
        onClose={vi.fn()}
      />,
    );

    expect(within(stats()).getByText('not every store is rated')).toBeInTheDocument();
  });
});
