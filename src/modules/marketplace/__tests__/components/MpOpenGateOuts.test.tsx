import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  manualUpdate: vi.fn(),
  cancel: vi.fn(),
  print: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../api/marketplace.api', () => ({
  marketplaceApi: {
    gatePassManual: vi.fn(),
    gatePassManualUpdate: (...a: unknown[]) => api.manualUpdate(...a),
    gatePassCancel: (...a: unknown[]) => api.cancel(...a),
    gatePassPrint: (...a: unknown[]) => api.print(...a),
  },
}));
// The real pickers fetch the vehicle/driver masters; this suite is about the
// draft row and the form it opens, so they stand in as plain labelled boxes.
vi.mock('@/modules/gate/components', () => ({
  VehicleSelect: ({ label, value }: { label?: string; value?: string }) => (
    <div>
      {label}: {value}
    </div>
  ),
  DriverSelect: ({ label, value }: { label?: string; value?: string }) => (
    <div>
      {label}: {value}
    </div>
  ),
}));

import { MpOpenGateOuts } from '../../components/MpOpenGateOuts';
import type { MpGatePass } from '../../types/marketplace.types';

const pass = (over: Partial<MpGatePass> = {}) =>
  ({
    id: 12,
    channel: 'FLIPKART',
    status: 'DRAFT',
    status_display: 'Draft',
    import_batch: null,
    sheet: '',
    is_manual: true,
    delivery_note_no: '1508264519',
    delivery_note_date: '2026-09-07',
    box_count: 62,
    vehicle: 4,
    vehicle_no: 'HR55AK6402',
    transporter: 2,
    transporter_name: 'Arnav Transport',
    driver: 9,
    driver_name: 'Soyab',
    tare_weight: null,
    gross_weight: null,
    net_weight: null,
    is_weighed: false,
    weighbridge_slip_no: '',
    weight_error: '',
    order_count: 0,
    parcel_count: 0,
    gatepass_no: null,
    security_name: '',
    remarks: '',
    attachments: [],
    created_at: '2026-09-07T11:02:00Z',
    ...over,
  }) as unknown as MpGatePass;

const onDone = vi.fn();

function renderList(passes: MpGatePass[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/marketplace/gate']}>
        <Routes>
          <Route
            path="/marketplace/gate"
            element={<MpOpenGateOuts channel="FLIPKART" passes={passes} onDone={onDone} />}
          />
          <Route path="/marketplace/gate/:batchId/send-out" element={<div>send out screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const btn = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => {
  api.manualUpdate
    .mockReset()
    .mockResolvedValue(pass({ status: 'DISPATCHED', gatepass_no: 'MKT/1' }));
  api.cancel.mockReset().mockResolvedValue(pass({ status: 'CANCELLED' }));
  api.print.mockReset().mockResolvedValue(pass());
  onDone.mockReset();
});

/** The payload the finish-a-draft form submitted. */
const sent = () => api.manualUpdate.mock.calls[0][1] as Record<string, unknown>;

describe('MpOpenGateOuts — gate outs saved as drafts', () => {
  it('shows a draft the gate page used to hide entirely', () => {
    renderList([pass()]);
    expect(document.body.textContent).toMatch(/Not out yet/);
    expect(document.body.textContent).toMatch(/HR55AK6402/);
    expect(document.body.textContent).toMatch(/DN 1508264519/);
    expect(document.body.textContent).toMatch(/62 box\(es\)/);
    expect(document.body.textContent).toMatch(/No sheet/);
  });

  it('renders nothing when no trip is waiting, rather than an empty box', () => {
    renderList([]);
    expect(document.body.textContent).not.toMatch(/Not out yet/);
  });

  it('opens the whole gate-out form on a draft, filled in with what is on the trip', () => {
    renderList([pass()]);
    fireEvent.click(btn(/Mark out/));

    // Not a lone Security box any more: the details the truck is leaving with.
    expect(screen.getByDisplayValue('1508264519')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-09-07')).toBeTruthy();
    expect(screen.getByDisplayValue('62')).toBeTruthy();
    expect(document.body.textContent).toMatch(/Vehicle: HR55AK6402/);
    expect(document.body.textContent).toMatch(/Driver: Soyab/);
    expect(screen.getByLabelText(/Gross \(kg\)/)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Who is letting it out/)).toBeTruthy();
  });

  it('sends the weight the gate person finally took along with the mark-out', async () => {
    renderList([pass()]);
    fireEvent.click(btn(/Mark out/));

    fireEvent.change(screen.getByLabelText(/Tare \(kg\)/), { target: { value: '1260' } });
    fireEvent.change(screen.getByLabelText(/Gross \(kg\)/), { target: { value: '2250' } });
    fireEvent.change(screen.getByPlaceholderText(/Who is letting it out/), {
      target: { value: 'Rakesh' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Mark out$/ }));

    await waitFor(() => expect(api.manualUpdate).toHaveBeenCalled());
    expect(api.manualUpdate.mock.calls[0][0]).toBe(12);
    expect(sent()).toMatchObject({
      tare_weight: '1260',
      gross_weight: '2250',
      security_name: 'Rakesh',
      mark_out: true,
    });
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('corrects a mistyped note number without sending the truck out', async () => {
    renderList([pass()]);
    fireEvent.click(btn(/Mark out/));

    fireEvent.change(screen.getByDisplayValue('1508264519'), {
      target: { value: '1509264522' },
    });
    fireEvent.click(btn(/Save, keep waiting/));

    await waitFor(() => expect(api.manualUpdate).toHaveBeenCalled());
    expect(sent()).toMatchObject({ delivery_note_no: '1509264522', mark_out: false });
  });

  it('leaves a blank weighbridge box alone rather than sending it as a zero', async () => {
    renderList([pass()]);
    fireEvent.click(btn(/Mark out/));
    fireEvent.click(screen.getByRole('button', { name: /^Mark out$/ }));

    await waitFor(() => expect(api.manualUpdate).toHaveBeenCalled());
    expect(sent().tare_weight).toBeUndefined();
    expect(sent().gross_weight).toBeUndefined();
  });

  it('will not cancel a draft without a reason', async () => {
    renderList([pass()]);
    fireEvent.click(btn(/^Cancel$/));
    expect(btn(/Cancel gate out/)).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/Reason/), {
      target: { value: 'raised twice' },
    });
    fireEvent.click(btn(/Cancel gate out/));
    await waitFor(() => expect(api.cancel).toHaveBeenCalledWith(12, 'raised twice'));
  });

  it('hands a sheet-based draft over to the send-out screen instead of marking it out here', () => {
    renderList([pass({ is_manual: false, import_batch: 53, sheet: 'orders-07-09.csv' })]);
    expect(document.body.textContent).toMatch(/orders-07-09\.csv/);
    fireEvent.click(btn(/Continue/));
    expect(document.body.textContent).toMatch(/send out screen/);
  });

  it('says why a mis-keyed weighment is holding the truck, and still opens the fix', () => {
    // The button used to be disabled here, which trapped the truck: the boxes
    // holding the bad reading were behind it. The server still refuses the
    // mark-out until the tare is under the gross.
    renderList([
      pass({
        weight_error: 'Tare weight cannot be greater than gross weight.',
        tare_weight: '2900.000',
        gross_weight: '2450.000',
        is_weighed: true,
        net_weight: '-450.000',
      }),
    ]);
    expect(screen.getByText(/Tare weight cannot be greater than gross weight/)).toBeTruthy();

    fireEvent.click(btn(/Mark out/));
    expect(screen.getByLabelText(/Tare \(kg\)/)).toHaveValue(2900);
  });
});
