import { IndianRupee } from 'lucide-react';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import { Navigate } from 'react-router-dom';

import type { ModuleConfig } from '@/core/types';

const FinanceMemoDashboardPage = lazy(() => import('./pages/FinanceMemoDashboardPage'));
const FinanceMemoNewPage = lazy(() => import('./pages/FinanceMemoNewPage'));
const FinanceMemoDetailPage = lazy(() => import('./pages/FinanceMemoDetailPage'));

export const financeModuleConfig: ModuleConfig = {
  name: 'finance',
  routes: [
    {
      path: '/finance',
      element: <Navigate to="/finance/credit-notes" replace />,
      layout: 'main',
      breadcrumb: { label: 'Finance' },
    },
    {
      path: '/finance/credit-notes',
      element: <FinanceMemoDashboardPage memoType="credit" />,
      layout: 'main',
      breadcrumb: { label: 'Credit Notes' },
    },
    {
      path: '/finance/credit-notes/new',
      element: <FinanceMemoNewPage memoType="credit" />,
      layout: 'main',
      breadcrumb: { label: 'New Credit Note' },
    },
    {
      path: '/finance/credit-notes/:entryId',
      element: <FinanceMemoDetailPage memoType="credit" />,
      layout: 'main',
      breadcrumb: { label: 'Credit Note' },
    },
    {
      path: '/finance/debit-notes',
      element: <FinanceMemoDashboardPage memoType="debit" />,
      layout: 'main',
      breadcrumb: { label: 'Debit Notes' },
    },
    {
      path: '/finance/debit-notes/new',
      element: <FinanceMemoNewPage memoType="debit" />,
      layout: 'main',
      breadcrumb: { label: 'New Debit Note' },
    },
    {
      path: '/finance/debit-notes/:entryId',
      element: <FinanceMemoDetailPage memoType="debit" />,
      layout: 'main',
      breadcrumb: { label: 'Debit Note' },
    },
  ],
  navigation: [
    {
      path: '/finance',
      title: 'Sales / Finance',
      icon: IndianRupee,
      showInSidebar: true,
      hasSubmenu: true,
      children: [
        {
          path: '/finance/credit-notes',
          title: 'Credit Notes',
        },
        {
          path: '/finance/debit-notes',
          title: 'Debit Notes',
        },
      ],
    },
  ],
};
