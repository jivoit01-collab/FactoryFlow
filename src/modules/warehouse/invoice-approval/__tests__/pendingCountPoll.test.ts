import { describe, expect, it } from 'vitest';

import {
  PENDING_COUNT_POLL_OFF_PAGE_MS,
  PENDING_COUNT_POLL_ON_PAGE_MS,
  pendingCountPollMs,
} from '../api/invoice-approval.queries';

/**
 * The badge is a sidebar item, so it polls from every page in the app for every
 * user who can view invoices — against an OMS rate limit all of them share.
 * These pin the cadence so it cannot drift back to "poll hard from everywhere".
 */
describe('pendingCountPollMs', () => {
  it('polls at the faster rate on the approvals page', () => {
    expect(pendingCountPollMs('/warehouse/invoice-approval')).toBe(
      PENDING_COUNT_POLL_ON_PAGE_MS,
    );
  });

  it('polls far less often from anywhere else in the app', () => {
    for (const path of ['/', '/dashboard', '/warehouse', '/warehouse/grpo', '/gate/arrivals']) {
      expect(pendingCountPollMs(path)).toBe(PENDING_COUNT_POLL_OFF_PAGE_MS);
    }
  });

  it('backs off substantially off-page rather than nominally', () => {
    expect(PENDING_COUNT_POLL_OFF_PAGE_MS).toBeGreaterThanOrEqual(
      PENDING_COUNT_POLL_ON_PAGE_MS * 4,
    );
  });

  it('treats /warehouse (the parent) as off-page, not a prefix match for the page', () => {
    expect(pendingCountPollMs('/warehouse')).toBe(PENDING_COUNT_POLL_OFF_PAGE_MS);
  });
});
