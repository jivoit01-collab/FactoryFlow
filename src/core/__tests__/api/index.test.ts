import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// api/index.ts — Barrel Re-exports (File Content Verification)
//
// The API barrel imports from client.ts which pulls in axios,
// sonner, auth services, etc. — deep transitive deps that hang
// Vite's module graph. Verify structure via readFileSync instead.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/core/api/index.ts'), 'utf-8');
}

describe('api/index.ts — Barrel Re-exports', () => {
  // ─── Re-exports from ./client ────────────────────────────────

  it('re-exports apiClient from ./client', () => {
    const content = readSource();
    expect(content).toContain('apiClient');
    expect(content).toContain("from './client'");
  });

  it('re-exports setupTokenRefreshInterval from ./client', () => {
    const content = readSource();
    expect(content).toContain('setupTokenRefreshInterval');
    expect(content).toContain("from './client'");
  });

  // ─── Re-exports from ./queryClient ──────────────────────────

  it('re-exports queryClient from ./queryClient', () => {
    const content = readSource();
    expect(content).toContain('queryClient');
    expect(content).toContain("from './queryClient'");
  });

  // ─── Re-exports from ./types ────────────────────────────────

  it('re-exports all from ./types', () => {
    const content = readSource();
    expect(content).toMatch(/export \* from ['"]\.\/types['"]/);
  });

  // ─── Structure ──────────────────────────────────────────────

  it('has exactly 3 export lines', () => {
    const content = readSource();
    const exportLines = content
      .split('\n')
      .filter((line: string) => line.trim().startsWith('export'));
    expect(exportLines).toHaveLength(3);
  });
});
