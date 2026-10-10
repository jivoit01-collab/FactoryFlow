import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CASH_SAP_API } from '../constants/api';
import {
  CASH_SAP_ITEM_SEARCH_ACCESS,
  CASH_SAP_MODULE_PREFIX,
  CASH_SAP_PERMISSIONS,
  CASH_SAP_POST_ACCESS,
  CASH_SAP_READ_ACCESS,
  CASH_SAP_SETTINGS_ACCESS,
  CASH_SAP_VOUCHER_INFO_WRITE_ACCESS,
} from '../constants/permissions';

/**
 * The config is read as text, as `dashboard/__tests__/module.config.test.tsx`
 * does: importing it pulls lucide-react's whole icon graph into the test.
 */
const MODULE = join(process.cwd(), 'src', 'modules', 'cash-sap');
const read = (...parts: string[]) => readFileSync(join(MODULE, ...parts), 'utf-8');

describe('cash-sap module config', () => {
  const config = read('module.config.tsx');

  it('exports cashSapModuleConfig as a ModuleConfig named cash-sap', () => {
    expect(config).toContain('export const cashSapModuleConfig: ModuleConfig');
    expect(config).toMatch(/name:\s*'cash-sap'/);
  });

  it('registers the list, the settings and the bunch SAP page at the address the backend links to', () => {
    // cash_sap/titles.py: link_for(bunch_id) -> /accounts/bunches/<id>/sap
    expect(config).toContain("path: '/accounts/cash-sap'");
    expect(config).toContain("path: '/accounts/cash-sap-settings'");
    expect(config).toContain("path: '/accounts/bunches/:bunchId/sap'");
  });

  it('lazy-loads every page with the retrying loader', () => {
    expect(config).toContain("import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload'");
    for (const page of ['CashSapBunchesPage', 'BunchSapPage', 'CashSapSettingsPage']) {
      expect(config).toContain(`lazy(() => import('./pages/${page}'))`);
    }
  });

  it('gates every route on the read access and hangs its menu items under Accounts', () => {
    expect(config.match(/permissions: CASH_SAP_READ_ACCESS/g)).toHaveLength(3);
    expect(config).toContain('export const CASH_SAP_NAV_ITEMS: ModuleNavItem[]');
    expect(config).toContain("title: 'Bunches → SAP'");
    expect(config).toContain("title: 'Cash → SAP settings'");
    expect(config).toContain('navigation: []');
    const accounts = readFileSync(
      join(process.cwd(), 'src', 'modules', 'accounts', 'module.config.tsx'),
      'utf-8',
    );
    expect(accounts).toContain('...CASH_SAP_NAV_ITEMS');
    expect(accounts).toContain('CASH_SAP_MODULE_PREFIX');
  });

  it('uses module-local constants, not the shared config files it may not edit', () => {
    expect(config).not.toContain('@/config/permissions');
    const api = read('api', 'cashSap.api.ts');
    expect(api).not.toContain('API_ENDPOINTS');
    expect(api).toContain("from '../constants/api'");
  });
});

describe('cash-sap permissions', () => {
  it('names the two cash_sap codenames the backend defines', () => {
    expect(CASH_SAP_PERMISSIONS).toEqual({
      POST: 'cash_sap.can_post_cash_to_sap',
      SETTINGS: 'cash_sap.can_manage_cash_sap_settings',
    });
    expect(CASH_SAP_MODULE_PREFIX).toBe('cash_sap');
    expect(CASH_SAP_POST_ACCESS).toEqual(['cash_sap.can_post_cash_to_sap']);
    expect(CASH_SAP_SETTINGS_ACCESS).toEqual(['cash_sap.can_manage_cash_sap_settings']);
  });

  it('reads for any cash book right or either cash_sap right (CASH_READ)', () => {
    expect([...CASH_SAP_READ_ACCESS].sort()).toEqual(
      [
        'cash_book.can_view_cash_book',
        'cash_book.can_manage_cash_book',
        'cash_book.can_approve_cash_entries',
        'cash_book.can_manage_cash_branches',
        'cash_sap.can_post_cash_to_sap',
        'cash_sap.can_manage_cash_sap_settings',
      ].sort(),
    );
  });

  it('lets the custodian or the poster write bill facts, and either cash_sap right search items', () => {
    expect(CASH_SAP_VOUCHER_INFO_WRITE_ACCESS).toEqual([
      'cash_book.can_manage_cash_book',
      'cash_sap.can_post_cash_to_sap',
    ]);
    expect(CASH_SAP_ITEM_SEARCH_ACCESS).toEqual([
      'cash_sap.can_post_cash_to_sap',
      'cash_sap.can_manage_cash_sap_settings',
    ]);
  });
});

