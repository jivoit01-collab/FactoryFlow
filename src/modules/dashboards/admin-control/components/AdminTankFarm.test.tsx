import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminOilStorage, AdminOilTank } from '../types';
import { AdminTankFarm, levelY } from './AdminTankFarm';

function tank(over: Partial<AdminOilTank> = {}): AdminOilTank {
  return {
    code: 'TNK017',
    type: 'TANK',
    item_code: 'RM0MKG',
    item: 'MUSTARD KACHI GHANI',
    category: 'MUSTARD',
    capacity_tons: 100,
    stock_tons: 98,
    used_pct: 98,
    ...over,
  };
}

function oil(rows: AdminOilTank[]): AdminOilStorage {
  return {
    unit: 'tonnes',
    warehouse: 'BH-LO',
    total_tons: 978.6,
    total_litres: 920_220,
    capacity_tons: 1296,
    used_pct: 75.5,
    no_capacity_reason: null,
    source: 'EXIM',
    sap_tons: 920.22,
    tank_rows: rows,
    by_type: {},
    excluded: {},
    basis: '',
    rows: [],
  };
}

/**
 * The oil inside one vessel.
 *
 * There are two `.tf-liquid` groups per vessel — the body and the sight glass
 * beside it — and they must always carry the same level, so this returns both.
 */
function liquids(figure: HTMLElement) {
  const nodes = figure.querySelectorAll<SVGGElement>('.tf-liquid');
  if (nodes.length !== 2) throw new Error(`expected 2 liquid groups, got ${nodes.length}`);
  return Array.from(nodes);
}

/** The level the oil is drawn at, as the transform actually applied. */
function level(figure: HTMLElement) {
  return liquids(figure)[0].style.transform;
}

function at(percent: number) {
  return `translateY(${levelY(percent)}px)`;
}

describe('AdminTankFarm', () => {
  it('fills each vessel to its OWN rating, not its share of the farm', async () => {
    // The trap this guards: a 16 T tank that is full must draw as full beside a
    // 100 T tank that is full. Encoding stock as a share of the farm would draw
    // it as a sliver and tell an operator the tank has room it does not have.
    render(
      <AdminTankFarm
        oil={oil([
          tank({ code: 'BIG', capacity_tons: 100, stock_tons: 100, used_pct: 100 }),
          tank({ code: 'SMALL', capacity_tons: 16, stock_tons: 16, used_pct: 100 }),
        ])}
        onClose={vi.fn()}
      />,
    );

    const big = screen.getByTitle(/^BIG/);
    const small = screen.getByTitle(/^SMALL/);
    // The pour is one animation frame away; both land at the same surface.
    await vi.waitFor(() => {
      expect(level(big)).toBe(at(100));
    });
    expect(level(small)).toBe(level(big));
  });

  it('pours from empty so the level animates rather than appearing', () => {
    render(<AdminTankFarm oil={oil([tank()])} onClose={vi.fn()} />);
    // First paint, before the frame that sets the real level.
    expect(level(screen.getByTitle(/^TNK017/))).toBe(at(0));
  });

  it('carries the same level in the sight glass as in the tank', async () => {
    // The gauge on the side of a real tank IS the tank's level. Two different
    // numbers on one vessel would be worse than showing no gauge at all.
    render(<AdminTankFarm oil={oil([tank({ used_pct: 62 })])} onClose={vi.fn()} />);
    const figure = screen.getByTitle(/^TNK017/);
    await vi.waitFor(() => {
      expect(level(figure)).toBe(at(62));
    });
    const [body, gauge] = liquids(figure);
    expect(gauge.style.transform).toBe(body.style.transform);
  });

  it('never draws a level above the vessel', async () => {
    // A mis-keyed stock bigger than the rating must overflow the NUMBER, not
    // the glass — a liquid taller than its tank reads as a rendering fault and
    // hides the real one.
    render(
      <AdminTankFarm
        oil={oil([tank({ code: 'OVER', capacity_tons: 10, stock_tons: 15, used_pct: 150 })])}
        onClose={vi.fn()}
      />,
    );
    await vi.waitFor(() => {
      expect(level(screen.getByTitle(/^OVER/))).toBe(at(100));
    });
  });

  it('names the oil in text, so identity never rides on colour alone', () => {
    render(<AdminTankFarm oil={oil([tank()])} onClose={vi.fn()} />);
    const figure = screen.getByTitle(/^TNK017/);
    expect(within(figure).getByText('MUSTARD KACHI GHANI')).toBeInTheDocument();
    expect(within(figure).getByText('TNK017')).toBeInTheDocument();
  });

  it('prints the tonnage, because a uniform glyph cannot carry magnitude', () => {
    render(<AdminTankFarm oil={oil([tank()])} onClose={vi.fn()} />);
    const figure = screen.getByTitle(/^TNK017/);
    expect(within(figure).getByText(/\/ 100.0 T/)).toBeInTheDocument();
  });

  it('separates the totes from the tanks and says why', () => {
    render(
      <AdminTankFarm
        oil={oil([tank(), tank({ code: 'TOT002', type: 'TOTES' })])}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Tanks')).toBeInTheDocument();
    expect(screen.getByText(/outside the tank-farm percentage/)).toBeInTheDocument();
  });

  it('omits a group nobody has vessels in rather than drawing an empty heading', () => {
    render(<AdminTankFarm oil={oil([tank()])} onClose={vi.fn()} />);
    expect(screen.queryByText('Totes')).not.toBeInTheDocument();
  });

  it('marks an empty vessel as empty instead of leaving its item blank', () => {
    render(
      <AdminTankFarm
        oil={oil([tank({ code: 'TNK0021', item: 'empty', stock_tons: 0, used_pct: 0 })])}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTitle(/^TNK0021/)).toHaveClass('is-empty');
  });

  it('flags a near-full vessel with a word as well as a colour', () => {
    render(<AdminTankFarm oil={oil([tank({ used_pct: 98 })])} onClose={vi.fn()} />);
    expect(screen.getByTitle(/^TNK017/)).toHaveClass('is-near');
    expect(screen.getByText(/Near full/)).toBeInTheDocument();
  });

  it('shows a rule, not a zero, for a vessel with no rating', () => {
    render(
      <AdminTankFarm
        oil={oil([tank({ code: 'NORATE', capacity_tons: 0, used_pct: null })])}
        onClose={vi.fn()}
      />,
    );
    expect(within(screen.getByTitle(/^NORATE/)).getByText('—')).toBeInTheDocument();
  });

  it('closes on Escape, because the wall board is driven by a shelf keyboard', () => {
    const onClose = vi.fn();
    render(<AdminTankFarm oil={oil([tank()])} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on the scrim but not on the panel', () => {
    // A drag that starts on a tank and ends on the scrim must not dismiss the
    // panel, which is why the handler tests the event target.
    const onClose = vi.fn();
    const { container } = render(<AdminTankFarm oil={oil([tank()])} onClose={onClose} />);
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(container.querySelector('.tf-scrim') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
