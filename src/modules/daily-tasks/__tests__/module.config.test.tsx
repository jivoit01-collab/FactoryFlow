import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════
// Source-text assertions.
//
// The module config imports pages through lazyWithRetry, so importing it here
// would pull in the whole page tree. Every other module config test in this repo
// reads the source instead — same approach.
// ═══════════════════════════════════════════════════════════════════════════

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8');
}

const CONFIG = 'src/modules/daily-tasks/module.config.tsx';

describe('dailyTasksModuleConfig', () => {
  it('exports the config with the ModuleConfig type', () => {
    expect(readSource(CONFIG)).toContain('export const dailyTasksModuleConfig: ModuleConfig');
  });

  it("uses the module name 'daily-tasks'", () => {
    expect(readSource(CONFIG)).toContain("name: 'daily-tasks'");
  });

  it('lazy-loads pages through the chunk-reload helper, not React.lazy', () => {
    const content = readSource(CONFIG);
    expect(content).toContain("import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload'");
    expect(content).not.toContain('React.lazy');
  });

  it('registers both routes on the main layout', () => {
    const content = readSource(CONFIG);
    expect(content).toContain("path: '/daily-tasks'");
    expect(content).toContain("path: '/daily-tasks/team'");
    expect(content).toContain("layout: 'main'");
  });

  it('gates the personal page on VIEW_MY and the board on VIEW_ALL', () => {
    const content = readSource(CONFIG);
    expect(content).toContain('DAILY_TASKS_PERMISSIONS.VIEW_MY');
    expect(content).toContain('DAILY_TASKS_PERMISSIONS.VIEW_ALL');
    expect(content).toContain("import { DAILY_TASKS_PERMISSIONS } from '@/config/permissions'");
  });

  it('does not gate the nav item on modulePrefix', () => {
    // `activity_center` also matches can_view_activity_reports, which alone opens
    // neither page — the two explicit permissions are the correct gate.
    expect(readSource(CONFIG)).not.toContain('modulePrefix:');
  });

  it('ships no sidebar badge', () => {
    // Deliberate: the natural badge number is "not yet", and a standing red pill
    // would turn an informational sheet into a nag. See docs/modules/daily-tasks.md.
    expect(readSource(CONFIG)).not.toContain('badge:');
  });

  it('is registered in the app module registry', () => {
    const registry = readSource('src/app/registry/index.ts');
    expect(registry).toContain(
      "import { dailyTasksModuleConfig } from '@/modules/daily-tasks/module.config'",
    );
    expect(registry).toContain('dailyTasksModuleConfig,');
  });

  it('exposes its permissions from the central permissions barrel', () => {
    expect(readSource('src/config/permissions/index.ts')).toContain('DAILY_TASKS_PERMISSIONS');
  });
});

describe('daily tasks presentation guarantees', () => {
  // These assertions encode decisions from the plan, not style preferences.
  // A failure here means the "show, don't score" contract was weakened.

  it('never renders a percentage or progress ring in the stat tiles', () => {
    const stats = readSource('src/modules/daily-tasks/components/DailySheetStats.tsx');
    expect(stats).not.toMatch(/%/);
    expect(stats).not.toContain('Progress');
  });

  it('does not colour an un-done job red', () => {
    const row = readSource('src/modules/daily-tasks/components/DailyJobRow.tsx');
    expect(row).not.toContain('text-red-');
    expect(row).not.toContain('bg-red-');
    expect(row).not.toContain('destructive');
  });

  it('renders the not-tracked state rather than a zero', () => {
    const row = readSource('src/modules/daily-tasks/components/DailyJobRow.tsx');
    expect(row).toContain('Not tracked');
    expect(row).toContain('Not yet today');
  });

  it('keeps the honesty notice inline, not behind a tooltip or collapsible', () => {
    const notice = readSource('src/modules/daily-tasks/components/NotTrackedNotice.tsx');
    expect(notice).not.toContain('Tooltip');
    expect(notice).not.toContain('Collapsible');
  });

  it('defaults the board sort to name, not to who did least', () => {
    const filters = readSource('src/modules/daily-tasks/components/TeamBoardFilters.tsx');
    expect(filters.indexOf('name:')).toBeLessThan(filters.indexOf('least:'));
    expect(readSource('src/modules/daily-tasks/pages/TeamDailyTasksPage.tsx')).toContain(
      "useState<BoardSort>('name')",
    );
  });
});
