import { describe, expect, it } from 'vitest';

import {
  MAINTENANCE_MODULE_PREFIX,
  MAINTENANCE_PERMISSIONS,
} from '@/config/permissions/maintenance.permissions';

describe('maintenance permissions', () => {
  it('uses the maintenance module prefix', () => {
    expect(MAINTENANCE_MODULE_PREFIX).toBe('maintenance');
  });

  it('defines dashboard, asset, master, and future workflow permissions', () => {
    expect(MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD).toBe(
      'maintenance.can_view_maintenance_dashboard',
    );
    expect(MAINTENANCE_PERMISSIONS.VIEW_ASSET).toBe('maintenance.view_asset');
    expect(MAINTENANCE_PERMISSIONS.DEACTIVATE_ASSET).toBe('maintenance.can_deactivate_asset');
    expect(MAINTENANCE_PERMISSIONS.CREATE_ASSET_PHOTO).toBe('maintenance.add_assetphoto');
    expect(MAINTENANCE_PERMISSIONS.CREATE_ASSET_DOCUMENT).toBe('maintenance.add_assetdocument');
    expect(MAINTENANCE_PERMISSIONS.VIEW_WORK_ORDER).toBe('maintenance.can_view_work_order');
    expect(MAINTENANCE_PERMISSIONS.CREATE_WORK_ORDER).toBe('maintenance.can_create_work_order');
    expect(MAINTENANCE_PERMISSIONS.ASSIGN_WORK_ORDER).toBe('maintenance.can_assign_work_order');
    expect(MAINTENANCE_PERMISSIONS.COMPLETE_WORK_ORDER).toBe('maintenance.can_complete_work_order');
    expect(MAINTENANCE_PERMISSIONS.APPROVE_WORK_ORDER).toBe('maintenance.can_approve_work_order');
    expect(MAINTENANCE_PERMISSIONS.VIEW_PM).toBe('maintenance.can_view_pm');
    expect(MAINTENANCE_PERMISSIONS.VIEW_SPARE).toBe('maintenance.can_view_spare');
  });

  it('splits raising a material indent from sending it for approval', () => {
    expect(MAINTENANCE_PERMISSIONS.DRAFT_MATERIAL_INDENT).toBe(
      'maintenance.can_draft_material_indent',
    );
    expect(MAINTENANCE_PERMISSIONS.SUBMIT_MATERIAL_INDENT).toBe(
      'maintenance.can_submit_material_indent',
    );
    // The legacy superset stays, so nobody who could already do both loses it.
    expect(MAINTENANCE_PERMISSIONS.MANAGE_MATERIAL_INDENT).toBe(
      'maintenance.can_manage_material_indent',
    );
  });
});
