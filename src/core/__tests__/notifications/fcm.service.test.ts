import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// notifications/fcm.service.ts — FCMService (File Content Verification)
//
// Imports from firebase/messaging, firebase/app, and
// @/config/firebase.config. Deep dependency chain through
// Firebase SDK — verify via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/core/notifications/fcm.service.ts'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('fcm.service.ts — Imports', () => {
  it('imports getToken, onMessage, deleteToken from firebase/messaging', () => {
    const content = readSource()
    expect(content).toContain('getToken')
    expect(content).toContain('onMessage')
    expect(content).toContain('deleteToken')
    expect(content).toContain("from 'firebase/messaging'")
  })

  it('imports initializeFirebase, getFirebaseMessaging, getFCMServiceWorkerRegistration, isFirebaseConfigured from @/config/firebase.config', () => {
    const content = readSource()
    expect(content).toContain('initializeFirebase')
    expect(content).toContain('getFirebaseMessaging')
    expect(content).toContain('getFCMServiceWorkerRegistration')
    expect(content).toContain('isFirebaseConfigured')
    expect(content).toContain("from '@/config/firebase.config'")
  })

  it('reads VAPID_KEY from import.meta.env', () => {
    const content = readSource()
    expect(content).toContain('VITE_FIREBASE_VAPID_KEY')
  })
})

// ═══════════════════════════════════════════════════════════════
// Class Definition
// ═══════════════════════════════════════════════════════════════

describe('fcm.service.ts — Class Definition', () => {
  it('defines FCMService as a class', () => {
    const content = readSource()
    expect(content).toMatch(/class\s+FCMService/)
  })

  it('has private initialized, messageListeners, and currentToken fields', () => {
    const content = readSource()
    expect(content).toContain('private initialized = false')
    expect(content).toContain('private messageListeners')
    expect(content).toContain('private currentToken')
  })
})

// ═══════════════════════════════════════════════════════════════
// Public Methods
// ═══════════════════════════════════════════════════════════════

describe('fcm.service.ts — Public Methods', () => {
  it('defines isSupported method checking Notification, serviceWorker, PushManager', () => {
    const content = readSource()
    expect(content).toMatch(/isSupported\(\):\s*boolean/)
    expect(content).toContain("'Notification' in window")
    expect(content).toContain("'serviceWorker' in navigator")
    expect(content).toContain("'PushManager' in window")
  })

  it('defines isPWA method checking display-mode standalone', () => {
    const content = readSource()
    expect(content).toMatch(/isPWA\(\):\s*boolean/)
    expect(content).toContain('display-mode: standalone')
  })

  it('defines getPermissionStatus method returning NotificationPermission', () => {
    const content = readSource()
    expect(content).toMatch(/getPermissionStatus\(\):\s*NotificationPermission/)
    expect(content).toContain('Notification.permission')
  })

  it('defines async initialize method', () => {
    const content = readSource()
    expect(content).toMatch(/async\s+initialize\(\):\s*Promise<boolean>/)
    expect(content).toContain('this.initialized = true')
  })

  it('defines async requestPermission method', () => {
    const content = readSource()
    expect(content).toMatch(/async\s+requestPermission\(\):\s*Promise<NotificationPermission>/)
    expect(content).toContain('Notification.requestPermission()')
  })

  it('defines async getDeviceToken method using getToken with vapidKey', () => {
    const content = readSource()
    expect(content).toMatch(/async\s+getDeviceToken\(\):\s*Promise<string\s*\|\s*null>/)
    expect(content).toContain('vapidKey: VAPID_KEY')
    expect(content).toContain('this.currentToken = token')
  })

  it('defines async deleteDeviceToken method using deleteToken', () => {
    const content = readSource()
    expect(content).toMatch(/async\s+deleteDeviceToken\(\):\s*Promise<boolean>/)
    expect(content).toContain('deleteToken(messaging)')
    expect(content).toContain('this.currentToken = null')
  })

  it('defines async setupPushNotifications method orchestrating full setup flow', () => {
    const content = readSource()
    expect(content).toMatch(/async\s+setupPushNotifications\(\)/)
    expect(content).toContain('this.initialize()')
    expect(content).toContain('this.requestPermission()')
    expect(content).toContain('this.getDeviceToken()')
  })

  it('defines async cleanupPushNotifications method', () => {
    const content = readSource()
    expect(content).toMatch(/async\s+cleanupPushNotifications\(\):\s*Promise<void>/)
    expect(content).toContain('this.deleteDeviceToken()')
  })

  it('defines onMessage method returning unsubscribe function', () => {
    const content = readSource()
    expect(content).toMatch(/onMessage\(callback:\s*MessageListener\):\s*\(\)\s*=>\s*void/)
    expect(content).toContain('this.messageListeners.push(callback)')
    expect(content).toContain('this.messageListeners.filter')
  })

  it('defines getCurrentToken method', () => {
    const content = readSource()
    expect(content).toMatch(/getCurrentToken\(\):\s*string\s*\|\s*null/)
    expect(content).toContain('return this.currentToken')
  })
})

// ═══════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════

describe('fcm.service.ts — Singleton Export', () => {
  it('exports fcmService singleton instance', () => {
    const content = readSource()
    expect(content).toMatch(/export\s+const\s+fcmService\s*=\s*new\s+FCMService\(\)/)
  })
})

// ═══════════════════════════════════════════════════════════════
// Private Method
// ═══════════════════════════════════════════════════════════════

describe('fcm.service.ts — Private Method', () => {
  it('has private notifyListeners method that iterates messageListeners', () => {
    const content = readSource()
    expect(content).toContain('private notifyListeners')
    expect(content).toContain('this.messageListeners.forEach')
  })
})
