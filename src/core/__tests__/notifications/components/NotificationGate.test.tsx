import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// NotificationGate.tsx — File Content Verification
//
// Imports lucide-react icons and @/shared/components/ui/button.
// Deep dependency chain through lucide-react — verify structure
// via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/notifications/components/NotificationGate.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('NotificationGate.tsx — Imports', () => {
  it('imports useState, useEffect, useCallback from react', () => {
    const content = readSource()
    expect(content).toContain('useState')
    expect(content).toContain('useEffect')
    expect(content).toContain('useCallback')
    expect(content).toContain("from 'react'")
  })

  it('imports BellOff and Bell from lucide-react', () => {
    const content = readSource()
    expect(content).toContain('BellOff')
    expect(content).toContain('Bell')
    expect(content).toContain("from 'lucide-react'")
  })

  it('imports Button from @/shared/components/ui/button', () => {
    const content = readSource()
    expect(content).toContain('Button')
    expect(content).toContain("from '@/shared/components/ui/button'")
  })

  it('imports APP_NAME from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain('APP_NAME')
    expect(content).toContain("from '@/config/constants'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════

describe('NotificationGate.tsx — Export', () => {
  it('exports NotificationGate as a named function component accepting children', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+NotificationGate\(/)
    expect(content).toContain('children')
    expect(content).toContain('React.ReactNode')
  })
})

// ═══════════════════════════════════════════════════════════════
// Permission Check & State
// ═══════════════════════════════════════════════════════════════

describe('NotificationGate.tsx — Permission Check', () => {
  it('checks Notification.permission in useEffect', () => {
    const content = readSource()
    expect(content).toContain("'Notification' in window")
    expect(content).toContain('Notification.permission')
  })

  it('manages permission state with useState', () => {
    const content = readSource()
    expect(content).toContain('useState<NotificationPermission | null>')
  })

  it('renders children when permission is granted', () => {
    const content = readSource()
    expect(content).toContain("permission === 'granted'")
    expect(content).toContain('{children}')
  })
})

// ═══════════════════════════════════════════════════════════════
// Gate UI — Layout
// ═══════════════════════════════════════════════════════════════

describe('NotificationGate.tsx — Gate Layout', () => {
  it('renders h-screen full-screen gate', () => {
    const content = readSource()
    expect(content).toContain('h-screen')
  })

  it('renders Enable Notifications heading', () => {
    const content = readSource()
    expect(content).toContain('Enable Notifications')
  })

  it('uses requestPermission callback with Notification.requestPermission()', () => {
    const content = readSource()
    expect(content).toContain('requestPermission')
    expect(content).toContain('Notification.requestPermission()')
  })
})

// ═══════════════════════════════════════════════════════════════
// Buttons
// ═══════════════════════════════════════════════════════════════

describe('NotificationGate.tsx — Buttons', () => {
  it('renders Allow Notifications button when permission is default', () => {
    const content = readSource()
    expect(content).toContain('Allow Notifications')
    expect(content).toContain('onClick={requestPermission}')
  })

  it('renders Reload Page button when permission is denied', () => {
    const content = readSource()
    expect(content).toContain('Reload Page')
    expect(content).toContain('window.location.reload()')
  })
})

// ═══════════════════════════════════════════════════════════════
// Denied State
// ═══════════════════════════════════════════════════════════════

describe('NotificationGate.tsx — Denied State', () => {
  it('checks isDenied flag for denied permission state', () => {
    const content = readSource()
    expect(content).toContain("const isDenied = permission === 'denied'")
  })

  it('renders BellOff icon when denied and Bell icon when default', () => {
    const content = readSource()
    expect(content).toContain('<BellOff')
    expect(content).toContain('<Bell')
  })

  it('shows instructions about unblocking notifications when denied', () => {
    const content = readSource()
    expect(content).toContain('Notifications are blocked for this site')
    expect(content).toContain('lock/settings icon')
  })

  it('uses destructive border and background for denied state', () => {
    const content = readSource()
    expect(content).toContain('border-destructive/50')
    expect(content).toContain('bg-destructive/10')
  })
})
