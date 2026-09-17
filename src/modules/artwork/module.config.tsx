/**
 * Artwork module — the label and carton artwork register.
 *
 * One page. It lists every SAP packaging item whose sub-group is LABEL or
 * CARTON and holds, for each, the controlled document number and its revision
 * date, the barcode printed on the artwork, and the two files (print-ready PDF
 * and the CorelDRAW source).
 *
 * The sidebar hides the whole module from anyone without an `artwork.*`
 * permission (`modulePrefix`), so the two groups the backend ships with —
 * Artwork Viewer and Artwork Editor — are the only way in.
 */
import { Palette } from 'lucide-react';

import { ARTWORK_ACCESS, ARTWORK_MODULE_PREFIX } from '@/config/permissions';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';
import type { ModuleConfig } from '@/core/types';

const ArtworkRegisterPage = lazy(() => import('./pages/ArtworkRegisterPage'));

export const artworkModuleConfig: ModuleConfig = {
  name: 'artwork',
  routes: [
    {
      path: '/artwork',
      element: <ArtworkRegisterPage />,
      layout: 'main',
      permissions: ARTWORK_ACCESS,
      breadcrumb: { label: 'Label & Carton Artwork' },
    },
  ],
  navigation: [
    {
      path: '/artwork',
      title: 'Artwork',
      icon: Palette,
      showInSidebar: true,
      permissions: ARTWORK_ACCESS,
      modulePrefix: ARTWORK_MODULE_PREFIX,
    },
  ],
};
