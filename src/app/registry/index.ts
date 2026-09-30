import type { Reducer } from '@reduxjs/toolkit';

import type { ModuleConfig, ModuleNavItem, ModuleRoute } from '@/core/types';
// Module configuration imports
// Each module exports its own routes, navigation, and reducers
import { accountsModuleConfig } from '@/modules/accounts/module.config';
import { adminModuleConfig } from '@/modules/admin/module.config';
import { artworkModuleConfig } from '@/modules/artwork/module.config';
import { authModuleConfig } from '@/modules/auth/module.config';
import { barcodeModuleConfig } from '@/modules/barcode/module.config';
import { bomChangesModuleConfig } from '@/modules/bom-changes/module.config';
import { constructionModuleConfig } from '@/modules/construction/module.config';
import { dashboardModuleConfig } from '@/modules/dashboard/module.config';
import { dashboardsModuleConfig } from '@/modules/dashboards/module.config';
import { dispatchModuleConfig } from '@/modules/dispatch/module.config';
import { employeesModuleConfig } from '@/modules/employees/module.config';
import { etpModuleConfig } from '@/modules/etp/module.config';
import { eximModuleConfig } from '@/modules/exim/module.config';
import { fireModuleConfig } from '@/modules/fire/module.config';
import { fleetModuleConfig } from '@/modules/fleet/module.config';
import { gateModuleConfig } from '@/modules/gate/module.config';
import { issuesModuleConfig } from '@/modules/issues/module.config';
import { maintenanceModuleConfig } from '@/modules/maintenance/module.config';
import { marketplaceModuleConfig } from '@/modules/marketplace/module.config';
import { notificationsModuleConfig } from '@/modules/notifications/module.config';
import { organizationModuleConfig } from '@/modules/organization/module.config';
import { partnerOnboardingModuleConfig } from '@/modules/partner-onboarding/module.config';
import { planningPurchaseModuleConfig } from '@/modules/planning-purchase/module.config';
import { productionModuleConfig } from '@/modules/production/module.config';
import { qcModuleConfig } from '@/modules/qc/module.config';
import { returnsModuleConfig } from '@/modules/returns/module.config';
import { sapApprovalsModuleConfig } from '@/modules/sap-approvals/module.config';
import { sapDocumentsModuleConfig } from '@/modules/sap-documents/module.config';
import { sapFinanceModuleConfig } from '@/modules/sap-finance/module.config';
import { sapPortalModuleConfig } from '@/modules/sap-portal/module.config';
import { sapReportsModuleConfig } from '@/modules/sap-reports/module.config';
import { settingsModuleConfig } from '@/modules/settings/module.config';
import { vehicleManagementModuleConfig } from '@/modules/vehicle-management/module.config';
import { warehouseModuleConfig } from '@/modules/warehouse/module.config';
import { wmsModuleConfig } from '@/modules/wms/module.config';

/**
 * Central registry of all feature modules
 * Each module exports its own configuration (routes, navigation, reducers)
 */
