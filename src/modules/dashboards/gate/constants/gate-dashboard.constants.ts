import {
  Boxes,
  Briefcase,
  Building2,
  Container,
  HardHat,
  type LucideIcon,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';

import { GATE_PERMISSIONS } from '@/config/permissions';
import type { AccentKey } from '@/shared/components/dashboard';

/** A from→to date range (YYYY-MM-DD) that drives the whole gate dashboard. */
export interface GateRange {
  from: string;
  to: string;
}

/** How often the gate dashboard polls for live updates (ms). */
export const GATE_REFRESH_MS = 30_000;

/** Today's local date as YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Broad view-gate for the Gate dashboard route/section. */
export const GATE_DASHBOARD_VIEW_PERMISSIONS = [
  GATE_PERMISSIONS.DASHBOARD.VIEW,
  GATE_PERMISSIONS.GATE_ENTRY.VIEW,
  GATE_PERMISSIONS.PERSON_GATE_IN.VIEW,
  GATE_PERMISSIONS.SALES_DISPATCH.VIEW,
  GATE_PERMISSIONS.RAW_MATERIAL.VIEW,
] as const;

export interface GateActivity {
  title: string;
  description: string;
  route: string;
  icon: LucideIcon;
  accent: AccentKey;
  /** 'in' | 'out' | 'person' — drives the small direction tag */
  flow: 'in' | 'out' | 'person';
  permissions: readonly string[];
}

/**
 * Every gate activity as a light nav card. Grouped loosely by inbound (in),
 * outbound (out) and people (person) so the board reads as the whole gate.
 */
export const GATE_ACTIVITIES: readonly GateActivity[] = [
  {
    title: 'Empty Vehicle In',
    description: 'Record empty vehicles arriving at the gate',
    route: '/gate/empty-vehicle-in',
    icon: Truck,
    accent: 'emerald',
    flow: 'in',
    permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_IN.VIEW],
  },
  {
    title: 'Empty Vehicle Out',
    description: 'Mark inward vehicles out empty',
    route: '/gate/empty-vehicle-out',
    icon: Truck,
    accent: 'blue',
    flow: 'out',
    permissions: [GATE_PERMISSIONS.EMPTY_VEHICLE_OUT.VIEW],
  },
  {
    title: 'Sales Dispatch Out',
    description: 'Customer dispatch gate-out & gatepass',
    route: '/gate/sales-dispatch',
    icon: PackageCheck,
    accent: 'teal',
    flow: 'out',
    permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
  },
  {
    title: 'Raw Material In',
    description: 'PO receipts, arrival slips & weighment',
    route: '/gate/raw-materials',
    icon: Package,
    accent: 'amber',
    flow: 'in',
    permissions: [GATE_PERMISSIONS.RAW_MATERIAL.VIEW, GATE_PERMISSIONS.RAW_MATERIAL.VIEW_FULL],
  },
  {
    title: 'Daily Needs',
    description: 'Daily-need consumables gate entries',
    route: '/gate/daily-needs',
    icon: Boxes,
    accent: 'orange',
    flow: 'in',
    permissions: [GATE_PERMISSIONS.DAILY_NEEDS.VIEW, GATE_PERMISSIONS.DAILY_NEEDS.VIEW_FULL],
  },
  {
    title: 'Maintenance In',
    description: 'Maintenance material gate entries',
    route: '/gate/maintenance',
    icon: Wrench,
    accent: 'violet',
    flow: 'in',
    permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
  },
  {
    title: 'Construction',
    description: 'Construction material gate entries',
    route: '/gate/construction',
    icon: HardHat,
    accent: 'cyan',
    flow: 'in',
    permissions: [GATE_PERMISSIONS.CONSTRUCTION.VIEW, GATE_PERMISSIONS.CONSTRUCTION.VIEW_FULL],
  },
  {
    title: 'Fixed Assets',
    description: 'Fixed-asset movement gate entries',
    route: '/gate/fixed-assets',
    icon: Building2,
    accent: 'indigo',
    flow: 'in',
    permissions: [GATE_PERMISSIONS.FIXED_ASSET.VIEW],
  },
  {
    title: 'Rejected QC Return',
    description: 'QC-rejected material leaving the gate',
    route: '/gate/rejected-qc-return',
    icon: RotateCcw,
    accent: 'pink',
    flow: 'out',
    permissions: [GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW],
  },
  {
    title: 'Job Work',
    description: 'Job-work material out & back in',
    route: '/gate/job-work',
    icon: Briefcase,
    accent: 'sky',
    flow: 'out',
    permissions: [GATE_PERMISSIONS.JOB_WORK.VIEW],
  },
  {
    title: 'BST Out',
    description: 'Branch stock transfer gate-out',
    route: '/gate/bst-out',
    icon: Container,
    accent: 'slate',
    flow: 'out',
    permissions: [GATE_PERMISSIONS.BST_OUT.VIEW],
  },
  {
    title: 'Visitors & Persons',
    description: 'Visitors, contractors & labour entries',
    route: '/gate/visitor-labour',
    icon: Users,
    accent: 'emerald',
    flow: 'person',
    permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
  },
  {
    title: 'Labour In',
    description: 'Contractor labour headcount at the gate',
    route: '/gate/labour-in',
    icon: HardHat,
    accent: 'amber',
    flow: 'person',
    permissions: [GATE_PERMISSIONS.LABOUR_GATE.RECORD_IN, GATE_PERMISSIONS.LABOUR_GATE.VIEW],
  },
] as const;
