/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging Service Worker
 *
 * This service worker handles background push notifications when the app is:
 * - In the background (tab not focused)
 * - Closed completely
 * - Running as an installed PWA
 *
 * IMPORTANT: Replace the placeholder values below with your actual Firebase config.
 * These values are safe to expose as they are also visible in your frontend code.
 * Get these from: Firebase Console > Project Settings > General > Your apps > Web app
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase configuration (hardcoded - service workers cannot access import.meta.env)
firebase.initializeApp({
  apiKey: 'AIzaSyBanxBLJy0h5_D3inPJP9e850kmsoRDTxo',
  authDomain: 'sampooran-jivo.firebaseapp.com',
  projectId: 'sampooran-jivo',
  storageBucket: 'sampooran-jivo.firebasestorage.app',
  messagingSenderId: '288727872234',
  appId: '1:288727872234:web:6fc2628ca56d1d440bdd93',
});

const messaging = firebase.messaging();

/**
 * Handle background messages
 * This is called when the app is in the background or closed
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message received:', payload);

  // Extract notification data
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationBody = payload.notification?.body || payload.data?.body || '';

  // Build notification options
  const notificationOptions = {
    body: notificationBody,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: payload.data?.tag || payload.data?.type_code || 'default',
    data: {
      ...payload.data,
      url: payload.data?.url || '/',
      notification_id: payload.data?.notification_id,
      type_code: payload.data?.type_code,
    },
    // Notification behavior
    requireInteraction: payload.data?.require_interaction === 'true',
    silent: false,
    // Actions for notification
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    // Vibration pattern (mobile)
    vibrate: [200, 100, 200],
  };

  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification click events
 * Opens the app or focuses existing window when notification is clicked
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event.action);

  // Close the notification
  event.notification.close();

  // Handle dismiss action
  if (event.action === 'dismiss') {
    return;
  }

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        // If we find a matching window, focus it and navigate
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            // Navigate to the notification URL
            if ('navigate' in focusedClient) {
              return focusedClient.navigate(fullUrl);
            }
            return focusedClient;
          });
        }
      }
      // If no matching window found, open a new one
      return clients.openWindow(fullUrl);
    })
  );
});

/**
 * Handle notification close events (optional)
 * Useful for analytics or cleanup
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[FCM SW] Notification closed:', event.notification.tag);
  // Could send analytics here if needed
});

/**
 * Handle push subscription change
 * This can happen when the browser refreshes the push subscription
 */
self.addEventListener('pushsubscriptionchange', () => {
  console.log('[FCM SW] Push subscription changed');
  // The FCM SDK handles this automatically, but you could add custom logic here
});