describe('cash-sap endpoints', () => {
  it('match cash_sap/urls.py', () => {
    expect(CASH_SAP_API.OPTIONS).toBe('/cash-sap/options/');
    expect(CASH_SAP_API.BUNCH_STATUSES).toBe('/cash-sap/bunches/');
    expect(CASH_SAP_API.BUNCH_PLAN(5)).toBe('/cash-sap/bunches/5/');
    expect(CASH_SAP_API.BUNCH_POST(5)).toBe('/cash-sap/bunches/5/post/');
    expect(CASH_SAP_API.BUNCH_SEND_NEXT(5)).toBe('/cash-sap/bunches/5/send-next/');
    expect(CASH_SAP_API.BUNCH_STOP(5)).toBe('/cash-sap/bunches/5/stop/');
    expect(CASH_SAP_API.BUNCH_RECHECK(5)).toBe('/cash-sap/bunches/5/recheck/');
    expect(CASH_SAP_API.BUNCH_ACCEPT_CHANGES(5)).toBe('/cash-sap/bunches/5/accept-changes/');
    expect(CASH_SAP_API.BATCH_CLOSE_PO(5, 2)).toBe('/cash-sap/bunches/5/batches/2/close-po/');
    expect(CASH_SAP_API.VOUCHER_OVERRIDE(5, 9)).toBe('/cash-sap/bunches/5/vouchers/9/');
    expect(CASH_SAP_API.VOUCHER_LEAVE_OUT(5, 9)).toBe('/cash-sap/bunches/5/vouchers/9/leave-out/');
    expect(CASH_SAP_API.GRPO_REDATE(5, 3)).toBe('/cash-sap/bunches/5/grpos/3/');
    expect(CASH_SAP_API.VOUCHER_INFO(9)).toBe('/cash-sap/vouchers/9/info/');
    expect(CASH_SAP_API.VOUCHER_BILLS(9)).toBe('/cash-sap/vouchers/9/bills/');
    expect(CASH_SAP_API.BILL_DETAIL(4)).toBe('/cash-sap/bills/4/');
    expect(CASH_SAP_API.ROUTING).toBe('/cash-sap/routing/');
    expect(CASH_SAP_API.ROUTING_DETAIL(1)).toBe('/cash-sap/routing/1/');
    expect(CASH_SAP_API.GL_MAP).toBe('/cash-sap/gl-map/');
    expect(CASH_SAP_API.GL_MAP_DETAIL(8)).toBe('/cash-sap/gl-map/8/');
    expect(CASH_SAP_API.ITEMS).toBe('/cash-sap/items/');
  });
});

describe('cash-sap pages', () => {
  it('the bunch page loops send-next through the shared loop and polls through the plan hook', () => {
    const page = read('pages', 'BunchSapPage.tsx');
    expect(page).toContain('runSendLoop(');
    expect(page).toContain('confirmSapPost(');
    expect(page).toContain('useBunchSapPlan(');
    expect(page).toContain('BUNCH_CHANGED');
    const queries = read('api', 'cashSap.queries.ts');
    expect(queries).toContain('refetchInterval');
    expect(queries).toContain('PLAN_POLL_MS');
  });

  it('never takes today from the UTC date', () => {
    for (const file of [
      ['utils', 'voucherDates.ts'],
      ['components', 'VoucherSapDialog.tsx'],
      ['components', 'GrpoRedateDialog.tsx'],
    ]) {
      const source = read(...file);
      expect(source).not.toMatch(/toISOString\(\)\.slice\(0,\s*10\)/);
      expect(source).not.toMatch(/toISOString\(\)\.split\('T'\)/);
    }
  });
});
