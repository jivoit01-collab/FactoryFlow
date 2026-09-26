import { BarChart3 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import {
  BLOWING_PERMISSIONS,
  DASHBOARDS_PERMISSIONS,
  DISPATCH_PERMISSIONS,
  GATE_PERMISSIONS,
  SAP_REPORTS_ACCESS,
} from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

import { ACCOUNTS_BOARD_VIEW_PERMISSIONS } from './accounts-board/constants';
import { ADMIN_BOARD_VIEW_PERMISSIONS } from './admin-control/constants';
import {
  BOARD_BUILDER_PERMISSIONS,
  BOARD_LIST_VIEW_PERMISSIONS,
} from './builder/constants';
import { BOARD_CAROUSEL_VIEW_PERMISSIONS } from './carousel/constants';
import { CIVIL_BOARD_VIEW_PERMISSIONS } from './civil-control/constants';
import { COMPANY_EXPENSE_VIEW_PERMISSIONS } from './company-expense/constants';
import { CUSTOMER_RETURNS_VIEW_PERMISSIONS } from './customer-returns/constants';
import {
  ELECTRICITY_BOARD_COMPANIES,
  ELECTRICITY_BOARD_VIEW_PERMISSIONS,
} from './electricity/constants';
import { GATE_DASHBOARD_VIEW_PERMISSIONS } from './gate/constants/gate-dashboard.constants';
import { HR_BOARD_VIEW_PERMISSIONS } from './hr-board/constants';
import {
  LOGISTICS_CONTROL_VIEW_PERMISSIONS,
  LOGISTICS_CONTROL_WAREHOUSE_PERMISSIONS,
} from './logistics-control/constants';
import { PLANT_BOARD_VIEW_PERMISSIONS } from './plant-board/constants';
import { PRODUCTION_CONTROL_VIEW_PERMISSIONS } from './production-control/constants';
import { TOMORROW_RUN_VIEW_PERMISSIONS } from './tomorrow-run/constants';
import { WAREHOUSE_CONTROL_VIEW_PERMISSIONS } from './warehouse-control/constants';

const DashboardsLandingPage = lazy(() => import('./pages/DashboardsLandingPage'));
const ExecutiveOverviewPage = lazy(() => import('./overview/pages/ExecutiveOverviewPage'));
const GateDashboardPage = lazy(() => import('./gate/pages/GateDashboardPage'));
const ProductionDashboardPage = lazy(() => import('./production/pages/ProductionDashboardPage'));
const LinePerformanceDashboardPage = lazy(
  () => import('./production/pages/LinePerformanceDashboardPage'),
);
const BlowingDashboardPage = lazy(() => import('./blowing/pages/BlowingDashboardPage'));
const ElectricityDashboardPage = lazy(
  () => import('./electricity/pages/ElectricityDashboardPage'),
);
const StockLevelDashboardPage = lazy(() => import('./stock-level/pages/StockLevelDashboardPage'));
const NonMovingDashboardPage = lazy(() => import('./non-moving/pages/NonMovingDashboardPage'));
const SalesPlanningRequirementDashboardPage = lazy(
  () => import('./sales-planning-requirement/pages/SalesPlanningRequirementDashboardPage'),
);
const ProductionMovementDashboardPage = lazy(
  () => import('./production-movement/pages/ProductionMovementDashboardPage'),
);
const PackingMaterialDashboardPage = lazy(
  () => import('./packing-material/pages/PackingMaterialDashboardPage'),
);
const PmRequirementDashboardPage = lazy(
  () => import('./pm-requirement/pages/PmRequirementDashboardPage'),
);
const TomorrowRunPage = lazy(() => import('./tomorrow-run/pages/TomorrowRunPage'));
const DispatchDayDashboardPage = lazy(() => import('./dispatch/pages/DispatchDayDashboardPage'));
const DispatchPipelineDashboardPage = lazy(
  () => import('./dispatch-pipeline/pages/DispatchPipelineDashboardPage'),
);
const DispatchFulfilmentDashboardPage = lazy(
  () => import('./dispatch-fulfilment/pages/DispatchFulfilmentDashboardPage'),
);
const DispatchTrackingDashboardPage = lazy(
  () => import('./dispatch-tracking/pages/DispatchTrackingDashboardPage'),
);
const BudgetApprovalsDashboardPage = lazy(
  () => import('./budget-approvals/pages/BudgetApprovalsDashboardPage'),
);
const FactoryExpenseWallPage = lazy(() => import('./factory-expense/pages/FactoryExpenseWallPage'));
const FactoryExpenseConfigPage = lazy(
  () => import('./factory-expense/pages/FactoryExpenseConfigPage'),
);
const CompanyExpenseDashboardPage = lazy(
  () => import('./company-expense/pages/CompanyExpenseDashboardPage'),
);
const CustomerReturnsDashboardPage = lazy(
  () => import('./customer-returns/pages/CustomerReturnsDashboardPage'),
);
const WarehouseControlDashboardPage = lazy(
  () => import('./warehouse-control/pages/WarehouseControlDashboardPage'),
);
const ProductionControlDashboardPage = lazy(
  () => import('./production-control/pages/ProductionControlDashboardPage'),
);
const PlantBoardDashboardPage = lazy(() => import('./plant-board/pages/PlantBoardDashboardPage'));
const AdminControlDashboardPage = lazy(
  () => import('./admin-control/pages/AdminControlDashboardPage'),
);
const HrBoardDashboardPage = lazy(() => import('./hr-board/pages/HrBoardDashboardPage'));
const AccountsDashboardPage = lazy(
  () => import('./accounts-board/pages/AccountsDashboardPage'),
);
const CivilControlDashboardPage = lazy(
  () => import('./civil-control/pages/CivilControlDashboardPage'),
);
const BoardCarouselPage = lazy(() => import('./carousel/pages/BoardCarouselPage'));
const MyDashboardsPage = lazy(() => import('./builder/pages/MyDashboardsPage'));
const DashboardBuilderPage = lazy(
  () => import('./builder/pages/DashboardBuilderPage'),
);
const CustomBoardPage = lazy(() => import('./builder/pages/CustomBoardPage'));
const PlantBoardConfigPage = lazy(() => import('./plant-board/pages/PlantBoardConfigPage'));
const LogisticsControlDashboardPage = lazy(
  () => import('./logistics-control/pages/LogisticsControlDashboardPage'),
);
const LogisticsControlConfigPage = lazy(
  () => import('./logistics-control/pages/LogisticsControlConfigPage'),
);

export const dashboardsModuleConfig: ModuleConfig = {
  name: 'dashboards',
  routes: [
    {
      path: '/dashboards',
      element: <DashboardsLandingPage />,
      layout: 'main',
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
        DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
        DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT,
        DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
        DASHBOARDS_PERMISSIONS.VIEW_BUDGET_APPROVALS,
        BLOWING_PERMISSIONS.VIEW_REPORTS,
        // Production Control reuses these three rights rather than minting its
        // own; they are already listed above, but keeping the spread here means
        // the parent gate follows the board if its rights ever change.
        ...PRODUCTION_CONTROL_VIEW_PERMISSIONS,
        // Same reasoning for the Plant Control wall board: it mints no right of
        // its own, and the spread keeps the parent gate following it.
        ...PLANT_BOARD_VIEW_PERMISSIONS,
        // The boards that are composed server-side now carry BOARD FEED rights
        // as well as the operational ones, and a dashboard-only login holds
        // nothing but those. Without these spreads such a login would be sent
        // to /unauthorized by the landing page before ever reaching the board
        // it was granted.
        ...ADMIN_BOARD_VIEW_PERMISSIONS,
        ...COMPANY_EXPENSE_VIEW_PERMISSIONS,
        ...CUSTOMER_RETURNS_VIEW_PERMISSIONS,
        ...HR_BOARD_VIEW_PERMISSIONS,
        // Tomorrow's run has rights of its own that nothing above covers.
        ...TOMORROW_RUN_VIEW_PERMISSIONS,
      ],
    },
    {
      path: '/dashboards/overview',
      element: <ExecutiveOverviewPage />,
      layout: 'main',
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
        DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
        DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT,
        DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
      ],
      breadcrumb: { label: 'Command Centre' },
    },
    {
      // Rated capacity and the last physical count, per packaging store. The
      // same per-warehouse settings the Logistics board writes, so a store
      // configured on either screen is configured on both. Gated on the
      // board's own rights rather than a new one: both figures are properties
      // of the building that the board already shows to anyone who can open it.
      path: '/dashboards/plant-board/settings',
      element: <PlantBoardConfigPage />,
      layout: 'main',
      permissions: PLANT_BOARD_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Store Settings' },
    },
    {
      // The wall rotation: Admin, Plant and Logistics Control in turn, on a
      // timer, with nothing to click. First among the routes because it is the
      // one a screen is left on -- the boards below it are what somebody opens
      // when they want to stand in front of one.
      //
      // Gated on the UNION of the three boards' own gates rather than a right of
      // its own, for the same reason none of them mints one: a dedicated
      // permission would need a row created on the live database and added to
      // every group before anybody could open the screen, and it would buy
      // nothing -- the page shows exactly what its three slides show, and each
      // slide re-checks its own gate before it is included in the rotation.
      //
      // That re-check matters here in a way it does not on a normal route: the
      // carousel MOUNTS the three page components directly, which bypasses the
      // route guards those pages sit behind. A viewer holding one board's rights
      // therefore gets a rotation of one, not a board they may not read.
      path: '/dashboards/carousel',
      element: <BoardCarouselPage />,
      layout: 'main',
      permissions: BOARD_CAROUSEL_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Board Carousel' },
    },
    {
      // The builder's own list. Gated WIDER than the editor, on purpose.
      //
      // Two different people arrive here: somebody who builds boards, and
      // somebody a board was published to. The second holds no build right,
      // so gating on that alone would hide every board they were deliberately
      // given. The page hides "New board" instead, off the `can_build` flag
      // the list endpoint returns, and the server refuses a POST from anybody
      // who should not be making one.
      path: '/dashboards/builder',
      element: <MyDashboardsPage />,
      layout: 'main',
      permissions: BOARD_LIST_VIEW_PERMISSIONS,
      breadcrumb: { label: 'My Dashboards' },
    },
    {
      // The editor. Gated on the build right, which grants no DATA: the
      // palette is filtered server-side to the cards this author may read,
      // and every figure on every board they build is still withheld per
      // card, per reader. See board_builder/permissions.py.
      path: '/dashboards/builder/:slug',
      element: <DashboardBuilderPage />,
      layout: 'main',
      permissions: BOARD_BUILDER_PERMISSIONS,
      breadcrumb: { label: 'Edit' },
    },
    {
      // A built board, read. Ungated for the same reason the list is: who may
      // open one is decided per board (its author published it to you) and
      // then per card (you hold that card's feed), server-side, on every
      // request. A permission list here could only ever be wrong -- it cannot
      // know which board the slug names.
      path: '/dashboards/board/:slug',
      element: <CustomBoardPage />,
      layout: 'main',
      breadcrumb: { label: 'Board' },
    },
    {
      // The owner's screen: what the plant made and shipped this month, what is
      // standing in it, what it cost, and what somebody has to do about all
      // three. Three bands and one composed read.
      //
      // Deliberately NOT a fifth control board. The others answer "how is my
      // section doing"; this one answers "how is the factory doing", which is
      // why it carries an action centre and they do not -- the alerts are
      // derived server-side so this page and any other consumer cannot reach
      // different conclusions from the same figures.
      //
      // Gated on the four rights its own reports already need rather than a new
      // one, so no permission row has to be created on the live database before
      // anyone can open it. Note that this shows the factory's wage and power
      // bill to anyone holding any of them -- the same disclosure the Logistics
      // board already makes, recorded in admin_board/permissions.py.
      path: '/dashboards/admin-control',
      element: <AdminControlDashboardPage />,
      layout: 'main',
      permissions: ADMIN_BOARD_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Admin Control' },
    },
    {
      // The whole plant on one wall screen, in the order material moves:
      // bought, stored, made, shifted. Four bands, one composed read, no
      // clicks -- see the page for why each of those is deliberate.
      path: '/dashboards/plant-board',
      element: <PlantBoardDashboardPage />,
      layout: 'main',
      permissions: PLANT_BOARD_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Plant Control' },
    },
    {
      // The two questions an HR head asks every morning: how many people are on
      // the rolls, and how many labourers came through the gate today. Two
      // bands, one composed read, no clicks.
      //
      // The bands answer to the company switcher DIFFERENTLY, which is a
      // property of the data rather than an oversight: the employee directory
      // is one directory for the whole factory, split by the plant a person is
      // costed to rather than by company, while the labour gate really does
      // book the plants apart. Each band prints its own scope so the two
      // figures are never read as covering the same ground.
      //
      // Gated on the rights its two registers already need rather than a new
      // one, so no permission row has to be created on the live database before
      // anyone can open it. It shows head counts only -- no pay and no named
      // person -- which is what makes the widely-held directory right the right
      // gate for it.
      path: '/dashboards/hr-board',
      element: <HrBoardDashboardPage />,
      layout: 'main',
      permissions: HR_BOARD_VIEW_PERMISSIONS,
      breadcrumb: { label: 'HR Control' },
    },
    {
      // The cash box: what came in, what went out, what is still waiting to go
      // to head office, what is in the drawer, and who is holding the rest.
      //
      // Unlike its neighbours this one is worked from rather than watched --
      // rows select, a detail panel opens, and "Add entry" hands off to the
      // register's own dialog. It sits here because this is where people look
      // for a dashboard, not because it is a wall board.
      //
      // Gated on the cash book's own rights rather than a new one: this board
      // IS that register summarised, so being allowed to read it is being
      // allowed to read this. A dashboard-only login reaches it instead through
      // control_boards' cash_book feed right, and the API then masks the names.
      path: '/dashboards/accounts-board',
      element: <AccountsDashboardPage />,
      layout: 'main',
      permissions: ACCOUNTS_BOARD_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Accounts' },
    },
    {
      // Every ongoing building job on the campus, one row each: area, what was
      // sanctioned against what has been spent, work certified, and the
      // programme. The six columns of the site meeting's own whiteboard, in the
      // order that meeting already runs.
      //
      // THE BOARD HAS NO FEED YET. There is no civil register behind it, so it
      // draws four worked-example projects and says so in its header, in a chip
      // and on every row. It was asked for ahead of the data on purpose -- a
      // column layout is argued about far better against something that looks
      // like the meeting than against a description of one.
      //
      // Gated on the budget-approvals rights rather than a new one, so no
      // permission row has to be created on the live database before anyone can
      // open it: capex sanctioned against capex spent is what that screen
      // already shows. Revisit when the register lands and the board starts
      // carrying contractors and certified progress -- see the constants file.
      path: '/dashboards/civil-control',
      element: <CivilControlDashboardPage />,
      layout: 'main',
      permissions: CIVIL_BOARD_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Civil Control' },
    },
    {
      // Production lines and the finished-goods floor they feed, on one screen:
      // line state and speed up top, BH-PF occupancy and its standing queue
      // beneath. Any one section's right opens it; the page hides the panels
      // the reader may not see.
      path: '/dashboards/production-control',
      element: <ProductionControlDashboardPage />,
      layout: 'main',
      permissions: PRODUCTION_CONTROL_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Production Control' },
    },
    {
      // One board folding four screens: non-moving stock, pallet space, today's
      // bills and vehicle linking. Any one section's right opens it; the page
      // itself hides the panels the user may not read.
      path: '/dashboards/warehouse-control',
      element: <WarehouseControlDashboardPage />,
      layout: 'main',
      permissions: WAREHOUSE_CONTROL_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Warehouse Control' },
    },
    {
      // The dispatch office wall: BH-BT's stock, the combined Oil + Mart
      // dispatch, and the freight bills behind it. Any one card's right opens
      // it; the page itself states which cards the user may not read rather
      // than dropping them silently.
      //
      // Signed into Jivo Beverages, this same route is the beverages plant's
      // wall instead — BH-FG and Beverages alone, three of its sixteen tiles
      // saying why they have no source. One address, and the company switcher
      // decides the plant, so a wall screen is a browser left signed into the
      // company that plant belongs to.
      path: '/dashboards/logistics-control',
      element: <LogisticsControlDashboardPage />,
      layout: 'main',
      permissions: LOGISTICS_CONTROL_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Logistics Control' },
    },
    {
      // The two warehouse facts SAP does not hold — rated tonnage capacity and
      // the date stock was last physically verified. Gated on the warehouse
      // right rather than a new one: both are properties of the building that
      // the board already displays to anyone who can open it. Like the board,
      // it edits whichever plant the signed-in company owns.
      path: '/dashboards/logistics-control/settings',
      element: <LogisticsControlConfigPage />,
      layout: 'main',
      permissions: LOGISTICS_CONTROL_WAREHOUSE_PERMISSIONS,
      breadcrumb: { label: 'Board Settings' },
    },
    {
      // The beverages board used to be its own address. It is now the logistics
      // route read as Jivo Beverages, so these two only forward — wall screens
      // and browser bookmarks still point here, and a dead link on a screen
      // nobody is standing at is a blank wall until somebody notices.
      //
      // Forwarding does not switch company: a browser signed into Oil that
      // opens this lands on the Oil board. That is the intended answer, and the
      // visible one — the board names its own plant in its heading.
      path: '/dashboards/beverage',
      element: <Navigate to="/dashboards/logistics-control" replace />,
      layout: 'main',
      permissions: LOGISTICS_CONTROL_VIEW_PERMISSIONS,
    },
    {
      path: '/dashboards/beverage/settings',
      element: <Navigate to="/dashboards/logistics-control/settings" replace />,
      layout: 'main',
      permissions: LOGISTICS_CONTROL_WAREHOUSE_PERMISSIONS,
    },
    {
      path: '/dashboards/gate',
      element: <GateDashboardPage />,
      layout: 'main',
      permissions: GATE_DASHBOARD_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Gate' },
    },
    {
      // Packing material stock in the three packaging stores, the packing
      // material production issued, and the packing material that shipped out
      // inside dispatched bills.
      path: '/dashboards/packing-material',
      element: <PackingMaterialDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PACKING_MATERIAL],
      breadcrumb: { label: 'Packing Material' },
    },
    {
      // The buyer's question rather than management's: the month's plan
      // exploded through its bills of material, against what the floor has
      // taken, what the stores hold and what is on order. Its own page and
      // not a fourth panel on the board above -- that one reports what
      // HAPPENED to packaging, this one is a 196-row buying list, and they
      // are read by different people for different reasons.
      path: '/dashboards/pm-requirement',
      element: <PmRequirementDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PACKING_MATERIAL],
      breadcrumb: { label: 'PM Requirement' },
    },
    {
      // Oil's machine plan for the next working day, read at 7 pm from the
      // planning sheet, stock, oil, packaging and the production log. Its own
      // rights, because picking what runs first is Gurvinder veerji's call.
      path: '/dashboards/tomorrow-run',
      element: <TomorrowRunPage />,
      layout: 'main',
      permissions: TOMORROW_RUN_VIEW_PERMISSIONS,
      breadcrumb: { label: "Tomorrow's run" },
    },
    {
      path: '/dashboards/production',
      element: <ProductionDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
      breadcrumb: { label: 'Production' },
    },
    {
      // The same day's runs, cut per line instead of per plant. Gated on the
      // production board's own permission rather than a new one: it is the
      // same data read a different way, and a separate permission would hand
      // somebody the plant total while hiding which line produced it.
      path: '/dashboards/production-lines',
      element: <LinePerformanceDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
      breadcrumb: { label: 'Line Performance' },
    },
    {
      path: '/dashboards/blowing',
      element: <BlowingDashboardPage />,
      layout: 'main',
      permissions: [BLOWING_PERMISSIONS.VIEW_REPORTS],
      breadcrumb: { label: 'Blowing' },
    },
    {
      path: '/dashboards/electricity',
      element: <ElectricityDashboardPage />,
      layout: 'main',
      permissions: ELECTRICITY_BOARD_VIEW_PERMISSIONS,
      companies: ELECTRICITY_BOARD_COMPANIES,
      breadcrumb: { label: 'Electricity' },
    },
    {
      path: '/dashboards/stock-levels',
      element: <StockLevelDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
      breadcrumb: { label: 'Stock Benchmark' },
    },
    {
      path: '/dashboards/non-moving',
      element: <NonMovingDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM],
      breadcrumb: { label: 'Non-Moving RM & PM' },
    },
    {
      path: '/dashboards/sales-planning-requirement',
      element: <SalesPlanningRequirementDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT],
      breadcrumb: { label: 'Sales Planning vs Requirement' },
    },
    {
      path: '/dashboards/production-movement',
      element: <ProductionMovementDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
      breadcrumb: { label: 'Production Movement' },
    },
    {
      path: '/dashboards/budget-approvals',
      element: <BudgetApprovalsDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_BUDGET_APPROVALS],
      breadcrumb: { label: 'Budget Approvals' },
    },
    {
      // The wall board. Route sits first among the dispatch entries because it
      // is the one an admin opens and leaves running.
      path: '/dashboards/dispatch',
      element: <DispatchDayDashboardPage />,
      layout: 'main',
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
        // The vendor / company / vehicle panels read the docking register, so
        // gate staff who only hold that permission can open the board too.
        GATE_PERMISSIONS.SALES_DISPATCH.VIEW,
      ],
      breadcrumb: { label: 'Dispatch' },
    },
    {
      path: '/dashboards/dispatch-plans',
      element: <Navigate to="/dispatch/plans" replace />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS],
      breadcrumb: { label: 'Dispatch Plans' },
    },
    {
      path: '/dashboards/dispatch-pipeline',
      element: <DispatchPipelineDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE],
      breadcrumb: { label: 'Dispatch Pipeline' },
    },
    {
      path: '/dashboards/dispatch-fulfilment',
      element: <DispatchFulfilmentDashboardPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS],
      breadcrumb: { label: 'Dispatch Fulfilment' },
    },
    {
      // The expense wall. Sits with the dispatch board because they are the two
      // screens that live on a wall rather than a desk.
      path: '/dashboards/factory-expense',
      element: <FactoryExpenseWallPage />,
      layout: 'main',
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
        DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE,
      ],
      breadcrumb: { label: 'Factory Expense' },
    },
    {
      path: '/dashboards/factory-expense/config',
      element: <FactoryExpenseConfigPage />,
      layout: 'main',
      permissions: [DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE],
      breadcrumb: { label: 'Configuration' },
    },
    {
      // The same spend as a grid: a row per company, a column per cost line.
      // Its own route rather than a tab on the wall above, because the two
      // answer different questions — that board asks "what is the factory
      // spending today", this one "whose spend is it" — and a wall screen has
      // nobody standing at it to switch tabs.
      //
      // Gated on the same pair as the wall: it reads the same registers through
      // the same server-side permission class, so it is that board rearranged
      // rather than a new disclosure, and no new right has to be created on the
      // live database before anyone can open it.
      path: '/dashboards/company-expense',
      element: <CompanyExpenseDashboardPage />,
      layout: 'main',
      permissions: COMPANY_EXPENSE_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Company Expense' },
    },
    {
      // Customer returns: how much came back, in what state, and from whom.
      //
      // Gated on the returns module's own view right rather than a dashboards
      // one: the board reports the returns its reader can already open one at a
      // time, so it discloses nothing extra, and it needs no permission row
      // created on the live database before anyone can use it.
      path: '/dashboards/customer-returns',
      element: <CustomerReturnsDashboardPage />,
      layout: 'main',
      permissions: CUSTOMER_RETURNS_VIEW_PERMISSIONS,
      breadcrumb: { label: 'Customer Returns' },
    },
    {
      path: '/dashboards/dispatch-tracking',
      element: <DispatchTrackingDashboardPage />,
      layout: 'main',
      permissions: [DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW],
      breadcrumb: { label: 'Dispatch Tracking' },
    },
  ],
  navigation: [
    {
      path: '/dashboards',
      title: 'Dashboards',
      icon: BarChart3,
      showInSidebar: true,
      permissions: [
        DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD,
        DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM,
        DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT,
        // Production reports permission — lets production staff reach the
        // Dashboards menu for the company-aware Production dashboard.
        DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
        DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
        // Gate dashboard lives here too — let gate staff reach the Dashboards menu.
        ...GATE_DASHBOARD_VIEW_PERMISSIONS,
        // Blowing dashboard lives here too — let blowing staff reach the menu.
        BLOWING_PERMISSIONS.VIEW_REPORTS,
        // Same for the Electricity board: a meter keeper may hold nothing but
        // the daily register's access set.
        ...ELECTRICITY_BOARD_VIEW_PERMISSIONS,
        // SAP Reports lives here too — a user with only report access still
        // needs the group to appear.
        ...SAP_REPORTS_ACCESS,
        // Factory Expense wall — an admin who only holds this must still be
        // able to reach the Dashboards menu.
        DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
        DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE,
        // Warehouse Control lives here too. Its pallet-space and linking panels
        // are the only reason a WMS operator or a dispatch linker would open the
        // Dashboards menu, so their rights must appear on the parent as well.
        ...WAREHOUSE_CONTROL_VIEW_PERMISSIONS,
        // Logistics Control lives here too. Its rights are all already listed
        // above, but they are spread explicitly so that narrowing this board's
        // gate later cannot silently hide the whole Dashboards menu from
        // whoever it was narrowed to.
        ...LOGISTICS_CONTROL_VIEW_PERMISSIONS,
        // Customer Returns lives here too. A returns clerk holds none of the
        // rights above, so without this the whole Dashboards menu -- not just
        // their board -- stays hidden from them.
        ...CUSTOMER_RETURNS_VIEW_PERMISSIONS,
        // Admin Control lives here too. Its rights are all already listed
        // above, but they are spread explicitly so that narrowing this board's
        // gate later cannot silently hide the whole Dashboards menu from
        // whoever it was narrowed to -- the same reasoning as Logistics.
        ...ADMIN_BOARD_VIEW_PERMISSIONS,
        // The Board Carousel lives here too. Every right in it is already listed
        // above -- it is the union of three boards that are all here -- but the
        // spread is kept for the same reason as the two above it: a display
        // login holding only this must not find the whole Dashboards menu
        // hidden, whatever any of those three gates is narrowed to later.
        ...BOARD_CAROUSEL_VIEW_PERMISSIONS,
        // Plant Control and Company Expense were covered only because their
        // OPERATIONAL rights happen to be listed individually above. That stops
        // being true the moment a reader holds the board feed right instead --
        // which is exactly what a dashboard-only login holds -- so both are now
        // spread like their neighbours. Without this the whole Dashboards menu,
        // not just one board, disappears for them.
        ...PLANT_BOARD_VIEW_PERMISSIONS,
        ...COMPANY_EXPENSE_VIEW_PERMISSIONS,
        // Same again for HR Control: a login granted only its two feed rights
        // holds nothing else under any module, so without this spread the
        // entire Dashboards menu -- not just this board -- is hidden from the
        // very people it was granted to.
        ...HR_BOARD_VIEW_PERMISSIONS,
        // Tomorrow's run mints its own rights, so a picker holding only those
        // would otherwise never see the Dashboards menu at all.
        ...TOMORROW_RUN_VIEW_PERMISSIONS,
        // And the Accounts board. A cash book viewer holds none of the rights
        // above, so without this spread the entire Dashboards menu -- not just
        // this one board -- stays hidden from the people it was built for.
        ...ACCOUNTS_BOARD_VIEW_PERMISSIONS,
        // The builder. Somebody granted only the build right holds nothing
        // else under any module, so without this the whole Dashboards menu is
        // hidden from the very people it was granted to. Note this does NOT
        // cover a colleague who was merely SHARED a board -- they hold nothing
        // at all, and reach the board by its link or from a menu they can see
        // for some other reason. A right for "somebody shares boards with me"
        // would be a right that grants nothing and has to be administered,
        // which is worse than a link.
        ...BOARD_LIST_VIEW_PERMISSIONS,
        // And Civil Control. Budget approvals is the only right on this list
        // that nothing else here carries, so without the spread the whole
        // Dashboards menu stays hidden from exactly the people the civil board
        // is for -- the ones who sanction what it reports on.
        ...CIVIL_BOARD_VIEW_PERMISSIONS,
      ],
      hasSubmenu: true,
      children: [
        {
          // Boards people compose themselves, first: this is the only entry
          // here that is a place to MAKE something rather than a place to
          // read one thing.
          //
          // Gated on the build right OR any board feed, never left ungated:
          // the sidebar shows a child with no permissions to everyone,
          // including the wall screen whose entire promise is one entry and
          // nothing else.
          path: '/dashboards/builder',
          title: 'My Dashboards',
          permissions: BOARD_LIST_VIEW_PERMISSIONS,
        },
        {
          // The rotation, above the boards it rotates: a wall screen is set up
          // once and never touched again, so the entry that sets it up comes
          // before the three that are read one at a time.
          path: '/dashboards/carousel',
          title: 'Board Carousel',
          permissions: BOARD_CAROUSEL_VIEW_PERMISSIONS,
        },
        {
          // First, because it is the summary the others drill into.
          path: '/dashboards/admin-control',
          title: 'Admin Control',
          permissions: ADMIN_BOARD_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/plant-board',
          title: 'Plant Control',
          permissions: PLANT_BOARD_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/production-control',
          title: 'Production Control',
          permissions: PRODUCTION_CONTROL_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/hr-board',
          title: 'HR Control',
          permissions: HR_BOARD_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/accounts-board',
          title: 'Accounts',
          permissions: ACCOUNTS_BOARD_VIEW_PERMISSIONS,
        },
        {
          // Beside Accounts rather than among the plant boards: what it reports
          // is capex, and the people who read it are the ones who sanction it.
          path: '/dashboards/civil-control',
          title: 'Civil Control',
          permissions: CIVIL_BOARD_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/warehouse-control',
          title: 'Warehouse Control',
          permissions: WAREHOUSE_CONTROL_VIEW_PERMISSIONS,
        },
        {
          // One entry, both plants: the board reads BH-BT for Oil and Mart and
          // BH-FG for Jivo Beverages, following the company switcher. The
          // beverages plant had a second entry here until the company became
          // the control — two menu rows for one board invited reading a
          // Beverages tonnage under an Oil heading, and back.
          path: '/dashboards/logistics-control',
          title: 'Logistics Control',
          permissions: LOGISTICS_CONTROL_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/gate',
          title: 'Gate',
          permissions: GATE_DASHBOARD_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/tomorrow-run',
          title: "Tomorrow's Run",
          permissions: TOMORROW_RUN_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/production',
          title: 'Production',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
        },
        {
          path: '/dashboards/production-lines',
          title: 'Line Performance',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
        },
        {
          path: '/dashboards/blowing',
          title: 'Blowing',
          permissions: [BLOWING_PERMISSIONS.VIEW_REPORTS],
        },
        {
          path: '/dashboards/electricity',
          title: 'Electricity',
          permissions: ELECTRICITY_BOARD_VIEW_PERMISSIONS,
          companies: ELECTRICITY_BOARD_COMPANIES,
        },
        {
          path: '/dashboards/stock-levels',
          title: 'Stock Benchmark',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
        },
        {
          path: '/dashboards/non-moving',
          title: 'Non-Moving RM & PM',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM],
        },
        {
          path: '/dashboards/sales-planning-requirement',
          title: 'Sales Plan vs Req.',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT],
        },
        {
          path: '/dashboards/packing-material',
          title: 'Packing Material',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_PACKING_MATERIAL],
        },
        {
          path: '/dashboards/pm-requirement',
          title: 'PM Requirement',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_PACKING_MATERIAL],
        },
        {
          path: '/dashboards/dispatch',
          title: 'Dispatch',
          permissions: [
            DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
            DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
            GATE_PERMISSIONS.SALES_DISPATCH.VIEW,
          ],
        },
        {
          path: '/dashboards/factory-expense',
          title: 'Factory Expense',
          permissions: [
            DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
            DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE,
          ],
        },
        {
          // The same spend, company by company. Needs nothing added to the
          // parent's permission list above — it holds exactly the two rights
          // the Factory Expense entry already spreads there, so the Dashboards
          // menu cannot be hidden by this board's gate.
          path: '/dashboards/company-expense',
          title: 'Company Expense',
          permissions: COMPANY_EXPENSE_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/customer-returns',
          title: 'Customer Returns',
          permissions: CUSTOMER_RETURNS_VIEW_PERMISSIONS,
        },
        {
          path: '/dashboards/dispatch-fulfilment',
          title: 'Dispatch Fulfilment',
          permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS],
        },
        {
          // Routes for this one are owned by the sap-reports module; only the
          // sidebar entry lives here. Same split the gate module uses for
          // Marketplace Gate.
          path: '/dashboards/sap-reports',
          title: 'SAP Reports',
          permissions: SAP_REPORTS_ACCESS,
        },
      ],
    },
  ],
};
