import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { BacklogBillDetail } from '../components/BacklogBillDetail';
import type { BacklogBill } from '../hooks';

function bill(overrides: Partial<BacklogBill> = {}): BacklogBill {
  return {
    id: 1,
    invoiceNo: '626040516',
    customer: 'ANTIZE FOODS PRIVATE LIMITED',
    place: 'DL',
    transporter: '',
    dispatchDate: '2026-05-02',
    ageDays: 127,
    status: 'PENDING',
    amount: 2_000_000,
    litres: 10_500,
    weightKg: 10_600,
    isStub: false,
    docEntry: 4204,
    customerCode: 'CUSTA000910',
    productVariety: 'MUSTARD',
    priority: 'HIGH',
    ewayBill: '',
    vehicleNo: '',
    dispatchStage: null,
    gatepassNo: null,
    gateOutCount: 0,
    lastDispatchedAt: null,
    dispatchedAmount: 0,
    dispatchedWeightKg: 0,
    dispatchedBoxes: 0,
    fulfillmentRate: null,
    dispatches: [],
    ...overrides,
  };
}

const show = (b: BacklogBill | null, onClose = vi.fn()) =>
  render(
    <MemoryRouter>
      <BacklogBillDetail bill={b} onClose={onClose} />
    </MemoryRouter>,
  );

describe('BacklogBillDetail', () => {
  it('shows the bill without firing a request of its own', () => {
    show(bill());

    expect(screen.getByText('ANTIZE FOODS PRIVATE LIMITED')).toBeTruthy();
    expect(document.body.textContent).toContain('626040516');
    expect(document.body.textContent).toContain('127d late');
    expect(document.body.textContent).toContain('CUSTA000910');
    expect(document.body.textContent).toContain('MUSTARD');
  });

  it('says no transporter is allotted rather than printing dashes', () => {
    show(bill({ status: 'PENDING' }));

    expect(document.body.textContent).toContain('No transporter allotted yet');
  });

  it('names the carrier once the plan is booked', () => {
    show(
      bill({
        status: 'BOOKED',
        transporter: 'Bhargave Road Carrier',
        vehicleNo: 'HR55AK3066',
        dispatchStage: 'DOCKED',
      }),
    );

    expect(document.body.textContent).toContain('Bhargave Road Carrier');
    expect(document.body.textContent).toContain('HR55AK3066');
    expect(document.body.textContent).not.toContain('No transporter allotted yet');
  });

  it('separates what has already shipped from what is still owed', () => {
    show(
      bill({
        amount: 1_000_000,
        dispatchedAmount: 750_000,
        dispatchedBoxes: 300,
        fulfillmentRate: 0.75,
        dispatches: [
          {
            docNum: 'INV-1',
            status: 'DISPATCHED',
            gatepassNo: 'DCK/OIL/2026/000123',
            amount: 750_000,
            weightKg: 7_500,
            boxes: 300,
            vehicleNo: 'HR69F7125',
            gateOutDate: '2026-05-04',
            dispatchedAt: '2026-05-04T09:12:00Z',
          },
        ],
      }),
    );

    expect(document.body.textContent).toContain('Already shipped against this bill');
    expect(document.body.textContent).toContain('75%');
    // The remainder is the number that matters: the row's own amount is the
    // WHOLE bill, and reading it as outstanding would overstate the backlog.
    expect(document.body.textContent).toContain('₹2.5 L');
    expect(document.body.textContent).toContain('DCK/OIL/2026/000123');
  });

  it('hides the shipped section entirely when nothing has gone out', () => {
    show(bill({ dispatchedAmount: 0 }));
    expect(document.body.textContent).not.toContain('Already shipped against this bill');
  });

  it('calls out a stub instead of showing it as a bill worth nothing', () => {
    show(bill({ isStub: true, amount: 0, litres: 0, weightKg: 0 }));
    expect(document.body.textContent).toContain('never filled in');
  });

  it('tells the reader when the bill shipped while the card was open', () => {
    // The panel passes null once the id it is holding drops out of the live
    // backlog — which happens on any refresh where the bill went out.
    show(null);

    expect(document.body.textContent).toContain('This bill has just shipped');
  });

  it('closes on Escape, since the board is driven from across a room', () => {
    const onClose = vi.fn();
    show(bill(), onClose);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
