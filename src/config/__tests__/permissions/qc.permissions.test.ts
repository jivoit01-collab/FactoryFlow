import { describe, it, expect } from 'vitest';
import { QC_PERMISSIONS, QC_MODULE_PREFIX } from '@/config/permissions/qc.permissions';

// ═══════════════════════════════════════════════════════════════
// QC_PERMISSIONS — Structure
// ═══════════════════════════════════════════════════════════════

describe('QC_PERMISSIONS — Structure', () => {
  it('has ARRIVAL_SLIP, INSPECTION, APPROVAL, MASTER_DATA categories', () => {
    expect(QC_PERMISSIONS).toHaveProperty('ARRIVAL_SLIP');
    expect(QC_PERMISSIONS).toHaveProperty('INSPECTION');
    expect(QC_PERMISSIONS).toHaveProperty('APPROVAL');
    expect(QC_PERMISSIONS).toHaveProperty('MASTER_DATA');
  });

  // ─── ARRIVAL_SLIP ───
  it('ARRIVAL_SLIP has CREATE, EDIT, SUBMIT, VIEW', () => {
    expect(QC_PERMISSIONS.ARRIVAL_SLIP).toHaveProperty('CREATE');
    expect(QC_PERMISSIONS.ARRIVAL_SLIP).toHaveProperty('EDIT');
    expect(QC_PERMISSIONS.ARRIVAL_SLIP).toHaveProperty('SUBMIT');
    expect(QC_PERMISSIONS.ARRIVAL_SLIP).toHaveProperty('VIEW');
  });

  it('ARRIVAL_SLIP.CREATE is "quality_control.add_materialarrivalslip"', () => {
    expect(QC_PERMISSIONS.ARRIVAL_SLIP.CREATE).toBe('quality_control.add_materialarrivalslip');
  });

  it('ARRIVAL_SLIP.SUBMIT is "quality_control.can_submit_arrival_slip"', () => {
    expect(QC_PERMISSIONS.ARRIVAL_SLIP.SUBMIT).toBe('quality_control.can_submit_arrival_slip');
  });

  // ─── INSPECTION ───
  it('INSPECTION has CREATE, EDIT, SUBMIT, VIEW', () => {
    expect(QC_PERMISSIONS.INSPECTION).toHaveProperty('CREATE');
    expect(QC_PERMISSIONS.INSPECTION).toHaveProperty('EDIT');
    expect(QC_PERMISSIONS.INSPECTION).toHaveProperty('SUBMIT');
    expect(QC_PERMISSIONS.INSPECTION).toHaveProperty('VIEW');
  });

  // ─── APPROVAL ───
  it('APPROVAL has APPROVE_AS_CHEMIST, APPROVE_AS_QAM, REJECT', () => {
    expect(QC_PERMISSIONS.APPROVAL).toHaveProperty('APPROVE_AS_CHEMIST');
    expect(QC_PERMISSIONS.APPROVAL).toHaveProperty('APPROVE_AS_QAM');
    expect(QC_PERMISSIONS.APPROVAL).toHaveProperty('REJECT');
  });

  it('APPROVAL.APPROVE_AS_CHEMIST is "quality_control.can_approve_as_chemist"', () => {
    expect(QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST).toBe(
      'quality_control.can_approve_as_chemist',
    );
  });

  // ─── MASTER_DATA ───
  it('MASTER_DATA has MANAGE_MATERIAL_TYPES, MANAGE_QC_PARAMETERS', () => {
    expect(QC_PERMISSIONS.MASTER_DATA).toHaveProperty('MANAGE_MATERIAL_TYPES');
    expect(QC_PERMISSIONS.MASTER_DATA).toHaveProperty('MANAGE_QC_PARAMETERS');
  });

  // ─── Removed sub-modules ───
  it('no longer defines the removed Online Monitoring and QC Record groups', () => {
    expect(QC_PERMISSIONS).not.toHaveProperty('ONLINE_MONITORING');
    expect(QC_PERMISSIONS).not.toHaveProperty('QC_RECORD');
  });

  // ─── PRODUCTION_QC (rebuilt: entries on a running line, one-step approval) ───
  it('PRODUCTION_QC maps to the entry codenames', () => {
    expect(QC_PERMISSIONS.PRODUCTION_QC).toEqual({
      VIEW: 'quality_control.can_view_production_qc_entries',
      FILL: 'quality_control.can_fill_production_qc_entries',
      APPROVE: 'quality_control.can_approve_production_qc_entries',
      MANAGE_PARAMETERS: 'quality_control.can_manage_production_qc_parameters',
    });
  });

  it('holds none of the removed session-based Production QC codenames', () => {
    // Whole values: each new codename contains an old one as a substring.
    const values: string[] = Object.values(QC_PERMISSIONS).flatMap((group) =>
      Object.values(group as Record<string, string>),
    );
    for (const removed of [
      'quality_control.can_view_production_qc',
      'quality_control.can_create_production_qc',
      'quality_control.can_submit_production_qc',
      'quality_control.can_approve_production_qc',
    ]) {
      expect(values).not.toContain(removed);
    }
    expect(QC_PERMISSIONS.PRODUCTION_QC).not.toHaveProperty('CREATE');
    expect(QC_PERMISSIONS.PRODUCTION_QC).not.toHaveProperty('SUBMIT');
  });

  it('keeps the Line Clearance QC permission strings', () => {
    expect(QC_PERMISSIONS.LINE_CLEARANCE_QC.VIEW).toBe('quality_control.can_view_line_clearance_qc');
    expect(QC_PERMISSIONS.LINE_CLEARANCE_QC.APPROVE).toBe(
      'quality_control.can_approve_line_clearance_qc',
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// QC_MODULE_PREFIX
// ═══════════════════════════════════════════════════════════════

describe('QC_MODULE_PREFIX', () => {
  it('is "quality_control"', () => {
    expect(QC_MODULE_PREFIX).toBe('quality_control');
  });

  it('all permission values contain the module prefix', () => {
    const allValues = [
      ...Object.values(QC_PERMISSIONS.ARRIVAL_SLIP),
      ...Object.values(QC_PERMISSIONS.INSPECTION),
      ...Object.values(QC_PERMISSIONS.APPROVAL),
      ...Object.values(QC_PERMISSIONS.MASTER_DATA),
      ...Object.values(QC_PERMISSIONS.PRODUCTION_QC),
    ];
    for (const value of allValues) {
      expect(value).toContain(QC_MODULE_PREFIX);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// QC_PERMISSIONS — Integrity
// ═══════════════════════════════════════════════════════════════

describe('QC_PERMISSIONS — Integrity', () => {
  const allValues = [
    ...Object.values(QC_PERMISSIONS.ARRIVAL_SLIP),
    ...Object.values(QC_PERMISSIONS.INSPECTION),
    ...Object.values(QC_PERMISSIONS.APPROVAL),
    ...Object.values(QC_PERMISSIONS.MASTER_DATA),
    ...Object.values(QC_PERMISSIONS.PRODUCTION_QC),
  ];

  it('no permission values are undefined', () => {
    for (const value of allValues) {
      expect(value).not.toBeUndefined();
    }
  });

  it('no permission values are empty strings', () => {
    for (const value of allValues) {
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all permission values are unique (no duplicates)', () => {
    const unique = new Set(allValues);
    expect(unique.size).toBe(allValues.length);
  });

  it('all permission values follow "app_label.codename" format', () => {
    for (const value of allValues) {
      expect(value).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });

  it('total permission count is 19', () => {
    expect(allValues).toHaveLength(19);
  });
});
