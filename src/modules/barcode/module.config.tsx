import { ScanBarcode, Package, Boxes } from 'lucide-react';
import { lazy } from 'react';

import { BARCODE_PERMISSIONS } from '@/config/permissions/barcode.permissions';
import type { ModuleConfig } from '@/core/types';

const BarcodeDashboardPage = lazy(() => import('./pages/BarcodeDashboardPage'));
const PalletListPage = lazy(() => import('./pages/PalletListPage'));
const PalletDetailPage = lazy(() => import('./pages/PalletDetailPage'));
const BoxListPage = lazy(() => import('./pages/BoxListPage'));
const BoxDetailPage = lazy(() => import('./pages/BoxDetailPage'));

// Phase 2 — Label & Print
const LabelGeneratePage = lazy(() => import('./pages/LabelGeneratePage'));
const ReprintPage = lazy(() => import('./pages/ReprintPage'));
const PrintHistoryPage = lazy(() => import('./pages/PrintHistoryPage'));

// Pallet Operations
const PalletMovePage = lazy(() => import('./pages/PalletMovePage'));
const PalletTransferPage = lazy(() => import('./pages/PalletTransferPage'));
const PalletSplitPage = lazy(() => import('./pages/PalletSplitPage'));

// Loose & Dismantle
const DismantlePage = lazy(() => import('./pages/DismantlePage'));
const LooseStockPage = lazy(() => import('./pages/LooseStockPage'));
const RepackPage = lazy(() => import('./pages/RepackPage'));

export const barcodeModuleConfig: ModuleConfig = {
  name: 'barcode',
  routes: [
    {
      path: '/barcode',
      element: <BarcodeDashboardPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_PALLET],
    },
    {
      path: '/barcode/pallets',
      element: <PalletListPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_PALLET],
    },
    {
      path: '/barcode/pallets/:palletId',
      element: <PalletDetailPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_PALLET],
    },
    {
      path: '/barcode/boxes',
      element: <BoxListPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
    },
    {
      path: '/barcode/boxes/:boxId',
      element: <BoxDetailPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
    },
    // Phase 2 — Label & Print
    {
      path: '/barcode/generate',
      element: <LabelGeneratePage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.CREATE_BOX],
    },
    {
      path: '/barcode/reprint',
      element: <ReprintPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
    },
    {
      path: '/barcode/print-history',
      element: <PrintHistoryPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
    },
    // Pallet Operations
    {
      path: '/barcode/move',
      element: <PalletMovePage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.MANAGE_PALLET],
    },
    {
      path: '/barcode/transfer',
      element: <PalletTransferPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.MANAGE_PALLET],
    },
    {
      path: '/barcode/split',
      element: <PalletSplitPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.MANAGE_PALLET],
    },
    // Loose & Dismantle
    {
      path: '/barcode/dismantle',
      element: <DismantlePage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.MANAGE_BOX],
    },
    {
      path: '/barcode/loose',
      element: <LooseStockPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
    },
    {
      path: '/barcode/repack',
      element: <RepackPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.MANAGE_BOX],
    },
  ],
  navigation: [
    {
      path: '/barcode',
      title: 'Barcode',
      icon: ScanBarcode,
      showInSidebar: true,
      permissions: [BARCODE_PERMISSIONS.VIEW_PALLET],
      hasSubmenu: true,
      children: [
        {
          path: '/barcode',
          title: 'Dashboard',
          permissions: [BARCODE_PERMISSIONS.VIEW_PALLET],
        },
        {
          path: '/barcode/pallets',
          title: 'Pallets',
          permissions: [BARCODE_PERMISSIONS.VIEW_PALLET],
        },
        {
          path: '/barcode/boxes',
          title: 'Boxes',
          permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
        },
        {
          path: '/barcode/generate',
          title: 'Generate Labels',
          permissions: [BARCODE_PERMISSIONS.CREATE_BOX],
        },
        {
          path: '/barcode/reprint',
          title: 'Reprint',
          permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
        },
        {
          path: '/barcode/print-history',
          title: 'Print History',
          permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
        },
        {
          path: '/barcode/move',
          title: 'Move Pallet',
          permissions: [BARCODE_PERMISSIONS.MANAGE_PALLET],
        },
        {
          path: '/barcode/transfer',
          title: 'Godown Transfer',
          permissions: [BARCODE_PERMISSIONS.MANAGE_PALLET],
        },
        {
          path: '/barcode/split',
          title: 'Split Pallet',
          permissions: [BARCODE_PERMISSIONS.MANAGE_PALLET],
        },
        {
          path: '/barcode/dismantle',
          title: 'Dismantle',
          permissions: [BARCODE_PERMISSIONS.MANAGE_BOX],
        },
        {
          path: '/barcode/loose',
          title: 'Loose Stock',
          permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
        },
        {
          path: '/barcode/repack',
          title: 'Repack',
          permissions: [BARCODE_PERMISSIONS.MANAGE_BOX],
        },
      ],
    },
  ],
};
