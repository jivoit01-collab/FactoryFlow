import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// auth/index.ts — Barrel Re-exports (File Content Verification)
//
// The auth barrel imports components, hooks, and services that
// pull in React, Redux, IndexedDB, and Firebase deps. Verify
// structure via readFileSync to avoid Vite module graph hangs.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/core/auth/index.ts'), 'utf-8');
}

describe('auth/index.ts — Barrel Re-exports', () => {
  // ═══════════════════════════════════════════════════════════
  // Components
  // ═══════════════════════════════════════════════════════════

  it('re-exports ProtectedRoute component', () => {
    const content = readSource();
    expect(content).toContain('ProtectedRoute');
    expect(content).toContain("from './components/ProtectedRoute'");
  });

  it('re-exports Authorized and withAuthorization from Authorized', () => {
    const content = readSource();
    expect(content).toContain('Authorized');
    expect(content).toContain('withAuthorization');
    expect(content).toContain("from './components/Authorized'");
  });

  it('re-exports AuthInitializer component', () => {
    const content = readSource();
    expect(content).toContain('AuthInitializer');
    expect(content).toContain("from './components/AuthInitializer'");
  });

  // ═══════════════════════════════════════════════════════════
  // Hooks
  // ═══════════════════════════════════════════════════════════

  it('re-exports useAuth and useAuthInitializer hooks', () => {
    const content = readSource();
    expect(content).toContain('useAuth');
    expect(content).toContain('useAuthInitializer');
    expect(content).toContain("from './hooks/useAuth'");
  });

  it('re-exports usePermission, useHasPermission, useCanPerformAction hooks', () => {
    const content = readSource();
    expect(content).toContain('usePermission');
    expect(content).toContain('useHasPermission');
    expect(content).toContain('useCanPerformAction');
    expect(content).toContain("from './hooks/usePermission'");
  });

  // ═══════════════════════════════════════════════════════════
  // Services
  // ═══════════════════════════════════════════════════════════

  it('re-exports authService from auth.service', () => {
    const content = readSource();
    expect(content).toContain('authService');
    expect(content).toContain("from './services/auth.service'");
  });

  it('re-exports indexedDBService from indexedDb.service', () => {
    const content = readSource();
    expect(content).toContain('indexedDBService');
    expect(content).toContain("from './services/indexedDb.service'");
  });

  // ═══════════════════════════════════════════════════════════
  // Types
  // ═══════════════════════════════════════════════════════════

  it('re-exports User, UserCompany, AuthState, LoginCredentials, LoginResponse, MeResponse, RefreshTokenResponse types', () => {
    const content = readSource();
    expect(content).toContain('User');
    expect(content).toContain('UserCompany');
    expect(content).toContain('AuthState');
    expect(content).toContain('LoginCredentials');
    expect(content).toContain('LoginResponse');
    expect(content).toContain('MeResponse');
    expect(content).toContain('RefreshTokenResponse');
    expect(content).toContain("from './types/auth.types'");
  });

  it('re-exports utility functions: getPermissions, getDefaultCompany, getActiveCompanies, hasRoleInAnyCompany, hasRoleInCompany', () => {
    const content = readSource();
    expect(content).toContain('getPermissions');
    expect(content).toContain('getDefaultCompany');
    expect(content).toContain('getActiveCompanies');
    expect(content).toContain('hasRoleInAnyCompany');
    expect(content).toContain('hasRoleInCompany');
  });

  // ═══════════════════════════════════════════════════════════
  // Store
  // ═══════════════════════════════════════════════════════════

  it('re-exports authReducer as default from authSlice', () => {
    const content = readSource();
    expect(content).toContain('default as authReducer');
    expect(content).toContain("from './store/authSlice'");
  });

  it('re-exports all 11 action creators from authSlice', () => {
    const content = readSource();
    const actions = [
      'loginSuccess',
      'logout',
      'updateUser',
      'updateTokens',
      'updatePermissions',
      'switchCompany',
      'clearCurrentCompany',
      'initializeAuth',
      'initializeComplete',
      'setLoading',
      'setPermissionsLoading',
    ];
    for (const action of actions) {
      expect(content).toContain(action);
    }
  });
});
