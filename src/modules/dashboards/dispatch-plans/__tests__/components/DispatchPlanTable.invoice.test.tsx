import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DispatchPlanTable } from '../../components/DispatchPlanTable';
import type { DispatchBill } from '../../types';

// The bill is read from SAP on a click; this test is about the row, not the
// read, so the query is stubbed and the table needs no QueryClient.
const useBillSummaryInvoicePrint = vi.hoisted(() =>
  vi.fn(() => ({ data: undefined, isFetching: false, error: null })),
);
vi.mock('@/modules/warehouse/api', () => ({ useBillSummaryInvoicePrint }));

/** Only the fields the table reads; the rest of DispatchBill is irrelevant here. */
const bill = (docEntry: number, docNum: string, booking_status: string) =>
  ({
    doc_entry: docEntry,
    doc_num: docNum,
    doc_date: '2026-08-12',
    create_date: '2026-08-12',
    create_time: '10:00',
    card_code: 'C1',
    card_name: `Party ${docNum}`,
    branch_name: 'DELHI',
    base_refs: '',
    item_summary: '',
    city: 'Delhi',
    state: 'DL',
    doc_total: 5000,
    total_litres: 100,
    total_boxes: 10,
    total_weight: 500,
    total_gross_amount: 5900,
    ship_to_address: 'Somewhere',
    sap_vehicle_no: '',
    sap_transporter_name: '',
    sap_bilty_no: '',
    sap_lr_number: '',
    gst_vehicle_no: '',
    plan: { booking_status, remarks: '' },
  }) as unknown as DispatchBill;

const BILLS = [bill(4101, 'INV-PENDING', 'PENDING'), bill(4102, 'INV-DISPATCHED', 'DISPATCHED')];

const row = (docNum: string) => screen.getByText(docNum).closest('tr') as HTMLElement;
const invoiceIn = (docNum: string) =>
  within(row(docNum)).queryByRole('button', { name: `Download invoice ${docNum}` });

function renderTable(props: Partial<Parameters<typeof DispatchPlanTable>[0]> = {}) {
  const onEdit = vi.fn();
  render(
    <DispatchPlanTable
      bills={BILLS}
      isLoading={false}
      canEdit
      onEdit={onEdit}
      page={1}
      pageSize={50}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      ordering="default"
      onOrderingChange={vi.fn()}
      {...props}
    />,
  );
  return { onEdit };
}

describe('Dispatch Plan table — the bill on a row', () => {
  beforeEach(() => {
    useBillSummaryInvoicePrint.mockClear();
  });

  it('offers the invoice on every row, whatever the bill is doing', () => {
    renderTable();
    expect(invoiceIn('INV-PENDING')).toBeTruthy();
    expect(invoiceIn('INV-DISPATCHED')).toBeTruthy();
  });

  it('offers it to a user who cannot edit the plan', () => {
    // Reading a posted SAP document is not an edit — a planner without write
    // rights still has to be able to hand the driver his bill.
    renderTable({ canEdit: false });
    expect(invoiceIn('INV-PENDING')).toBeTruthy();
  });

  it('reads nothing until somebody asks for it', () => {
    renderTable();
    expect(useBillSummaryInvoicePrint).toHaveBeenCalledWith(null);
    expect(useBillSummaryInvoicePrint).not.toHaveBeenCalledWith(4101);
  });

  it('asks for that row’s bill, and does not also open the edit sheet', () => {
    const { onEdit } = renderTable();
    fireEvent.click(invoiceIn('INV-PENDING')!);
    expect(useBillSummaryInvoicePrint).toHaveBeenLastCalledWith(4101);
    // The row itself is clickable — the button must stop that propagating.
    expect(onEdit).not.toHaveBeenCalled();
  });
});
