import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AmountsBoardResponse, AmountsCategory, AmountsPlant } from '../types';

/**
 * What these pin down: an unreadable section says so instead of reading as an
 * empty plant, the owner survives a SAP outage, the debtors Total names what it
 * left out, and the Beverage row's non-moving tile lands on Beverages' report.
 */

const useAmountsBoard = vi.fn();
const permissions = new Set<string>();

vi.mock('../api', () => ({
  useAmountsBoard: () => useAmountsBoard(),
  useAmountsGodownItems: () => ({ data: undefined, isLoading: true, error: null }),
}));

vi.mock('@/core/auth', () => ({
  usePermission: () => ({ hasPermission: (code: string) => permissions.has(code) }),
}));

import AmountsDashboardPage from './AmountsDashboardPage';

function category(key: 'RM' | 'PM' | 'FG', value: number): AmountsCategory {
  return {
    key,
    label: { RM: 'Raw Material', PM: 'Packing Material', FG: 'Finished Goods' }[key],
    item_group: { RM: 106, PM: 105, FG: 102 }[key],
    value,
    items: 3,
    godowns: [
      {
        code: `${key}-A`,
        name: `${key} store A`,
        value: value * 0.75,
        items: 2,
        managers: ['Gautam'],
      },
      { code: `${key}-B`, name: `${key} store B`, value: value * 0.25, items: 1, managers: [] },
    ],
  };
}

function plant(code: string, label: string, over: Partial<AmountsPlant> = {}): AmountsPlant {
  return {
    company_code: code,
    label,
    owners: {
      RM: { id: 1, name: 'Gautam Chanana', email: 'g@example.com' },
      PM: null,
      FG: null,
    },
    stock: {
      total: 300_000_000,
      categories: [
        category('RM', 190_000_000),
        category('PM', 50_000_000),
        category('FG', 60_000_000),
      ],
    },
    non_moving: {
      value: 3_534_282,
      item_count: 239,
      warehouses: ['BH-BS', 'BH-NM'],
      age_days: 45,
      item_group: 105,
    },
    ...over,
  };
}

function board(over: Partial<AmountsBoardResponse> = {}): AmountsBoardResponse {
  return {
    plants: [plant('JIVO_OIL', 'Oil plant'), plant('JIVO_BEVERAGES', 'Beverage plant')],
    debtors: {
      companies: [
        {
          key: 'JWPL',
          label: 'JWPL',
          company_code: 'JIVO_OIL',
          figures: {
            amount: 63_409_842,
            customers: 82,
            group_amount: 1_121_586_871,
            oldest: {
              date: '2024-09-30',
              card_code: 'CUSTA000891',
              card_name: 'FUTURE RETAIL LTD.',
              balance: 9_456_961,
            },
          },
        },
        { key: 'MART', label: 'MART', company_code: 'JIVO_MART', figures: null },
        {
          key: 'BEVERAGES',
          label: 'Beverages',
          company_code: 'JIVO_BEVERAGES',
          figures: { amount: 0, customers: 0, group_amount: 0, oldest: null },
        },
      ],
      total: {
        amount: 63_409_842,
        customers: 82,
        group_amount: 1_121_586_871,
        oldest: {
          date: '2024-09-30',
          card_code: 'CUSTA000891',
          card_name: 'FUTURE RETAIL LTD.',
          balance: 9_456_961,
          company: 'JWPL',
        },
        missing: ['MART'],
      },
      oldest_floor: 1000,
    },
    meta: {
      generated_at: '2026-10-06T08:30:00Z',
      refresh_seconds: 300,
      degraded: ['debtors_mart'],
      withheld: [],
      warnings: [],
    },
    ...over,
  };
}

function Landed() {
  const location = useLocation();
  return <p>landed on {`${location.pathname}${location.search}`}</p>;
}

