import {
  Boxes,
  CalendarDays,
  ClipboardList,
  Link2,
  PackageCheck,
  Printer,
  ReceiptText,
  Truck,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { DISPATCH_PERMISSIONS, GATE_PERMISSIONS, GRPO_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

interface DispatchModuleCard {
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  color: string;
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

const dispatchModuleCards: DispatchModuleCard[] = [
  {
    title: 'Plans',
    description: 'Review SAP dispatch bills, planning handoff dates, loads, and booking status.',
    route: '/dispatch/plans',
    icon: <CalendarDays className="h-5 w-5" />,
    color: 'text-blue-600',
    permissions: [DISPATCH_PERMISSIONS.VIEW_PLANS],
  },
  {
    title: 'Vehicle Linking',
    description: 'Link vehicles to planned dispatch bills before gate and docking movement.',
    route: '/dispatch/vehicle-linking',
    icon: <Link2 className="h-5 w-5" />,
    color: 'text-cyan-700',
    permissions: [DISPATCH_PERMISSIONS.LINK_VEHICLE],
  },
  {
    title: 'Inside Vehicle Manager',
    description: 'Fix dispatch issues on vehicles already inside — add, remove, or move bills.',
    route: '/dispatch/inside-vehicles',
    icon: <Boxes className="h-5 w-5" />,
    color: 'text-indigo-700',
    permissions: [DISPATCH_PERMISSIONS.INSIDE_VEHICLE_VIEW],
  },
  {
    title: 'Docking',
    description: 'Manage docking entries, box scanning, documents, gatepass, and dispatch status.',
    route: '/dispatch/docking',
    icon: <Truck className="h-5 w-5" />,
    color: 'text-emerald-700',
    permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
  },
  {
    title: 'Reprint Gatepass',
    description: 'Search printed docking gatepasses and issue audited reprint copies.',
    route: '/dispatch/docking/reprint',
    icon: <Printer className="h-5 w-5" />,
    color: 'text-violet-700',
    permissions: [GATE_PERMISSIONS.SALES_DISPATCH.REPRINT_GATEPASS],
  },
  {
    title: 'Service GRPO',
    description: 'Post bilty service GRPOs and review pending transporter service entries.',
    route: '/dispatch/bilty-grpo',
    icon: <PackageCheck className="h-5 w-5" />,
    color: 'text-green-700',
    permissions: serviceGRPOPermissions,
  },
  {
    title: 'Open Bilties',
    description: 'Track open bilties before transporter invoice posting.',
    route: '/dispatch/open-bilties',
    icon: <ClipboardList className="h-5 w-5" />,
    color: 'text-amber-700',
    permissions: [DISPATCH_PERMISSIONS.VIEW_OPEN_BILTIES],
  },
  {
    title: 'A/P Invoice',
    description: 'Create and review transporter A/P invoices for completed dispatch work.',
    route: '/dispatch/transporter-invoices',
    icon: <ReceiptText className="h-5 w-5" />,
    color: 'text-rose-700',
    permissions: [DISPATCH_PERMISSIONS.POST_TRANSPORTER_AP_INVOICE],
  },
];

export default function DispatchDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const visibleCards = useMemo(
    () => dispatchModuleCards.filter((card) => hasAnyPermission([...card.permissions])),
    [hasAnyPermission],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dispatch</h2>
        <p className="text-muted-foreground">
          Plans, vehicle linking, docking, GRPO, bilties, and transporter invoices
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((card) => (
          <Card
            key={card.route}
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => navigate(card.route)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={card.color}>{card.icon}</div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-5 text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
