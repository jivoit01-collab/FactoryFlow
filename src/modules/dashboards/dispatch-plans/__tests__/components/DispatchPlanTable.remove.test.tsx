import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DispatchPlanTable } from '../../components/DispatchPlanTable';
import type { DispatchBill } from '../../types';

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

const BILLS = [
  bill(1, 'INV-PENDING', 'PENDING'),
  bill(2, 'INV-BOOKED', 'BOOKED'),
  bill(3, 'INV-DISPATCHED', 'DISPATCHED'),
];

const row = (docNum: string) => screen.getByText(docNum).closest('tr') as HTMLElement;
const removeIn = (docNum: string) =>
  within(row(docNum)).queryByRole('button', { name: /Remove bill/i });

function renderTable(props: Partial<Parameters<typeof DispatchPlanTable>[0]> = {}) {
  const onRemove = vi.fn();
  const onEdit = vi.fn();
  render(
    <DispatchPlanTable
      bills={BILLS}
      isLoading={false}
      canEdit
      onEdit={onEdit}
      onRemove={onRemove}
      page={1}
      pageSize={50}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      ordering="default"
      onOrderingChange={vi.fn()}
      {...props}
    />,
  );
  return { onRemove, onEdit };
}

describe('Dispatch Plan table — removing an entry', () => {
  it('offers Remove on a bill nothing has been booked against', () => {
    renderTable();
    expect(removeIn('INV-PENDING')).toBeTruthy();
  });

  it('does not offer Remove once a vehicle is booked or the truck has gone', () => {
    // Removing then would hide live work from this page while it stays live
    // everywhere else — the server refuses it too.
    renderTable();
    expect(removeIn('INV-BOOKED')).toBeNull();
    expect(removeIn('INV-DISPATCHED')).toBeNull();
  });

  it('offers nothing to a user who cannot edit', () => {
    renderTable({ canEdit: false });
    expect(removeIn('INV-PENDING')).toBeNull();
  });

  it('offers nothing when no remove handler is wired', () => {
    renderTable({ onRemove: undefined });
    expect(removeIn('INV-PENDING')).toBeNull();
  });

  it('hands the bill to the caller and does not also open the edit sheet', () => {
    const { onRemove, onEdit } = renderTable();
    fireEvent.click(removeIn('INV-PENDING')!);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove.mock.calls[0][0].doc_num).toBe('INV-PENDING');
    // The row itself is clickable — the button must stop that propagating.
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('shows progress on the row being removed, and only that row', () => {
    renderTable({ removingDocEntry: 1 });
    const button = removeIn('INV-PENDING')!;
    expect(button).toBeDisabled();
    expect(button.textContent).toContain('Removing');
  });
});
