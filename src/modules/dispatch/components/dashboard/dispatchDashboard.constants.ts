import {
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Link2,
  type LucideIcon,
  PackageCheck,
  Printer,
  ReceiptText,
  Truck,
} from 'lucide-react';

import { DISPATCH_PERMISSIONS, GATE_PERMISSIONS, GRPO_PERMISSIONS } from '@/config/permissions';
import type { PipelineStage } from '@/modules/dashboards/dispatch-pipeline/types';
import type { AccentKey } from '@/shared/components/dashboard';

// -------------------------------------------------------------------------- //
// Pipeline flow — the animated Vehicle-Link → Docking → Dispatched journey.
// Each node aggregates one or more raw pipeline stages into a friendly step.
// -------------------------------------------------------------------------- //
export interface PipelineNode {
  key: string;
  label: string;
  icon: LucideIcon;
  accent: AccentKey;
  /** raw pipeline stages whose counts roll up into this node */
  stages: PipelineStage[];
}

export const PIPELINE_NODES: readonly PipelineNode[] = [
  { key: 'booked', label: 'Booked', icon: CalendarDays, accent: 'blue', stages: ['BOOKED'] },
  { key: 'vehicle-in', label: 'Vehicle In', icon: Link2, accent: 'cyan', stages: ['EMPTY_IN'] },
  {
    key: 'ready',
    label: 'Ready to Dock',
    icon: Boxes,
    accent: 'indigo',
    stages: ['READY_TO_DOCK'],
  },
  {
    key: 'docked',
    label: 'Docked',
    icon: Truck,
    accent: 'violet',
    stages: ['DOCKED', 'PHOTO_ATTACHED'],
  },
  {
    key: 'gatepass',
    label: 'Gatepass',
    icon: Printer,
    accent: 'amber',
    stages: ['READY_FOR_GATEPASS', 'GATEPASS_PRINTED', 'PRINT_COMMITTED'],
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    icon: CheckCircle2,
    accent: 'emerald',
    stages: ['DISPATCHED'],
  },
] as const;

// -------------------------------------------------------------------------- //
// Module sections — shown at the bottom as small light nav cards.
// -------------------------------------------------------------------------- //
export interface DispatchSection {
  title: string;
  description: string;
  route: string;
  icon: LucideIcon;
  accent: AccentKey;
  permissions: readonly string[];
}

const serviceGRPOPermissions = [
  DISPATCH_PERMISSIONS.POST_BILTY_GRPO,
  GRPO_PERMISSIONS.VIEW_PENDING,
  GRPO_PERMISSIONS.PREVIEW,
  GRPO_PERMISSIONS.POST,
  GRPO_PERMISSIONS.VIEW_HISTORY,
  GRPO_PERMISSIONS.VIEW_POSTING,
] as const;

export const DISPATCH_SECTIONS: readonly DispatchSection[] = [
  {
    title: 'Plans',
    description: 'SAP dispatch bills, handoff dates & booking status',
    route: '/dispatch/plans',
    icon: CalendarDays,
    accent: 'blue',
    permissions: [DISPATCH_PERMISSIONS.VIEW_PLANS],
  },
  {
    title: 'Bills Linking',
    description: 'Pick bills and link transport to them, bill by bill',
    route: '/dispatch/bills-linking',
    icon: Link2,
    accent: 'cyan',
    permissions: [DISPATCH_PERMISSIONS.LINK_VEHICLE],
  },
  {
    title: 'Vehicle Linking',
    description: 'One card per truck — link vehicles, fix bills booked or inside',
    route: '/dispatch/vehicle-linking',
    icon: Truck,
    accent: 'sky',
    permissions: [
      DISPATCH_PERMISSIONS.LINK_VEHICLE,
      DISPATCH_PERMISSIONS.INSIDE_VEHICLE_VIEW,
    ],
  },
  {
    title: 'Docking',
    description: 'Entries, box scanning, documents & gatepass',
    route: '/dispatch/docking',
    icon: Truck,
    accent: 'violet',
    permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
  },
  {
    title: 'Reprint Gatepass',
    description: 'Search & reissue audited gatepass copies',
    route: '/dispatch/docking/reprint',
    icon: Printer,
    accent: 'pink',
    permissions: [GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS],
  },
  {
    title: 'Service GRPO',
    description: 'Post bilty service GRPOs & pending entries',
    route: '/dispatch/bilty-grpo',
    icon: PackageCheck,
    accent: 'emerald',
    permissions: serviceGRPOPermissions,
  },
  {
    title: 'Open Bilties',
    description: 'Track open bilties before invoice posting',
    route: '/dispatch/open-bilties',
    icon: ClipboardList,
    accent: 'amber',
    permissions: [DISPATCH_PERMISSIONS.VIEW_OPEN_BILTIES],
  },
  {
    title: 'A/P Invoice',
    description: 'Transporter A/P invoices for completed work',
    route: '/dispatch/transporter-invoices',
    icon: ReceiptText,
    accent: 'rose',
    permissions: [DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE],
  },
] as const;
