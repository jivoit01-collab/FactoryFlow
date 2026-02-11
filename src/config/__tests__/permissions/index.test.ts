import { describe, it, expect } from 'vitest'
import {
  QC_PERMISSIONS,
  QC_MODULE_PREFIX,
  GRPO_PERMISSIONS,
  GRPO_MODULE_PREFIX,
  NOTIFICATION_PERMISSIONS,
  NOTIFICATION_MODULE_PREFIX,
} from '@/config/permissions'

// ═══════════════════════════════════════════════════════════════
// permissions/index.ts — Barrel Re-exports
// ═══════════════════════════════════════════════════════════════

describe('permissions/index.ts — Barrel Re-exports', () => {
  it('exports QC_PERMISSIONS', () => {
    expect(QC_PERMISSIONS).toBeDefined()
    expect(QC_PERMISSIONS).toHaveProperty('ARRIVAL_SLIP')
    expect(QC_PERMISSIONS).toHaveProperty('INSPECTION')
    expect(QC_PERMISSIONS).toHaveProperty('APPROVAL')
    expect(QC_PERMISSIONS).toHaveProperty('MASTER_DATA')
  })

  it('exports QC_MODULE_PREFIX', () => {
    expect(QC_MODULE_PREFIX).toBe('quality_control')
  })

  it('exports GRPO_PERMISSIONS', () => {
    expect(GRPO_PERMISSIONS).toBeDefined()
    expect(GRPO_PERMISSIONS).toHaveProperty('VIEW_PENDING')
    expect(GRPO_PERMISSIONS).toHaveProperty('POST')
  })

  it('exports GRPO_MODULE_PREFIX', () => {
    expect(GRPO_MODULE_PREFIX).toBe('grpo')
  })

  it('exports NOTIFICATION_PERMISSIONS', () => {
    expect(NOTIFICATION_PERMISSIONS).toBeDefined()
    expect(NOTIFICATION_PERMISSIONS).toHaveProperty('SEND')
    expect(NOTIFICATION_PERMISSIONS).toHaveProperty('SEND_BULK')
  })

  it('exports NOTIFICATION_MODULE_PREFIX', () => {
    expect(NOTIFICATION_MODULE_PREFIX).toBe('notifications')
  })

  it('all three module prefixes are non-empty strings', () => {
    expect(typeof QC_MODULE_PREFIX).toBe('string')
    expect(typeof GRPO_MODULE_PREFIX).toBe('string')
    expect(typeof NOTIFICATION_MODULE_PREFIX).toBe('string')
    expect(QC_MODULE_PREFIX.length).toBeGreaterThan(0)
    expect(GRPO_MODULE_PREFIX.length).toBeGreaterThan(0)
    expect(NOTIFICATION_MODULE_PREFIX.length).toBeGreaterThan(0)
  })

  it('all module prefixes are distinct', () => {
    const prefixes = [QC_MODULE_PREFIX, GRPO_MODULE_PREFIX, NOTIFICATION_MODULE_PREFIX]
    expect(new Set(prefixes).size).toBe(3)
  })
})
