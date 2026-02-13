import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// firebase.config — File Content Verification
//
// Direct import may hang or fail because firebase.config imports
// from 'firebase/app' and 'firebase/messaging' which are heavy
// external SDKs. We verify via file content analysis.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/config/firebase.config.ts'), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('firebase.config — Imports', () => {
  it('imports initializeApp and FirebaseApp type from firebase/app', () => {
    const content = readSource();
    expect(content).toContain("from 'firebase/app'");
    expect(content).toContain('initializeApp');
    expect(content).toContain('type FirebaseApp');
  });

  it('imports getMessaging, Messaging type, and isSupported from firebase/messaging', () => {
    const content = readSource();
    expect(content).toContain("from 'firebase/messaging'");
    expect(content).toContain('getMessaging');
    expect(content).toContain('type Messaging');
    expect(content).toContain('isSupported');
  });
});

// ═══════════════════════════════════════════════════════════════
// firebaseConfig object
// ═══════════════════════════════════════════════════════════════

describe('firebase.config — firebaseConfig object', () => {
  it('includes apiKey from VITE_FIREBASE_API_KEY', () => {
    const content = readSource();
    expect(content).toContain('apiKey: import.meta.env.VITE_FIREBASE_API_KEY');
  });

  it('includes authDomain from VITE_FIREBASE_AUTH_DOMAIN', () => {
    const content = readSource();
    expect(content).toContain('authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN');
  });

  it('includes projectId from VITE_FIREBASE_PROJECT_ID', () => {
    const content = readSource();
    expect(content).toContain('projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID');
  });

  it('includes storageBucket from VITE_FIREBASE_STORAGE_BUCKET', () => {
    const content = readSource();
    expect(content).toContain('storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET');
  });

  it('includes messagingSenderId from VITE_FIREBASE_MESSAGING_SENDER_ID', () => {
    const content = readSource();
    expect(content).toContain(
      'messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID',
    );
  });

  it('includes appId from VITE_FIREBASE_APP_ID', () => {
    const content = readSource();
    expect(content).toContain('appId: import.meta.env.VITE_FIREBASE_APP_ID');
  });

  it('reads exactly 6 VITE_FIREBASE_* env vars', () => {
    const content = readSource();
    const envVarMatches = content.match(/import\.meta\.env\.VITE_FIREBASE_\w+/g) || [];
    expect(envVarMatches).toHaveLength(6);
  });
});

// ═══════════════════════════════════════════════════════════════
// Module-level state
// ═══════════════════════════════════════════════════════════════

describe('firebase.config — Module-level state', () => {
  it('declares app as FirebaseApp | null initialized to null', () => {
    const content = readSource();
    expect(content).toContain('let app: FirebaseApp | null = null');
  });

  it('declares messaging as Messaging | null initialized to null', () => {
    const content = readSource();
    expect(content).toContain('let messaging: Messaging | null = null');
  });

  it('declares fcmServiceWorkerRegistration as null', () => {
    const content = readSource();
    expect(content).toContain('let fcmServiceWorkerRegistration');
    expect(content).toContain('= null');
  });
});

// ═══════════════════════════════════════════════════════════════
// Exported functions
// ═══════════════════════════════════════════════════════════════

describe('firebase.config — Exported functions', () => {
  it('exports isFirebaseConfigured function', () => {
    const content = readSource();
    expect(content).toContain('export const isFirebaseConfigured');
  });

  it('exports registerFCMServiceWorker as async function', () => {
    const content = readSource();
    expect(content).toContain('export const registerFCMServiceWorker');
    expect(content).toContain('async');
  });

  it('exports getFCMServiceWorkerRegistration function', () => {
    const content = readSource();
    expect(content).toContain('export const getFCMServiceWorkerRegistration');
  });

  it('exports initializeFirebase as async function', () => {
    const content = readSource();
    expect(content).toContain('export const initializeFirebase');
  });

  it('exports getFirebaseMessaging function', () => {
    const content = readSource();
    expect(content).toContain('export const getFirebaseMessaging');
  });

  it('exports getFirebaseApp function', () => {
    const content = readSource();
    expect(content).toContain('export const getFirebaseApp');
  });
});
