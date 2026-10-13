import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MaterialIndent } from '@/modules/maintenance/types';

// A purchase on the gate's Material In screen that does not all come at once.

const gateIn = vi.fn().mockResolvedValue({});
let indents: MaterialIndent[] = [];

vi.mock('@/modules/maintenance/api', () => ({
  useMaterialIndents: () => ({ data: indents, isLoading: false }),
  useGateInMaterialIndent: () => ({ mutateAsync: gateIn, isPending: false }),
  useUploadMaterialIndentAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/modules/gate/api/returnable', () => ({
  useReturnableGatePasses: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

import ReturnInListPage from '@/modules/gate/pages/returnablePages/ReturnInListPage';

function line(id: number, particulars: string, bought: string, arrived = '0.000') {
  return {
    id,
    indent: 7,
    line_num: id,
    particulars,
    specification: '',
    quantity: bought,
    unit: 'NOS',
    issued_quantity: '0.000',
    shortfall_quantity: bought,
    arrived_quantity: arrived,
    pending_arrival_quantity: String(Number(bought) - Number(arrived)),
    awaiting_receipt_quantity: '0.000',
    received_quantity: '0.000',
  };
}

function indent(status: string, items: ReturnType<typeof line>[]): MaterialIndent {
  return {
    id: 7,
    indent_no: 'MI-20261012-0001',
    status,
    requested_by_name: 'Vikram',
    created_by_name: 'Vikram',
    items,
    arrivals: [],
  } as unknown as MaterialIndent;
}

function renderPage() {
  render(
    <MemoryRouter>
      <ReturnInListPage />
    </MemoryRouter>,
  );
}

describe('Material In — a purchase arriving in pieces', () => {
  beforeEach(() => gateIn.mockClear());

  it('gates in only what came and says the rest stays open', async () => {
    indents = [indent('PURCHASED', [line(1, 'A4 Paper box', '30.000'), line(2, 'Pen', '40.000')])];
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Gate In' }));
    const dialog = await screen.findByRole('dialog');
    // Every box starts at what is still expected: a full delivery is one tap.
    expect(
      within(dialog).getByText('Everything still expected is on this vehicle.'),
    ).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/Pen/), { target: { value: '0' } });
    expect(within(dialog).getByText(/Part delivery: 1 of 2 items coming in/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gate In Part' }));

    await waitFor(() => expect(gateIn).toHaveBeenCalled());
    expect(gateIn.mock.calls[0][0]).toMatchObject({
      indentId: 7,
      payload: { items: [{ id: 1, quantity: '30' }] },
    });
  });

  it('will not let in more than is still expected', async () => {
    indents = [
      indent('PARTIALLY_ARRIVED', [
        line(1, 'A4 Paper box', '30.000', '30.000'),
        line(2, 'Pen', '40.000', '25.000'),
      ]),
    ];
    renderPage();
    // Part arrived: the paper is all in, the pens are not, and the gate can take the rest.
    expect(screen.getByText('1 item still to come')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Gate In Rest' }));
    const dialog = await screen.findByRole('dialog');
    const pens = within(dialog).getByLabelText(/Pen/);
    expect(pens).toHaveValue(15);
    expect(within(dialog).queryByLabelText(/A4 Paper box/)).not.toBeInTheDocument();

    fireEvent.change(pens, { target: { value: '20' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm Gate In' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Only 15 NOS of Pen is still expected.',
    );
    expect(gateIn).not.toHaveBeenCalled();
  });
});
