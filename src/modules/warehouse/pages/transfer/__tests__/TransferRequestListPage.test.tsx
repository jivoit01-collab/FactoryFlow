/**
 * One search box over every tab.
 *
 * The queues here are five different things — the app's own requests, SAP's
 * approval queue, SAP's approved drafts — and somebody chasing a transfer does
 * not know which one holds it. These assert the part that makes the box worth
 * having: it counts matches in EVERY tab, says so when they are in another one,
 * and gets you there in a click.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type {
  SapTransferDraft,
  TransferRequestListItem,
} from '../../../types';
import TransferRequestListPage from '../TransferRequestListPage';

const request = {
  id: 1,
  entry_no: 'TR-20260914-003',
  from_warehouse: 'BH-BT',
  to_warehouse: 'BH-FG',
  route_type: 'SAME_BRANCH',
  intransit_warehouse: '',
  status: 'PENDING',
  status_display: 'Awaiting decision',
  posting_status: 'NOT_POSTED',
  posting_status_display: 'Stock not moved',
  sap_request_doc_num: '',
  sap_transfer_doc_num: '',
  sap_leg2_doc_num: '',
  requested_by_name: 'Pankaj',
  line_count: 1,
  created_at: '2026-09-14T04:00:00Z',
} as TransferRequestListItem;

const draft = {
  draft_entry: 4321,
  doc_num: 726676913,
  doc_date: '2026-07-24',
  from_warehouse: 'BH-GR',
  to_warehouse: 'BH-SC',
  comments: 'disassembly entery',
  journal_memo: null,
  branch_id: 1,
  created_by: 'PANKAJ',
  age_days: 52,
  approval_status: 'Y',
  can_post: true,
  blocked_reason: null,
  warnings: [],
  will_be_refused: false,
  lines: [
    {
      line_num: 0,
      item_code: 'SC0000007',
      item_name: 'TROLLY BAG',
      uom: 'PCS',
      quantity: '16',
      from_warehouse: 'BH-GR',
      to_warehouse: 'BH-SC',
      source_stock: '16',
      short: false,
      source_empty: false,
      batch_managed: false,
      batches_allocated: 0,
      allocated_quantity: '0',
      batches_missing: false,
      allocation_partial: false,
      batches_short: [],
      last_issue: null,
    },
  ],
} as SapTransferDraft;

const loaded = <T,>(data: T) => ({ data, isLoading: false, isError: false });
const empty = { data: [], isLoading: false, isError: false };

vi.mock('../../../api', () => ({
  useTransferRequests: () => loaded([request]),
  usePendingTransferRequests: () => loaded([request]),
  useInTransitTransferRequests: () => empty,
  useSapTransferApprovals: () => empty,
  useSapAwaitingTransfers: () => empty,
  useSapTransferDrafts: () => loaded([draft]),
  // Reached only once a card's button is pressed, which these never do.
  useAddSapTransferDraft: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePostSapTransfer: () => ({ isPending: false, mutateAsync: vi.fn() }),
  // The document side of this page — printing a posted SAP transfer. These
  // tests are about the search box, so the lookup stays empty and nothing is
  // ever printed; they exist so the imports resolve.
  useSapTransferSearch: () => empty,
  sapTransferApi: { search: vi.fn(), get: vi.fn() },
  SAP_TRANSFER_QUERY_KEYS: { detail: (docEntry: number) => ['sap-transfer', docEntry] },
  warehousePrintInfoQuery: () => ({ codes: [], options: {} }),
}));

vi.mock('@/core/auth', () => ({ usePermission: () => ({ hasPermission: () => true }) }));

function open() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <TransferRequestListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Type into the one search box; the page debounces, so assertions wait. */
function searchFor(text: string) {
  fireEvent.change(screen.getByLabelText('Search every transfer queue'), {
    target: { value: text },
  });
}

/** The tab strip's own button for one tab, so counts can be read off it. */
function tabButton(label: string): HTMLElement {
  return screen.getAllByRole('button', { name: new RegExp(label, 'i') })[0];
}

describe('TransferRequestListPage search', () => {
  it('counts matches in every tab, not just the open one', async () => {
    open();

    // "TROLLY BAG" is an item on a SAP approved draft — a different queue, and
    // a different tab, from the one that opens by default.
    searchFor('trolly');

    await waitFor(() =>
      expect(within(tabButton('All requests')).getByText('0')).toBeTruthy(),
    );
    expect(within(tabButton('Awaiting transfer')).getByText('1')).toBeTruthy();
  });

  it('says where the match is when it is not in this tab, and goes there', async () => {
    open();

    searchFor('trolly');

    const jump = await screen.findByRole('button', { name: /Awaiting transfer \(1\)/i });
    fireEvent.click(jump);

    // The draft queue is open, and the matched draft is on screen.
    expect(await screen.findByText(/SAP 726676913/)).toBeTruthy();
  });

  it('searches the app’s own requests too', async () => {
    open();

    searchFor('bh-fg');

    await waitFor(() =>
      expect(within(tabButton('All requests')).getByText('1')).toBeTruthy(),
    );
    expect(screen.getByText('TR-20260914-003')).toBeTruthy();
  });

  it('leaves every tab alone until the box has something to search on', async () => {
    open();

    // One character matches nearly everything, so it is not treated as a
    // search: every tab keeps its own backlog count.
    searchFor('t');

    await waitFor(() =>
      expect(within(tabButton('All requests')).getByText('1')).toBeTruthy(),
    );
    expect(within(tabButton('Awaiting transfer')).getByText('1')).toBeTruthy();
    expect(screen.queryByText(/found in/i)).toBeNull();
  });
});
