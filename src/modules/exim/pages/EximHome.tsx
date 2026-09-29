import { Navigate } from 'react-router-dom';

import { usePermission } from '@/core/auth/hooks/usePermission';

import { eximModuleConfig } from '../module.config';

/** `/exim` itself: the first screen in the menu the reader may open. */
export default function EximHome() {
  const { hasAnyPermission } = usePermission();
  const screens = eximModuleConfig.navigation?.[0]?.children ?? [];
  const first = screens.find((screen) => hasAnyPermission([...(screen.permissions ?? [])]));
  // The route is gated on EXIM_ACCESS, which is every screen's rights, so one
  // of them is always open; the rates page is the smallest fallback.
  return <Navigate to={first?.path ?? '/exim/customs-rates'} replace />;
}
