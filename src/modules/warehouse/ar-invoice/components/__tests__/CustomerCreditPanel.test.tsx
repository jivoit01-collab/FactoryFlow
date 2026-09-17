import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomerCredit } from '../../types';
import { CustomerCreditPanel } from '../CustomerCreditPanel';

const useCustomerCredit = vi.hoisted(() => vi.fn());

vi.mock('../../api/ar-invoice.queries', () => ({ useCustomerCredit }));

function credit(over: Partial<CustomerCredit> = {}): CustomerCredit {
  return {
    customer_code: 'CUSTA000636',
    customer_name: 'THE AREA MANAGER CANTEEN STORE DEPARTMENT',
    credit_limit: 1_000_000,
    has_credit_limit: true,
    balance: 600_000,
    open_orders: 150_000,
    open_deliveries: 50_000,
    exposure: 800_000,
    available: 200_000,
    over_limit: false,
    is_active: true,
    is_frozen: false,
    ...over,
  };
}

function render(props: Partial<Parameters<typeof CustomerCreditPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <CustomerCreditPanel customerCode="CUSTA000636" {...props} />,
  );
}

function state(over: Partial<{ data: CustomerCredit; isLoading: boolean; isError: boolean }>) {
  useCustomerCredit.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...over,
  });
}

describe('CustomerCreditPanel', () => {
  beforeEach(() => {
    useCustomerCredit.mockReset();
  });

  it('shows the limit and what is drawn against it', () => {
    state({ data: credit() });
    const html = render();
    expect(html).toContain('Credit limit');
    expect(html).toContain('₹10,00,000.00');
    // Exposure and what is left of the limit.
    expect(html).toContain('₹8,00,000.00');
    expect(html).toContain('₹2,00,000.00');
  });

  it('says a missing limit is unset rather than printing a zero limit', () => {
    // The majority of the customer master. A currency-formatted 0 here would
    // read as "blocked" on a customer SAP invoices happily.
    state({ data: credit({ credit_limit: 0, has_credit_limit: false, available: null }) });
    const html = render();
    expect(html).toContain('No limit set');
    expect(html).toContain('Not set');
    expect(html).not.toContain('₹0.00');
    expect(html).not.toContain('Available credit');
  });

  it('still shows the exposure when no limit is set', () => {
    state({
      data: credit({
        credit_limit: 0,
        has_credit_limit: false,
        available: null,
        balance: 450_000,
        open_orders: 0,
        open_deliveries: 0,
        exposure: 450_000,
      }),
    });
    expect(render()).toContain('₹4,50,000.00');
  });

  it('flags a customer already over the limit', () => {
    state({
      data: credit({ credit_limit: 500_000, exposure: 800_000, available: -300_000, over_limit: true }),
    });
    expect(render()).toContain('Over credit limit');
  });

  it('flags the invoice that is what tips the customer over', () => {
    state({ data: credit() });
    // 800,000 exposure + 250,000 invoice against a 1,000,000 limit.
    const html = render({ invoiceAmount: 250_000 });
    expect(html).toContain('This invoice exceeds the limit');
    expect(html).toContain('After this invoice');
  });

  it('does not flag an invoice that fits', () => {
    state({ data: credit() });
    const html = render({ invoiceAmount: 100_000 });
    expect(html).not.toContain('exceeds the limit');
    expect(html).toContain('After this invoice');
  });

  it('reports a frozen or inactive account', () => {
    state({ data: credit({ is_frozen: true, is_active: false }) });
    const html = render();
    expect(html).toContain('Frozen in SAP');
    expect(html).toContain('Inactive');
  });

  it('renders nothing when SAP cannot be read', () => {
    // An informational read must never hold up the invoice being raised.
    state({ isError: true });
    expect(render()).toBe('');
  });

  it('renders nothing before a customer is picked', () => {
    state({ data: credit() });
    expect(render({ customerCode: '' })).toBe('');
  });
});
