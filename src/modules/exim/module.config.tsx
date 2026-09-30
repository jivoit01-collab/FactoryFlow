/**
 * Import / Export module.
 *
 * EXIM's screens, brought across from the separate system they ran in, one
 * module at a time and renamed for what they are. Live so far:
 *
 *   Oil Stock               EXIM's Stock Dashboard: every oil in every status
 *   Oil Lots                EXIM's Stock Status: each lot from contract to tank,
 *                           with its Contracts, Vehicle Report and Shortages
 *   Tank Farm               EXIM's Tank Monitoring, with its Tanks, Oils (EXIM's
 *                           "tank items"), Tank Log and Oil Cost (its in-tank
 *                           breakdown)
 *   Domestic Contracts      EXIM's domestic contract register and its landed-
 *                           cost sheet, rebuilt on SAP's oil POs and the gate
 *   Oil Prices, Jivo Rates  EXIM's daily commodity prices and Jivo rates, read
 *                           nightly from the purchase team's price sheet
 *   Director Inventory      EXIM's Director Dashboard
 *   Contract History,
 *   Change Log              EXIM's contractual history and stock updation logs
 *   Export Licences         EXIM's Advance License and DFIA License pages, as
 *                           one register with a tab per kind
 *   Customs Exchange Rates  EXIM's Custom Exchange Rates page
 *
 * Gated on EXIM's own rights under the `exim` label (see
 * `config/permissions/exim.permissions.ts`), which EXIM's users arrived holding.
 */
import {
  ChartLine,
  ClipboardList,
  Container,
  Cylinder,
  Droplets,
  FileBadge,
  FileClock,
  Gauge,
  Globe,
  History,
  IndianRupee,
  LayoutGrid,
  ListChecks,
  Palette,
  ReceiptIndianRupee,
  Scale,
  Ship,
  Tags,
  Truck,
} from 'lucide-react';

import {
  EXIM_ACCESS,
  EXIM_CONTRACT_ACCESS,
  EXIM_LICENCE_ACCESS,
  EXIM_PERMISSIONS,
  EXIM_PRICE_ACCESS,
  EXIM_RATE_ACCESS,
} from '@/config/permissions/exim.permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const EximHome = lazy(() => import('./pages/EximHome'));
const LicencesPage = lazy(() => import('./pages/LicencesPage'));
const LicenceDetailPage = lazy(() => import('./pages/LicenceDetailPage'));
const CustomsRatesPage = lazy(() => import('./pages/CustomsRatesPage'));

const StockDashboardPage = lazy(() => import('./pages/reports/StockDashboardPage'));
const StockStatusBreakdownPage = lazy(() => import('./pages/reports/StockStatusBreakdownPage'));
const DirectorInventoryPage = lazy(() => import('./pages/reports/DirectorInventoryPage'));

const DomesticContractsPage = lazy(() => import('./pages/contracts/DomesticContractsPage'));
const DomesticContractPage = lazy(() => import('./pages/contracts/DomesticContractPage'));

const OilPricesPage = lazy(() => import('./pages/prices/OilPricesPage'));
const JivoRatesPage = lazy(() => import('./pages/prices/JivoRatesPage'));

const LotsPage = lazy(() => import('./pages/lots/LotsPage'));
const LotDetailPage = lazy(() => import('./pages/lots/LotDetailPage'));
const ContractsPage = lazy(() => import('./pages/lots/ContractsPage'));
const VehicleReportPage = lazy(() => import('./pages/lots/VehicleReportPage'));
const ShortagesPage = lazy(() => import('./pages/lots/ShortagesPage'));
const ContractHistoryPage = lazy(() => import('./pages/lots/ContractHistoryPage'));
const LotChangeLogPage = lazy(() => import('./pages/lots/LotChangeLogPage'));

const TankFarmPage = lazy(() => import('./pages/farm/TankFarmPage'));
const TanksPage = lazy(() => import('./pages/farm/TanksPage'));
const OilsPage = lazy(() => import('./pages/farm/OilsPage'));
const TankLogPage = lazy(() => import('./pages/farm/TankLogPage'));
const OilCostPage = lazy(() => import('./pages/farm/OilCostPage'));

const P = EXIM_PERMISSIONS;

