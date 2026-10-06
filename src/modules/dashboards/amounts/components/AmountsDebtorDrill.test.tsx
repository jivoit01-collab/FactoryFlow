import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AmountsDebtorDrill as Drill, AmountsDebtorFigures } from '../types';

const useAmountsDebtors = vi.fn();
const useAmountsDebtorBills = vi.fn();

vi.mock('../api', () => ({
  useAmountsDebtors: (...args: unknown[]) => useAmountsDebtors(...args),
  useAmountsDebtorBills: (...args: unknown[]) => useAmountsDebtorBills(...args),
}));

import { AmountsDebtorDrill } from './AmountsDebtorDrill';

const figures: AmountsDebtorFigures = {
  amount: 26_000_000,
  customers: 3,
  group_amount: 1_121_586_871,
  oldest: {
    date: '2024-09-30',
    card_code: 'CUSTA000891',
    card_name: 'FUTURE RETAIL LTD.',
    balance: 9_456_961,
  },
};

const total: Drill = {
  key: 'TOTAL',
  amount: 26_000_000,
  missing: ['MART'],
  customers: [
    {
      company_code: 'JIVO_OIL',
      company_label: 'JWPL',
      card_code: 'CUSTA000636',
      card_name: 'THE AREA MANAGER CANTEEN STORE DEPARTMENT',
      balance: 16_543_039,
      since: '2026-07-03',
    },
    {
      company_code: 'JIVO_OIL',
      company_label: 'JWPL',
      card_code: 'CUSTA000891',
      card_name: 'FUTURE RETAIL LTD.',
      balance: 9_456_961,
      since: '2024-09-30',
    },
  ],
};

function renderDrill(key: 'JWPL' | 'TOTAL' = 'TOTAL') {
  return render(
    <AmountsDebtorDrill
      debtorKey={key}
      label={key === 'TOTAL' ? 'Total' : 'JWPL'}
      figures={figures}
      onClose={() => {}}
    />,
  );
}

describe('AmountsDebtorDrill', () => {
  beforeEach(() => {
    useAmountsDebtors.mockReturnValue({ data: total, isLoading: false, error: null });
  });

  it('lists every customer with what they owe and since when', () => {
    renderDrill();

    expect(useAmountsDebtors).toHaveBeenCalledWith('TOTAL');
    expect(screen.getByText('All debtors')).toBeInTheDocument();
    expect(screen.getByText('THE AREA MANAGER CANTEEN STORE DEPARTMENT')).toBeInTheDocument();
    expect(screen.getByText('₹1.65 Cr')).toBeInTheDocument();
    expect(screen.getByText('3 Jul 2026')).toBeInTheDocument();
    // The Total names the company it could not read rather than shrinking quietly.
    expect(screen.getByText('SAP could not be read')).toBeInTheDocument();
  });

  it('opens a customer on its unpaid bills, the oldest one part-paid', () => {
    useAmountsDebtorBills.mockReturnValue({
      data: {
        company_code: 'JIVO_OIL',
        company_label: 'JWPL',
        card_code: 'CUSTA000891',
        card_name: 'FUTURE RETAIL LTD.',
        balance: 1_200,
        bills: [
          {
            trans_id: 10,
            line_id: 0,
            date: '2024-09-30',
            due_date: '2020-01-11',
            type: 'A/R Invoice',
            reference: '1601201044',
            memo: 'A/R Invoices - CUSTA000891',
            amount: 1_000,
            unpaid: 400,
          },
          {
            trans_id: 20,
            line_id: 0,
            date: '2026-09-01',
            due_date: '2026-10-01',
            type: 'Journal Entry',
            reference: '99',
            memo: '',
            amount: 800,
            unpaid: 800,
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    renderDrill();
    fireEvent.click(screen.getByText('FUTURE RETAIL LTD.'));

    expect(useAmountsDebtorBills).toHaveBeenCalledWith('JIVO_OIL', 'CUSTA000891');
    expect(screen.getByText('1601201044')).toBeInTheDocument();
    // Once in the row, once as the panel's "oldest due".
    expect(screen.getAllByText('11 Jan 2020')).toHaveLength(2);
    expect(screen.getByText('₹400')).toBeInTheDocument();
    expect(screen.getByText('all')).toBeInTheDocument();
  });

  it('shows no company column for a single company', () => {
    renderDrill('JWPL');
    expect(screen.getByText('JWPL · debtors')).toBeInTheDocument();
    expect(screen.queryByText('Company')).not.toBeInTheDocument();
  });
});
