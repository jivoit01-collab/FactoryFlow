/**
 * The credit-note queue's readability contract.
 *
 * Two things here are easy to get wrong and expensive when they are. A credit
 * note is not always goods coming back — about a third are service documents
 * with no items and no warehouse — so the row must render what the document
 * actually holds. And SAP takes a decision from one named authorizer only, so
 * Approve must appear on that person's rows and nowhere else, while everybody
 * else's rows stay visible with the reason they cannot be touched.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CreditNoteApproval } from '../../types';
import { CreditNoteApprovalTable } from '../CreditNoteApprovalTable';

/** An A/R item credit note: a customer sent goods back into BH-GR. */
const PENDING: CreditNoteApproval = {
  id: 75424,
  obj_type: '14',
  doc_type_label: 'A/R Credit Note',
  family: 'AR',
  line_type: 'I',
  line_type_label: 'Item',
  moves_stock: true,
  stock_direction: 'IN',
  draft_entry: 57198,
  // Provisional: this number is on other open drafts too.
  doc_num: 626092648,
  posted_doc_entry: null,
  posted_doc_num: null,
  card_code: 'CUSTA000844',
  party_name: 'ILAHI CO.',
  total_amount: '17455.00',
  tax_amount: '0.00',
  currency: 'INR',
  branch: 'FACTORY',
  doc_date: '2026-09-16',
  comments: 'RN-1626096511',
  reference: null,
  base_documents: ['A/R Return 1626096511'],
  warehouses: ['BH-GR'],
  status: 'PENDING',
  rejection_reason: null,
  current_step: 20,
  template_code: 106,
  template_name: 'USER24 ALL GAUTAM',
  request_count: 1,
  request_index: 1,
  open_request_count: 1,
  approver_code: 'USER24',
  approver_name: 'Gautam Chanana',
  decided_by: null,
  decided_by_name: null,
  decided_at: null,
  credentials_configured: false,
  is_mine: false,
  can_decide: false,
  lines: [
    {
      line_num: 0,
      item_code: 'FG0000123',
      description: 'JIVO CANOLA OIL 1 LTR',
      quantity: 120,
      warehouse: 'BH-GR',
      price: '145.45',
      line_total: '17455.00',
      account_code: null,
      account_name: null,
      warehouse_stock: 3400,
      base_ref: '1626096511',
      base_type_label: 'A/R Return',
    },
  ],
  created_at: '2026-09-16T10:00:00',
  created_by: 'ATUL SHARMA',
};

/** No items, no warehouse — an amount against a G/L account. */
const SERVICE: CreditNoteApproval = {
  ...PENDING,
  id: 74504,
  line_type: 'S',
  line_type_label: 'Service',
  moves_stock: false,
  stock_direction: null,
  total_amount: '10842.00',
  base_documents: [],
  warehouses: [],
  lines: [
    {
      line_num: 0,
      item_code: null,
      description: 'PROMOTIONAL DISCOUNT',
      quantity: 0,
      warehouse: null,
      price: '10842.00',
      line_total: '10842.00',
      account_code: '5500004',
      account_name: 'PROMOTIONAL DISCOUNT',
      warehouse_stock: null,
      base_ref: null,
      base_type_label: null,
    },
  ],
};

/** An A/P credit note sending stock back to a vendor the warehouse is short of. */
const VENDOR_SHORT: CreditNoteApproval = {
  ...PENDING,
  id: 75500,
  obj_type: '19',
  doc_type_label: 'A/P Credit Note',
  family: 'AP',
  stock_direction: 'OUT',
  party_name: 'SHREE PACKAGING',
  lines: [{ ...PENDING.lines[0], quantity: 5000, warehouse_stock: 120 }],
};

const DECIDED: CreditNoteApproval = {
  ...PENDING,
  id: 75425,
  status: 'APPROVED',
  approver_code: null,
  approver_name: null,
  decided_by: 'USER06',
  decided_by_name: 'LOVPREET SINGH',
  decided_at: '2026-09-16T11:24:00',
  posted_doc_entry: 41202,
  // Deliberately NOT the draft's number — that divergence is the whole point.
  posted_doc_num: 626092650,
};

const MINE: CreditNoteApproval = {
  ...PENDING,
  id: 75601,
  approver_code: 'USER37',
  approver_name: 'HONEY SINGH',
  credentials_configured: true,
  is_mine: true,
  can_decide: true,
};

/**
 * Oil draft 52386 as SAP holds it: ONE credit note that matched two approval
 * templates, so SAP opened two requests on it and both wait on the same user.
 * Every other field is the draft's, shared by both rows — which is exactly why
 * the pair looked like the queue printing one document twice.
 */
const TWIN_A: CreditNoteApproval = {
  ...PENDING,
  id: 69466,
  draft_entry: 52386,
  party_name: 'JIVO MART PVT LTD',
  card_code: 'CUSTA000606',
  total_amount: '80621.00',
  template_code: 27,
  template_name: 'USER26 GRPO',
  request_count: 2,
  request_index: 1,
  open_request_count: 2,
};

const TWIN_B: CreditNoteApproval = {
  ...TWIN_A,
  id: 69467,
  template_code: 73,
  template_name: 'USER26 FINISHED GP',
  request_index: 2,
};

