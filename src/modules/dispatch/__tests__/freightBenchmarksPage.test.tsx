import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FreightBenchmarksPage from '../pages/FreightBenchmarksPage';
import type {
  FreightBenchmarkTable,
  FreightDestination,
  FreightSlab,
} from '../types/freightBenchmark.types';

const slab = (id: number, label: string, above: number, upTo: number): FreightSlab => ({
  id,
  label,
  above_kg: above,
  up_to_kg: upTo,
  sort_order: id,
  is_active: true,
  destination_count: 1,
});

const SLABS = [
  slab(1, '5 MT', 0, 5000),
  slab(2, '10 MT', 5000, 10000),
  slab(3, '15 MT', 10000, 15000),
  slab(11, 'Up to 2,000 kg', 0, 2000),
  slab(12, '5,001-8,000 kg', 5000, 8000),
];

const place = (overrides: Partial<FreightDestination>): FreightDestination => ({
  id: 1,
  state: 'PUNJAB',
  district: 'LUDHIANA',
  name: 'KHANNA',
  pin_code: '141401',
  distance_km: 213,
  remarks: '',
  is_active: true,
  updated_at: '2026-09-29T10:00:00',
  updated_by_name: '',
  rates: [
    { slab: 2, basis: 'PER_TRIP', amount: 13500 },
    { slab: 3, basis: 'PER_TRIP', amount: 20250 },
  ],
  ...overrides,
});

const TABLE: FreightBenchmarkTable = {
  slabs: SLABS,
  destinations: [
    place({}),
    place({
      id: 2,
      state: 'DELHI NCR',
      district: '',
      name: 'DELHI',
      pin_code: '',
      distance_km: null,
      rates: [
        { slab: 11, basis: 'PER_TRIP', amount: 3500 },
        { slab: 12, basis: 'PER_KG', amount: 1.2 },
      ],
    }),
    place({ id: 3, state: 'HARYANA', district: '', name: 'PANCHKULA', rates: [] }),
  ],
};

const perms = vi.hoisted(() => ({ manage: false }));
const save = vi.hoisted(() => vi.fn());

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => perms.manage }),
}));

vi.mock('../api/freightBenchmark.api', () => ({
  useFreightBenchmarks: () => ({
    data: TABLE,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  }),
  useSaveFreightDestination: () => ({ mutateAsync: save, isPending: false }),
  useDeleteFreightDestination: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSaveFreightSlab: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteFreightSlab: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function headers() {
  return screen.getAllByRole('columnheader').map((th) => th.textContent ?? '');
}

describe('FreightBenchmarksPage', () => {
  beforeEach(() => {
    perms.manage = false;
    save.mockReset();
    save.mockImplementation(async ({ data }) => ({ ...place({}), name: data.name }));
  });

  it('shows only the slab columns the rows on screen use', () => {
    render(<FreightBenchmarksPage />);

    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'DELHI NCR' } });
    expect(headers().some((h) => h.startsWith('Up to 2,000 kg'))).toBe(true);
    expect(headers().some((h) => h.startsWith('10 MT'))).toBe(false);
    expect(screen.getByText('₹1.20/kg')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'PUNJAB' } });
    expect(headers().some((h) => h.startsWith('10 MT'))).toBe(true);
    expect(headers().some((h) => h.startsWith('Up to 2,000 kg'))).toBe(false);
    expect(screen.getByText('₹13,500')).toBeInTheDocument();
  });

  it('flags a destination with no benchmark and filters to those', () => {
    render(<FreightBenchmarksPage />);

    const row = screen.getByText('PANCHKULA').closest('tr')!;
    expect(within(row).getByText('No benchmark')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'unrated' } });
    expect(screen.getByText('1 of 3 destinations')).toBeInTheDocument();
    expect(screen.queryByText('KHANNA')).not.toBeInTheDocument();
  });

  it('gives a viewer nothing to edit with', () => {
    render(<FreightBenchmarksPage />);

    expect(screen.queryByRole('button', { name: /add destination/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit KHANNA' })).not.toBeInTheDocument();
  });

  it('saves the whole rate list, so a cleared box drops that rate', async () => {
    perms.manage = true;
    render(<FreightBenchmarksPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit KHANNA' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^15 MT/, { selector: 'input' }), {
      target: { value: '' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^10 MT/, { selector: 'input' }), {
      target: { value: '14000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const { id, data } = save.mock.calls[0][0];
    expect(id).toBe(1);
    expect(data.rates).toEqual([{ slab: 2, basis: 'PER_TRIP', amount: '14000' }]);
  });

  it('refuses rates on two slabs a vehicle could fall into both of', async () => {
    perms.manage = true;
    render(<FreightBenchmarksPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit KHANNA' }));
    const dialog = await screen.findByRole('dialog');
    // Punjab is quoted in tonnes, so Delhi's kg bands are one click away.
    expect(within(dialog).queryByLabelText(/^5,001-8,000 kg/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /show every slab/i }));
    // 10 MT is 5,001-10,000 kg, which contains the whole 5,001-8,000 kg band.
    fireEvent.change(within(dialog).getByLabelText(/^5,001-8,000 kg/, { selector: 'input' }), {
      target: { value: '1' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/overlap/)).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});
