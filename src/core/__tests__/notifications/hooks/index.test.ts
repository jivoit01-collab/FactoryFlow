import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect,it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// notifications/hooks/index.ts — Hooks Barrel (File Content Verification)
//
// Re-exports notification hooks from useNotifications. Deep
// dependency chain through Redux store — verify via readFileSync.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
      return readFileSync(resolve(process.cwd(), 'src/core/notifications/hooks/index.ts'), 'utf-8');
}

describe('notifications/hooks/index.ts — Hook Re-exports', () => {
  it('re-exports usePushNotifications from ./useNotifications', () => {
    const content = readSource();
    expect(content).toContain('usePushNotifications');
    expect(content).toContain("from './useNotifications'");
  });

  it('re-exports useNotificationList from ./useNotifications', () => {
    const content = readSource();
    expect(content).toContain('useNotificationList');
  });

  it('re-exports useUnreadCount from ./useNotifications', () => {
    const content = readSource();
    expect(content).toContain('useUnreadCount');
  });

  it('re-exports useNotificationPreferences from ./useNotifications', () => {
    const content = readSource();
    expect(content).toContain('useNotificationPreferences');
  });
});
