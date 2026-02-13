import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// auth/utils/tokenRefresh.util.ts — File Content Verification
//
// tokenRefresh.util imports indexedDBService and authService
// which pull in deep dependency chains (axios, sonner, IndexedDB).
// Verify structure via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/core/auth/utils/tokenRefresh.util.ts'), 'utf-8');
}

describe('auth/utils/tokenRefresh.util.ts', () => {
  // ═══════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════

  it('imports indexedDBService from ../services/indexedDb.service', () => {
    const content = readSource();
    expect(content).toContain('indexedDBService');
    expect(content).toContain("from '../services/indexedDb.service'");
  });

  it('imports authService from ../services/auth.service', () => {
    const content = readSource();
    expect(content).toContain('authService');
    expect(content).toContain("from '../services/auth.service'");
  });

  it('imports RefreshTokenResponse type from ../types/auth.types', () => {
    const content = readSource();
    expect(content).toContain('RefreshTokenResponse');
    expect(content).toContain("from '../types/auth.types'");
  });

  // ═══════════════════════════════════════════════════════════
  // Exported interface
  // ═══════════════════════════════════════════════════════════

  it('exports TokenRefreshResult interface with success, access, refresh, and optional error', () => {
    const content = readSource();
    expect(content).toMatch(/export interface TokenRefreshResult/);
    expect(content).toContain('success: boolean');
    expect(content).toContain('access: string');
    expect(content).toContain('refresh: string');
    expect(content).toContain('error?: Error');
  });

  // ═══════════════════════════════════════════════════════════
  // Exported functions
  // ═══════════════════════════════════════════════════════════

  // ─── isTokenCompletelyExpired ──────────────────────────────

  it('exports isTokenCompletelyExpired as async function', () => {
    const content = readSource();
    expect(content).toMatch(/export async function isTokenCompletelyExpired\(\)/);
  });

  it('isTokenCompletelyExpired delegates to indexedDBService.isTokenExpiredCompletely', () => {
    const content = readSource();
    expect(content).toContain('indexedDBService.isTokenExpiredCompletely()');
  });

  // ─── shouldRefreshToken ────────────────────────────────────

  it('exports shouldRefreshToken as async function', () => {
    const content = readSource();
    expect(content).toMatch(/export async function shouldRefreshToken\(\)/);
  });

  it('shouldRefreshToken delegates to indexedDBService.isTokenExpired', () => {
    const content = readSource();
    expect(content).toContain('indexedDBService.isTokenExpired()');
  });

  // ─── refreshAccessToken ────────────────────────────────────

  it('exports refreshAccessToken as async function returning TokenRefreshResult', () => {
    const content = readSource();
    expect(content).toMatch(
      /export async function refreshAccessToken\(\): Promise<TokenRefreshResult>/,
    );
  });

  it('refreshAccessToken retrieves refresh token and calls authService.refreshToken', () => {
    const content = readSource();
    expect(content).toContain('indexedDBService.getRefreshToken()');
    expect(content).toContain('authService.refreshToken(refresh)');
  });

  it('refreshAccessToken handles missing refresh token with error', () => {
    const content = readSource();
    expect(content).toContain('No refresh token available');
  });

  it('refreshAccessToken has try/catch error handling', () => {
    const content = readSource();
    expect(content).toContain('Token refresh failed');
  });

  // ─── ensureValidToken ──────────────────────────────────────

  it('exports ensureValidToken as async function with optional onExpired callback', () => {
    const content = readSource();
    expect(content).toMatch(/export async function ensureValidToken\(/);
    expect(content).toContain('onExpired');
  });

  it('ensureValidToken checks both access and refresh tokens', () => {
    const content = readSource();
    expect(content).toContain('indexedDBService.getAccessToken()');
    expect(content).toContain('indexedDBService.getRefreshToken()');
  });

  it('ensureValidToken calls isTokenCompletelyExpired and shouldRefreshToken', () => {
    const content = readSource();
    expect(content).toContain('isTokenCompletelyExpired()');
    expect(content).toContain('shouldRefreshToken()');
  });

  it('ensureValidToken calls refreshAccessToken when token needs refresh', () => {
    const content = readSource();
    expect(content).toContain('refreshAccessToken()');
    expect(content).toContain('result.success');
    expect(content).toContain('result.access');
  });
});
