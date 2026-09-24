import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminDispatch } from '../types';
import { AdminDispatchDrill, companyName } from './AdminDispatchDrill';

function dispatch(over: Partial<AdminDispatch> = {}): AdminDispatch {
  return {
    mtd_tons: 2_042.1,
    today_tons: 0,
    trucks: 194,
    bills: 194,
    dispatch_days: 22,
    avg_tons_per_dispatch_day: 92.8,
    companies: [
      { company_code: 'JIVO_MART', tons: 1_219.0, trucks: 118, bills: 118 },
      { company_code: 'JIVO_OIL', tons: 823.2, trucks: 76, bills: 76 },
    ],
    invoiced_tons: 1_703.3,
    basis: 'The gate-out register, not SAP invoices.',
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

describe('companyName', () => {
  it('spells a company code the way a table is read, not the way a band is', () => {
    expect(companyName('JIVO_OIL')).toBe('Jivo Oil');
    expect(companyName('JIVO_BEVERAGES')).toBe('Jivo Beverages');
  });

  it('leaves a code it does not recognise alone rather than mangling it', () => {
    expect(companyName('ACME')).toBe('ACME');
  });
});

describe('AdminDispatchDrill', () => {
  it('opens with the tile’s own figures above the companies that make them up', () => {
    render(<AdminDispatchDrill dispatch={dispatch()} period="1–24 Sept" onClose={vi.fn()} />);

    expect(within(stats()).getByText('2,042.1 T')).toBeInTheDocument();
    // A truck carrying four invoices is one truck and four bills, so neither
    // count is printed without the other.
    expect(within(stats()).getByText('194 trucks · 194 bills')).toBeInTheDocument();
    expect(within(stats()).getByText('92.8 T over 22 days')).toBeInTheDocument();
    expect(screen.getByText(/The gate-out register, not SAP invoices/)).toBeInTheDocument();
  });

  it('splits the headline across the companies, and the shares add up', () => {
    render(<AdminDispatchDrill dispatch={dispatch()} period="" onClose={vi.fn()} />);

    expect(within(row('Jivo Mart')).getByText('1,219.0 T')).toBeInTheDocument();
    expect(within(row('Jivo Mart')).getByText('60%')).toBeInTheDocument();
    expect(within(row('Jivo Oil')).getByText('823.2 T')).toBeInTheDocument();
    expect(within(row('Jivo Oil')).getByText('40%')).toBeInTheDocument();
  });

  it('says nothing is out yet rather than printing a zero tonnage', () => {
    // A gate that has not opened today and a gate nobody can read are
    // different answers, and only the first is a fact.
    render(<AdminDispatchDrill dispatch={dispatch()} period="" onClose={vi.fn()} />);

    expect(within(stats()).getByText('nothing out yet')).toBeInTheDocument();
  });

  it('names the billing gap as stock still standing here when billing leads', () => {
    render(
      <AdminDispatchDrill
        dispatch={dispatch({ mtd_tons: 1_500, invoiced_tons: 1_703.3 })}
        period=""
        onClose={vi.fn()}
      />,
    );

    expect(within(cut()).getByText('Billed but still here')).toBeInTheDocument();
    expect(within(cut()).getByText('203.3 T')).toBeInTheDocument();
  });

  it('names the same gap the other way round as earlier months’ bills moving', () => {
    // Shipping more than was billed this month is normal here and must not
    // read as a shortfall.
    render(<AdminDispatchDrill dispatch={dispatch()} period="" onClose={vi.fn()} />);

    expect(within(cut()).getByText('Shipped on earlier bills')).toBeInTheDocument();
    expect(within(cut()).getByText('338.8 T')).toBeInTheDocument();
  });

  it('states that SAP could not be read rather than comparing against a zero', () => {
    render(
      <AdminDispatchDrill
        dispatch={dispatch({ invoiced_tons: null })}
        period=""
        onClose={vi.fn()}
      />,
    );

    expect(
      within(cut()).getByText(/SAP could not be read, so what was billed this month is unknown/),
    ).toBeInTheDocument();
  });

  it('states a month that shipped nothing rather than drawing a blank table', () => {
    render(
      <AdminDispatchDrill
        dispatch={dispatch({ companies: [], mtd_tons: 0, trucks: 0, bills: 0 })}
        period=""
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('No truck left the gate this month.')).toBeInTheDocument();
  });
});
