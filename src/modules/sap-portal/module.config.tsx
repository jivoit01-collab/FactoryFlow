/**
 * SAP Portal — one sidebar entry for the screens that came over from SAP
 * Portal: SAP's documents and approvals, its books, its bills of materials and
 * partner onboarding.
 *
 * Only the menu is merged. Each screen stays in its own module with its own
 * routes and rights, so every address still works and each item still shows
 * only to the people it did before; the entry itself shows to anyone who holds
 * any one of them.
 */
import { Landmark } from 'lucide-react';

import {
  BOM_CHANGES_ACCESS,
  PARTNER_ONBOARDING_ACCESS,
  SAP_APPROVALS_ACCESS,
  SAP_DOCUMENTS_ACCESS,
  SAP_FINANCE_ACCESS,
  SAP_REJECTION_HISTORY_ACCESS,
} from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';
import { BOM_CHANGES_NAV_ITEMS } from '@/modules/bom-changes/module.config';
import { PARTNER_ONBOARDING_NAV_ITEMS } from '@/modules/partner-onboarding/module.config';
import { SAP_APPROVALS_NAV_ITEMS } from '@/modules/sap-approvals/module.config';
import { SAP_DOCUMENTS_NAV_ITEMS } from '@/modules/sap-documents/module.config';
import { SAP_FINANCE_NAV_ITEMS } from '@/modules/sap-finance/module.config';

/** Anyone who can open any SAP Portal screen sees the entry. */
export const SAP_PORTAL_ACCESS: readonly string[] = [
  ...new Set([
    ...SAP_DOCUMENTS_ACCESS,
    ...SAP_APPROVALS_ACCESS,
    ...SAP_REJECTION_HISTORY_ACCESS,
    ...SAP_FINANCE_ACCESS,
    ...BOM_CHANGES_ACCESS,
    ...PARTNER_ONBOARDING_ACCESS,
  ]),
];

export const sapPortalModuleConfig: ModuleConfig = {
  name: 'sap-portal',
  routes: [],
  // A getter, read when the sidebar is built, not when this file loads. The
  // modules it gathers from sit in an import loop with the store (Approvals'
  // badge reads it, and the store reads the module registry), so reading their
  // items at load time would, in some load orders, find them not yet defined.
  get navigation() {
    return [
      {
        path: '/sap-documents',
        title: 'SAP Portal',
        icon: Landmark,
        showInSidebar: true,
        hasSubmenu: true,
        permissions: SAP_PORTAL_ACCESS,
        children: [
          ...SAP_DOCUMENTS_NAV_ITEMS,
          ...SAP_APPROVALS_NAV_ITEMS,
          ...SAP_FINANCE_NAV_ITEMS,
          ...BOM_CHANGES_NAV_ITEMS,
          ...PARTNER_ONBOARDING_NAV_ITEMS,
        ],
      },
    ];
  },
};
