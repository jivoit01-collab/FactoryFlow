import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, type Messaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let messaging: Messaging | null = null
let fcmServiceWorkerRegistration: ServiceWorkerRegistration | null = null

/**
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
  )
}

/**
 * Register the Firebase messaging service worker
 * This must be done before requesting FCM tokens
 */
export const registerFCMServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (fcmServiceWorkerRegistration) {
    return fcmServiceWorkerRegistration
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser')
    return null
  }

  try {
    // Register the Firebase messaging service worker
    fcmServiceWorkerRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    )

    console.log('[FCM] Service worker registered:', fcmServiceWorkerRegistration.scope)

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready

    return fcmServiceWorkerRegistration
  } catch (error) {
    console.error('[FCM] Service worker registration failed:', error)
    return null
  }
}

/**
 * Get the FCM service worker registration
 */
export const getFCMServiceWorkerRegistration = (): ServiceWorkerRegistration | null => {
  return fcmServiceWorkerRegistration
}

/**
 * Initialize Firebase app and messaging
 */
export const initializeFirebase = async (): Promise<{
  app: FirebaseApp | null
  messaging: Messaging | null
}> => {
  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase is not configured. Check your environment variables.')
    return { app: null, messaging: null }
  }

  // Initialize Firebase app
  if (!app) {
    app = initializeApp(firebaseConfig)
  }

  // Check if messaging is supported (not in all browsers)
  const supported = await isSupported()
  if (!supported) {
    console.warn('[FCM] Firebase messaging is not supported in this browser')
    return { app, messaging: null }
  }

  // Register FCM service worker first
  await registerFCMServiceWorker()

  // Initialize messaging
  if (!messaging) {
    messaging = getMessaging(app)
  }

  return { app, messaging }
}

/**
 * Get the Firebase messaging instance
 */
export const getFirebaseMessaging = (): Messaging | null => messaging

/**
 * Get the Firebase app instance
 */
export const getFirebaseApp = (): FirebaseApp | null => app
