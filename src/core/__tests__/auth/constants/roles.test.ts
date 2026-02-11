import { describe, it, expect } from 'vitest'
import { Role, ROLE_LABELS, ROLE_HIERARCHY } from '@/core/auth/constants/roles'

// ═══════════════════════════════════════════════════════════════
// Roles Constants (src/core/auth/constants/roles.ts) — Direct Import
//
// Pure constants with zero imports.
// ═══════════════════════════════════════════════════════════════

describe('Roles Constants', () => {
  // ─── Role Enum ────────────────────────────────────────────

  it('Role has exactly 4 values', () => {
    expect(Object.keys(Role)).toHaveLength(4)
  })

  it('Role.ADMIN is "admin"', () => {
    expect(Role.ADMIN).toBe('admin')
  })

  it('Role.SUPERVISOR is "supervisor"', () => {
    expect(Role.SUPERVISOR).toBe('supervisor')
  })

  it('Role.OPERATOR is "operator"', () => {
    expect(Role.OPERATOR).toBe('operator')
  })

  it('Role.QUALITY_INSPECTOR is "quality_inspector"', () => {
    expect(Role.QUALITY_INSPECTOR).toBe('quality_inspector')
  })

  // ─── ROLE_LABELS ──────────────────────────────────────────

  it('ROLE_LABELS has entries for all 4 roles', () => {
    expect(Object.keys(ROLE_LABELS)).toHaveLength(4)
  })

  it('ROLE_LABELS maps admin → Administrator', () => {
    expect(ROLE_LABELS[Role.ADMIN]).toBe('Administrator')
  })

  it('ROLE_LABELS maps supervisor → Supervisor', () => {
    expect(ROLE_LABELS[Role.SUPERVISOR]).toBe('Supervisor')
  })

  it('ROLE_LABELS maps operator → Operator', () => {
    expect(ROLE_LABELS[Role.OPERATOR]).toBe('Operator')
  })

  it('ROLE_LABELS maps quality_inspector → Quality Inspector', () => {
    expect(ROLE_LABELS[Role.QUALITY_INSPECTOR]).toBe('Quality Inspector')
  })

  // ─── ROLE_HIERARCHY ───────────────────────────────────────

  it('ROLE_HIERARCHY has entries for all 4 roles', () => {
    expect(Object.keys(ROLE_HIERARCHY)).toHaveLength(4)
  })

  it('ROLE_HIERARCHY admin = 100 (highest)', () => {
    expect(ROLE_HIERARCHY[Role.ADMIN]).toBe(100)
  })

  it('ROLE_HIERARCHY supervisor = 75', () => {
    expect(ROLE_HIERARCHY[Role.SUPERVISOR]).toBe(75)
  })

  it('ROLE_HIERARCHY quality_inspector = 50', () => {
    expect(ROLE_HIERARCHY[Role.QUALITY_INSPECTOR]).toBe(50)
  })

  it('ROLE_HIERARCHY operator = 25 (lowest)', () => {
    expect(ROLE_HIERARCHY[Role.OPERATOR]).toBe(25)
  })

  it('hierarchy ordering: admin > supervisor > quality_inspector > operator', () => {
    expect(ROLE_HIERARCHY[Role.ADMIN]).toBeGreaterThan(ROLE_HIERARCHY[Role.SUPERVISOR])
    expect(ROLE_HIERARCHY[Role.SUPERVISOR]).toBeGreaterThan(ROLE_HIERARCHY[Role.QUALITY_INSPECTOR])
    expect(ROLE_HIERARCHY[Role.QUALITY_INSPECTOR]).toBeGreaterThan(ROLE_HIERARCHY[Role.OPERATOR])
  })
})
