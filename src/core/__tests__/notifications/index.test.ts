import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// notifications/index.ts — Barrel Re-exports (File Content Verification)
//
// The notifications barrel imports services, components, hooks,
// and types with deep dependency chains through Firebase,
// lucide-react, and Redux. Verify structure via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(process.cwd(), 'src/core/notifications/index.ts'), 'utf-8');
}

describe('notifications/index.ts — Barrel Re-exports', () => {
  // ═══════════════════════════════════════════════════════════
  // Services
  // ═══════════════════════════════════════════════════════════

  it('re-exports fcmService from ./fcm.service', () => {
    const content = readSource();
    expect(content).toContain('fcmService');
    expect(content).toContain("from './fcm.service'");
  });

  it('re-exports notificationService from ./notification.service', () => {
    const content = readSource();
    expect(content).toContain('notificationService');
    expect(content).toContain("from './notification.service'");
  });

  // ═══════════════════════════════════════════════════════════
  // Components
  // ═══════════════════════════════════════════════════════════

  it('re-exports NotificationBell from ./components/NotificationBell', () => {
    const content = readSource();
    expect(content).toContain('NotificationBell');
    expect(content).toContain("from './components/NotificationBell'");
  });

  // ═══════════════════════════════════════════════════════════
  // Hooks
  // ═══════════════════════════════════════════════════════════

  it('re-exports all hooks via wildcard from ./hooks', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+\*\s+from\s+['"]\.\/hooks['"]/);
  });

  // ═══════════════════════════════════════════════════════════
  // Types
  // ═══════════════════════════════════════════════════════════

  it('re-exports all types via wildcard from ./types', () => {
    const content = readSource();
    expect(content).toMatch(/export\s+\*\s+from\s+['"]\.\/types['"]/);
  });

  it('has exactly 5 export statements (2 services, 1 component, 1 hooks, 1 types)', () => {
    const content = readSource();
    const exportLines = content
      .split('\n')
      .filter((line: string) => line.trim().startsWith('export'));
    expect(exportLines.length).toBe(5);
  });
});
