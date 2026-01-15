import { Badge } from '@/shared/components/ui'
import { QualityCheckStatus } from '../types/qualityCheck.types'
import { QUALITY_CHECK_STATUS_LABELS } from '../constants/qualityCheck.constants'

interface QualityStatusBadgeProps {
  status: QualityCheckStatus
}

const statusVariantMap: Record<
  QualityCheckStatus,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning'
> = {
  [QualityCheckStatus.PENDING]: 'warning',
  [QualityCheckStatus.PASSED]: 'success',
  [QualityCheckStatus.FAILED]: 'destructive',
  [QualityCheckStatus.PARTIAL]: 'secondary',
}

export function QualityStatusBadge({ status }: QualityStatusBadgeProps) {
  return <Badge variant={statusVariantMap[status]}>{QUALITY_CHECK_STATUS_LABELS[status]}</Badge>
}
