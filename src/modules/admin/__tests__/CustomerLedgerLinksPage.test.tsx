import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomerLedgerLink } from '@/modules/warehouse/ar-invoice/types';

import CustomerLedgerLinksPage from '../pages/CustomerLedgerLinksPage';

const useCustomerLedgerLinks = vi.hoisted(() => vi.fn());
const idleMutation = vi.hoisted(() => () => ({ isPending: false, mutateAsync: vi.fn() }));

vi.mock('@/modules/warehouse/ar-invoice/api/ar-invoice.queries', () => ({
  useCustomerLedgerLinks,
  useCreateCustomerLedgerLink: idleMutation,
  useRemoveCustomerLedgerLink: idleMutation,
}));
vi.mock('@/modules/notifications/api/sendNotification.queries', () => ({
  useCompanyUsers: () => ({ data: [], isLoading: false }),
}));
// The dialog's pickers are closed on a first render; only the list matters here.
vi.mock('@/modules/warehouse/ar-invoice/components/CustomerSelect', () => ({
  CustomerSelect: () => null,
}));

function link(over: Partial<CustomerLedgerLink> = {}): CustomerLedgerLink {
  return {
    id: 1,
    user: 7,
    user_name: 'Harpreet Singh',
    user_email: 'harpreet@jivo.in',
    user_code: 'EMP-07',
    customer_code: 'CUSTA000025',
    customer_name: 'HARPREET SINGH CASH SALE',
    is_active: true,
    created_by_name: 'IT Team',
    created_at: '2026-10-03T10:00:00Z',
    updated_at: '2026-10-03T10:00:00Z',
    ...over,
  };
}

function render(links: CustomerLedgerLink[], isLoading = false) {
  useCustomerLedgerLinks.mockReturnValue({ data: links, isLoading });
  return renderToStaticMarkup(<CustomerLedgerLinksPage />);
}

describe('CustomerLedgerLinksPage', () => {
  beforeEach(() => useCustomerLedgerLinks.mockReset());

  it('lists each linked user once, with their customers', () => {
    const html = render([
      link(),
      link({ id: 2, customer_code: 'CUSTA000486', customer_name: 'WAL MART INDIA PVT LTD' }),
      link({ id: 3, user: 9, user_name: 'Asha', user_email: 'asha@jivo.in', user_code: '' }),
    ]);
    expect(html).toContain('Linked users (2)');
    expect(html.match(/Harpreet Singh</g)).toHaveLength(1);
    expect(html).toContain('HARPREET SINGH CASH SALE');
    expect(html).toContain('WAL MART INDIA PVT LTD');
    expect(html).toContain('Unlink CUSTA000486 from Harpreet Singh');
  });

  it('leaves unlinked customers off the list', () => {
    const html = render([link({ is_active: false })]);
    expect(html).not.toContain('HARPREET SINGH CASH SALE');
    expect(html).toContain('Nobody is linked yet');
  });

  it('says it is loading rather than that nobody is linked', () => {
    const html = render([], true);
    expect(html).toContain('Loading links');
    expect(html).not.toContain('Nobody is linked yet');
  });
});
