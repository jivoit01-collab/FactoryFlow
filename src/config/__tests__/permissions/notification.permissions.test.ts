import { describe, it, expect } from 'vitest'
import {
  NOTIFICATION_PERMISSIONS,
  NOTIFICATION_MODULE_PREFIX,
} from '@/config/permissions/notification.permissions'

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION_PERMISSIONS
// ═══════════════════════════════════════════════════════════════

describe('NOTIFICATION_PERMISSIONS', () => {
  it('has SEND and SEND_BULK', () => {
    expect(NOTIFICATION_PERMISSIONS).toHaveProperty('SEND')
    expect(NOTIFICATION_PERMISSIONS).toHaveProperty('SEND_BULK')
  })

  it('SEND is "notifications.can_send_notification"', () => {
    expect(NOTIFICATION_PERMISSIONS.SEND).toBe('notifications.can_send_notification')
  })

  it('SEND_BULK is "notifications.can_send_bulk_notification"', () => {
    expect(NOTIFICATION_PERMISSIONS.SEND_BULK).toBe('notifications.can_send_bulk_notification')
  })

  it('all values start with "notifications."', () => {
    for (const value of Object.values(NOTIFICATION_PERMISSIONS)) {
      expect(value).toMatch(/^notifications\./)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION_MODULE_PREFIX
// ═══════════════════════════════════════════════════════════════

describe('NOTIFICATION_MODULE_PREFIX', () => {
  it('is "notifications"', () => {
    expect(NOTIFICATION_MODULE_PREFIX).toBe('notifications')
  })
})

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION_PERMISSIONS — Integrity
// ═══════════════════════════════════════════════════════════════

describe('NOTIFICATION_PERMISSIONS — Integrity', () => {
  const allValues = Object.values(NOTIFICATION_PERMISSIONS)

  it('total permission count is 2', () => {
    expect(allValues).toHaveLength(2)
  })

  it('all values are unique', () => {
    const unique = new Set(allValues)
    expect(unique.size).toBe(allValues.length)
  })
})
