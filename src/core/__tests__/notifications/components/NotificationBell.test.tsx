import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// NotificationBell.tsx — File Content Verification
//
// Imports lucide-react icons, react-router-dom, @/shared/components/ui,
// and notification hooks/services. Deep transitive dependency chains
// — verify structure via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/notifications/components/NotificationBell.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('NotificationBell.tsx — Imports', () => {
  it('imports useState, useEffect, useCallback from react', () => {
    const content = readSource()
    expect(content).toContain('useState')
    expect(content).toContain('useEffect')
    expect(content).toContain('useCallback')
    expect(content).toContain("from 'react'")
  })

  it('imports Bell, CheckCheck, Loader2 from lucide-react', () => {
    const content = readSource()
    expect(content).toContain('Bell')
    expect(content).toContain('CheckCheck')
    expect(content).toContain('Loader2')
    expect(content).toContain("from 'lucide-react'")
  })

  it('imports useNavigate from react-router-dom', () => {
    const content = readSource()
    expect(content).toContain('useNavigate')
    expect(content).toContain("from 'react-router-dom'")
  })

  it('imports Button, Popover, PopoverTrigger, PopoverContent from @/shared/components/ui', () => {
    const content = readSource()
    expect(content).toContain('Button')
    expect(content).toContain('Popover')
    expect(content).toContain('PopoverTrigger')
    expect(content).toContain('PopoverContent')
    expect(content).toContain("from '@/shared/components/ui'")
  })

  it('imports useUnreadCount from ../hooks', () => {
    const content = readSource()
    expect(content).toContain('useUnreadCount')
    expect(content).toContain("from '../hooks'")
  })

  it('imports notificationService from ../notification.service', () => {
    const content = readSource()
    expect(content).toContain('notificationService')
    expect(content).toContain("from '../notification.service'")
  })

  it('imports Notification type from ../types', () => {
    const content = readSource()
    expect(content).toContain('Notification')
    expect(content).toContain("from '../types'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Exports — formatTimeAgo, NotificationItem, NotificationBell
// ═══════════════════════════════════════════════════════════════

describe('NotificationBell.tsx — Exports', () => {
  it('defines formatTimeAgo function', () => {
    const content = readSource()
    expect(content).toMatch(/function\s+formatTimeAgo\(/)
  })

  it('defines NotificationItem component', () => {
    const content = readSource()
    expect(content).toMatch(/function\s+NotificationItem\(/)
  })

  it('exports NotificationBell as a named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+NotificationBell\(\)/)
  })
})

// ═══════════════════════════════════════════════════════════════
// Popover Structure
// ═══════════════════════════════════════════════════════════════

describe('NotificationBell.tsx — Popover Structure', () => {
  it('uses Popover with PopoverTrigger containing Bell icon', () => {
    const content = readSource()
    expect(content).toContain('<Popover')
    expect(content).toContain('<PopoverTrigger')
    expect(content).toContain('<Bell')
  })

  it('renders unread count badge with 99+ formatting', () => {
    const content = readSource()
    expect(content).toContain("unreadCount > 99 ? '99+' : unreadCount")
  })

  it('renders max-h-80 overflow-y-auto scrollable notification list', () => {
    const content = readSource()
    expect(content).toContain('max-h-80')
    expect(content).toContain('overflow-y-auto')
  })
})

// ═══════════════════════════════════════════════════════════════
// Mark All Read
// ═══════════════════════════════════════════════════════════════

describe('NotificationBell.tsx — Mark All Read', () => {
  it('renders mark all read button with CheckCheck icon', () => {
    const content = readSource()
    expect(content).toContain('<CheckCheck')
    expect(content).toContain('Mark all read')
  })

  it('handleMarkAllAsRead calls notificationService.markAllAsRead()', () => {
    const content = readSource()
    expect(content).toContain('handleMarkAllAsRead')
    expect(content).toContain('notificationService.markAllAsRead()')
  })
})

// ═══════════════════════════════════════════════════════════════
// Callbacks
// ═══════════════════════════════════════════════════════════════

describe('NotificationBell.tsx — Callbacks', () => {
  it('defines handleOpenChange callback', () => {
    const content = readSource()
    expect(content).toContain('handleOpenChange')
    expect(content).toContain('useCallback')
  })

  it('defines handleNotificationClick callback that navigates to notification', () => {
    const content = readSource()
    expect(content).toContain('handleNotificationClick')
    expect(content).toContain("navigate(`/notifications/${notification.id}`)")
  })

  it('renders View all notifications footer link', () => {
    const content = readSource()
    expect(content).toContain('View all notifications')
    expect(content).toContain("navigate('/notifications')")
  })
})
