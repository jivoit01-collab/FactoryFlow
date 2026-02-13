import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// App Barrel (src/app/index.ts) — File Content Verification
//
// Re-exports App, layouts, providers, and routes. All
// transitively depend on lucide-react, @/core/auth, etc.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/app/index.ts'), 'utf-8');
}

describe('App Index', () => {
  // ─── Re-exports ──────────────────────────────────────────

  it('re-exports App as named export from ./App', () => {
    const content = readSource();
    expect(content).toContain("export { default as App } from './App'");
  });

  it('re-exports all layouts via wildcard', () => {
    const content = readSource();
    expect(content).toContain("export * from './layouts'");
  });

  it('re-exports all providers via wildcard', () => {
    const content = readSource();
    expect(content).toContain("export * from './providers'");
  });

  it('re-exports all routes via wildcard', () => {
    const content = readSource();
    expect(content).toContain("export * from './routes'");
  });

  // ─── Structure ───────────────────────────────────────────

  it('has exactly 4 export statements', () => {
    const content = readSource();
    const exportLines = content
      .split('\n')
      .filter((line: string) => line.trim().startsWith('export'));
    expect(exportLines).toHaveLength(4);
  });

  it('does not re-export from ./modules (internal only)', () => {
    const content = readSource();
    expect(content).not.toContain("from './modules'");
  });

  it('App is re-exported as named export, not default', () => {
    const content = readSource();
    expect(content).toMatch(/export\s*\{\s*default\s+as\s+App\s*\}/);
  });
});
