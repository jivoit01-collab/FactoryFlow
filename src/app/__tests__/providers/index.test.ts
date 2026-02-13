import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Providers Barrel — File Content Verification
//
// Re-exports from providers that import @/core/store,
// @/core/notifications, and other heavy dependencies.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/app/providers/index.ts'), 'utf-8');
}

describe('Providers Index', () => {
  // ─── Re-exports ──────────────────────────────────────────

  it('re-exports AppProviders from ./AppProviders', () => {
    const content = readSource();
    expect(content).toContain("export { AppProviders } from './AppProviders'");
  });

  it('re-exports NotificationProvider from ./NotificationProvider', () => {
    const content = readSource();
    expect(content).toContain("export { NotificationProvider } from './NotificationProvider'");
  });

  // ─── Structure ───────────────────────────────────────────

  it('has exactly 2 export statements', () => {
    const content = readSource();
    const exportLines = content
      .split('\n')
      .filter((line: string) => line.trim().startsWith('export'));
    expect(exportLines).toHaveLength(2);
  });

  it('does not contain default exports', () => {
    const content = readSource();
    expect(content).not.toMatch(/export\s+default/);
  });
});
