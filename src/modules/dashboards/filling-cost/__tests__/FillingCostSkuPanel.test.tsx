import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FillingCostSkuPanel } from '../components/FillingCostSkuPanel';

const board = vi.hoisted(() => ({
  month: '2026-09',
  skus: [
    {
      product: 'Jivo Water',
      sku: '1000 ML',
      pieces_per_case: 12,
      litres_per_piece: '1.000',
      days_run: 2,
      cases: '4000.00',
      total: '5039.86',
      per_case: '1.26',
      per_bottle: '0.1050',
      days: [
        {
          date: '2026-09-27',
          share: '100.00',
          cases: '1000.00',
          total: '1000.00',
          per_case: '1.00',
          per_bottle: '0.0833',
        },
        {
          date: '2026-09-28',
          share: '34.66',
          cases: '3000.00',
          total: '4039.86',
          per_case: '1.35',
          per_bottle: '0.1122',
        },
      ],
    },
  ],
  unassigned: { days: ['2026-09-26'], cases: '10.00', total: '10.00' },
}));

vi.mock('../api', () => ({
  useFillingCostBoard: () => ({ data: board, isLoading: false, isError: false, error: null }),
}));

describe('Filling cost by SKU', () => {
  it('averages each SKU over the days it ran, and opens onto those days', () => {
    render(<FillingCostSkuPanel date="2026-09-28" />);

    const table = within(screen.getByRole('table', { name: 'Filling cost by SKU' }));
    const row = within(table.getByText('1000 ML').closest('tr') as HTMLElement);
    expect(row.getByText('2')).toBeInTheDocument();
    expect(row.getByText('4,000')).toBeInTheDocument();
    expect(row.getByText('₹1.26')).toBeInTheDocument();
    expect(table.queryByText(/^27 Sep/)).not.toBeInTheDocument();

    fireEvent.click(table.getByText('1000 ML'));
    expect(table.getByText(/^27 Sep/)).toBeInTheDocument();
    expect(table.getByText(/35% of the day's boxes/)).toBeInTheDocument();
    expect(screen.getByText(/^A day that ran.*26 Sep.* had a sheet but no runs, so its ₹10 is in no SKU/)).toBeInTheDocument();
  });
});
