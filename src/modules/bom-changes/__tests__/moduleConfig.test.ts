import { describe, expect, it } from 'vitest';

import {
  BOM_CHANGES_ACCESS,
  BOM_CHANGES_APPROVER_ACCESS,
  BOM_CHANGES_PERMISSIONS,
} from '@/config/permissions';

import {
  BOM_CHANGES_NAV_ITEMS,
  BOM_CHANGES_RAISE_ACCESS,
  bomChangesModuleConfig,
} from '../module.config';

describe('bom-changes module config', () => {
  it('registers the viewer, the list, the form and the detail under /bom-changes', () => {
    expect(bomChangesModuleConfig.routes.map((route) => route.path)).toEqual([
      '/bom-changes/sap-boms',
      '/bom-changes/requests',
      '/bom-changes/requests/new',
      '/bom-changes/requests/:id',
    ]);
  });

  it('never uses the warehouse material-request path', () => {
    for (const route of bomChangesModuleConfig.routes) {
      expect(route.path.startsWith('/bom-changes/')).toBe(true);
      expect(route.path).not.toContain('bom-requests');
    }
  });

  it('opens the read-only pages on any right and the form only to those who may raise one', () => {
    for (const route of bomChangesModuleConfig.routes) {
      const expected =
        route.path === '/bom-changes/requests/new' ? BOM_CHANGES_RAISE_ACCESS : BOM_CHANGES_ACCESS;
      expect(route.permissions).toEqual(expected);
    }
    expect(BOM_CHANGES_RAISE_ACCESS).toEqual([
      BOM_CHANGES_PERMISSIONS.REQUEST,
      BOM_CHANGES_PERMISSIONS.PUSH_DIRECTLY,
    ]);
  });

  it('sits under SAP Portal as BOMs and BOM Change Requests, gated and never by prefix', () => {
    expect(bomChangesModuleConfig.navigation ?? []).toEqual([]);
    expect(BOM_CHANGES_NAV_ITEMS.map((item) => [item.title, item.path])).toEqual([
      ['BOMs', '/bom-changes/sap-boms'],
      ['BOM Change Requests', '/bom-changes/requests'],
    ]);
    for (const item of BOM_CHANGES_NAV_ITEMS) {
      expect(item.modulePrefix).toBeUndefined();
      expect(item.permissions).toEqual(BOM_CHANGES_ACCESS);
    }
  });

  it('reveals the module on every bom_changes right, since each implies viewing', () => {
    expect([...BOM_CHANGES_ACCESS].sort()).toEqual(Object.values(BOM_CHANGES_PERMISSIONS).sort());
    expect(BOM_CHANGES_ACCESS).toHaveLength(6);
  });

  it('names only bom_changes rights, and approvers are the three level rights', () => {
    for (const value of Object.values(BOM_CHANGES_PERMISSIONS)) {
      expect(value.startsWith('bom_changes.')).toBe(true);
    }
    expect(BOM_CHANGES_APPROVER_ACCESS).toEqual([
      'bom_changes.can_approve_bom_level_1',
      'bom_changes.can_approve_bom_level_2',
      'bom_changes.can_push_bom_to_sap',
    ]);
  });
});
