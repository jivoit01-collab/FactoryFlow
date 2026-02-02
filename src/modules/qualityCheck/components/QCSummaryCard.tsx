import { Clock, CheckCircle2, XCircle, PauseCircle } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui'
import { QCStatus } from '../types/qualityCheck.types'
import { QC_STATUS_LABELS, QC_STATUS_COLORS } from '../constants/qualityCheck.constants'
import { cn } from '@/shared/utils'

interface QCSummaryCardProps {
  status: QCStatus
  count: number
  onClick?: () => void
  isActive?: boolean
}

const statusIcons: Record<QCStatus, React.ElementType> = {
  [QCStatus.PENDING]: Clock,
  [QCStatus.PASSED]: CheckCircle2,
  [QCStatus.FAILED]: XCircle,
  [QCStatus.ON_HOLD]: PauseCircle,
}

export function QCSummaryCard({ status, count, onClick, isActive }: QCSummaryCardProps) {
  const colors = QC_STATUS_COLORS[status]
  const Icon = statusIcons[status]

  return (
    <Card
      className={cn(
        colors.bgColor,
        'border cursor-pointer hover:shadow-md transition-shadow min-h-[80px]',
        isActive && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', colors.color)} />
          <span className={cn('text-xl sm:text-2xl font-bold', colors.color)}>{count}</span>
        </div>
        <p className={cn('mt-1 text-xs sm:text-sm font-medium', colors.color)}>
          {QC_STATUS_LABELS[status]}
        </p>
      </CardContent>
    </Card>
  )
}
