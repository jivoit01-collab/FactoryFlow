// Loaded the way the app loads it: the store first (AuthInitializer reads it),
// which loads the module registry and every module in it. See the getter in
// ../module.config for why the order matters.
import '@/core/store';

import { describe, expect, it } from 'vitest';

import { getAllNavigation, moduleRegistry } from '@/app/registry';
import {
  BOM_CHANGES_ACCESS,
  PARTNER_ONBOARDING_ACCESS,
  SAP_APPROVALS_ACCESS,
  SAP_DOCUMENTS_ACCESS,
  SAP_FINANCE_ACCESS,
} from '@/config/permissions';
import { bomChangesModuleConfig } from '@/modules/bom-changes/module.config';
import { partnerOnboardingModuleConfig } from '@/modules/partner-onboarding/module.config';
import { sapApprovalsModuleConfig } from '@/modules/sap-approvals/module.config';
import { sapDocumentsModuleConfig } from '@/modules/sap-documents/module.config';
import { sapFinanceModuleConfig } from '@/modules/sap-finance/module.config';

import { SAP_PORTAL_ACCESS, sapPortalModuleConfig } from '../module.config';

const MERGED = [
  sapDocumentsModuleConfig,
  sapApprovalsModuleConfig,
  sapFinanceModuleConfig,
  bomChangesModuleConfig,
  partnerOnboardingModuleConfig,
];

describe('SAP Portal menu', () => {
  // Read the way the sidebar reads it: after every module has loaded.
  const entry = () => (sapPortalModuleConfig.navigation ?? [])[0];

  it('is registered, and the sidebar gets it', () => {
    expect(moduleRegistry).toContain(sapPortalModuleConfig);
    expect(getAllNavigation().filter((item) => item.title === 'SAP Portal')).toHaveLength(1);
    // ...and none of the five old entries.
    for (const title of ['SAP Finance', 'SAP Documents', 'SAP Approvals', 'BOM Changes']) {
      expect(getAllNavigation().some((item) => item.title === title)).toBe(false);
    }
  });

  it('is one sidebar entry holding every SAP Portal screen', () => {
    expect(sapPortalModuleConfig.navigation).toHaveLength(1);
    expect(entry().title).toBe('SAP Portal');
    expect(entry().hasSubmenu).toBe(true);
    expect(entry().children?.map((child) => [child.title, child.path])).toEqual([
      ['Documents', '/sap-documents'],
      ['Approvals', '/sap-approvals'],
      ['Journal Entries', '/sap-finance/journal-entries'],
      ['General Ledger', '/sap-finance/general-ledger'],
      ['Chart of Accounts', '/sap-finance/chart-of-accounts'],
      ['Budgets', '/sap-finance/budgets'],
      ['BOMs', '/bom-changes/sap-boms'],
      ['BOM Change Requests', '/bom-changes/requests'],
      ['Partner Onboarding', '/partners/approvals'],
    ]);
  });

  it('shows to anyone who holds any one of the five modules’ rights', () => {
    expect(entry().permissions).toEqual(SAP_PORTAL_ACCESS);
    for (const access of [
      SAP_DOCUMENTS_ACCESS,
      SAP_APPROVALS_ACCESS,
      SAP_FINANCE_ACCESS,
      BOM_CHANGES_ACCESS,
      PARTNER_ONBOARDING_ACCESS,
    ]) {
      for (const permission of access) expect(SAP_PORTAL_ACCESS).toContain(permission);
    }
  });

  it('shows each screen only to its own audience', () => {
    for (const child of entry().children ?? []) {
      expect(child.permissions?.length).toBeGreaterThan(0);
    }
  });

  it('keeps the Approvals pending count', () => {
    expect(entry().children?.find((c) => c.path === '/sap-approvals')?.badge).toBeDefined();
  });

  it('points only at routes the merged modules still serve', () => {
    const routes = new Set(MERGED.flatMap((module) => module.routes.map((route) => route.path)));
    for (const child of entry().children ?? []) expect(routes.has(child.path)).toBe(true);
    expect(routes.has(entry().path)).toBe(true);
  });

  it('leaves the five modules no sidebar line of their own', () => {
    for (const module of MERGED) expect(module.navigation ?? []).toEqual([]);
  });
});
