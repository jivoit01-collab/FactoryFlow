import { describe, expect, it } from 'vitest';

import {
  CUSTOMER_REGISTRATIONS_ACCESS,
  PARTNER_ONBOARDING_ACCESS,
  PARTNER_ONBOARDING_PERMISSIONS,
  VENDOR_REGISTRATIONS_ACCESS,
} from '@/config/permissions';

import { PARTNER_ONBOARDING_NAV_ITEMS, partnerOnboardingModuleConfig } from '../module.config';

const route = (path: string) => partnerOnboardingModuleConfig.routes.find((r) => r.path === path);

describe('partner-onboarding module config', () => {
  it('registers the two public forms, the queue and the two detail pages', () => {
    expect(partnerOnboardingModuleConfig.routes.map((r) => r.path)).toEqual([
      '/register/customer',
      '/register/vendor',
      '/partners/approvals',
      '/partners/approvals/customers/:id',
      '/partners/approvals/vendors/:id',
    ]);
  });

  it('leaves the public forms outside login and permissions', () => {
    for (const path of ['/register/customer', '/register/vendor']) {
      const publicRoute = route(path);
      // The auth layout is rendered outside ProtectedRoute (AppRoutes.tsx).
      expect(publicRoute?.layout).toBe('auth');
      expect(publicRoute?.requiresAuth).toBe(false);
      expect(publicRoute?.permissions).toBeUndefined();
      expect(publicRoute?.companies).toBeUndefined();
    }
  });

  it('gates the staff pages on explicit rights, each detail page on its own kind', () => {
    expect(route('/partners/approvals')?.permissions).toEqual(PARTNER_ONBOARDING_ACCESS);
    expect(route('/partners/approvals/customers/:id')?.permissions).toEqual(
      CUSTOMER_REGISTRATIONS_ACCESS,
    );
    expect(route('/partners/approvals/vendors/:id')?.permissions).toEqual(
      VENDOR_REGISTRATIONS_ACCESS,
    );
    for (const staffRoute of partnerOnboardingModuleConfig.routes.filter(
      (r) => r.layout === 'main',
    )) {
      expect(staffRoute.permissions?.length).toBeGreaterThan(0);
    }
  });

  it('sits under SAP Portal, gated on the view rights and never by prefix', () => {
    expect(partnerOnboardingModuleConfig.navigation ?? []).toEqual([]);
    expect(PARTNER_ONBOARDING_NAV_ITEMS.map((item) => item.title)).toEqual(['Partner Onboarding']);
    for (const item of PARTNER_ONBOARDING_NAV_ITEMS) {
      expect(item.modulePrefix).toBeUndefined();
      expect(item.permissions).toEqual(PARTNER_ONBOARDING_ACCESS);
      expect(item.path.startsWith('/register')).toBe(false);
    }
  });

  it('opens the queue to any right of either kind, and names only partner_onboarding rights', () => {
    expect(new Set(PARTNER_ONBOARDING_ACCESS)).toEqual(
      new Set(Object.values(PARTNER_ONBOARDING_PERMISSIONS)),
    );
    expect(CUSTOMER_REGISTRATIONS_ACCESS.every((p) => p.includes('_customer_'))).toBe(true);
    expect(VENDOR_REGISTRATIONS_ACCESS.every((p) => p.includes('_vendor_'))).toBe(true);
    for (const value of Object.values(PARTNER_ONBOARDING_PERMISSIONS)) {
      expect(value.startsWith('partner_onboarding.')).toBe(true);
    }
  });
});
