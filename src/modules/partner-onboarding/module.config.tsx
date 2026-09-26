/**
 * Partner Onboarding — customer and vendor registration, merged in from SAP
 * Portal (factory_app partner_onboarding).
 *
 * Two audiences:
 *
 * - **The public** — `/register/customer` and `/register/vendor` are open forms
 *   (no login), in the auth layout like `/login`: no sidebar, no permission
 *   gate, and the API behind them needs no token (decision D2).
 * - **Staff** — `/partners/approvals` is the queue (Customers / Vendors tabs),
 *   and each registration opens a detail page where it is verified, rejected or
 *   created in SAP. Gated on explicit rights, not a module prefix: a prefix
 *   short-circuits `permissions` in the sidebar, and customer and vendor
 *   onboarding go to different people. Each detail route takes its own kind's
 *   rights; the buttons on it follow what the server says the user may do.
 */
import { UserPlus } from 'lucide-react';

import {
  CUSTOMER_REGISTRATIONS_ACCESS,
  PARTNER_ONBOARDING_ACCESS,
  VENDOR_REGISTRATIONS_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const PublicCustomerRegistrationPage = lazy(() => import('./pages/PublicCustomerRegistrationPage'));
const PublicVendorRegistrationPage = lazy(() => import('./pages/PublicVendorRegistrationPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const CustomerRegistrationDetailPage = lazy(() => import('./pages/CustomerRegistrationDetailPage'));
const VendorRegistrationDetailPage = lazy(() => import('./pages/VendorRegistrationDetailPage'));

export const partnerOnboardingModuleConfig: ModuleConfig = {
  name: 'partner-onboarding',
  routes: [
    // Public forms: no login, no sidebar.
    {
      path: '/register/customer',
      element: <PublicCustomerRegistrationPage />,
      layout: 'auth',
      requiresAuth: false,
    },
    {
      path: '/register/vendor',
      element: <PublicVendorRegistrationPage />,
      layout: 'auth',
      requiresAuth: false,
    },
    // The approvals queue and its detail pages.
    {
      path: '/partners/approvals',
      element: <ApprovalsPage />,
      layout: 'main',
      permissions: PARTNER_ONBOARDING_ACCESS,
      breadcrumb: { label: 'Partner Onboarding' },
    },
    {
      path: '/partners/approvals/customers/:id',
      element: <CustomerRegistrationDetailPage />,
      layout: 'main',
      permissions: CUSTOMER_REGISTRATIONS_ACCESS,
      breadcrumb: { label: 'Customer' },
    },
    {
      path: '/partners/approvals/vendors/:id',
      element: <VendorRegistrationDetailPage />,
      layout: 'main',
      permissions: VENDOR_REGISTRATIONS_ACCESS,
      breadcrumb: { label: 'Vendor' },
    },
  ],
  navigation: [
    {
      path: '/partners/approvals',
      title: 'Partner Onboarding',
      icon: UserPlus,
      showInSidebar: true,
      permissions: PARTNER_ONBOARDING_ACCESS,
    },
  ],
};
