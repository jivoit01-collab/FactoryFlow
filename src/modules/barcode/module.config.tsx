import { ScanBarcode } from 'lucide-react';

import { BARCODE_PERMISSIONS } from '@/config/permissions/barcode.permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const BarcodeDashboardPage = lazy(() => import('./pages/BarcodeDashboardPage'));
const PalletListPage = lazy(() => import('./pages/PalletListPage'));
const PalletDetailPage = lazy(() => import('./pages/PalletDetailPage'));
const BoxListPage = lazy(() => import('./pages/BoxListPage'));
const BoxDetailPage = lazy(() => import('./pages/BoxDetailPage'));
const PalletVerifyPage = lazy(() => import('./pages/PalletVerifyPage'));
const PalletVerifyNewPage = lazy(() => import('./pages/PalletVerifyNewPage'));
const PalletVerifyRequestDetailPage = lazy(
  () => import('./pages/PalletVerifyRequestDetailPage'),
);

// Phase 2 — Label & Print
const LabelGeneratePage = lazy(() => import('./pages/LabelGeneratePage'));
const ReprintPage = lazy(() => import('./pages/ReprintPage'));
const PrintHistoryPage = lazy(() => import('./pages/PrintHistoryPage'));

// Scan
const ScanPage = lazy(() => import('./pages/ScanPage'));
const BarcodeDispatchPage = lazy(() => import('./pages/BarcodeDispatchPage'));
const BarcodeDispatchReportsPage = lazy(() => import('./pages/BarcodeDispatchReportsPage'));
const BarcodeDispatchSummaryPage = lazy(() => import('./pages/BarcodeDispatchSummaryPage'));
const BarcodeTraceabilityPage = lazy(() => import('./pages/BarcodeTraceabilityPage'));
const IntercompanyTransferPage = lazy(() => import('./pages/IntercompanyTransferPage'));
const IntercompanyTransferDetailPage = lazy(() => import('./pages/IntercompanyTransferDetailPage'));

// Pallet Operations
const PalletMovePage = lazy(() => import('./pages/PalletMovePage'));
const PalletTransferPage = lazy(() => import('./pages/PalletTransferPage'));
const PalletSplitPage = lazy(() => import('./pages/PalletSplitPage'));
const BoxTransferPage = lazy(() => import('./pages/BoxTransferPage'));

// Loose & Dismantle
const DismantlePage = lazy(() => import('./pages/DismantlePage'));
const VoidPage = lazy(() => import('./pages/VoidPage'));
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
    {
      path: '/barcode/verify',
      element: <PalletVerifyPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_PALLET],
    },
    {
      path: '/barcode/verify/new',
      element: <PalletVerifyNewPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_PALLET],
    },
    {
      path: '/barcode/verify/:requestId',
      element: <PalletVerifyRequestDetailPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_PALLET],
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
    // Scan
    {
      path: '/barcode/scan',
      element: <ScanPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
    },
    {
      path: '/barcode/dispatch',
      element: <BarcodeDispatchPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_DISPATCH, BARCODE_PERMISSIONS.VIEW_BOX],
    },
    {
      path: '/barcode/dispatch/reports',
      element: <BarcodeDispatchReportsPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_DISPATCH, BARCODE_PERMISSIONS.VIEW_BOX],
    },
    {
      path: '/barcode/dispatch/summary/:sessionId',
      element: <BarcodeDispatchSummaryPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_DISPATCH, BARCODE_PERMISSIONS.VIEW_BOX],
    },
    {
      path: '/barcode/intercompany',
      element: <IntercompanyTransferPage />,
      layout: 'main',
      permissions: [
        BARCODE_PERMISSIONS.VIEW_INTERCOMPANY_TRANSFER,
        BARCODE_PERMISSIONS.SCAN_INTERCOMPANY_TRANSFER,
      ],
    },
    {
      path: '/barcode/intercompany/:transferId',
      element: <IntercompanyTransferDetailPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_INTERCOMPANY_TRANSFER],
    },
    {
      path: '/barcode/traceability',
      element: <BarcodeTraceabilityPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.VIEW_INTERCOMPANY_TRANSFER],
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
    {
      path: '/barcode/box-transfer',
      element: <BoxTransferPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.MANAGE_BOX],
    },
    // Loose & Dismantle
    {
      path: '/barcode/dismantle',
      element: <DismantlePage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.MANAGE_BOX],
    },
    {
      path: '/barcode/void',
      element: <VoidPage />,
      layout: 'main',
      permissions: [BARCODE_PERMISSIONS.MANAGE_PALLET],
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
          path: '/barcode/verify',
          title: 'Verify Pallet',
          permissions: [BARCODE_PERMISSIONS.VIEW_PALLET],
        },
        {
          path: '/barcode/scan',
          title: 'Scan',
          permissions: [BARCODE_PERMISSIONS.VIEW_BOX],
        },
        {
          path: '/barcode/dispatch',
          title: 'Dispatch',
          permissions: [BARCODE_PERMISSIONS.VIEW_DISPATCH, BARCODE_PERMISSIONS.VIEW_BOX],
        },
        {
          path: '/barcode/dispatch/reports',
          title: 'Dispatch Reports',
          permissions: [BARCODE_PERMISSIONS.VIEW_DISPATCH, BARCODE_PERMISSIONS.VIEW_BOX],
        },
        {
          path: '/barcode/intercompany',
          title: 'Intercompany Transfer',
          permissions: [BARCODE_PERMISSIONS.VIEW_INTERCOMPANY_TRANSFER],
        },
        {
          path: '/barcode/traceability',
          title: 'Traceability',
          permissions: [BARCODE_PERMISSIONS.VIEW_INTERCOMPANY_TRANSFER],
        },
        {
          path: '/barcode/generate',
          title: 'Pallet QR Print',
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
          path: '/barcode/box-transfer',
          title: 'Box Transfer',
          permissions: [BARCODE_PERMISSIONS.MANAGE_BOX],
        },
        {
          path: '/barcode/dismantle',
          title: 'Dismantle',
          permissions: [BARCODE_PERMISSIONS.MANAGE_BOX],
        },
        {
          path: '/barcode/void',
          title: 'Void',
          permissions: [BARCODE_PERMISSIONS.MANAGE_PALLET],
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
