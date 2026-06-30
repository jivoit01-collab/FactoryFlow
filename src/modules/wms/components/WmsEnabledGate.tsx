/**
 * Renders its children only while the WMS master flag is on.
 *
 * This is the reusable enforcement point for "when the master flag is off, the
 * app behaves exactly as it does today, with no warehouse steps anywhere."
 * Every WMS feature surface added in later steps (designer, map, scan flows,
 * and any injection into existing screens) should be wrapped in this gate so a
 * single toggle removes them everywhere.
 */
import type { ReactNode } from 'react';

import { useWmsEnabled } from '../store';

interface WmsEnabledGateProps {
  children: ReactNode;
  /** Optional content shown when WMS is disabled (defaults to nothing). */
  fallback?: ReactNode;
}

export function WmsEnabledGate({ children, fallback = null }: WmsEnabledGateProps) {
  const enabled = useWmsEnabled();
  return <>{enabled ? children : fallback}</>;
}
