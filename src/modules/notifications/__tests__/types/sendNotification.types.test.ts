// ═══════════════════════════════════════════════════════════════
// Send Notification Types Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that NOTIFICATION_TYPES constant, type interfaces,
// and type aliases are correctly defined and usable.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'

import {
  NOTIFICATION_TYPES,
} from '../../types/sendNotification.types'

import type {
  CompanyUser,
  NotificationTypeValue,
  SendNotificationRequest,
  SendNotificationResponse,
} from '../../types/sendNotification.types'

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION_TYPES constant
// ═══════════════════════════════════════════════════════════════

describe('NOTIFICATION_TYPES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(NOTIFICATION_TYPES)).toBe(true)
    expect(NOTIFICATION_TYPES.length).toBeGreaterThan(0)
  })

  it('has exactly 13 entries', () => {
    expect(NOTIFICATION_TYPES).toHaveLength(13)
  })

  it('each entry has a value string and label string', () => {
    NOTIFICATION_TYPES.forEach((entry) => {
      expect(typeof entry.value).toBe('string')
      expect(typeof entry.label).toBe('string')
      expect(entry.value.length).toBeGreaterThan(0)
      expect(entry.label.length).toBeGreaterThan(0)
    })
  })

  it('all value fields are unique', () => {
    const values = NOTIFICATION_TYPES.map((t) => t.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('includes GENERAL_ANNOUNCEMENT', () => {
    expect(NOTIFICATION_TYPES.some((t) => t.value === 'GENERAL_ANNOUNCEMENT')).toBe(true)
  })

  it('includes GATE_ENTRY_CREATED', () => {
    expect(NOTIFICATION_TYPES.some((t) => t.value === 'GATE_ENTRY_CREATED')).toBe(true)
  })

  it('includes QC_REJECTED', () => {
    expect(NOTIFICATION_TYPES.some((t) => t.value === 'QC_REJECTED')).toBe(true)
  })

  it('includes GRPO_POSTED', () => {
    expect(NOTIFICATION_TYPES.some((t) => t.value === 'GRPO_POSTED')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// Type interfaces — compile-time usability
// ═══════════════════════════════════════════════════════════════

describe('CompanyUser interface', () => {
  it('is usable with required fields', () => {
    const user: CompanyUser = { id: 1, email: 'a@b.com', full_name: 'Alice' }
    expect(user.id).toBe(1)
    expect(user.email).toBe('a@b.com')
    expect(user.full_name).toBe('Alice')
  })
})

describe('SendNotificationRequest interface', () => {
  it('works with only required fields', () => {
    const req: SendNotificationRequest = { title: 'Test', body: 'Hello' }
    expect(req.title).toBe('Test')
    expect(req.body).toBe('Hello')
  })

  it('works with all optional fields', () => {
    const req: SendNotificationRequest = {
      title: 'Test',
      body: 'Hello',
      notification_type: 'GENERAL_ANNOUNCEMENT',
      click_action_url: '/test',
      recipient_user_ids: [1, 2, 3],
      role_filter: 'QC',
    }
    expect(req.recipient_user_ids).toEqual([1, 2, 3])
    expect(req.role_filter).toBe('QC')
  })
})

describe('SendNotificationResponse interface', () => {
  it('has message and recipients_count', () => {
    const res: SendNotificationResponse = { message: 'Sent', recipients_count: 5 }
    expect(res.message).toBe('Sent')
    expect(res.recipients_count).toBe(5)
  })
})

describe('NotificationTypeValue type', () => {
  it('matches one of the NOTIFICATION_TYPES values', () => {
    const value: NotificationTypeValue = 'GENERAL_ANNOUNCEMENT'
    expect(NOTIFICATION_TYPES.some((t) => t.value === value)).toBe(true)
  })
})
