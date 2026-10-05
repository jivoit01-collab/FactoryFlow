/**
 * The bill summary list's search box.
 *
 * Somebody at the dispatch desk arrives holding a bill number, a party or a
 * truck, and the list is a few hundred sheets long. These assert the parts
 * that make the box worth having: it narrows the list, it reaches the
 * SAP-stamped dispatches too once they are shown, and an empty answer says
 * where else the bill might be rather than just "nothing".
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { BillSummary } from '../../../api';
import BillSummaryListPage from '../BillSummaryListPage';

function sheet(overrides: Partial<BillSummary>): BillSummary {
  return {
    id: 1,
    source: 'APP',
    key: '1',
    entry_no: 'BS-20260928-001',
    sap_invoice_doc_num: '626090581',
    customer_code: 'C1',
    customer_name: 'SHRAY FOOD & BEVERAGES PRIVATE LIMITED',
    warehouse_codes: 'BH-PF',
    dispatch_date: '2026-09-28',
    vehicle_no: '',
    transporter_name: '',
    bilty_no: '',
    driver_name: '',
    status: 'PICKED',
    sap_status: 'POSTED',
    totals: { lines: 1 },
    ...overrides,
  } as BillSummary;
}

const appRows = [
  sheet({}),
  sheet({
    id: 2,
    key: '2',
    entry_no: 'BS-20260928-002',
    sap_invoice_doc_num: '626090573',
    customer_name: 'DURGA TRADING COMPANY',
    vehicle_no: 'PB10AB1234',
    warehouse_codes: 'BH-BT',
  }),
];

const sapRows = [
  sheet({
    id: null,
    source: 'SAP',
    key: 'sap-5101',
    entry_no: 'SAP-626090580',
    sap_invoice_doc_num: '626090580',
    customer_name: 'HARPREET SINGH CASH SALE',
  }),
];

const listed = vi.hoisted(() => ({ rows: null as BillSummary[] | null }));
const scope = vi.hoisted(() => ({
  manages: (() => true) as (code?: string | null) => boolean,
  managesNothing: false,
}));

vi.mock('../../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api')>()),
  useBillSummaries: () => ({ data: listed.rows ?? appRows, isLoading: false }),
  useWarehouseScope: () => scope,
  useSapBillSummaries: (_params: unknown, enabled: boolean) => ({
    data: enabled ? sapRows : [],
    isFetching: false,
    error: null,
  }),
}));

vi.mock('@/core/auth', () => ({ usePermission: () => ({ hasPermission: () => true }) }));

function open() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <BillSummaryListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Type into the search box; the page debounces, so assertions wait. */
function searchFor(text: string) {
  fireEvent.change(screen.getByLabelText('Search bill summaries'), {
    target: { value: text },
  });
}

describe('BillSummaryListPage search', () => {
  it('narrows the list to the bill typed, and clearing brings the rest back', async () => {
    open();
    expect(screen.getByText('BS-20260928-001')).toBeTruthy();

    searchFor('626090573');
    await waitFor(() => expect(screen.queryByText('BS-20260928-001')).toBeNull());
    expect(screen.getByText('BS-20260928-002')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Clear the search'));
    await waitFor(() => expect(screen.getByText('BS-20260928-001')).toBeTruthy());
    expect(screen.getByText('BS-20260928-002')).toBeTruthy();
  });

  it('finds a sheet by its truck', async () => {
    open();
    searchFor('pb10');
    await waitFor(() => expect(screen.queryByText('BS-20260928-001')).toBeNull());
    expect(screen.getByText('BS-20260928-002')).toBeTruthy();
  });

  it('searches the SAP-stamped dispatches once they are shown', async () => {
    open();
    fireEvent.click(screen.getByRole('switch'));
    searchFor('harpreet');
    await waitFor(() => expect(screen.queryByText('BS-20260928-001')).toBeNull());
    expect(screen.getByText('SAP-626090580')).toBeTruthy();
  });

  it('says a bill may be stamped in SAP when nothing here matches', async () => {
    open();
    searchFor('harpreet');
    await waitFor(() => expect(screen.getByText(/Nothing matches “harpreet”/)).toBeTruthy());
    expect(
      screen.getByText(/shows up only with “Also show dispatches stamped in SAP” on/),
    ).toBeTruthy();
  });
});

describe('BillSummaryListPage to-approve count', () => {
  it('counts only the sheets out of the godowns the user manages', () => {
    listed.rows = [
      sheet({ id: 3, key: '3', entry_no: 'BS-3', status: 'PENDING_APPROVAL' }),
      sheet({ id: 4, key: '4', entry_no: 'BS-4', status: 'PENDING_APPROVAL' }),
      sheet({
        id: 5,
        key: '5',
        entry_no: 'BS-5',
        status: 'PENDING_APPROVAL',
        warehouse_codes: 'BH-BT',
      }),
    ];
    scope.manages = (code) => code === 'BH-BT';
    try {
      open();
      expect(screen.getByRole('button', { name: /1 to approve/ })).toBeTruthy();
    } finally {
      listed.rows = null;
      scope.manages = () => true;
    }
  });
});
