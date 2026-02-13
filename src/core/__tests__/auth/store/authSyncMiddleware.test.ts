import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Auth Sync Middleware (src/core/auth/store/authSyncMiddleware.ts)
// Direct Import + Mock
//
// Mock indexedDBService and @/config/constants before import.
// ═══════════════════════════════════════════════════════════════

const { mockIndexedDBService } = vi.hoisted(() => ({
  mockIndexedDBService: {
    saveAuthDataLogin: vi.fn(() => Promise.resolve()),
    updateTokens: vi.fn(() => Promise.resolve()),
    updateUser: vi.fn(() => Promise.resolve()),
    updateCurrentCompany: vi.fn(() => Promise.resolve()),
    clearAuthData: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/core/auth/services/indexedDb.service', () => ({
  indexedDBService: mockIndexedDBService,
}));

vi.mock('@/config/constants', () => ({
  AUTH_CONFIG: { userKey: 'test-user-key' },
}));

import { authSyncMiddleware } from '@/core/auth/store/authSyncMiddleware';
import {
  loginSuccess,
  updateTokens,
  updateUser,
  logout,
  switchCompany,
  clearCurrentCompany,
} from '@/core/auth/store/authSlice';
import type { User, UserCompany } from '@/core/auth/types/auth.types';

function makeCompany(overrides: Partial<UserCompany> = {}): UserCompany {
  return {
    company_id: 1,
    company_name: 'Corp',
    company_code: 'C',
    role: 'admin',
    is_default: true,
    is_active: true,
    ...overrides,
  };
}

describe('Auth Sync Middleware', () => {
  const next = vi.fn((action) => action);
  let middleware: ReturnType<ReturnType<typeof authSyncMiddleware>>;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = (authSyncMiddleware as any)({})(next);
  });

  it('calls next with the action and returns result', () => {
    const action = { type: 'unknown/action' };
    const result = middleware(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(result).toBe(action);
  });

  // ─── loginSuccess ─────────────────────────────────────────

  it('calls saveAuthDataLogin on loginSuccess', () => {
    const action = loginSuccess({
      user: { id: 1, email: 'a@b.com', full_name: 'A', companies: [makeCompany()] },
      access: 'acc',
      refresh: 'ref',
      tokensExpiresIn: { access_expires_in: 300, refresh_expires_in: 86400 },
    });
    middleware(action);
    expect(mockIndexedDBService.saveAuthDataLogin).toHaveBeenCalledTimes(1);
    const call = mockIndexedDBService.saveAuthDataLogin.mock.calls[0][0];
    expect(call.id).toBe('test-user-key');
    expect(call.access).toBe('acc');
    expect(call.refresh).toBe('ref');
    expect(call.user.email).toBe('a@b.com');
  });

  // ─── updateTokens ────────────────────────────────────────

  it('calls updateTokens on updateTokens action', () => {
    const action = updateTokens({
      access: 'new-a',
      refresh: 'new-r',
      expiresIn: 999,
      refreshExpiresAt: 5000,
    });
    middleware(action);
    expect(mockIndexedDBService.updateTokens).toHaveBeenCalledWith('new-a', 'new-r', 999, 5000);
  });

  // ─── updateUser ───────────────────────────────────────────

  it('calls updateUser on updateUser action', () => {
    const user: User = {
      id: 1,
      email: 'a@b.com',
      full_name: 'A',
      employee_code: 'E',
      is_active: true,
      is_staff: false,
      date_joined: '2024-01-01',
      companies: [],
      permissions: [],
    };
    middleware(updateUser(user));
    expect(mockIndexedDBService.updateUser).toHaveBeenCalledWith(user);
  });

  // ─── switchCompany ────────────────────────────────────────

  it('calls updateCurrentCompany on switchCompany', () => {
    const company = makeCompany({ company_id: 42 });
    middleware(switchCompany(company));
    expect(mockIndexedDBService.updateCurrentCompany).toHaveBeenCalledWith(company);
  });

  // ─── clearCurrentCompany ──────────────────────────────────

  it('calls updateCurrentCompany(null) on clearCurrentCompany', () => {
    middleware(clearCurrentCompany());
    expect(mockIndexedDBService.updateCurrentCompany).toHaveBeenCalledWith(null);
  });

  // ─── logout ───────────────────────────────────────────────

  it('calls clearAuthData on logout', () => {
    middleware(logout());
    expect(mockIndexedDBService.clearAuthData).toHaveBeenCalledTimes(1);
  });

  // ─── Unrelated action ─────────────────────────────────────

  it('does not call IndexedDB for unrelated actions', () => {
    middleware({ type: 'some/other' });
    expect(mockIndexedDBService.saveAuthDataLogin).not.toHaveBeenCalled();
    expect(mockIndexedDBService.updateTokens).not.toHaveBeenCalled();
    expect(mockIndexedDBService.updateUser).not.toHaveBeenCalled();
    expect(mockIndexedDBService.updateCurrentCompany).not.toHaveBeenCalled();
    expect(mockIndexedDBService.clearAuthData).not.toHaveBeenCalled();
  });
});
