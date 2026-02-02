import { Badge } from '@/shared/components/ui'
import { QCStatus } from '../types/qualityCheck.types'
import { QC_STATUS_LABELS } from '../constants/qualityCheck.constants'

interface QCStatusBadgeProps {
  status: QCStatus
}

const statusVariantMap: Record<
  QCStatus,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning'
> = {
  [QCStatus.PENDING]: 'warning',
  [QCStatus.PASSED]: 'success',
  [QCStatus.FAILED]: 'destructive',
  [QCStatus.ON_HOLD]: 'secondary',
}

export function QCStatusBadge({ status }: QCStatusBadgeProps) {
  return <Badge variant={statusVariantMap[status]}>{QC_STATUS_LABELS[status]}</Badge>
}

// Legacy export for backwards compatibility
export { QCStatusBadge as QualityStatusBadge }
