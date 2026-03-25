import { STATUS_CONFIG } from '../constants/dispatch.constants';
import type { ShipmentStatus } from '../types/dispatch.types';

interface ShipmentStatusBadgeProps {
  status: ShipmentStatus;
}

export default function ShipmentStatusBadge({ status }: ShipmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return <span>{status}</span>;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
