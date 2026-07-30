import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// module.config — File Content Verification
//
// Matches the convention used by the other modules: a direct import
// hangs because module.config pulls a lucide icon and lazy() page
// imports, so the wiring is asserted against the source text.
// ═══════════════════════════════════════════════════════════════

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8');
}

const CONFIG = 'src/modules/activities/module.config.tsx';

describe('module.config — Exports', () => {
  it('exports activitiesModuleConfig with ModuleConfig type', () => {
    expect(readSource(CONFIG)).toContain('export const activitiesModuleConfig: ModuleConfig');
  });

  it('imports the retry-aware lazy for code-split pages', () => {
    expect(readSource(CONFIG)).toContain(
      "import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload'",
    );
  });

  it('imports ACTIVITY permissions from @/config/permissions', () => {
    const content = readSource(CONFIG);
    expect(content).toContain("from '@/config/permissions'");
    expect(content).toContain('ACTIVITY_PERMISSIONS');
  });
});

describe('module.config — Route gating', () => {
  it('gates the personal screen on the self-scoped permission', () => {
    const content = readSource(CONFIG);
    expect(content).toContain("path: '/activities'");
    expect(content).toContain('ACTIVITY_PERMISSIONS.VIEW_MY');
  });

  it('gates the team screen and the catalogue on VIEW_ALL only', () => {
    const content = readSource(CONFIG);
    const team = content.slice(content.indexOf("path: '/activities/team'"));
    expect(team.slice(0, 220)).toContain('ACTIVITY_PERMISSIONS.VIEW_ALL');
    expect(team.slice(0, 220)).not.toContain('VIEW_MY');

    const catalogue = content.slice(content.indexOf("path: '/activities/catalogue'"));
    expect(catalogue.slice(0, 220)).toContain('ACTIVITY_PERMISSIONS.VIEW_ALL');
  });

  it('registers the per-user detail route', () => {
    expect(readSource(CONFIG)).toContain("path: '/activities/users/:userId'");
  });
});

describe('module.config — Navigation', () => {
  it('adds a sidebar group with the pending badge', () => {
    const content = readSource(CONFIG);
    expect(content).toContain("title: 'Activities'");
    expect(content).toContain('badge: MyPendingBadge');
    expect(content).toContain('showInSidebar: true');
  });
});

describe('registry', () => {
  it('registers the module so its routes are mounted', () => {
    const registry = readSource('src/app/registry/index.ts');
    expect(registry).toContain(
      "import { activitiesModuleConfig } from '@/modules/activities/module.config'",
    );
    expect(registry).toContain('activitiesModuleConfig,');
  });
});

describe('permissions', () => {
  it('maps to the backend activity_center app', () => {
    const perms = readSource('src/config/permissions/activity.permissions.ts');
    expect(perms).toContain("VIEW_MY: 'activity_center.can_view_my_activities'");
    expect(perms).toContain("VIEW_ALL: 'activity_center.can_view_all_activities'");
  });

  it('is re-exported from the permissions barrel', () => {
    expect(readSource('src/config/permissions/index.ts')).toContain('ACTIVITY_PERMISSIONS');
  });
});
