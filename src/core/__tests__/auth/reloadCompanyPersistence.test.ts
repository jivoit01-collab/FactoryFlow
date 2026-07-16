import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Reload → Company persistence (regression)
//
// Reproduces the bug where reloading the app intermittently bounced
// the user to /select-company, and proves the fix.
//
// Root cause: AuthInitializer dispatched `loginSuccess` on reload.
// authSyncMiddleware syncs loginSuccess to IndexedDB via
// saveAuthDataLogin, which rewrites the record in "login shape" —
// WITHOUT currentCompany. AuthInitializer then reads
// getCurrentCompany() to decide routing; a null result routes to
// /select-company.
//
// The fix dispatches `initializeAuth` instead, which the middleware
// does NOT persist, so the stored currentCompany survives the reload.
//
// This test drives the REAL authSlice reducer + REAL authSyncMiddleware
// against a fake IndexedDB that mirrors the real service's
// read-modify-write semantics (see indexedDb.service.ts).
// ═══════════════════════════════════════════════════════════════

const USER_KEY = 'test-user-key';

// In-memory fake mirroring indexedDb.service.ts semantics.
// Critically: saveAuthDataLogin writes a login-shaped record with NO
// currentCompany / permissions, exactly like the real service.
const { fakeDB } = vi.hoisted(() => {
  type Rec = Record<string, unknown> | null;
  const state: { record: Rec } = { record: null };

  const flush = () => Promise.resolve();

  return {
    fakeDB: {
      __seed(record: Rec) {
        state.record = record;
      },
      async getAuthData() {
        await flush();
        return state.record;
      },
      async getCurrentCompany() {
        await flush();
        return (state.record?.currentCompany as unknown) ?? null;
      },
      async saveAuthDataLogin(data: Record<string, unknown>) {
        await flush();
        // Login shape: no currentCompany, no permissions (matches real service)
        state.record = {
          id: USER_KEY,
          user: data.user,
          access: data.access,
          refresh: data.refresh,
          accessExpiresAt: data.accessExpiresAt,
          refreshExpiresAt: data.refreshExpiresAt,
        };
      },
      async saveAuthData(data: Record<string, unknown>) {
        await flush();
        state.record = { id: USER_KEY, ...data, updatedAt: 0 };
      },
      async updateCurrentCompany(company: unknown) {
        await flush();
        const existing = state.record ?? {};
        state.record = {
          ...existing,
          id: USER_KEY,
          currentCompany: company,
        };
      },
      async updateTokens(
        access: string,
        refresh: string,
        accessExpiresAt: number,
        refreshExpiresAt: number,
      ) {
        await flush();
        const existing = state.record ?? {};
        state.record = { ...existing, id: USER_KEY, access, refresh, accessExpiresAt, refreshExpiresAt };
      },
      async updateUser(user: Record<string, unknown>) {
        await flush();
        const existing = state.record ?? {};
        state.record = {
          ...existing,
          id: USER_KEY,
          user,
          permissions: (user.permissions as string[]) ?? [],
          // Real service preserves an existing currentCompany
          currentCompany: existing.currentCompany ?? null,
        };
      },
      async clearAuthData() {
        await flush();
        state.record = null;
      },
    },
  };
});

vi.mock('@/core/auth/services/indexedDb.service', () => ({
  indexedDBService: fakeDB,
}));

vi.mock('@/config/constants', () => ({
  AUTH_CONFIG: { userKey: 'test-user-key' },
}));

import { authSyncMiddleware } from '@/core/auth/store/authSyncMiddleware';
import authReducer, {
  initializeAuth,
  loginSuccess,
} from '@/core/auth/store/authSlice';
import type { LoginResponse, User, UserCompany } from '@/core/auth/types/auth.types';

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer },
    middleware: (getDefault) => getDefault().concat(authSyncMiddleware),
  });
}

const COMPANY: UserCompany = {
  company_id: 3,
  company_name: 'Jivo Oil',
  company_code: 'JIVO_OIL',
  role: 'Manager',
  is_default: true,
  is_active: true,
};

const USER: User = {
  id: 1,
  email: 'jivoit0@gmail.com',
  full_name: 'Jivo IT',
  employee_code: 'EMP1',
  is_active: true,
  is_staff: false,
  date_joined: '2025-01-01',
  companies: [COMPANY],
  permissions: ['gate.view'],
};

/** A fully-initialized session record, as it exists in IndexedDB after
 *  login → company select → /auth/me completes. */
function seedSelectedCompanySession() {
  fakeDB.__seed({
    id: USER_KEY,
    user: USER,
    permissions: USER.permissions,
    currentCompany: COMPANY,
    access: 'access-token',
    refresh: 'refresh-token',
    accessExpiresAt: 9_999_999_999_999,
    refreshExpiresAt: 9_999_999_999_999,
    updatedAt: 0,
  });
}

// Let the middleware's fire-and-forget IndexedDB writes settle.
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('reload → company persistence', () => {
  beforeEach(() => {
    fakeDB.__seed(null);
  });

  it('BUG REPRO: dispatching loginSuccess on reload wipes the stored company', async () => {
    seedSelectedCompanySession();
    const store = makeStore();

    // What the OLD AuthInitializer did on reload:
    const payload: LoginResponse = {
      user: USER,
      access: 'access-token',
      refresh: 'refresh-token',
      tokensExpiresIn: { access_expires_in: 3600, refresh_expires_in: 86400 },
    };
    store.dispatch(loginSuccess(payload));
    await settle();

    // The middleware's saveAuthDataLogin has now dropped currentCompany.
    // AuthInitializer would read null here and route to /select-company.
    const currentCompany = await fakeDB.getCurrentCompany();
    expect(currentCompany).toBeNull();
  });

  it('FIX: dispatching initializeAuth on reload preserves the stored company', async () => {
    seedSelectedCompanySession();
    const store = makeStore();

    // What the FIXED AuthInitializer does on reload:
    store.dispatch(
      initializeAuth({
        user: USER,
        permissions: USER.permissions,
        currentCompany: COMPANY,
        access: 'access-token',
        refresh: 'refresh-token',
        expiresIn: 9_999_999_999_999,
      }),
    );
    await settle();

    // currentCompany survives → AuthInitializer routes to LOADING_USER,
    // never to /select-company.
    const currentCompany = (await fakeDB.getCurrentCompany()) as UserCompany | null;
    expect(currentCompany).not.toBeNull();
    expect(currentCompany?.company_code).toBe('JIVO_OIL');

    // Redux reflects the restored company as well.
    expect(store.getState().auth.currentCompany?.company_code).toBe('JIVO_OIL');
    expect(store.getState().auth.permissions).toEqual(['gate.view']);
  });
});
