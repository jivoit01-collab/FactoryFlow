import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  PackageCheck,
  Truck,
} from 'lucide-react';

import type { ShipmentStatus } from '../types/dispatch.types';

export const SHIPMENT_STATUS: Record<string, ShipmentStatus> = {
  RELEASED: 'RELEASED',
  PICKING: 'PICKING',
  PACKED: 'PACKED',
  STAGED: 'STAGED',
  LOADING: 'LOADING',
  DISPATCHED: 'DISPATCHED',
  CANCELLED: 'CANCELLED',
} as const;

export const STATUS_CONFIG: Record<
  ShipmentStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: typeof Clock;
  }
> = {
  RELEASED: {
    label: 'Released',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: Clock,
  },
  PICKING: {
    label: 'Picking',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    icon: Package,
  },
  PACKED: {
    label: 'Packed',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: PackageCheck,
  },
  STAGED: {
    label: 'Staged',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    icon: Package,
  },
  LOADING: {
    label: 'Loading',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    icon: Loader2,
  },
  DISPATCHED: {
    label: 'Dispatched',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: Ban,
  },
};

export const STATUS_OPTIONS: { value: ShipmentStatus; label: string }[] = [
  { value: 'RELEASED', label: 'Released' },
  { value: 'PICKING', label: 'Picking' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'STAGED', label: 'Staged' },
  { value: 'LOADING', label: 'Loading' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const DOCK_BAY_RANGE = { min: 19, max: 30 } as const;

export const DOCK_BAY_OPTIONS = Array.from(
  { length: DOCK_BAY_RANGE.max - DOCK_BAY_RANGE.min + 1 },
  (_, i) => {
    const bay = String(DOCK_BAY_RANGE.min + i);
    return { value: bay, label: `Bay ${bay}` };
  },
);

export const TRAILER_CONDITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'CLEAN', label: 'Clean' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'REJECTED', label: 'Rejected' },
];

// Icons for dashboard
export { AlertCircle, CheckCircle2, Clock, Truck };
