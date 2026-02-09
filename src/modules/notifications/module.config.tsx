import { lazy } from 'react'
import { Bell } from 'lucide-react'
import type { ModuleConfig } from '@/core/types'
import { NOTIFICATION_PERMISSIONS, NOTIFICATION_MODULE_PREFIX } from '@/config/permissions'

const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const SendNotificationPage = lazy(() => import('./pages/SendNotificationPage'))

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
      modulePrefix: NOTIFICATION_MODULE_PREFIX,
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
}