export const moduleRegistry: ModuleConfig[] = [
  authModuleConfig,
  adminModuleConfig,
  dashboardModuleConfig,
  dashboardsModuleConfig,
  dispatchModuleConfig,
  gateModuleConfig,
  returnsModuleConfig,
  vehicleManagementModuleConfig,
  // Sits beside Vehicle Management and is not the same thing: that module is
  // the gate's register of outside trucks, this one is the company's own
  // vehicles and what their fuel and service cost.
  fleetModuleConfig,
  qcModuleConfig,
  // Sits after QC: the artwork on a label is a controlled document, and QA
  // is who holds it. One page, gated on artwork.* alone.
  artworkModuleConfig,
  productionModuleConfig,
  // Sits next to Production: it reads the plan SAP holds and turns its bill of
  // materials into purchase orders.
  planningPurchaseModuleConfig,
  // Sits after Planning & Purchase: the licences and rates the oil is bought
  // and sold across the border under. EXIM's screens, moving in one by one.
  eximModuleConfig,
  maintenanceModuleConfig,
  // Sits after Maintenance: the campus's own building work, from the budget
  // and its approval through the daily record of what was done and what it
  // cost. What Maintenance looks after, this module built.
  constructionModuleConfig,
  fireModuleConfig,
  // Sits by Maintenance: the treatment plants' own registers.
  etpModuleConfig,
  warehouseModuleConfig,
  wmsModuleConfig,
  barcodeModuleConfig,
  marketplaceModuleConfig,
  sapReportsModuleConfig,
  notificationsModuleConfig,
  // The department ownership chart, the labour pages, and the Attendance and
  // Leave submodules. Routes only — their sidebar entries are the Organisation
  // module's, which opens on the chart. Attendance's permissions are still
  // separate from the directory's, so gate supervisors can see who turned up
  // without seeing the org tree.
  organizationModuleConfig,
  // Organisation: the ownership chart plus the people themselves — the
  // directory, the reporting tree and compensation, each with its own access
  // control.
  employeesModuleConfig,
  // The cash box and its approvals. Sits after the people modules: it is the
  // other thing the office keeps a book of, and it is nobody's shop-floor
  // screen.
  accountsModuleConfig,
  // One sidebar entry for everything that came over from SAP Portal. It holds
  // no routes of its own: the five modules below keep theirs, and hand it
  // their menu items instead of each taking a line of the sidebar.
  sapPortalModuleConfig,
  // SAP's books, merged in from SAP Portal: journal entries, ledgers, the chart
  // of accounts and budgets. Beside Accounts because it is the other set of
  // books; separate because it is SAP's, not the factory's cash box, and a
  // person often holds one without the other.
  sapFinanceModuleConfig,
  // Every SAP document — purchase and sales documents, transfers, journals,
  // payments and drafts — with its attachments, from SAP Portal's document
  // browser. Beside SAP Finance, the other SAP Portal screen: that one is the
  // books, this one the documents behind them, and each has its own audience.
  sapDocumentsModuleConfig,
  // SAP's approval requests of every document type, merged in from SAP Portal:
  // the ones waiting on the caller and the ones they raised. Beside SAP Finance
  // because both are SAP's own work surfaced here; separate from the warehouse
  // approval queues, which list one document family company-wide.
  sapApprovalsModuleConfig,
  // Changes to SAP's bills of materials, merged in from SAP Portal: a request,
  // level approvals, then the write to SAP, plus a viewer of the trees SAP
  // holds. After SAP Finance because it is the other SAP master data the
  // office keeps; its own group because its approvers are production and
  // costing people, not accountants.
  bomChangesModuleConfig,
  // Customer and vendor registration, from SAP Portal: the public forms and
  // the queue where registrations are verified and created in SAP. Beside SAP
  // Finance because it too came over from SAP Portal and writes to SAP; its
  // own entry because the people who onboard partners are not the ones who
  // read the ledgers.
  partnerOnboardingModuleConfig,
  // The software's own bug list. Last but one: it is about the app rather than
  // about the factory, so it sits with Settings at the bottom.
  issuesModuleConfig,
  settingsModuleConfig,
];

/**
 * Extract all routes from registered modules
 */
export function getAllRoutes(): ModuleRoute[] {
  return moduleRegistry.flatMap((m) => m.routes);
}

/**
 * Extract routes by layout type
 */
export function getRoutesByLayout(layout: 'auth' | 'main'): ModuleRoute[] {
  return getAllRoutes().filter((route) => {
    if (layout === 'auth') {
      return route.layout === 'auth';
    }
    // Default to main layout if not specified
    return route.layout !== 'auth';
  });
}

/**
 * Extract all navigation items from registered modules
 */
export function getAllNavigation(): ModuleNavItem[] {
  return moduleRegistry.flatMap((m) => m.navigation ?? []);
}

/**
 * Build a Set of all registered route paths (for breadcrumb navigability)
 * and a Map of path → breadcrumb label overrides
 */
export function getBreadcrumbMeta(): {
  navigablePaths: Set<string>;
  labels: Map<string, string>;
} {
  const navigablePaths = new Set<string>();
  const labels = new Map<string, string>();

  for (const route of getAllRoutes()) {
    // Skip auth routes and dynamic param routes for navigability
    if (route.layout === 'auth') continue;
    navigablePaths.add(route.path);

    if (route.breadcrumb?.label) {
      labels.set(route.path, route.breadcrumb.label);
      // e.g. '/gate/raw-materials' → 'raw-materials' → 'RM'
    }
  }

  return { navigablePaths, labels };
}

/**
 * Combine all module reducers into a single object for the root reducer
 */
export function getAllReducers(): Record<string, Reducer> {
  return moduleRegistry.reduce(
    (acc, m) => ({
      ...acc,
      ...m.reducer,
    }),
    {} as Record<string, Reducer>,
  );
}
