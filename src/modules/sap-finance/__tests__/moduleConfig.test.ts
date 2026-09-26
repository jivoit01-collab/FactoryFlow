import { describe, expect, it } from 'vitest';

import {
  SAP_FINANCE_ACCESS,
  SAP_FINANCE_BUDGETS_ACCESS,
  SAP_FINANCE_LEDGERS_ACCESS,
  SAP_FINANCE_PERMISSIONS,
} from '@/config/permissions';

import { sapFinanceModuleConfig } from '../module.config';

describe('sap-finance module config', () => {
  it('registers its four pages', () => {
    expect(sapFinanceModuleConfig.routes.map((route) => route.path)).toEqual([
      '/sap-finance/journal-entries',
      '/sap-finance/general-ledger',
      '/sap-finance/chart-of-accounts',
      '/sap-finance/budgets',
    ]);
  });

  it('gates the ledger pages on the ledger right and budgets on the budget rights', () => {
    for (const route of sapFinanceModuleConfig.routes) {
      const expected = route.path === '/sap-finance/budgets' ? SAP_FINANCE_BUDGETS_ACCESS : SAP_FINANCE_LEDGERS_ACCESS;
      expect(route.permissions).toEqual(expected);
    }
  });

  it('gates every sidebar entry, and never by prefix', () => {
    // A child with no permissions is shown to everyone who sees the parent.
    for (const item of sapFinanceModuleConfig.navigation ?? []) {
      expect(item.modulePrefix).toBeUndefined();
      expect(item.permissions).toEqual(SAP_FINANCE_ACCESS);
      for (const child of item.children ?? []) {
        expect(child.permissions?.length).toBeGreaterThan(0);
      }
    }
  });

  it('shows each child only to the audience its page serves', () => {
    const children = sapFinanceModuleConfig.navigation?.[0].children ?? [];
    const budget = children.find((child) => child.path === '/sap-finance/budgets');
    expect(budget?.permissions).toEqual(SAP_FINANCE_BUDGETS_ACCESS);
    for (const child of children.filter((c) => c !== budget)) {
      expect(child.permissions).toEqual(SAP_FINANCE_LEDGERS_ACCESS);
    }
  });

  it('names only sap_finance rights', () => {
    for (const value of Object.values(SAP_FINANCE_PERMISSIONS)) {
      expect(value.startsWith('sap_finance.')).toBe(true);
    }
  });
});
