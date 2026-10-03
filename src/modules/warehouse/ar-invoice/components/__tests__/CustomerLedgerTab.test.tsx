import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomerLedgerAccess } from '../../types';
import { CustomerLedgerTab } from '../CustomerLedgerTab';

const useCustomerLedgerAccess = vi.hoisted(() => vi.fn());
const useCustomerLedger = vi.hoisted(() =>
  vi.fn(() => ({ data: undefined, isLoading: false, isError: false, error: null })),
);

vi.mock('../../api/ar-invoice.queries', () => ({ useCustomerLedgerAccess, useCustomerLedger }));
// The searching picker fetches the customer master; only whether it is offered matters here.
vi.mock('../CustomerSelect', () => ({ CustomerSelect: () => <div>searching picker</div> }));

const WALMART = { customer_code: 'CUSTA000486', customer_name: 'WAL MART INDIA PVT LTD' };
const CASH = { customer_code: 'CUSTA000025', customer_name: 'HARPREET SINGH CASH SALE' };

function render(access: CustomerLedgerAccess | undefined, isError = false) {
  useCustomerLedgerAccess.mockReturnValue({ data: access, isError, error: null });
  return renderToStaticMarkup(<CustomerLedgerTab />);
}

const askedFor = () => useCustomerLedger.mock.calls.at(-1)?.[0]?.customer_code;

describe('CustomerLedgerTab — whose ledger', () => {
  beforeEach(() => {
    useCustomerLedger.mockClear();
  });

  it('opens a linked user straight on their own account, named not searched', () => {
    const html = render({ all_customers: false, customers: [WALMART] });
    expect(html).toContain('WAL MART INDIA PVT LTD (CUSTA000486)');
    expect(html).not.toContain('searching picker');
    expect(html).not.toContain('<select');
    expect(askedFor()).toBe('CUSTA000486');
  });

  it('lists several linked accounts and starts on the first', () => {
    const html = render({ all_customers: false, customers: [CASH, WALMART] });
    expect(html).toContain('<select');
    expect(html).toContain('HARPREET SINGH CASH SALE (CUSTA000025)');
    expect(html).toContain('WAL MART INDIA PVT LTD (CUSTA000486)');
    expect(askedFor()).toBe('CUSTA000025');
  });

  it('tells a user with no link why there is nothing, and asks SAP for nobody', () => {
    const html = render({ all_customers: false, customers: [] });
    expect(html).toContain('No SAP customer is linked to your login');
    expect(html).not.toContain('searching picker');
    expect(askedFor()).toBe('');
  });

  it('offers the searching picker to a holder of the all-ledgers right', () => {
    const html = render({ all_customers: true, customers: [] });
    expect(html).toContain('searching picker');
    expect(html).toContain('No customer chosen');
    expect(askedFor()).toBe('');
  });

  it('asks SAP for nobody until it knows whose ledgers are allowed', () => {
    render(undefined);
    expect(askedFor()).toBe('');
    expect(render(undefined, true)).toContain('Could not check whose ledger you can see');
  });
});
