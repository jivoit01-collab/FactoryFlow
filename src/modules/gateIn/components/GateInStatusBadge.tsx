import { Badge } from '@/shared/components/ui'
import { GateInStatus } from '../types/gateIn.types'
import { GATE_IN_STATUS_LABELS } from '../constants/gateIn.constants'

interface GateInStatusBadgeProps {
  status: GateInStatus
}

const statusVariantMap: Record<
  GateInStatus,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning'
> = {
  [GateInStatus.PENDING]: 'warning',
  [GateInStatus.APPROVED]: 'success',
  [GateInStatus.REJECTED]: 'destructive',
  [GateInStatus.IN_PROGRESS]: 'secondary',
}

export function GateInStatusBadge({ status }: GateInStatusBadgeProps) {
  return <Badge variant={statusVariantMap[status]}>{GATE_IN_STATUS_LABELS[status]}</Badge>
}
