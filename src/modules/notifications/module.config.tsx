import { Bell } from 'lucide-react';
import { lazy } from 'react';

import { NOTIFICATION_PERMISSIONS } from '@/config/permissions';
import type { ModuleConfig } from '@/core/types';

const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SendNotificationPage = lazy(() => import('./pages/SendNotificationPage'));

export const notificationsModuleConfig: ModuleConfig = {
  name: 'notifications',
  routes: [
    {
      path: '/notifications',
      element: <NotificationsPage />,
      layout: 'main',
    },
    {
      path: '/notifications/send',
      element: <SendNotificationPage />,
      layout: 'main',
      permissions: [NOTIFICATION_PERMISSIONS.SEND],
    },
  ],
  navigation: [
    {
      path: '/notifications',
      title: 'Notifications',
      icon: Bell,
      showInSidebar: true,
      permissions: [NOTIFICATION_PERMISSIONS.SEND, NOTIFICATION_PERMISSIONS.SEND_BULK],
      hasSubmenu: true,
      children: [
        {
          path: '/notifications',
          title: 'All Notifications',
        },
        {
          path: '/notifications/send',
          title: 'Send Notification',
          permissions: [NOTIFICATION_PERMISSIONS.SEND],
        },
      ],
    },
  ],
};
