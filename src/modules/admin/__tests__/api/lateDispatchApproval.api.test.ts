import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({ data: [] });
const post = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import { lateDispatchApprovalApi } from '../../api/lateDispatchApproval.api';

describe('lateDispatchApprovalApi', () => {
  beforeEach(() => {
    get.mockClear();
    post.mockClear();
  });

  it('lists pending requests across every company', async () => {
    // The gate is one physical place: a truck's request is filed under whichever
    // company's bills it carries, so a company-scoped queue would hide it.
    await lateDispatchApprovalApi.list({ status: 'PENDING', all_companies: true });
    expect(get.mock.calls[0][0]).toContain('/gate-core/late-dispatch-approvals/');
    expect(get.mock.calls[0][0]).toContain('status=PENDING');
    expect(get.mock.calls[0][0]).toContain('all_companies=true');
  });

  it('asks where one truck stands for a given date', async () => {
    get.mockResolvedValueOnce({
      data: { vehicle: 12, requires_approval: true, cutoff: '17:00', approval: null },
    });
    const status = await lateDispatchApprovalApi.byVehicle(12, '2026-09-16');
    expect(get.mock.calls[0][0]).toContain('/gate-core/late-dispatch-approvals/by-vehicle/12/');
    expect(get.mock.calls[0][0]).toContain('gate_in_date=2026-09-16');
    expect(status.requires_approval).toBe(true);
  });

  it('omits the date when the gate means today', async () => {
    await lateDispatchApprovalApi.byVehicle(12);
    expect(get).toHaveBeenCalledWith('/gate-core/late-dispatch-approvals/by-vehicle/12/');
  });

  it('raises a request for a vehicle, not for a gate-in that does not exist yet', async () => {
    const payload = {
      vehicle_id: 12,
      gate_in_date: '2026-09-16',
      in_time: '18:30',
      reason: 'Held up at the previous delivery.',
    };
    await lateDispatchApprovalApi.create(payload);
    expect(post).toHaveBeenCalledWith('/gate-core/late-dispatch-approvals/', payload);
  });

  it('approves and rejects through their own endpoints', async () => {
    await lateDispatchApprovalApi.approve(4, { notes: 'Crew is on shift.' });
    expect(post).toHaveBeenCalledWith('/gate-core/late-dispatch-approvals/4/approve/', {
      notes: 'Crew is on shift.',
    });

    await lateDispatchApprovalApi.reject(4, { notes: 'Load it tomorrow.' });
    expect(post).toHaveBeenCalledWith('/gate-core/late-dispatch-approvals/4/reject/', {
      notes: 'Load it tomorrow.',
    });
  });
});
