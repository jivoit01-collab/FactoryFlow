import { QC_PERMISSIONS } from '@/config/permissions';

import type { QCSectionTab } from '../components/QCSectionTabs';

/*
 * The QC sidebar has one item per area; an area of several pages gets a tab bar
 * across them. The permissions here are the ones each page's route is gated on
 * in module.config.tsx.
 */

export const LINE_CLEARANCE_QC_PERMISSIONS = [
  QC_PERMISSIONS.LINE_CLEARANCE_QC.VIEW,
  QC_PERMISSIONS.LINE_CLEARANCE_QC.APPROVE,
] as const;

export const QA_PROCEDURES_PERMISSIONS = [
  QC_PERMISSIONS.DOCUMENT_FILE.VIEW,
  QC_PERMISSIONS.DOCUMENT_FILE.MANAGE,
] as const;

export const APPROVAL_PERMISSIONS = [
  QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST,
  QC_PERMISSIONS.APPROVAL.APPROVE_AS_QAM,
] as const;

export const ARRIVAL_SLIP_TABS = [
  {
    path: '/qc/arrival-slips',
    label: 'Inspections',
    permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
  },
  {
    path: '/qc/arrival-slips/approvals',
    label: 'Approvals',
    permissions: APPROVAL_PERMISSIONS,
  },
  {
    path: '/qc/arrival-slips/decision-changed',
    label: 'Decision Changes',
    permissions: [QC_PERMISSIONS.INSPECTION.VIEW],
  },
  // The arrival-slip masters, kept beside the inspections they drive.
  {
    path: '/qc/arrival-slips/material-types',
    label: 'Material Types',
    permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_MATERIAL_TYPES],
  },
  {
    path: '/qc/arrival-slips/parameters',
    label: 'QC Parameters',
    permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS],
  },
] as const satisfies readonly QCSectionTab[];

export const MASTER_TABS = [
  {
    path: '/qc/master/print-documents',
    label: 'Print Documents',
    permissions: [QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS],
  },
] as const satisfies readonly QCSectionTab[];

/** Every arrival-slip master permission, wherever its page now sits. */
export const MASTER_PERMISSIONS = [
  QC_PERMISSIONS.MASTER_DATA.MANAGE_MATERIAL_TYPES,
  QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS,
] as const;

/** Master Data: the print documents, every printed form's document number. */
export const PRINT_DOCUMENT_PERMISSIONS = [
  QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS,
] as const;

/** Whoever fills, approves or only reads QA report entries sees the list. */
export const PRODUCTION_QC_ENTRY_PERMISSIONS = [
  QC_PERMISSIONS.PRODUCTION_QC.VIEW,
  QC_PERMISSIONS.PRODUCTION_QC.FILL,
  QC_PERMISSIONS.PRODUCTION_QC.APPROVE,
] as const;

export const PRODUCTION_QC_TABS = [
  {
    path: '/qc/qa-reports',
    label: 'Entries',
    permissions: PRODUCTION_QC_ENTRY_PERMISSIONS,
  },
  {
    path: '/qc/qa-reports/types',
    label: 'Report Types',
    permissions: [QC_PERMISSIONS.PRODUCTION_QC.MANAGE_PARAMETERS],
  },
] as const satisfies readonly QCSectionTab[];

/**
 * Where `/qc` lands: the first page, in sidebar order, the user may open. The
 * audit log comes last — it has no sidebar item, and only someone holding just
 * the audit permission ends up there.
 */
export const QC_HOME_CANDIDATES = [
  ...ARRIVAL_SLIP_TABS,
  { path: '/qc/qa-reports', permissions: PRODUCTION_QC_ENTRY_PERMISSIONS },
  { path: '/qc/line-clearance', permissions: LINE_CLEARANCE_QC_PERMISSIONS },
  { path: '/qc/qa-procedures', permissions: QA_PROCEDURES_PERMISSIONS },
  // The reports' own master, ahead of the arrival-slip ones.
  {
    path: '/qc/qa-reports/types',
    permissions: [QC_PERMISSIONS.PRODUCTION_QC.MANAGE_PARAMETERS],
  },
  ...MASTER_TABS,
  { path: '/qc/qa-procedures/log', permissions: [QC_PERMISSIONS.DOCUMENT_FILE.VIEW_AUDIT] },
] as const;

/**
 * The first tab the user may open, or null when there is none. Also what a
 * section's bare path (`/qc`, `/qc/master`) redirects to.
 */
export function firstAllowedPath(
  tabs: readonly Pick<QCSectionTab, 'path' | 'permissions'>[],
  hasAnyPermission: (permissions: readonly string[]) => boolean,
): string | null {
  return tabs.find((tab) => hasAnyPermission(tab.permissions))?.path ?? null;
}
