import { describe, expect, it } from 'vitest';

import {
  SAP_FINANCE_BUDGETS_ACCESS,
  SAP_FINANCE_LEDGERS_ACCESS,
  SAP_FINANCE_PERMISSIONS,
} from '@/config/permissions';
import {
  SAP_FINANCE_ACCESS,
  SAP_FINANCE_CUSTOMER_AGING_ACCESS,
  SAP_FINANCE_CUSTOMER_OUTSTANDING_ACCESS,
  SAP_FINANCE_OPEN_AP_ACCESS,
  SAP_FINANCE_OPEN_AR_ACCESS,
  SAP_FINANCE_OPEN_GRPOS_ACCESS,
  SAP_FINANCE_OUTSTANDING_PERMISSION,
  SAP_FINANCE_PARTY_OUTSTANDING_ACCESS,
  SAP_FINANCE_VENDOR_OUTSTANDING_ACCESS,
} from '@/config/permissions/sap-finance.permissions';

import { SAP_FINANCE_NAV_ITEMS, sapFinanceModuleConfig } from '../module.config';

/** Each page and the rights that open it. */
const ACCESS: Record<string, readonly string[]> = {
  '/sap-finance/journal-entries': SAP_FINANCE_LEDGERS_ACCESS,
  '/sap-finance/general-ledger': SAP_FINANCE_LEDGERS_ACCESS,
  '/sap-finance/chart-of-accounts': SAP_FINANCE_LEDGERS_ACCESS,
  '/sap-finance/budgets': SAP_FINANCE_BUDGETS_ACCESS,
  '/sap-finance/outstanding': SAP_FINANCE_PARTY_OUTSTANDING_ACCESS,
  '/sap-finance/open-ap': SAP_FINANCE_OPEN_AP_ACCESS,
  '/sap-finance/open-ar': SAP_FINANCE_OPEN_AR_ACCESS,
  '/sap-finance/open-grpos': SAP_FINANCE_OPEN_GRPOS_ACCESS,
  '/sap-finance/customer-aging': SAP_FINANCE_CUSTOMER_AGING_ACCESS,
};

describe('sap-finance module config', () => {
  it('registers its pages', () => {
    expect(sapFinanceModuleConfig.routes.map((route) => route.path)).toEqual(Object.keys(ACCESS));
  });

  it('gates each page on its own rights', () => {
    for (const route of sapFinanceModuleConfig.routes) {
      expect(route.permissions).toEqual(ACCESS[route.path]);
    }
  });

  it('opens each outstanding report to the right to them all and to its EXIM rights', () => {
    const reports = {
      vendors: [
        SAP_FINANCE_VENDOR_OUTSTANDING_ACCESS,
        ['exim.view_vendor_outstanding', 'exim.sync_balance_sheet'],
      ],
      customers: [
        SAP_FINANCE_CUSTOMER_OUTSTANDING_ACCESS,
        ['exim.view_customer_outstanding', 'exim.view_customer_balance_sheet'],
      ],
      openAp: [SAP_FINANCE_OPEN_AP_ACCESS, ['exim.view_open_aps']],
      openAr: [SAP_FINANCE_OPEN_AR_ACCESS, ['exim.view_open_ars']],
      grpos: [SAP_FINANCE_OPEN_GRPOS_ACCESS, ['exim.sync_open_grpos']],
      aging: [SAP_FINANCE_CUSTOMER_AGING_ACCESS, ['exim.view_customer_aging']],
    } as const;
    expect(SAP_FINANCE_OUTSTANDING_PERMISSION).toBe('sap_finance.can_view_sap_outstanding');
    for (const [access, exim] of Object.values(reports)) {
      expect([...access]).toEqual([SAP_FINANCE_OUTSTANDING_PERMISSION, ...exim]);
      // Whoever may open a report sees SAP Portal in the sidebar.
      for (const right of access) expect(SAP_FINANCE_ACCESS).toContain(right);
    }
    // Party Outstanding opens to either side's rights; the page offers each side to its own.
    for (const right of [
      ...SAP_FINANCE_VENDOR_OUTSTANDING_ACCESS,
      ...SAP_FINANCE_CUSTOMER_OUTSTANDING_ACCESS,
    ]) {
      expect(SAP_FINANCE_PARTY_OUTSTANDING_ACCESS).toContain(right);
    }
  });

  it('has no sidebar entry of its own: its pages are under SAP Portal', () => {
    expect(sapFinanceModuleConfig.navigation ?? []).toEqual([]);
    // A child with no permissions is shown to everyone who sees the parent.
    for (const item of SAP_FINANCE_NAV_ITEMS) {
      expect(item.modulePrefix).toBeUndefined();
      expect(item.permissions?.length).toBeGreaterThan(0);
    }
  });

  it('shows each child only to the audience its page serves', () => {
    expect(SAP_FINANCE_NAV_ITEMS.map((child) => child.path)).toEqual(Object.keys(ACCESS));
    for (const child of SAP_FINANCE_NAV_ITEMS) {
      expect(child.permissions).toEqual(ACCESS[child.path]);
    }
  });

  it('names only sap_finance rights', () => {
    for (const value of Object.values(SAP_FINANCE_PERMISSIONS)) {
      expect(value.startsWith('sap_finance.')).toBe(true);
    }
  });
});
