/**
 * The Electricity board reads Daily Electricity++.
 *
 * It opens on Jivo Beverages and asks Electricity++ for that company; every
 * figure — the tiles, the meters, the share of a meter two companies draw on —
 * is Electricity++'s, so it agrees with Admin Control and the expense boards.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPANY_CODES } from '@/config/constants';

import type { ElectricityBoard } from '../electricity/api';
import ElectricityDashboardPage from '../electricity/pages/ElectricityDashboardPage';

const BEVERAGES: ElectricityBoard = {
  date_from: '2026-09-01',
  date_to: '2026-09-30',
  company: 'JIVO_BEVERAGES',
  units: '1120.00',
  cost: '10080.00',
  days_with_units: 2,
  meters: [
    {
      name: 'Ground Floor',
      units: '720.00',
      cost: '6480.00',
      rate: '9.00',
      share_pct: null,
      days: 2,
    },
    { name: 'Lab', units: '400.00', cost: '3600.00', rate: '9.00', share_pct: '50.00', days: 2 },
  ],
  days: [
    {
      date: '2026-09-01',
      units: '560.00',
      cost: '5040.00',
      by_meter: { 'Ground Floor': '360.00', Lab: '200.00' },
    },
    {
      date: '2026-09-02',
      units: '560.00',
      cost: '5040.00',
      by_meter: { 'Ground Floor': '360.00', Lab: '200.00' },
    },
  ],
  supply: { units: '2000.00', cost: '18000.00' },
  tree: [
    {
      id: 1,
      name: 'Ground Floor',
      depth: 0,
      parent_id: null,
      units: '800.00',
      sub_metered_units: '80.00',
      own_units: '720.00',
      own_cost: '6480.00',
      company_units: '720.00',
      company_cost: '6480.00',
      company_share_pct: '100.0',
    },
    {
      id: 2,
      name: 'Lab',
      depth: 1,
      parent_id: 1,
      units: '80.00',
      sub_metered_units: '0.00',
      own_units: '80.00',
      own_cost: '720.00',
      company_units: '40.00',
      company_cost: '360.00',
      company_share_pct: '50.0',
    },
  ],
  warnings: ['HP-512: 4 readings did not start from the previous closing.'],
};

const asked = vi.hoisted(() => [] as unknown[]);
const answer = vi.hoisted(() => ({ board: null as unknown }));

vi.mock('../electricity/api', () => ({
  useElectricityBoard: (params: unknown) => {
    asked.push(params);
    return { data: answer.board, isLoading: false };
  },
}));

vi.mock('@/core/auth', () => ({
  useAuth: () => ({ currentCompany: { company_code: COMPANY_CODES.JIVO_BEVERAGES } }),
}));

const renderBoard = () =>
  render(
    <MemoryRouter>
      <ElectricityDashboardPage />
    </MemoryRouter>,
  );

describe('Electricity board', () => {
  beforeEach(() => {
    asked.length = 0;
    answer.board = BEVERAGES;
  });

  it('opens on Jivo Beverages and asks Electricity++ for that company', () => {
    renderBoard();
    expect(screen.getByLabelText('Company')).toHaveValue(COMPANY_CODES.JIVO_BEVERAGES);
    expect(asked[0]).toMatchObject({ company: COMPANY_CODES.JIVO_BEVERAGES });
  });

  it('shows Electricity++’s units and cost', () => {
    renderBoard();
    expect(screen.getAllByText('1,120').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹10,080').length).toBeGreaterThan(0);
    expect(screen.getByText('2 days')).toBeInTheDocument();
  });

  it('shows each meter as its reading less its sub-meters, and the company’s part', () => {
    renderBoard();
    const row = (name: string) =>
      within(screen.getByText(name, { selector: 'td span' }).closest('tr') as HTMLElement);
    expect(row('Ground Floor').getByText('800')).toBeInTheDocument(); // reading
    expect(row('Ground Floor').getByText('80')).toBeInTheDocument(); // − sub-meters
    expect(row('Ground Floor').getAllByText('720').length).toBeGreaterThan(0); // = own
    expect(row('Lab').getByText('40 (50%)')).toBeInTheDocument();
  });

  it('never shows a main meter', () => {
    renderBoard();
    expect(screen.queryByText('KWH')).not.toBeInTheDocument();
  });

  it('offers the meters Electricity++ has for the company', () => {
    renderBoard();
    const options = within(screen.getByLabelText('Meter'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options).toEqual(['All meters', 'Ground Floor', 'Lab']);
  });

  it('narrows the figures to one meter', () => {
    renderBoard();
    fireEvent.change(screen.getByLabelText('Meter'), { target: { value: 'Lab' } });
    expect(screen.getAllByText('400').length).toBeGreaterThan(0);
    expect(screen.queryByText('Ground Floor', { selector: 'td span' })).not.toBeInTheDocument();
  });

  it('asks for the whole campus when the company is cleared, and drops the meter', () => {
    renderBoard();
    fireEvent.change(screen.getByLabelText('Meter'), { target: { value: 'Lab' } });
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: '' } });
    expect(asked.at(-1)).toMatchObject({ company: '' });
    expect(screen.getByLabelText('Meter')).toHaveValue('');
  });

  it('says what Electricity++ flags about the readings', () => {
    renderBoard();
    expect(screen.getByText('1 reading problem in Electricity++')).toBeInTheDocument();
    expect(screen.getByText(/HP-512: 4 readings/)).toBeInTheDocument();
  });

  it('says so when there is no electricity in the range', () => {
    answer.board = {
      ...BEVERAGES,
      meters: [],
      days: [],
      tree: [],
      units: '0.00',
      cost: '0.00',
      warnings: [],
    };
    renderBoard();
    expect(screen.getAllByText('No electricity in this range.').length).toBeGreaterThan(0);
  });
});