function renderTable(props: Partial<Parameters<typeof CreditNoteApprovalTable>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CreditNoteApprovalTable rows={[PENDING]} isLoading={false} isError={false} {...props} />
    </QueryClientProvider>,
  );
}

describe('CreditNoteApprovalTable', () => {
  it('gives each credit note one row, with the lines hidden until asked for', () => {
    renderTable();
    // One header row + one body row. Lines are not in the grid.
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.queryByText('JIVO CANOLA OIL 1 LTR')).not.toBeInTheDocument();
    expect(screen.getByText('1 line')).toBeInTheDocument();

    fireEvent.click(screen.getByText('A/R Credit Note'));
    expect(screen.getByText('JIVO CANOLA OIL 1 LTR')).toBeInTheDocument();
    // Named in the grid ("vs …") and again in full inside the expander.
    expect(screen.getAllByText(/A\/R Return 1626096511/).length).toBeGreaterThan(0);
  });

  it('renders a service credit note as an account and an amount, not as goods', () => {
    renderTable({ rows: [SERVICE] });
    expect(screen.getByText('Service')).toBeInTheDocument();

    fireEvent.click(screen.getByText('A/R Credit Note'));
    // The account, not an item/quantity/warehouse grid.
    expect(screen.getByText('5500004')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Account' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Warehouse' })).not.toBeInTheDocument();
    expect(screen.getByText(/no goods move/i)).toBeInTheDocument();
  });

  it('warns only when the stock is going OUT and the warehouse cannot cover it', () => {
    const { unmount } = renderTable({ rows: [VENDOR_SHORT] });
    expect(screen.getByText('Stock out')).toBeInTheDocument();
    expect(screen.getByText('1 short')).toBeInTheDocument();
    unmount();

    // The same thin balance on an inbound credit note is normal — the goods are
    // arriving — so flagging it would cry wolf on every row.
    renderTable({ rows: [{ ...PENDING, lines: [{ ...PENDING.lines[0], warehouse_stock: 0 }] }] });
    expect(screen.getByText('Stock in')).toBeInTheDocument();
    expect(screen.queryByText('1 short')).not.toBeInTheDocument();
  });

  it('tells apart two approvals SAP opened on the same credit note', () => {
    renderTable({ rows: [TWIN_A, TWIN_B] });
    const [first, second] = screen.getAllByRole('row').slice(1);

    // The pair is identical in every other column, so the row has to say which
    // approval it is and under which template — otherwise it reads as a bug.
    expect(within(first).getByText('approval 1 of 2')).toBeInTheDocument();
    expect(within(second).getByText('approval 2 of 2')).toBeInTheDocument();
    expect(within(first).getByText('USER26 GRPO')).toBeInTheDocument();
    expect(within(second).getByText('USER26 FINISHED GP')).toBeInTheDocument();

    // And the queue says so up front, before anybody counts ₹80,621 twice.
    expect(screen.getByText(/rows belong to credit notes SAP wants signed more than once/i))
      .toBeInTheDocument();
  });

  it('spells out that both approvals are needed before anything is created', () => {
    renderTable({ rows: [TWIN_A] });
    fireEvent.click(screen.getByText('A/R Credit Note'));

    expect(screen.getByText(/approval 1 of 2 \(template USER26 GRPO\)/)).toBeInTheDocument();
    expect(screen.getByText(/deciding it does not decide the others/i)).toBeInTheDocument();
    expect(screen.getByText(/creates nothing until every one of them is approved/i))
      .toBeInTheDocument();
    // The request id, which is what a decision actually acts on.
    expect(screen.getByText(/69466 · USER26 GRPO/)).toBeInTheDocument();
  });

  it('says nothing about templates on an ordinary one-approval row', () => {
    renderTable();
    expect(screen.queryByText(/approval 1 of 1/)).not.toBeInTheDocument();
    expect(screen.queryByText('USER24 ALL GAUTAM')).not.toBeInTheDocument();
    expect(screen.queryByText(/wants signed more than once/i)).not.toBeInTheDocument();
  });

  it('offers Approve only on the rows SAP named this user on', () => {
    renderTable({ rows: [MINE, PENDING] });
    const [mineRow, theirsRow] = screen.getAllByRole('row').slice(1);
    expect(within(mineRow).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(within(theirsRow).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    // Theirs is still listed, naming who it is stuck on.
    expect(within(theirsRow).getByText('USER24')).toBeInTheDocument();
  });

  it('leads a decided row with the number SAP gave the document, not the draft it came from', () => {
    renderTable({ rows: [DECIDED], view: 'APPROVED' });
    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByRole('button', { name: /626092650/ })).toBeInTheDocument();
    // The draft's own provisional number is not offered at all.
    expect(within(row).queryByText(/626092648/)).not.toBeInTheDocument();
    expect(within(row).getByText('draft 57198')).toBeInTheDocument();
  });

  it('swaps the person column from the authorizer to whoever decided it', () => {
    const { unmount } = renderTable();
    expect(screen.getByText('Waiting on')).toBeInTheDocument();
    expect(screen.getByText('USER24')).toBeInTheDocument();
    unmount();

    renderTable({ rows: [DECIDED], view: 'APPROVED' });
    expect(screen.getByText('Decided by')).toBeInTheDocument();
    expect(screen.getByText('USER06')).toBeInTheDocument();
  });
});
