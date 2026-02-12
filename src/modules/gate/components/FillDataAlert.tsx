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
    <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{message}</p>
        </div>
        <Button onClick={onFillData} size="sm" variant="outline">
          Fill Data
        </Button>
      </div>
    </div>
  )
}
