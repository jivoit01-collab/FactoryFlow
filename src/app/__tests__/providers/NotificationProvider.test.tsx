import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// NotificationProvider — File Content Verification
//
// Imports @/core/store (useAppDispatch, useAppSelector),
// @/core/notifications (fcmService, notificationService),
// firebase/messaging, and sonner.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/app/providers/NotificationProvider.tsx'),
    'utf-8',
  )
}

describe('NotificationProvider', () => {
  // ─── Exports & Dependencies ──────────────────────────────

  it('exports NotificationProvider as named function', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+function\s+NotificationProvider/)
  })

  it('imports useEffect, useRef, useCallback from react', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*useEffect[^}]*useRef[^}]*useCallback[^}]*\}\s*from\s*['"]react['"]/,
    )
  })

  it('imports type MessagePayload from firebase/messaging', () => {
    const content = readSource()
    expect(content).toContain('type MessagePayload')
    expect(content).toMatch(/from\s*['"]firebase\/messaging['"]/)
  })

  it('imports toast from sonner', () => {
    const content = readSource()
    expect(content).toMatch(
      /import\s*\{[^}]*toast[^}]*\}\s*from\s*['"]sonner['"]/,
    )
  })

  it('imports useAppDispatch and useAppSelector from @/core/store', () => {
    const content = readSource()
    expect(content).toContain('useAppDispatch')
    expect(content).toContain('useAppSelector')
    expect(content).toMatch(/from\s*['"]@\/core\/store['"]/)
  })

  // ─── Notification Service Imports ───────────────────────

  it('imports fcmService and notificationService from @/core/notifications', () => {
    const content = readSource()
    expect(content).toContain('fcmService')
    expect(content).toContain('notificationService')
    expect(content).toMatch(/from\s*['"]@\/core\/notifications['"]/)
  })

  it('imports slice actions: setupPushNotifications, fetchUnreadCount, addNotification, selectFCMState', () => {
    const content = readSource()
    expect(content).toContain('setupPushNotifications')
    expect(content).toContain('fetchUnreadCount')
    expect(content).toContain('addNotification')
    expect(content).toContain('selectFCMState')
    expect(content).toMatch(/from\s*['"]@\/core\/store\/slices\/notification\.slice['"]/)
  })

  // ─── Props & Interface ───────────────────────────────────

  it('defines NotificationProviderProps with children: React.ReactNode', () => {
    const content = readSource()
    expect(content).toMatch(/interface\s+NotificationProviderProps/)
    expect(content).toContain('children: React.ReactNode')
  })

  // ─── Refs ───────────────────────────────────────────────

  it('uses messageListenerRef for cleanup', () => {
    const content = readSource()
    expect(content).toContain('messageListenerRef')
    expect(content).toMatch(/useRef<\(\(\)\s*=>\s*void\)\s*\|\s*null>\(null\)/)
  })

  it('uses setupAttemptedRef to prevent duplicate setup', () => {
    const content = readSource()
    expect(content).toContain('setupAttemptedRef')
    expect(content).toContain('useRef(false)')
  })

  it('uses deviceRegisteredTokenRef to prevent duplicate registration', () => {
    const content = readSource()
    expect(content).toContain('deviceRegisteredTokenRef')
    expect(content).toMatch(/useRef<string\s*\|\s*null>\(null\)/)
  })

  // ─── Foreground Message Handling ────────────────────────

  it('defines handleForegroundMessage as useCallback', () => {
    const content = readSource()
    expect(content).toContain('handleForegroundMessage')
    expect(content).toContain('useCallback')
  })

  it('dispatches addNotification with constructed notification', () => {
    const content = readSource()
    expect(content).toContain('dispatch(addNotification(notification))')
  })

  it('shows toast.info when document is visible', () => {
    const content = readSource()
    expect(content).toContain("document.visibilityState === 'visible'")
    expect(content).toContain('toast.info(notification.title')
  })

  it('creates browser Notification when tab is not visible', () => {
    const content = readSource()
    expect(content).toContain("globalThis.Notification?.permission === 'granted'")
    expect(content).toContain('new globalThis.Notification(notification.title')
  })

  it('dispatches fetchUnreadCount after 200ms delay', () => {
    const content = readSource()
    expect(content).toContain('setTimeout(() => dispatch(fetchUnreadCount()), 200)')
  })

  // ─── useEffect Hooks ───────────────────────────────────

  it('guards FCM setup with setupAttemptedRef and authentication check', () => {
    const content = readSource()
    expect(content).toContain('!isAuthenticated')
    expect(content).toContain('fcmState.token')
    expect(content).toContain("fcmState.permission === 'denied'")
    expect(content).toContain('setupAttemptedRef.current')
    expect(content).toContain('dispatch(setupPushNotifications())')
  })

  it('sets up message listener via fcmService.onMessage', () => {
    const content = readSource()
    expect(content).toContain('fcmService.onMessage(handleForegroundMessage)')
    expect(content).toContain('messageListenerRef.current')
  })

  it('registers device via notificationService.registerDevice', () => {
    const content = readSource()
    expect(content).toContain('notificationService.registerDevice(fcmState.token)')
    expect(content).toContain('deviceRegisteredTokenRef.current = fcmState.token')
  })

  it('fetches unread count when authenticated and company is selected', () => {
    const content = readSource()
    expect(content).toContain('!isAuthenticated || !currentCompany')
    expect(content).toContain('dispatch(fetchUnreadCount())')
  })

  it('resets refs on logout', () => {
    const content = readSource()
    expect(content).toContain('setupAttemptedRef.current = false')
    expect(content).toContain('deviceRegisteredTokenRef.current = null')
  })

  // ─── Rendering ──────────────────────────────────────────

  it('renders children wrapped in fragment', () => {
    const content = readSource()
    expect(content).toContain('return <>{children}</>')
  })
})
