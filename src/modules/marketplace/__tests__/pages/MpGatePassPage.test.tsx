import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────
const api = vi.hoisted(() => ({
  create: vi.fn(),
  weigh: vi.fn(),
  dispatch: vi.fn(),
  print: vi.fn(),
  list: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/core/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: [{ id: 1, vehicle_number: 'DL01LAT2433', name: 'Soyab' }],
    }),
  },
}));
vi.mock('../../api/marketplace.api', () => ({
  marketplaceApi: {
    gatePasses: (...a: unknown[]) => api.list(...a),
    gatePassCreate: (...a: unknown[]) => api.create(...a),
    gatePassWeigh: (...a: unknown[]) => api.weigh(...a),
    gatePassDispatch: (...a: unknown[]) => api.dispatch(...a),
    gatePassPrint: (...a: unknown[]) => api.print(...a),
  },
}));

import MpGatePassPage from '../../pages/MpGatePassPage';

const trip = (over: Record<string, unknown> = {}) => ({
  id: 7,
  status: 'DRAFT',
  vehicle_no: 'DL01LAT2433',
  transporter_name: 'Arnav Transport Service',
  driver_name: 'Soyab',
  driver_mobile_no: '9671747754',
  tare_weight: null,
  gross_weight: null,
  net_weight: null,
  is_weighed: false,
  weight_error: 'Gross weight is required before this trip can be marked out.',
  order_count: 0,
  parcel_count: 0,
  gatepass_no: null,
  gate_out_date: null,
  out_time: null,
  security_name: '',
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/marketplace/gate/53/send-out?channel=FLIPKART']}>
        <Routes>
          <Route path="/marketplace/gate/:batchId/send-out" element={<MpGatePassPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const btn = (name: RegExp) => screen.getByRole('button', { name });

/** The trip and weight lines are built from several spans, so assert on the
 *  rendered text as a whole rather than hunting for one element. */
const shows = (needle: RegExp | string) =>
  waitFor(() => expect(document.body.textContent).toMatch(needle));

/** The vehicle list loads asynchronously; selecting before it arrives is a no-op. */
async function pickVehicle() {
  await screen.findByRole('option', { name: 'DL01LAT2433' });
  // Two selects on the page (vehicle, driver); the vehicle is the first.
  const [vehicle] = screen.getAllByRole('combobox');
  fireEvent.change(vehicle, { target: { value: '1' } });
}

beforeEach(() => {
  api.list.mockReset().mockResolvedValue([]);
  api.create.mockReset().mockResolvedValue(trip());
  api.weigh.mockReset();
  api.dispatch.mockReset();
  api.print.mockReset();
});

describe('MpGatePassPage — send an approved sheet out', () => {
  it('starts at step 1 with the later steps not yet usable', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Vehicle & driver' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Weighment' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Mark out' })).toBeTruthy();
    // Nothing can be marked out before a trip exists.
    expect(btn(/Mark out/)).toBeDisabled();
  });

  it('saving the vehicle opens the trip and shows who is driving', async () => {
    renderPage();
    await pickVehicle();
    fireEvent.click(btn(/Save & continue/));
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    await shows(/Arnav Transport Service/);
    await shows(/DL01LAT2433/);
    await shows(/Soyab/);
  });

  it('will not mark out an unweighed trip, and shows the reason', async () => {
    renderPage();
    await pickVehicle();
    fireEvent.click(btn(/Save & continue/));
    await shows(/Arnav Transport Service/);
    expect(btn(/Mark out/)).toBeDisabled();
    expect(
      screen.getByText(/Gross weight is required before this trip can be marked out/),
    ).toBeTruthy();
  });

  it('shows an em dash for weights not recorded, never a zero', async () => {
    renderPage();
    await shows(/tare — · gross —/);
    await shows(/net —/);
  });

  it('allows marking out once weighed', async () => {
    api.create.mockResolvedValue(
      trip({
        is_weighed: true,
        tare_weight: '2450.000',
        gross_weight: '2712.500',
        net_weight: '262.500',
        weight_error: '',
      }),
    );
    renderPage();
    await pickVehicle();
    fireEvent.click(btn(/Save & continue/));
    await shows(/net 262.5 kg/);
    expect(btn(/Mark out/)).not.toBeDisabled();
  });

  it('resumes a trip already open on the sheet instead of starting a second', async () => {
    // A refresh mid-flow, or reopening the page, must not leave two DRAFTs
    // against one sheet with no way to tell which is live.
    api.list.mockResolvedValue([
      trip({ is_weighed: true, tare_weight: '2450.000', gross_weight: '2712.500',
             net_weight: '262.500', weight_error: '' }),
    ]);
    renderPage();
    await shows(/Arnav Transport Service/);
    await shows(/net 262.5 kg/);
    // Step 1 is already done, so nothing was created.
    expect(api.create).not.toHaveBeenCalled();
    expect(btn(/Mark out/)).not.toBeDisabled();
  });

  it('ignores a finished trip on the same sheet and starts fresh', async () => {
    api.list.mockResolvedValue([trip({ status: 'DISPATCHED' })]);
    renderPage();
    // The vehicle form is offered again rather than resuming a trip that has gone.
    await screen.findByRole('option', { name: 'DL01LAT2433' });
    expect(btn(/Save & continue/)).toBeTruthy();
  });

  it('after marking out, shows the load and offers the gatepass — nothing else', async () => {
    api.create.mockResolvedValue(trip({ is_weighed: true, weight_error: '' }));
    api.dispatch.mockResolvedValue(
      trip({
        status: 'DISPATCHED',
        is_weighed: true,
        weight_error: '',
        order_count: 3,
        parcel_count: 4,
        gatepass_no: 'MKT/JIVO_MART/2026-27/000001',
        gate_out_date: '2026-08-12',
        out_time: '14:58:28',
        security_name: 'Rakesh',
      }),
    );
    renderPage();
    await pickVehicle();
    fireEvent.click(btn(/Save & continue/));
    await shows(/Arnav Transport Service/);
    fireEvent.click(btn(/Mark out/));

    await shows(/3 orders · 4 parcels/);
    expect(screen.getByText('MKT/JIVO_MART/2026-27/000001')).toBeTruthy();
    await shows(/security Rakesh/);
    // Print is offered only after the fact, and never blocks the flow.
    expect(btn(/Print gatepass/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Mark out/ })).toBeNull();
  });
});
