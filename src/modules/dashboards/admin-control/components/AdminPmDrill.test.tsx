import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminPmStorage } from '../types';
import { AdminPmDrill } from './AdminPmDrill';

function pm(over: Partial<AdminPmStorage> = {}): AdminPmStorage {
  return {
    unit: 'value',
    total_value: 50_300_000,
    total_pieces: 1_204_880,
    pallets: 1_612,
    floor_sqft: 38_901,
    occupied_sqft: 25_100,
    free_sqft: 13_801,
    used_pct: 64.5,
    sqft_per_pallet: 16,
    blocks: [
      { label: 'PM store 1', sqft: 21_400 },
      { label: 'PM store 2', sqft: 17_501 },
    ],
    unmeasured_items: 9,
    unmeasured_pieces: 40_320,
    stacking_measured_on: '2026-07-14',
    capacity_tons: null,
    no_capacity_reason: 'Packaging has no litre volume.',
    basis: 'Pieces bridged to floor by the factory’s stacking sheet.',
    rows: [
      { warehouse: 'PM1', label: 'PM store 1', value: 32_000_000, pieces: 800_000, pallets: 1_100 },
      { warehouse: 'PM2', label: 'PM store 2', value: 18_300_000, pieces: 404_880, pallets: 512 },
    ],
    ...over,
  };
}

function row(label: string) {
  const nodes = screen.getAllByText(label);
  // The store names also appear in the floor cut above the table, so the row
  // wanted is the one that is actually inside a table row.
  for (const node of nodes) {
    const tr = node.closest('tr');
    if (tr) return tr as HTMLTableRowElement;
  }
  throw new Error(`no row for ${label}`);
}

const stats = () => document.querySelector('.ops-drill__stats') as HTMLElement;
const cuts = () => Array.from(document.querySelectorAll('.ops-drill__cut')) as HTMLElement[];

describe('AdminPmDrill', () => {
  it('opens with the tile’s own figures above the stores that make them up', () => {
    render(<AdminPmDrill pm={pm()} onClose={vi.fn()} />);

    expect(within(stats()).getByText('₹5.03 Cr')).toBeInTheDocument();
    expect(within(stats()).getByText('12,04,880')).toBeInTheDocument();
    expect(within(stats()).getByText('64.5%')).toBeInTheDocument();
    expect(within(stats()).getByText('13,801 sq ft')).toBeInTheDocument();
  });

  it('splits the value across the stores, and the shares add up', () => {
    render(<AdminPmDrill pm={pm()} onClose={vi.fn()} />);

    expect(within(row('PM store 1')).getByText('₹3.20 Cr')).toBeInTheDocument();
    expect(within(row('PM store 1')).getByText('64%')).toBeInTheDocument();
    expect(within(row('PM store 2')).getByText('36%')).toBeInTheDocument();
  });

  it('cuts the floor block by block and then names what the floor misses', () => {
    // Two cuts is the documented ceiling, and these are the two second
    // questions a floor figure actually has.
    render(<AdminPmDrill pm={pm()} onClose={vi.fn()} />);

    const [floor, missing] = cuts();
    expect(within(floor).getByText('The floor, block by block')).toBeInTheDocument();
    expect(within(floor).getByText('21,400 sq ft')).toBeInTheDocument();
    expect(within(missing).getByText('Items with no pallet figure')).toBeInTheDocument();
    // WHICH WAY THE ERROR RUNS. An unmeasured item is counted in the value and
    // left out of the floor, so it makes the stores look emptier than they
    // are — and an emptier store reads as good news.
    expect(
      within(missing).getByText('in the value, out of the floor — the stores read emptier'),
    ).toBeInTheDocument();
  });

  it('says a store’s pallets were never measured rather than printing zero', () => {
    // Zero pallets under 400,000 pieces is the unmeasured-item problem showing
    // up per store, not an empty floor.
    render(
      <AdminPmDrill
        pm={pm({
          rows: [
            { warehouse: 'PM2', label: 'PM store 2', value: 18_300_000, pieces: 404_880, pallets: 0 },
          ],
        })}
        onClose={vi.fn()}
      />,
    );

    expect(within(row('PM store 2')).getByText('not measured')).toBeInTheDocument();
  });

  it('states an unset pallet footprint rather than a floor at 0%', () => {
    // The footprint being unset and the stores being empty are opposite
    // conditions and must not render the same.
    render(
      <AdminPmDrill
        pm={pm({ used_pct: null, occupied_sqft: null, free_sqft: null })}
        onClose={vi.fn()}
      />,
    );

    expect(within(stats()).getByText('pallet footprint not set')).toBeInTheDocument();
  });

  it('says so plainly when every item carries a pallet figure', () => {
    render(
      <AdminPmDrill pm={pm({ unmeasured_items: 0, unmeasured_pieces: 0 })} onClose={vi.fn()} />,
    );

    expect(within(cuts()[1]).getByText('Every item carries a pallet figure.')).toBeInTheDocument();
  });

  it('states empty stores rather than drawing a blank table', () => {
    render(<AdminPmDrill pm={pm({ rows: [] })} onClose={vi.fn()} />);

    expect(
      screen.getByText('SAP returned no packaging material in these stores.'),
    ).toBeInTheDocument();
  });
});
