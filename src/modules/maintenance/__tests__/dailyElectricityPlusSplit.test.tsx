/**
 * The Split tab: who used how much between two dates, the tree it was worked
 * out on, and what kept it from being exact.
 */

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SplitTab } from '../components/electricity/SplitTab';
import { SPLIT } from './electricityTreeFixtures';

vi.mock('../api', () => ({
  useElectricityAllocation: () => ({ data: SPLIT, isLoading: false }),
}));

describe('Split tab', () => {
  it('gives each party its units, its cost and its share', () => {
    render(<SplitTab />);
    expect(screen.getAllByText('Jivo Oil').length).toBeGreaterThan(0);
    expect(screen.getByText('₹4,680')).toBeInTheDocument();
    expect(screen.getByText('520 units · 52.0%')).toBeInTheDocument();
  });

  it('names what nobody pays for yet, instead of hiding it', () => {
    render(<SplitTab />);
    expect(screen.getByText('Nobody is set to pay for these yet.')).toBeInTheDocument();
  });

  it('says when every unit on the mains is in the split', () => {
    render(<SplitTab />);
    expect(screen.getByText(/every one of them is in the split above/)).toBeInTheDocument();
  });

  it('lists the problems in words', () => {
    render(<SplitTab />);
    expect(screen.getByText(/KWH: nobody is set to pay for it/)).toBeInTheDocument();
    expect(screen.getByText(/counted in the rest of KWH/)).toBeInTheDocument();
  });

  it('shows each meter’s own units and who got them', () => {
    render(<SplitTab />);
    const lab = screen.getByText('Lab').closest('tr') as HTMLElement;
    expect(within(lab).getByText('Jivo Oil 50% · Jivo Beverages 50%')).toBeInTheDocument();
    expect(within(lab).getAllByText('20')).toHaveLength(2);
    const ground = screen.getByText('Production Floor Beverage').closest('tr') as HTMLElement;
    // Read 400, sub-meters 40, own 360.
    expect(within(ground).getByText('400')).toBeInTheDocument();
    expect(within(ground).getByText('40')).toBeInTheDocument();
    expect(within(ground).getAllByText('360').length).toBeGreaterThan(0);
    expect(within(ground).getByText('20/22')).toBeInTheDocument();
  });
});
