import {
  Activity,
  ArrowLeftRight,
  Boxes,
  Building2,
  ClipboardCheck,
  ClipboardList,
  CupSoda,
  DoorOpen,
  Factory,
  FileBarChart,
  GalleryHorizontalEnd,
  Gauge,
  IndianRupee,
  LayoutDashboard,
  LayoutGrid,
  MonitorPlay,
  Navigation,
  Package,
  PackageCheck,
  PackageX,
  ShieldCheck,
  Table2,
  Target,
  Truck,
  Undo2,
  Users,
  Wallet,
  Wind,
} from 'lucide-react';
import { useMemo } from 'react';

import {
  BLOWING_PERMISSIONS,
  DASHBOARDS_PERMISSIONS,
  DISPATCH_PERMISSIONS,
  GATE_PERMISSIONS,
  SAP_REPORTS_ACCESS,
} from '@/config/permissions';
import { useAuth, usePermission } from '@/core/auth';
import type { AccentKey } from '@/shared/components/dashboard/accents';
import { ModuleTile, ModuleTileGrid, ModuleTileGroupLabel } from '@/shared/components/navigation';

import { ACCOUNTS_BOARD_VIEW_PERMISSIONS } from '../accounts-board/constants';
import { ADMIN_BOARD_VIEW_PERMISSIONS } from '../admin-control/constants';
import { BOARD_LIST_VIEW_PERMISSIONS } from '../builder/constants';
import { BOARD_CAROUSEL_VIEW_PERMISSIONS } from '../carousel/constants';
import { CIVIL_BOARD_VIEW_PERMISSIONS } from '../civil-control/constants';
import { COMPANY_EXPENSE_VIEW_PERMISSIONS } from '../company-expense/constants';
import { CUSTOMER_RETURNS_VIEW_PERMISSIONS } from '../customer-returns/constants';
import {
  ELECTRICITY_BOARD_COMPANIES,
  ELECTRICITY_BOARD_VIEW_PERMISSIONS,
} from '../electricity/constants';
import { GATE_DASHBOARD_VIEW_PERMISSIONS } from '../gate/constants/gate-dashboard.constants';
import { HR_BOARD_VIEW_PERMISSIONS } from '../hr-board/constants';
import {
  LOGISTICS_CONTROL_VIEW_PERMISSIONS,
  logisticsControlScopeForCompany,
} from '../logistics-control/constants';
import { PLANT_BOARD_VIEW_PERMISSIONS } from '../plant-board/constants';
import { PRODUCTION_CONTROL_VIEW_PERMISSIONS } from '../production-control/constants';
import { WAREHOUSE_CONTROL_VIEW_PERMISSIONS } from '../warehouse-control/constants';

interface DashboardsModuleCard {
  title: string;
  icon: React.ReactNode;
  route: string;
  accent: AccentKey;
  permissions: readonly string[];
  /** Company units this board exists for. Omit for a board every unit has. */
  companies?: readonly string[];
}

