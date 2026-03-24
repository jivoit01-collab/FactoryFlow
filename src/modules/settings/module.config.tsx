import { Settings } from 'lucide-react';
import { lazy } from 'react';

import type { ModuleConfig } from '@/core/types';

const WorkflowRulesPage = lazy(() => import('./pages/WorkflowRulesPage'));
const RuleEditorPage = lazy(() => import('./pages/RuleEditorPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));

// Permission constant — matches Django permission
const SETTINGS_PERMISSIONS = {
  VIEW_RULES: 'workflow_rules.can_view_workflow_rules',
  MANAGE_RULES: 'workflow_rules.can_manage_workflow_rules',
};

export const settingsModuleConfig: ModuleConfig = {
  name: 'settings',
  routes: [
    {
      path: '/settings/rules',
      element: <WorkflowRulesPage />,
      layout: 'main',
      permissions: [SETTINGS_PERMISSIONS.VIEW_RULES],
    },
    {
      path: '/settings/rules/new',
      element: <RuleEditorPage />,
      layout: 'main',
      permissions: [SETTINGS_PERMISSIONS.MANAGE_RULES],
    },
    {
      path: '/settings/rules/:ruleId/edit',
      element: <RuleEditorPage />,
      layout: 'main',
      permissions: [SETTINGS_PERMISSIONS.MANAGE_RULES],
    },
    {
      path: '/settings/audit-log',
      element: <AuditLogPage />,
      layout: 'main',
      permissions: [SETTINGS_PERMISSIONS.VIEW_RULES],
    },
  ],
  navigation: [
    {
      path: '/settings/rules',
      title: 'Settings',
      icon: Settings,
      showInSidebar: true,
      permissions: [SETTINGS_PERMISSIONS.VIEW_RULES],
      hasSubmenu: true,
      children: [
        {
          path: '/settings/rules',
          title: 'Workflow Rules',
          permissions: [SETTINGS_PERMISSIONS.VIEW_RULES],
        },
        {
          path: '/settings/audit-log',
          title: 'Audit Log',
          permissions: [SETTINGS_PERMISSIONS.VIEW_RULES],
        },
      ],
    },
  ],
};
