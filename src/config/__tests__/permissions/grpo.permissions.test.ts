import { describe, it, expect } from 'vitest'
import { GRPO_PERMISSIONS, GRPO_MODULE_PREFIX } from '@/config/permissions/grpo.permissions'

// ═══════════════════════════════════════════════════════════════
// GRPO_PERMISSIONS
// ═══════════════════════════════════════════════════════════════

describe('GRPO_PERMISSIONS', () => {
  it('has VIEW_PENDING, PREVIEW, POST, VIEW_HISTORY, VIEW_POSTING', () => {
    expect(GRPO_PERMISSIONS).toHaveProperty('VIEW_PENDING')
    expect(GRPO_PERMISSIONS).toHaveProperty('PREVIEW')
    expect(GRPO_PERMISSIONS).toHaveProperty('POST')
    expect(GRPO_PERMISSIONS).toHaveProperty('VIEW_HISTORY')
    expect(GRPO_PERMISSIONS).toHaveProperty('VIEW_POSTING')
  })

  it('VIEW_PENDING is "grpo.can_view_pending_grpo"', () => {
    expect(GRPO_PERMISSIONS.VIEW_PENDING).toBe('grpo.can_view_pending_grpo')
  })

  it('POST is "grpo.add_grpoposting"', () => {
    expect(GRPO_PERMISSIONS.POST).toBe('grpo.add_grpoposting')
  })

  it('all values start with "grpo."', () => {
    for (const value of Object.values(GRPO_PERMISSIONS)) {
      expect(value).toMatch(/^grpo\./)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// GRPO_MODULE_PREFIX
// ═══════════════════════════════════════════════════════════════

describe('GRPO_MODULE_PREFIX', () => {
  it('is "grpo"', () => {
    expect(GRPO_MODULE_PREFIX).toBe('grpo')
  })

  it('all permission values contain the module prefix', () => {
    for (const value of Object.values(GRPO_PERMISSIONS)) {
      expect(value).toContain(GRPO_MODULE_PREFIX)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// GRPO_PERMISSIONS — Integrity
// ═══════════════════════════════════════════════════════════════

describe('GRPO_PERMISSIONS — Integrity', () => {
  const allValues = Object.values(GRPO_PERMISSIONS)

  it('no values are undefined or empty', () => {
    for (const value of allValues) {
      expect(value).not.toBeUndefined()
      expect(value.length).toBeGreaterThan(0)
    }
  })

  it('all values are unique', () => {
    const unique = new Set(allValues)
    expect(unique.size).toBe(allValues.length)
  })

  it('total permission count is 5', () => {
    expect(allValues).toHaveLength(5)
  })

  it('all values follow "app_label.codename" format', () => {
    for (const value of allValues) {
      expect(value).toMatch(/^[a-z_]+\.[a-z_]+$/)
    }
  })
})
