import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FillingCostSheetPanel } from '../components/FillingCostSheetPanel';
import type { FillingCostBoardDayDetail, FillingCostHeadRow } from '../types';
import { rate, rupees } from '../utils/format';

const head = (name: string, amount: string, perCase: string): FillingCostHeadRow => ({
  head: name,
  amount,
  share: null,
  per_case: perCase,
  per_bottle: null,
});

/** The night of the 28th, as the factory's own sheet has it. */
const NIGHT_HEADS = [
  head('Electricity', '32787.00', '5.80'),
  head('Fixed Manpower', '46154.00', '8.16'),
  head('Maintenance', '9615.00', '1.70'),
  head('Batch Coding', '4072.00', '0.72'),
  head('Lubrication', '905.00', '0.16'),
  head('Lab', '192.00', '0.03'),
  head('Miscellaneous', '3846.00', '0.68'),
  head('Wastage', '4121.00', '0.73'),
  head('Scrap Recovering', '-3075.00', '-0.54'),
];

const DAY: FillingCostBoardDayDetail = {
  date: '2026-09-28',
  kept_by: 'shift',
  cases: '8655.00',
  bottles: '207720',
  total: '150000.00',
  per_case: '17.33',
  per_bottle: '0.7221',
  heads: NIGHT_HEADS,
  sheet_heads: NIGHT_HEADS,
  skus: [{ product: '500 ML', pieces_per_case: 24, cases: '8655.00' }],
  shifts: [
    {
      shift: 'DAY',
      label: 'Day (07:00-19:00)',
      cases: '3000.00',
      bottles: '72000',
      total: '51383.00',
      per_case: '17.13',
      per_bottle: '0.7137',
      heads: [head('Electricity', '51383.00', '17.13')],
      skus: [{ product: '500 ML', pieces_per_case: 24, cases: '3000.00' }],
    },
    {
      shift: 'NIGHT',
      label: 'Night (19:00-07:00)',
      cases: '5655.00',
      bottles: '135720',
      total: '98617.00',
      per_case: '17.44',
      per_bottle: '0.7266',
      heads: NIGHT_HEADS,
      skus: [{ product: '500 ML', pieces_per_case: 24, cases: '5655.00' }],
    },
  ],
};

const asked = vi.hoisted(() => [] as unknown[]);
const answer = vi.hoisted(() => ({ day: null as unknown }));

vi.mock('../api', () => ({
  useFillingCostBoard: (month: string, day: string) => {
    asked.push({ month, day });
    return { data: { day: answer.day }, isLoading: false };
  },
}));

vi.mock('@/shared/contexts', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));

const renderPanel = (date = '2026-09-28') =>
  render(
    <MemoryRouter>
      <FillingCostSheetPanel date={date} />
    </MemoryRouter>,
  );

const sheetRow = (label: string) =>
  within(screen.getByText(label, { selector: 'td' }).closest('tr') as HTMLElement);

describe('Filling cost on the production board', () => {
  beforeEach(() => {
    asked.length = 0;
    answer.day = DAY;
  });

  it('asks for the day it is given', () => {
    renderPanel();
    expect(asked[0]).toEqual({ month: '2026-09', day: '2026-09-28' });
  });

  it('reads like the factory’s night shift sheet', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Night' }));

    expect(screen.getByText('Night shift')).toBeInTheDocument();
    expect(sheetRow('SKU').getByText('500 ML')).toBeInTheDocument();
    expect(sheetRow('BOX SIZE').getByText('24 PCS')).toBeInTheDocument();
    expect(sheetRow('PRODUCTION').getByText('5,655')).toBeInTheDocument();
    expect(sheetRow('Electricity').getByText('₹32,787')).toBeInTheDocument();
    expect(sheetRow('Electricity').getByText('₹5.80')).toBeInTheDocument();
    expect(sheetRow('Fixed Manpower').getByText('₹8.16')).toBeInTheDocument();
    expect(sheetRow('TOTAL').getByText('₹98,617')).toBeInTheDocument();
    expect(sheetRow('TOTAL').getByText('₹17.44')).toBeInTheDocument();
    expect(sheetRow('PER BOTTLE').getByText('₹0.7266')).toBeInTheDocument();
  });

  it('opens on the whole day and switches between shifts', () => {
    renderPanel();
    expect(screen.getByText('Whole day', { selector: 'th' })).toBeInTheDocument();
    expect(sheetRow('PRODUCTION').getByText('8,655')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Day' }));
    expect(screen.getByText('Day shift')).toBeInTheDocument();
    expect(sheetRow('PRODUCTION').getByText('3,000')).toBeInTheDocument();
  });

  it('pies the heads that cost something, and says what was taken off', () => {
    renderPanel();

    const legend = screen.getByText('Where the cost went').parentElement as HTMLElement;
    // Fixed Manpower: 46,154 of the 1,01,692 spent.
    const manpower = within(legend).getByText('Fixed Manpower').closest('li') as HTMLElement;
    expect(within(manpower).getByText('45.4%')).toBeInTheDocument();
    expect(within(legend).queryByText('Scrap Recovering')).not.toBeInTheDocument();
    expect(screen.getByText(/Scrap Recovering −₹3,075 taken off the total/)).toBeInTheDocument();
  });

  it('offers a date picker when it owns the day', () => {
    const onDateChange = vi.fn();
    render(
      <MemoryRouter>
        <FillingCostSheetPanel date="2026-09-28" onDateChange={onDateChange} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-27' } });
    expect(onDateChange).toHaveBeenCalledWith('2026-09-27');
  });

  it('has no date picker when the day is the caller’s', () => {
    renderPanel();
    expect(screen.queryByLabelText('Date')).not.toBeInTheDocument();
  });

  it('offers no shift switch on a day kept whole', () => {
    answer.day = { ...DAY, kept_by: 'day', shifts: [] };
    renderPanel();
    expect(screen.queryByRole('group', { name: 'Shift' })).not.toBeInTheDocument();
  });

  it('says so when the day has no sheet', () => {
    answer.day = null;
    renderPanel();
    expect(screen.getByText('No filling cost sheet saved for this day yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sheet/ })).toHaveAttribute(
      'href',
      '/production/execution/filling-cost',
    );
  });
});

describe('Filling cost figures', () => {
  it('writes rupees and rates the Indian way', () => {
    expect(rupees('1234567.8')).toBe('₹12,34,568');
    expect(rupees('-3075')).toBe('−₹3,075');
    expect(rate('0.08333', 4)).toBe('₹0.0833');
    expect(rate(null)).toBe('—');
  });
});
