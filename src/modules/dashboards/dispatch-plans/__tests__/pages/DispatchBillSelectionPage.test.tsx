import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────
// Only the data layer and the filter bar are stubbed; the selection board
// itself — the thing under test — runs for real.

const state = vi.hoisted(() => ({
  bills: [] as unknown[],
  submit: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('../../api', () => ({
  useDispatchBills: () => ({
    data: { data: state.bills },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSubmitBillSelection: () => ({ mutate: state.submit, isPending: false }),
}));

vi.mock('../../components', () => ({
  DispatchPlanFilters: () => <div data-testid="filters" />,
}));

vi.mock('../../../components/SAPUnavailableBanner', () => ({
  SAPUnavailableBanner: () => <div data-testid="sap-banner" />,
}));

import DispatchBillSelectionPage from '../../pages/DispatchBillSelectionPage';

const bill = (
  doc_entry: number,
  doc_num: string,
  is_selected: boolean,
  booking_status: string | null,
) => ({
  doc_entry,
  doc_num,
  doc_date: '2026-08-12',
  card_code: 'C1',
  card_name: `Party ${doc_num}`,
  city: 'Delhi',
  state: 'DL',
  total_litres: 100,
  total_boxes: 10,
  doc_total: 5000,
  is_selected,
  plan: booking_status ? { booking_status } : undefined,
});

/** The row for a given invoice number. */
const row = (docNum: string) => screen.getByText(docNum).closest('tr') as HTMLElement;
const checkboxIn = (docNum: string) => within(row(docNum)).getByRole('checkbox');

beforeEach(() => {
  state.submit = vi.fn();
  state.bills = [
    bill(1, 'INV-NEW', false, null), //          never added
    bill(2, 'INV-PENDING', true, 'PENDING'), //  added, nothing booked → reversible
    bill(3, 'INV-BOOKED', true, 'BOOKED'), //    vehicle booked → locked
    bill(4, 'INV-DISPATCHED', true, 'DISPATCHED'), // gone → locked
  ];
});

describe('Bill Selection — reversing a selection', () => {
  it('still lists a bill after it has been selected', () => {
    // The bug: selected bills were filtered out, so the only screen that can
    // reverse a selection was the one screen that refused to show it.
    render(<DispatchBillSelectionPage />);
    expect(row('INV-PENDING')).toBeTruthy();
    expect(row('INV-BOOKED')).toBeTruthy();
  });

  it('labels each bill with where it stands', () => {
    render(<DispatchBillSelectionPage />);
    expect(within(row('INV-NEW')).getByText('Not added')).toBeTruthy();
    expect(within(row('INV-PENDING')).getByText('In planning')).toBeTruthy();
    expect(within(row('INV-BOOKED')).getByText(/Booked · locked/)).toBeTruthy();
    expect(within(row('INV-DISPATCHED')).getByText(/Dispatched · locked/)).toBeTruthy();
  });

  it('lets a still-pending selection be unticked', () => {
    render(<DispatchBillSelectionPage />);
    const box = checkboxIn('INV-PENDING');
    expect(box).not.toBeDisabled();
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(checkboxIn('INV-PENDING')).not.toBeChecked();
  });

  it('disables the checkbox once the bill is booked or dispatched', () => {
    render(<DispatchBillSelectionPage />);
    expect(checkboxIn('INV-BOOKED')).toBeDisabled();
    expect(checkboxIn('INV-DISPATCHED')).toBeDisabled();
  });

  it('ignores a row click on a locked bill', () => {
    render(<DispatchBillSelectionPage />);
    fireEvent.click(row('INV-BOOKED'));
    expect(checkboxIn('INV-BOOKED')).toBeChecked();
  });

  it('warns how many bills the submit will remove', () => {
    render(<DispatchBillSelectionPage />);
    fireEvent.click(checkboxIn('INV-PENDING'));
    expect(screen.getByText(/1 will be removed from planning/)).toBeTruthy();
  });

  it('select-all leaves locked bills exactly as they were', () => {
    render(<DispatchBillSelectionPage />);
    // The header checkbox is the first in the table, above the rows.
    const selectAll = screen.getAllByRole('checkbox')[0];

    fireEvent.click(selectAll); // tick everything reversible
    expect(checkboxIn('INV-NEW')).toBeChecked();
    expect(checkboxIn('INV-BOOKED')).toBeChecked();

    fireEvent.click(selectAll); // untick everything reversible
    expect(checkboxIn('INV-NEW')).not.toBeChecked();
    expect(checkboxIn('INV-PENDING')).not.toBeChecked();
    // A bulk action must never try to reverse what the API will refuse.
    expect(checkboxIn('INV-BOOKED')).toBeChecked();
    expect(checkboxIn('INV-DISPATCHED')).toBeChecked();
  });

  it('submits the locked bills as still-selected so the server never sees a removal', () => {
    render(<DispatchBillSelectionPage />);
    fireEvent.click(checkboxIn('INV-PENDING'));
    fireEvent.click(screen.getByRole('button', { name: /Submit selection/i }));

    const payload = state.submit.mock.calls[0][0];
    expect(payload.shown_doc_entries.sort()).toEqual([1, 2, 3, 4]);
    // 2 dropped (the reversal); 3 and 4 still present so they are untouched.
    expect(payload.selected_doc_entries.sort()).toEqual([3, 4]);
  });
});
