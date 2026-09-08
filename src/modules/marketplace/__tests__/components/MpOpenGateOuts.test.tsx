import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ dispatch: vi.fn(), cancel: vi.fn(), print: vi.fn() }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../api/marketplace.api', () => ({
  marketplaceApi: {
    gatePassDispatch: (...a: unknown[]) => api.dispatch(...a),
    gatePassCancel: (...a: unknown[]) => api.cancel(...a),
    gatePassPrint: (...a: unknown[]) => api.print(...a),
  },
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
    vehicle_no: 'HR55AK6402',
    transporter_name: 'Arnav Transport',
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
  api.dispatch.mockReset().mockResolvedValue(pass({ status: 'DISPATCHED', gatepass_no: 'MKT/1' }));
  api.cancel.mockReset().mockResolvedValue(pass({ status: 'CANCELLED' }));
  api.print.mockReset().mockResolvedValue(pass());
  onDone.mockReset();
});

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

  it('marks a manual draft out with the security who let it through', async () => {
    renderList([pass()]);
    fireEvent.click(btn(/Mark out/));
    fireEvent.change(screen.getByPlaceholderText(/Who is letting it out/), {
      target: { value: 'Rakesh' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Mark out$/ }));
    await waitFor(() => expect(api.dispatch).toHaveBeenCalledWith(12, { security_name: 'Rakesh' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
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

  it('says why a mis-keyed weighment is holding the truck, and blocks the button', () => {
    renderList([pass({ weight_error: 'Tare weight cannot be greater than gross weight.' })]);
    expect(screen.getByText(/Tare weight cannot be greater than gross weight/)).toBeTruthy();
    expect(btn(/Mark out/)).toBeDisabled();
  });
});