// Kept in the same order as the Dashboards sidebar, and holding the same
// entries: a board that is reachable from the menu but missing here reads as
// one this login cannot open at all. `landingParity.test.ts` enforces it.
const dashboardsModules: DashboardsModuleCard[] = [
  {
    // Boards people compose themselves. Gated WIDER than the editor is: two
    // different people open this page, somebody who builds boards and
    // somebody a board was published to, and the second holds no build
    // right. See BOARD_LIST_VIEW_PERMISSIONS for why it is not simply
    // ungated -- the same list gates the route and the menu entry.
    title: 'My Dashboards',
    icon: <LayoutGrid className="h-5 w-5" />,
    route: '/dashboards/builder',
    accent: 'amber',
    permissions: BOARD_LIST_VIEW_PERMISSIONS,
  },
  {
    title: 'Board Carousel',
    icon: <GalleryHorizontalEnd className="h-5 w-5" />,
    route: '/dashboards/carousel',
    accent: 'blue',
    permissions: BOARD_CAROUSEL_VIEW_PERMISSIONS,
  },
  {
    title: 'Admin Control',
    icon: <ShieldCheck className="h-5 w-5" />,
    route: '/dashboards/admin-control',
    accent: 'rose',
    permissions: ADMIN_BOARD_VIEW_PERMISSIONS,
  },
  {
    title: 'Plant Control',
    icon: <MonitorPlay className="h-5 w-5" />,
    route: '/dashboards/plant-board',
    accent: 'cyan',
    permissions: PLANT_BOARD_VIEW_PERMISSIONS,
  },
  {
    title: 'Production Control',
    icon: <Gauge className="h-5 w-5" />,
    route: '/dashboards/production-control',
    accent: 'emerald',
    permissions: PRODUCTION_CONTROL_VIEW_PERMISSIONS,
  },
  {
    title: 'HR Control',
    icon: <Users className="h-5 w-5" />,
    route: '/dashboards/hr-board',
    accent: 'violet',
    permissions: HR_BOARD_VIEW_PERMISSIONS,
  },
  {
    title: 'Warehouse Control',
    icon: <LayoutDashboard className="h-5 w-5" />,
    route: '/dashboards/warehouse-control',
    accent: 'indigo',
    permissions: WAREHOUSE_CONTROL_VIEW_PERMISSIONS,
  },
  {
    // The dispatch office wall. One card, because it is one page: which plant
    // it reports on follows the company switcher, so the icon below is swapped
    // for a beverages viewer rather than a second card being listed that would
    // send an Oil user to an empty-looking Beverages board.
    title: 'Logistics Control',
    icon: <Truck className="h-5 w-5" />,
    route: '/dashboards/logistics-control',
    accent: 'violet',
    permissions: LOGISTICS_CONTROL_VIEW_PERMISSIONS,
  },
  {
    title: 'Gate',
    icon: <DoorOpen className="h-5 w-5" />,
    route: '/dashboards/gate',
    accent: 'blue',
    permissions: GATE_DASHBOARD_VIEW_PERMISSIONS,
  },
  {
    title: 'Production',
    icon: <Factory className="h-5 w-5" />,
    route: '/dashboards/production',
    accent: 'emerald',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
  },
  {
    // The same day's runs cut per line rather than per plant, so it shares the
    // production board's permission rather than having one of its own.
    title: 'Line Performance',
    icon: <Activity className="h-5 w-5" />,
    route: '/dashboards/production-lines',
    accent: 'emerald',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
  },
  {
    title: 'Blowing',
    icon: <Wind className="h-5 w-5" />,
    route: '/dashboards/blowing',
    accent: 'cyan',
    permissions: [BLOWING_PERMISSIONS.VIEW_REPORTS],
  },
  {
    // The campus supply is Oil and Beverages; Jivo Mart has no meter, so the
    // tile is withheld there rather than opening on an empty board.
    title: 'Electricity',
    icon: <Gauge className="h-5 w-5" />,
    route: '/dashboards/electricity',
    accent: 'amber',
    permissions: ELECTRICITY_BOARD_VIEW_PERMISSIONS,
    companies: ELECTRICITY_BOARD_COMPANIES,
  },
  {
    title: 'Stock Benchmark',
    icon: <Package className="h-5 w-5" />,
    route: '/dashboards/stock-levels',
    accent: 'teal',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
  },
  {
    title: 'Non-Moving RM & PM',
    icon: <PackageX className="h-5 w-5" />,
    route: '/dashboards/non-moving',
    accent: 'amber',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM],
  },
  {
    title: 'Sales Plan vs Req.',
    icon: <Target className="h-5 w-5" />,
    route: '/dashboards/sales-planning-requirement',
    accent: 'rose',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT],
  },
  {
    title: 'Packing Material',
    icon: <Boxes className="h-5 w-5" />,
    route: '/dashboards/packing-material',
    accent: 'blue',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_PACKING_MATERIAL],
  },
  {
    title: 'PM Requirement',
    icon: <ClipboardList className="h-5 w-5" />,
    route: '/dashboards/pm-requirement',
    accent: 'emerald',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_PACKING_MATERIAL],
  },
  {
    title: 'Production Movement',
    icon: <ArrowLeftRight className="h-5 w-5" />,
    route: '/dashboards/production-movement',
    accent: 'sky',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
  },
  {
    title: 'Dispatch',
    icon: <MonitorPlay className="h-5 w-5" />,
    route: '/dashboards/dispatch',
    accent: 'teal',
    permissions: [
      DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
      DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
      GATE_PERMISSIONS.SALES_DISPATCH.VIEW,
    ],
  },
  {
    title: 'Dispatch Pipeline',
    icon: <Truck className="h-5 w-5" />,
    route: '/dashboards/dispatch-pipeline',
    accent: 'emerald',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE],
  },
  {
    title: 'Dispatch Fulfilment',
    icon: <PackageCheck className="h-5 w-5" />,
    route: '/dashboards/dispatch-fulfilment',
    accent: 'violet',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS],
  },
  {
    title: 'Dispatch Tracking',
    icon: <Navigation className="h-5 w-5" />,
    route: '/dashboards/dispatch-tracking',
    accent: 'indigo',
    permissions: [DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW],
  },
  {
    // The cash box: what came in, what went out, what is in the drawer and who
    // is holding the rest. Gated on the register's own rights rather than a new
    // one -- this board IS the cash book summarised, so being allowed to read
    // that is being allowed to read this.
    title: 'Accounts',
    icon: <Wallet className="h-5 w-5" />,
    route: '/dashboards/accounts-board',
    accent: 'emerald',
    permissions: ACCOUNTS_BOARD_VIEW_PERMISSIONS,
  },
  {
    // Every ongoing building job on the campus -- area, sanction against spend,
    // work certified, programme. No civil feed behind it yet: the board draws a
    // worked example and says so on its own face.
    title: 'Civil Control',
    icon: <Building2 className="h-5 w-5" />,
    route: '/dashboards/civil-control',
    accent: 'teal',
    permissions: CIVIL_BOARD_VIEW_PERMISSIONS,
  },
  {
    title: 'Factory Expense',
    icon: <IndianRupee className="h-5 w-5" />,
    route: '/dashboards/factory-expense',
    accent: 'blue',
    permissions: [
      DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
      DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE,
    ],
  },
  {
    title: 'Company Expense',
    icon: <Table2 className="h-5 w-5" />,
    route: '/dashboards/company-expense',
    accent: 'amber',
    permissions: COMPANY_EXPENSE_VIEW_PERMISSIONS,
  },
  {
    title: 'Customer Returns',
    icon: <Undo2 className="h-5 w-5" />,
    route: '/dashboards/customer-returns',
    accent: 'teal',
    permissions: CUSTOMER_RETURNS_VIEW_PERMISSIONS,
  },
  {
    title: 'Budget Approvals',
    icon: <ClipboardCheck className="h-5 w-5" />,
    route: '/dashboards/budget-approvals',
    accent: 'violet',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_BUDGET_APPROVALS],
  },
  {
    // Routes for this one are owned by the sap-reports module; the sidebar
    // entry lives in the dashboards config, so the card does too.
    title: 'SAP Reports',
    icon: <FileBarChart className="h-5 w-5" />,
    route: '/dashboards/sap-reports',
    accent: 'blue',
    permissions: SAP_REPORTS_ACCESS,
  },
];

