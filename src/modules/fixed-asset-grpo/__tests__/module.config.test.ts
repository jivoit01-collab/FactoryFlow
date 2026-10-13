import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  FA_GRPO_ACCESS,
  FA_GRPO_LINK_ACCESS,
  FA_GRPO_MODULE_PREFIX,
  FA_GRPO_PERMISSIONS,
  FA_GRPO_POST_ACCESS,
} from '../constants/permissions';
import { FA_GRPO_BASE_PATH, FA_GRPO_ROUTES, faGrpoPaths } from '../constants/routes';

// ═══════════════════════════════════════════════════════════════
// Fixed Asset GRPO module config — source-text checks
//
// module.config.tsx lazy-loads its pages, and importing it directly hangs
// under vitest (as grpo's own module.config test explains), so the routes and
// the sidebar entry are checked on the source text; the constants they are
// built from are imported and checked for real.
// ═══════════════════════════════════════════════════════════════

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8');
}

const config = () => readSource('src/modules/fixed-asset-grpo/module.config.tsx');

describe('routes', () => {
  it('lives where the backend links to (FRONTEND_BASE)', () => {
    expect(FA_GRPO_BASE_PATH).toBe('/warehouse/grpo/fixed-asset');
    expect(FA_GRPO_ROUTES).toEqual({
      LIST: '/warehouse/grpo/fixed-asset',
      PREVIEW: '/warehouse/grpo/fixed-asset/preview/:vehicleEntryId',
      HISTORY_DETAIL: '/warehouse/grpo/fixed-asset/history/:postingId',
    });
    // The backend's draft and posted links.
    expect(faGrpoPaths.preview(12)).toBe('/warehouse/grpo/fixed-asset/preview/12');
    expect(faGrpoPaths.historyDetail(7)).toBe('/warehouse/grpo/fixed-asset/history/7');
  });

  it('registers the three routes, static before param', () => {
    const content = config();
    const list = content.indexOf('path: FA_GRPO_ROUTES.LIST');
    const preview = content.indexOf('path: FA_GRPO_ROUTES.PREVIEW');
    const detail = content.indexOf('path: FA_GRPO_ROUTES.HISTORY_DETAIL');
    expect(list).toBeGreaterThan(-1);
    expect(preview).toBeGreaterThan(list);
    expect(detail).toBeGreaterThan(list);
  });

  it('gates every route on any of the three rights', () => {
    const content = config();
    expect(content.match(/permissions: FA_GRPO_ACCESS/g)?.length).toBe(4); // 3 routes + nav
  });

  it('lazy-loads the pages with the retry-aware lazy', () => {
    const content = config();
    expect(content).toContain("import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload'");
    expect(content).toContain("lazy(() => import('./pages/FAGRPOPage'))");
    expect(content).toContain("lazy(() => import('./pages/FAGRPOPreviewPage'))");
    expect(content).toContain("lazy(() => import('./pages/FAGRPOHistoryDetailPage'))");
  });

  it('exports the module config the registry imports', () => {
    expect(config()).toContain('export const fixedAssetGrpoModuleConfig: ModuleConfig');
  });
});

describe('sidebar', () => {
  it('hangs a "Fixed Asset GRPO" item under Accounts, which the fixed_asset_grpo prefix opens', () => {
    const content = config();
    expect(content).toContain('export const FA_GRPO_NAV_ITEMS: ModuleNavItem[]');
    expect(content).toContain("title: 'Fixed Asset GRPO'");
    expect(content).toContain('navigation: []');
    const accounts = readSource('src/modules/accounts/module.config.tsx');
    expect(accounts).toContain('...FA_GRPO_NAV_ITEMS');
    expect(accounts).toContain('FA_GRPO_MODULE_PREFIX');
    expect(FA_GRPO_MODULE_PREFIX).toBe('fixed_asset_grpo');
  });
});

describe('permissions', () => {
  it('match the backend codenames (fixed_asset_grpo/constants.py)', () => {
    expect(FA_GRPO_PERMISSIONS).toEqual({
      VIEW: 'fixed_asset_grpo.can_view_fixed_asset_grpo',
      POST: 'fixed_asset_grpo.can_post_fixed_asset_grpo',
      LINK: 'fixed_asset_grpo.can_link_fixed_asset_po',
    });
  });

  it('let any right see, the link or post right link, and only the post right post', () => {
    expect([...FA_GRPO_ACCESS].sort()).toEqual(Object.values(FA_GRPO_PERMISSIONS).sort());
    expect([...FA_GRPO_LINK_ACCESS].sort()).toEqual(
      [FA_GRPO_PERMISSIONS.LINK, FA_GRPO_PERMISSIONS.POST].sort(),
    );
    expect([...FA_GRPO_POST_ACCESS]).toEqual([FA_GRPO_PERMISSIONS.POST]);
  });
});

describe('separate mode', () => {
  it('keeps endpoint paths in the module, not in the shared constants', () => {
    const api = readSource('src/modules/fixed-asset-grpo/api/faGrpo.api.ts');
    expect(api).toContain("from '../constants/api'");
    expect(api).not.toContain('API_ENDPOINTS');
  });
});