function renderBoard() {
  return render(
    <MemoryRouter initialEntries={['/dashboards/amounts']}>
      <Routes>
        <Route path="/dashboards/amounts" element={<AmountsDashboardPage />} />
        <Route path="/dashboards/non-moving" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The band whose rail reads `title`. */
function band(title: string): HTMLElement {
  const rail = screen.getAllByText(title).find((node) => node.closest('.ops-rail'));
  const section = rail?.closest('section');
  if (!section) throw new Error(`no band titled ${title}`);
  return section as HTMLElement;
}

/** The tile named `name` inside `scope`. */
function tile(scope: HTMLElement, name: string): HTMLElement {
  const label = within(scope)
    .getAllByText(name)
    .find((node) => node.classList.contains('ops-nm'));
  const group = label?.closest('.ops-grp');
  if (!group) throw new Error(`no tile named ${name}`);
  return group as HTMLElement;
}

describe('AmountsDashboardPage', () => {
  beforeEach(() => {
    permissions.clear();
    useAmountsBoard.mockReturnValue({
      data: board(),
      error: null,
      isFetching: false,
      isRefetchError: false,
    });
  });

  it('shows each plant split into RM, PM and FG with the owner named', () => {
    renderBoard();
    const oil = band('Oil plant');

    expect(within(tile(oil, 'Total stock')).getByText('₹30.00')).toBeInTheDocument();
    const rm = tile(oil, 'RM godowns');
    expect(within(rm).getByText('Owner · Gautam Chanana')).toBeInTheDocument();
    expect(within(rm).getByText('₹19.00')).toBeInTheDocument();
    expect(within(tile(oil, 'PM godowns')).getByText('Owner not set')).toBeInTheDocument();
  });

  it('opens a category on its godowns', () => {
    renderBoard();
    fireEvent.click(tile(band('Oil plant'), 'RM godowns'));

    expect(screen.getByText('Oil plant · Raw Material')).toBeInTheDocument();
    // The names are the panel's own; the tile shows only the codes.
    expect(screen.getByText('RM store A')).toBeInTheDocument();
    expect(screen.getByText('RM store B')).toBeInTheDocument();
  });

  it('keeps the owner on a tile whose stock SAP could not read', () => {
    const data = board();
    data.plants[0] = plant('JIVO_OIL', 'Oil plant', { stock: null });
    useAmountsBoard.mockReturnValue({
      data,
      error: null,
      isFetching: false,
      isRefetchError: false,
    });

    renderBoard();
    const rm = tile(band('Oil plant'), 'RM godowns');

    expect(within(rm).getByText('SAP could not be read.')).toBeInTheDocument();
    expect(within(rm).getByText('Owner · Gautam Chanana')).toBeInTheDocument();
    // Not openable: there is nothing behind it to show.
    expect(rm).not.toHaveAttribute('role', 'button');
  });

  it('says which debtor company could not be read, and that the Total leaves it out', () => {
    renderBoard();
    const debtors = band('Debtors');

    expect(within(tile(debtors, 'MART')).getByText('SAP could not be read.')).toBeInTheDocument();
    const total = tile(debtors, 'Total');
    expect(within(total).getByText('Leaves out MART: SAP not read.')).toBeInTheDocument();
    expect(within(total).getByText('30 Sept 2024')).toBeInTheDocument();
  });

  it('shows the oldest debt and the group balance it did not count', () => {
    renderBoard();
    const jwpl = tile(band('Debtors'), 'JWPL');

    expect(within(jwpl).getByText('FUTURE RETAIL LTD.', { exact: false })).toBeInTheDocument();
    expect(within(jwpl).getByText('Group & branches ₹112.16 Cr not counted')).toBeInTheDocument();
    expect(
      within(tile(band('Debtors'), 'Beverages')).getByText('No customer owes anything.'),
    ).toBeInTheDocument();
  });

  it("sends the Beverage row's non-moving tile to Beverages' report", () => {
    permissions.add('non_moving_rm.can_view_non_moving_rm');
    renderBoard();

    fireEvent.click(tile(band('Beverage plant'), 'Non-moving stock'));

    expect(
      screen.getByText('landed on /dashboards/non-moving?company=JIVO_BEVERAGES'),
    ).toBeInTheDocument();
  });

  it('does not offer the report to a reader who cannot open it', () => {
    renderBoard();
    const nonMoving = tile(band('Oil plant'), 'Non-moving stock');

    expect(nonMoving).not.toHaveAttribute('role', 'button');
    expect(
      within(nonMoving).getByText('The full report needs Non-Moving access.'),
    ).toBeInTheDocument();
  });
});
