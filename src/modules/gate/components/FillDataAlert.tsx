import { AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui'

interface FillDataAlertProps {
  /** Error message to display */
  message: string
  /** Handler for Fill Data button click */
  onFillData: () => void
}

/**
 * Alert component shown when data is not found in edit mode.
 * Provides a "Fill Data" button to allow users to enter new data.
 */
export function FillDataAlert({ message, onFillData }: FillDataAlertProps) {
  return (
    <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{message}</span>
        </div>
        <Button onClick={onFillData} size="sm">
          Fill Data
        </Button>
      </div>
    </div>
  )
}