export const eximModuleConfig: ModuleConfig = {
  name: 'exim',
  routes: [
    {
      // No page of its own: it names the breadcrumb, and sends the reader on
      // to the first screen they may open.
      path: '/exim',
      element: <EximHome />,
      layout: 'main',
      permissions: EXIM_ACCESS,
      breadcrumb: { label: 'Import / Export' },
    },

    // --- oil stock and lots ----------------------------------------------------
    {
      path: '/exim/oil-stock',
      element: <StockDashboardPage />,
      layout: 'main',
      permissions: [P.LOT_VIEW],
      breadcrumb: { label: 'Oil Stock' },
    },
    {
      path: '/exim/oil-stock/:status',
      element: <StockStatusBreakdownPage />,
      layout: 'main',
      permissions: [P.LOT_VIEW],
      breadcrumb: { label: 'Status' },
    },
    {
      path: '/exim/lots',
      element: <LotsPage />,
      layout: 'main',
      permissions: [P.LOT_VIEW],
      breadcrumb: { label: 'Oil Lots' },
    },
    {
      path: '/exim/lots/:lotId',
      element: <LotDetailPage />,
      layout: 'main',
      permissions: [P.LOT_VIEW],
      breadcrumb: { label: 'Lot' },
    },
    {
      path: '/exim/contracts',
      element: <ContractsPage />,
      layout: 'main',
      permissions: [P.LOT_VIEW],
      breadcrumb: { label: 'Contracts' },
    },
    {
      path: '/exim/vehicle-report',
      element: <VehicleReportPage />,
      layout: 'main',
      permissions: [P.VEHICLE_REPORT],
      breadcrumb: { label: 'Vehicle Report' },
    },
    {
      path: '/exim/shortages',
      element: <ShortagesPage />,
      layout: 'main',
      permissions: [P.SHORTAGE_VIEW],
      breadcrumb: { label: 'Shortages' },
    },

    // --- domestic contracts: SAP's oil POs, their trucks and landed cost ------
    {
      path: '/exim/domestic-contracts',
      element: <DomesticContractsPage />,
      layout: 'main',
      permissions: EXIM_CONTRACT_ACCESS,
      breadcrumb: { label: 'Domestic Contracts' },
    },
    {
      path: '/exim/domestic-contracts/:poNumber',
      element: <DomesticContractPage />,
      layout: 'main',
      permissions: EXIM_CONTRACT_ACCESS,
      breadcrumb: { label: 'PO' },
    },

    // --- oil prices: the purchase team's price sheet, day by day ----------------
    {
      path: '/exim/oil-prices',
      element: <OilPricesPage />,
      layout: 'main',
      permissions: EXIM_PRICE_ACCESS,
      breadcrumb: { label: 'Oil Prices' },
    },
    {
      path: '/exim/jivo-rates',
      element: <JivoRatesPage />,
      layout: 'main',
      permissions: EXIM_RATE_ACCESS,
      breadcrumb: { label: 'Jivo Rates' },
    },

    // --- the tank farm ---------------------------------------------------------
    {
      path: '/exim/tank-farm',
      element: <TankFarmPage />,
      layout: 'main',
      permissions: [P.TANK_VIEW],
      breadcrumb: { label: 'Tank Farm' },
    },
    {
      path: '/exim/tanks',
      element: <TanksPage />,
      layout: 'main',
      permissions: [P.TANK_VIEW],
      breadcrumb: { label: 'Tanks' },
    },
    {
      path: '/exim/oils',
      element: <OilsPage />,
      layout: 'main',
      permissions: [P.OIL_VIEW],
      breadcrumb: { label: 'Oils' },
    },
    {
      path: '/exim/tank-log',
      element: <TankLogPage />,
      layout: 'main',
      permissions: [P.TANK_LOG_VIEW],
      breadcrumb: { label: 'Tank Log' },
    },
    {
      path: '/exim/oil-cost',
      element: <OilCostPage />,
      layout: 'main',
      permissions: [P.TANK_AVERAGE],
      breadcrumb: { label: 'Oil Cost' },
    },

    // --- reports and records ---------------------------------------------------
    {
      path: '/exim/director-inventory',
      element: <DirectorInventoryPage />,
      layout: 'main',
      permissions: [P.DIRECTOR_REPORT],
      breadcrumb: { label: 'Director Inventory' },
    },
    {
      path: '/exim/contract-history',
      element: <ContractHistoryPage />,
      layout: 'main',
      permissions: [P.CONTRACT_HISTORY_VIEW],
      breadcrumb: { label: 'Contract History' },
    },
    {
      path: '/exim/lot-changes',
      element: <LotChangeLogPage />,
      layout: 'main',
      permissions: [P.CHANGE_LOG_VIEW],
      breadcrumb: { label: 'Change Log' },
    },

    // --- licences --------------------------------------------------------------
    {
      path: '/exim/licences',
      element: <LicencesPage />,
      layout: 'main',
      permissions: EXIM_LICENCE_ACCESS,
      breadcrumb: { label: 'Export Licences' },
    },
    {
      path: '/exim/licences/:licenceId',
      element: <LicenceDetailPage />,
      layout: 'main',
      permissions: EXIM_LICENCE_ACCESS,
      breadcrumb: { label: 'Licence' },
    },
    {
      path: '/exim/customs-rates',
      element: <CustomsRatesPage />,
      layout: 'main',
      permissions: [P.VIEW_CUSTOMS_RATES],
      breadcrumb: { label: 'Customs Exchange Rates' },
    },
  ],
  navigation: [
    {
      path: '/exim',
      title: 'Import / Export',
      icon: Ship,
      // Required, despite being optional on the type: the sidebar hides an
      // item without it.
      showInSidebar: true,
      // A list, not the `exim` prefix: see EXIM_ACCESS.
      permissions: EXIM_ACCESS,
      hasSubmenu: true,
      // The order a lot travels in: stock, the lots, the farm they end in, then
      // the records and the licences. EximHome lands on the first one allowed.
      children: [
        {
          path: '/exim/oil-stock',
          title: 'Oil Stock',
          icon: LayoutGrid,
          permissions: [P.LOT_VIEW],
        },
        { path: '/exim/lots', title: 'Oil Lots', icon: Droplets, permissions: [P.LOT_VIEW] },
        { path: '/exim/contracts', title: 'Contracts', icon: FileClock, permissions: [P.LOT_VIEW] },
        {
          path: '/exim/vehicle-report',
          title: 'Vehicle Report',
          icon: Truck,
          permissions: [P.VEHICLE_REPORT],
        },
        {
          path: '/exim/shortages',
          title: 'Shortages',
          icon: Scale,
          permissions: [P.SHORTAGE_VIEW],
        },
        {
          path: '/exim/domestic-contracts',
          title: 'Domestic Contracts',
          icon: ReceiptIndianRupee,
          permissions: EXIM_CONTRACT_ACCESS,
        },
        {
          path: '/exim/oil-prices',
          title: 'Oil Prices',
          icon: ChartLine,
          permissions: EXIM_PRICE_ACCESS,
        },
        {
          path: '/exim/jivo-rates',
          title: 'Jivo Rates',
          icon: Tags,
          permissions: EXIM_RATE_ACCESS,
        },
        { path: '/exim/tank-farm', title: 'Tank Farm', icon: Cylinder, permissions: [P.TANK_VIEW] },
        { path: '/exim/tanks', title: 'Tanks', icon: Container, permissions: [P.TANK_VIEW] },
        { path: '/exim/oils', title: 'Oils', icon: Palette, permissions: [P.OIL_VIEW] },
        {
          path: '/exim/tank-log',
          title: 'Tank Log',
          icon: ClipboardList,
          permissions: [P.TANK_LOG_VIEW],
        },
        {
          path: '/exim/oil-cost',
          title: 'Oil Cost',
          icon: IndianRupee,
          permissions: [P.TANK_AVERAGE],
        },
        {
          path: '/exim/director-inventory',
          title: 'Director Inventory',
          icon: Gauge,
          permissions: [P.DIRECTOR_REPORT],
        },
        {
          path: '/exim/contract-history',
          title: 'Contract History',
          icon: History,
          permissions: [P.CONTRACT_HISTORY_VIEW],
        },
        {
          path: '/exim/lot-changes',
          title: 'Change Log',
          icon: ListChecks,
          permissions: [P.CHANGE_LOG_VIEW],
        },
        {
          path: '/exim/licences',
          title: 'Export Licences',
          icon: FileBadge,
          permissions: EXIM_LICENCE_ACCESS,
        },
        {
          path: '/exim/customs-rates',
          title: 'Customs Exchange Rates',
          icon: Globe,
          permissions: [P.VIEW_CUSTOMS_RATES],
        },
      ],
    },
  ],
};
