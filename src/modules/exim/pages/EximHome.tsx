import { Navigate } from 'react-router-dom';

import { EXIM_LICENCE_ACCESS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';

/** `/exim` itself: the licence register, or the rates for somebody who holds only those. */
export default function EximHome() {
  const { hasAnyPermission } = usePermission();
  return (
    <Navigate
      to={hasAnyPermission(EXIM_LICENCE_ACCESS) ? '/exim/licences' : '/exim/customs-rates'}
      replace
    />
  );
}
