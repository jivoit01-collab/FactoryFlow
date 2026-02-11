import { describe, it, expect } from 'vitest'
import { QC_PERMISSIONS, QC_MODULE_PREFIX } from '@/config/permissions/qc.permissions'

// ═══════════════════════════════════════════════════════════════
// QC_PERMISSIONS — Structure
// ═══════════════════════════════════════════════════════════════

describe('QC_PERMISSIONS — Structure', () => {
  it('has ARRIVAL_SLIP, INSPECTION, APPROVAL, MASTER_DATA categories', () => {
    expect(QC_PERMISSIONS).toHaveProperty('ARRIVAL_SLIP')
    expect(QC_PERMISSIONS).toHaveProperty('INSPECTION')
    expect(QC_PERMISSIONS).toHaveProperty('APPROVAL')
    expect(QC_PERMISSIONS).toHaveProperty('MASTER_DATA')
  })

  // ─── ARRIVAL_SLIP ───
  it('ARRIVAL_SLIP has CREATE, EDIT, SUBMIT, VIEW', () => {
    expect(QC_PERMISSIONS.ARRIVAL_SLIP).toHaveProperty('CREATE')
    expect(QC_PERMISSIONS.ARRIVAL_SLIP).toHaveProperty('EDIT')
    expect(QC_PERMISSIONS.ARRIVAL_SLIP).toHaveProperty('SUBMIT')
    expect(QC_PERMISSIONS.ARRIVAL_SLIP).toHaveProperty('VIEW')
  })

  it('ARRIVAL_SLIP.CREATE is "quality_control.add_materialarrivalslip"', () => {
    expect(QC_PERMISSIONS.ARRIVAL_SLIP.CREATE).toBe('quality_control.add_materialarrivalslip')
  })

  it('ARRIVAL_SLIP.SUBMIT is "quality_control.can_submit_arrival_slip"', () => {
    expect(QC_PERMISSIONS.ARRIVAL_SLIP.SUBMIT).toBe('quality_control.can_submit_arrival_slip')
  })

  // ─── INSPECTION ───
  it('INSPECTION has CREATE, EDIT, SUBMIT, VIEW', () => {
    expect(QC_PERMISSIONS.INSPECTION).toHaveProperty('CREATE')
    expect(QC_PERMISSIONS.INSPECTION).toHaveProperty('EDIT')
    expect(QC_PERMISSIONS.INSPECTION).toHaveProperty('SUBMIT')
    expect(QC_PERMISSIONS.INSPECTION).toHaveProperty('VIEW')
  })

  // ─── APPROVAL ───
  it('APPROVAL has APPROVE_AS_CHEMIST, APPROVE_AS_QAM, REJECT', () => {
    expect(QC_PERMISSIONS.APPROVAL).toHaveProperty('APPROVE_AS_CHEMIST')
    expect(QC_PERMISSIONS.APPROVAL).toHaveProperty('APPROVE_AS_QAM')
    expect(QC_PERMISSIONS.APPROVAL).toHaveProperty('REJECT')
  })

  it('APPROVAL.APPROVE_AS_CHEMIST is "quality_control.can_approve_as_chemist"', () => {
    expect(QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST).toBe('quality_control.can_approve_as_chemist')
  })

  // ─── MASTER_DATA ───
  it('MASTER_DATA has MANAGE_MATERIAL_TYPES, MANAGE_QC_PARAMETERS', () => {
    expect(QC_PERMISSIONS.MASTER_DATA).toHaveProperty('MANAGE_MATERIAL_TYPES')
    expect(QC_PERMISSIONS.MASTER_DATA).toHaveProperty('MANAGE_QC_PARAMETERS')
  })
})

// ═══════════════════════════════════════════════════════════════
// QC_MODULE_PREFIX
// ═══════════════════════════════════════════════════════════════

describe('QC_MODULE_PREFIX', () => {
  it('is "quality_control"', () => {
    expect(QC_MODULE_PREFIX).toBe('quality_control')
  })

  it('all permission values contain the module prefix', () => {
    const allValues = [
      ...Object.values(QC_PERMISSIONS.ARRIVAL_SLIP),
      ...Object.values(QC_PERMISSIONS.INSPECTION),
      ...Object.values(QC_PERMISSIONS.APPROVAL),
      ...Object.values(QC_PERMISSIONS.MASTER_DATA),
    ]
    for (const value of allValues) {
      expect(value).toContain(QC_MODULE_PREFIX)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// QC_PERMISSIONS — Integrity
// ═══════════════════════════════════════════════════════════════

describe('QC_PERMISSIONS — Integrity', () => {
  const allValues = [
    ...Object.values(QC_PERMISSIONS.ARRIVAL_SLIP),
    ...Object.values(QC_PERMISSIONS.INSPECTION),
    ...Object.values(QC_PERMISSIONS.APPROVAL),
    ...Object.values(QC_PERMISSIONS.MASTER_DATA),
  ]

  it('no permission values are undefined', () => {
    for (const value of allValues) {
      expect(value).not.toBeUndefined()
    }
  })

  it('no permission values are empty strings', () => {
    for (const value of allValues) {
      expect(value.length).toBeGreaterThan(0)
    }
  })

  it('all permission values are unique (no duplicates)', () => {
    const unique = new Set(allValues)
    expect(unique.size).toBe(allValues.length)
  })

  it('all permission values follow "app_label.codename" format', () => {
    for (const value of allValues) {
      expect(value).toMatch(/^[a-z_]+\.[a-z_]+$/)
    }
  })

  it('total permission count is 13', () => {
    expect(allValues).toHaveLength(13)
  })
})
