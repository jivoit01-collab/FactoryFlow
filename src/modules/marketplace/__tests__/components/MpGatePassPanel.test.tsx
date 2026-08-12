import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────
// Only the data layer is stubbed; the panel itself runs for real.

const state = vi.hoisted(() => ({ passes: [] as unknown[] }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/core/api', () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock('../../api/marketplace.api', () => ({
  marketplaceApi: {
    gatePasses: vi.fn(() => Promise.resolve(state.passes)),
    gateQueue: vi.fn(() => Promise.resolve({ sheets: [] })),
    gatePassCreate: vi.fn(),
    gatePassWeigh: vi.fn(),
    gatePassPrint: vi.fn(),
    gatePassDispatch: vi.fn(),
    gatePassCancel: vi.fn(),
  },
}));

import { MpGatePassPanel } from '../../components/MpGatePassPanel';

const pass = (over: Record<string, unknown> = {}) => ({
  id: 1,
  channel: 'FLIPKART',
  status: 'DRAFT',
  status_display: 'Draft',
  import_batch: 53,
  sheet: 'Order-CSV.csv',
  vehicle: 1,
  vehicle_no: 'DL01LAT2433',
  transporter: 1,
  transporter_name: 'Arnav Transport Service',
  transporter_gstin: '',
  driver: 1,
  driver_name: 'Soyab',
  driver_mobile_no: '9671747754',
  driver_license_no: 'DL-1',
  tare_weight: null,
  gross_weight: null,
  net_weight: null,
  is_weighed: false,
  weighbridge_slip_no: '',
  first_weighment_at: null,
  second_weighment_at: null,
  weight_error: 'Gross weight is required before this trip can be marked out.',
  order_count: 0,
  parcel_count: 0,
  gatepass_no: null,
  random_code: '',
  qr_payload: '',
  printed_by_name: '',
  printed_at: null,
  gate_out_date: null,
  out_time: null,
  security_name: '',
  dispatched_by_name: '',
  dispatched_at: null,
  remarks: '',
  cancel_reason: '',
  cancelled_at: null,
  created_at: '2026-08-12T10:00:00Z',
  updated_at: '2026-08-12T10:00:00Z',
  ...over,
});

async function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MpGatePassPanel channel={'FLIPKART' as never} />
    </QueryClientProvider>,
  );
  // Let the trip list resolve.
  await screen.findByText(/DL01LAT2433|No trips yet/);
}

const markOut = () => screen.getByRole('button', { name: /Mark out/i });

beforeEach(() => {
  state.passes = [pass()];
});

describe('MpGatePassPanel', () => {
  it('shows the vehicle, transporter and driver frozen on the trip', async () => {
    await renderPanel();
    expect(screen.getByText('DL01LAT2433')).toBeTruthy();
    expect(screen.getByText(/Arnav Transport Service/)).toBeTruthy();
    expect(screen.getByText(/Soyab/)).toBeTruthy();
  });

  it('shows an em dash for weights not yet recorded, never a zero', async () => {
    await renderPanel();
    // "not weighed yet" and "weighed and found empty" must not read alike.
    expect(screen.getByText(/tare — · gross —/)).toBeTruthy();
    expect(screen.getByText(/net —/)).toBeTruthy();
  });

  it('refuses to mark out an unweighed trip, and says why', async () => {
    await renderPanel();
    expect(markOut()).toBeDisabled();
    expect(
      screen.getByText(/Gross weight is required before this trip can be marked out/),
    ).toBeTruthy();
  });

  it('still refuses once weighed, until the gatepass is printed', async () => {
    state.passes = [pass({
      status: 'WEIGHED', status_display: 'Weighed',
      tare_weight: '1000.000', gross_weight: '1250.500', net_weight: '250.500',
      is_weighed: true, weight_error: '',
    })];
    await renderPanel();
    expect(markOut()).toBeDisabled();
    expect(screen.getByText(/Print the gatepass before marking this trip out/)).toBeTruthy();
  });

  it('allows marking out once weighed and printed', async () => {
    state.passes = [pass({
      status: 'GATEPASS_PRINTED', status_display: 'Gatepass printed',
      tare_weight: '1000.000', gross_weight: '1250.500', net_weight: '250.500',
      is_weighed: true, weight_error: '', gatepass_no: 'MKT/JIVO_MART/2026-27/000001',
    })];
    await renderPanel();
    expect(markOut()).not.toBeDisabled();
    expect(screen.getByText('MKT/JIVO_MART/2026-27/000001')).toBeTruthy();
  });

  it('offers no actions on a trip that has already left', async () => {
    state.passes = [pass({
      status: 'DISPATCHED', status_display: 'Dispatched out',
      tare_weight: '1000.000', gross_weight: '1250.500', net_weight: '250.500',
      is_weighed: true, weight_error: '', gatepass_no: 'MKT/X/1',
      order_count: 3, parcel_count: 4,
      gate_out_date: '2026-08-12', out_time: '14:58:28', security_name: 'Rakesh',
    })];
    await renderPanel();
    expect(screen.queryByRole('button', { name: /Mark out/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancel/i })).toBeNull();
    expect(screen.getByText(/3 orders · 4 parcels/)).toBeTruthy();
    expect(screen.getByText(/security Rakesh/)).toBeTruthy();
  });

  it('shows the reason on a cancelled trip', async () => {
    state.passes = [pass({
      status: 'CANCELLED', status_display: 'Cancelled',
      cancel_reason: 'vehicle broke down',
    })];
    await renderPanel();
    expect(screen.getByText(/vehicle broke down/)).toBeTruthy();
  });

  it('says what to do when there are no trips', async () => {
    state.passes = [];
    await renderPanel();
    expect(screen.getByText(/Approve a sheet at the gate, then raise one/)).toBeTruthy();
  });
});