export default function DashboardsLandingPage() {
  const { hasAnyPermission } = usePermission();
  const { currentCompany } = useAuth();

  /**
   * Logistics Control is one route showing two plants, so its tile is marked
   * with the one this viewer will actually get. Named off the scope rather than
   * a second company check here: the scope is what the board itself reads, so
   * the tile cannot drift from the page it opens.
   */
  const logisticsScope = logisticsControlScopeForCompany(currentCompany?.company_code);

  const visibleModules = useMemo(
    () =>
      dashboardsModules
        .filter((mod) => hasAnyPermission(mod.permissions))
        .filter(
          (mod) => !mod.companies || mod.companies.includes(currentCompany?.company_code ?? ''),
        )
        .map((mod) =>
          mod.route === '/dashboards/logistics-control' && logisticsScope.key === 'beverages'
            ? { ...mod, icon: <CupSoda className="h-5 w-5" /> }
            : mod,
        ),
    [hasAnyPermission, logisticsScope.key, currentCompany?.company_code],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Dashboards</h2>
        <p className="mt-1.5 text-muted-foreground">Analytics and planning views across systems</p>
      </div>

      <div className="space-y-3.5">
        <ModuleTileGroupLabel label="Available dashboards" count={visibleModules.length} />

        <ModuleTileGrid>
          {visibleModules.map((module) => (
            <ModuleTile
              key={module.route}
              title={module.title}
              icon={module.icon}
              accent={module.accent}
              to={module.route}
            />
          ))}
        </ModuleTileGrid>
      </div>
    </div>
  );
}
