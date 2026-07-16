import { Users } from 'lucide-react';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';

import { LABOUR_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

// The Labour entry screen physically lives in the gate module (it reuses
// gate-domain masters: Contractor, Department). This top-level Labour module
// gives it its own sidebar entry and /labour route. The recorded data is then
// marked out from the gate's "Labour Out" screen (Gate Out section).
const LabourModulePage = lazy(() => import('@/modules/gate/pages/labourGatePages/LabourModulePage'));

// The Labour module is the HOD department-allocation screen. Allocating (or just
// viewing) the split is what grants access — the gate person's raw in/out
// permissions deliberately do NOT light up this module.
const LABOUR_MODULE_PERMISSIONS = [LABOUR_PERMISSIONS.ALLOCATE, LABOUR_PERMISSIONS.VIEW];

/**
 * Labour module configuration — record casual-labour headcount per
 * department + contractor. A single entry screen; marking labour out happens
 * on the gate's Labour Out board.
 */
export const labourModuleConfig: ModuleConfig = {
  name: 'labour',
  routes: [
    {
      path: '/labour',
      element: <LabourModulePage />,
      layout: 'main',
      permissions: LABOUR_MODULE_PERMISSIONS,
      breadcrumb: { label: 'Labour' },
    },
  ],
  navigation: [
    {
      path: '/labour',
      title: 'Labour',
      icon: Users,
      showInSidebar: true,
      permissions: LABOUR_MODULE_PERMISSIONS,
    },
  ],
};
