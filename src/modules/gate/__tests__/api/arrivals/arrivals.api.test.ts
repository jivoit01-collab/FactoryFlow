// ═══════════════════════════════════════════════════════════════
// Cross-Company Arrival API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies the combined-gatepass + arrival-dispatch endpoints and the
// all_companies threading on the three aggregated dashboards.
// ═══════════════════════════════════════════════════════════════

import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({ data: {} });
const post = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { arrivalsApi } from '../../../api/arrivals/arrivals.api';
import { emptyVehicleInApi } from '../../../api/emptyVehicleIn/emptyVehicleIn.api';
import { salesDispatchApi } from '../../../api/salesDispatch/salesDispatch.api';

describe('arrivalsApi combined gatepass + dispatch', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
  });

  it('reads combined gatepass readiness', async () => {
    await arrivalsApi.gatepassReadiness(7);
    expect(get).toHaveBeenCalledWith('/gate-core/arrivals/7/gatepass/readiness/');
  });

  it('prints the combined gatepass with a printer name', async () => {
    await arrivalsApi.gatepassPrint(7, 'HP-1');
    expect(post).toHaveBeenCalledWith('/gate-core/arrivals/7/gatepass/print/', {
      printer_name: 'HP-1',
    });
  });

  it('commits the combined gatepass', async () => {
    await arrivalsApi.gatepassCommit(7);
    expect(post).toHaveBeenCalledWith('/gate-core/arrivals/7/gatepass/commit/');
  });

  it('logs an audited reprint with a reason', async () => {
    await arrivalsApi.gatepassReprint(7, 'torn');
    expect(post).toHaveBeenCalledWith('/gate-core/arrivals/7/gatepass/reprint/', {
      reprint_reason: 'torn',
      printer_name: '',
    });
  });

  it('dispatches every company on the arrival', async () => {
    await arrivalsApi.dispatch(7);
    expect(post).toHaveBeenCalledWith('/gate-core/arrivals/7/dispatch/');
  });
});

describe('aggregated dashboards thread all_companies=1', () => {
  beforeEach(() => {
    get.mockClear();
  });

  it('empty-vehicle-in list sends all_companies', async () => {
    await emptyVehicleInApi.list({ reason: 'DISPATCH', all_companies: 1 });
    expect(get.mock.calls[0][0]).toContain('all_companies=1');
  });

  it('sales-dispatch list sends all_companies', async () => {
    await salesDispatchApi.list({ all_companies: 1 });
    expect(get.mock.calls[0][0]).toContain('all_companies=1');
  });

  it('pending bookings list sends all_companies', async () => {
    await salesDispatchApi.pendingBookings({ all_companies: 1 });
    expect(get.mock.calls[0][0]).toContain('all_companies=1');
  });
});
