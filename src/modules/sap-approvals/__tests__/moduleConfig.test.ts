import { describe, expect, it, vi } from 'vitest';

// The badge reaches `@/core/auth`, which pulls the store, which builds its
// reducers from the registry this config belongs to. Stub it: this test is
// about the gating.
vi.mock('../components/PendingCountBadge', () => ({
  PendingCountBadge: () => null,
}));

import { SAP_APPROVALS_ACCESS, SAP_APPROVALS_PERMISSIONS } from '@/config/permissions';

import { SAP_APPROVALS_NAV_ITEMS, sapApprovalsModuleConfig } from '../module.config';

describe('sap-approvals module config', () => {
  it('registers the inbox and the rejection history', () => {
    expect(sapApprovalsModuleConfig.routes.map((route) => route.path)).toEqual([
      '/sap-approvals',
      '/sap-approvals/rejections',
    ]);
  });

  it('opens on any of the three rights — deciding and withdrawing imply viewing', () => {
    expect([...SAP_APPROVALS_ACCESS].sort()).toEqual(
      [
        SAP_APPROVALS_PERMISSIONS.VIEW_INBOX,
        SAP_APPROVALS_PERMISSIONS.DECIDE,
        SAP_APPROVALS_PERMISSIONS.WITHDRAW_OWN,
      ].sort(),
    );
    // The rejection history too: every inbox user sees what comes back and why.
    for (const route of sapApprovalsModuleConfig.routes) {
      expect(route.permissions).toEqual(SAP_APPROVALS_ACCESS);
    }
  });

  it('sits under SAP Portal on the same rights, never by prefix, with the badge', () => {
    expect(sapApprovalsModuleConfig.navigation ?? []).toEqual([]);
    const [item, history] = SAP_APPROVALS_NAV_ITEMS;
    expect(item.title).toBe('Approvals');
    expect(item.modulePrefix).toBeUndefined();
    expect(item.permissions).toEqual(SAP_APPROVALS_ACCESS);
    expect(item.badge).toBeDefined();
    expect(history.title).toBe('Rejection History');
    expect(history.permissions).toEqual(SAP_APPROVALS_ACCESS);
  });

  it('names only sap_approvals rights, as the backend declares them', () => {
    expect(Object.values(SAP_APPROVALS_PERMISSIONS)).toEqual([
      'sap_approvals.can_view_sap_approval_inbox',
      'sap_approvals.can_decide_sap_approvals',
      'sap_approvals.can_withdraw_own_sap_approvals',
    ]);
  });
});
