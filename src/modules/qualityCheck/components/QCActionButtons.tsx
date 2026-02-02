import { CheckCircle, XCircle, PauseCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui'

interface QCActionButtonsProps {
  onAccept: () => void
  onReject: () => void
  onHold: () => void
  onCancel: () => void
  isSubmitting?: boolean
  disabled?: boolean
}

export function QCActionButtons({
  onAccept,
  onReject,
  onHold,
  onCancel,
  isSubmitting,
  disabled,
}: QCActionButtonsProps) {
  return (
    <div className="pt-6 border-t mt-6 space-y-3">
      {/* Mobile: Stack vertically, Desktop: Row layout */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
        <Button
          onClick={onAccept}
          disabled={disabled || isSubmitting}
          className="w-full sm:flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
        >
          <CheckCircle className="h-4 w-4" />
          Accept
        </Button>
        <Button
          onClick={onReject}
          disabled={disabled || isSubmitting}
          className="w-full sm:flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white min-h-[44px]"
        >
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
        <Button
          onClick={onHold}
          disabled={disabled || isSubmitting}
          className="w-full sm:flex-1 gap-2 bg-yellow-500 hover:bg-yellow-600 text-white min-h-[44px]"
        >
          <PauseCircle className="h-4 w-4" />
          Hold
        </Button>
      </div>
      {/* Cancel button - full width on mobile */}
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
        className="w-full sm:w-auto min-h-[44px]"
      >
        Cancel
      </Button>
    </div>
  )
}
