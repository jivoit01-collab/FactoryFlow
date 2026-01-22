import { AlertCircle } from 'lucide-react'
import { WIZARD_CONFIG } from '../constants'

interface StepHeaderProps {
  currentStep: number
  totalSteps?: number
  title?: string
  error?: string | null
}

/**
 * Shared header component for wizard steps.
 * Displays step progress bar and optional error message.
 */
export function StepHeader({
  currentStep,
  totalSteps = WIZARD_CONFIG.TOTAL_STEPS,
  title = 'Material Inward',
  error,
}: StepHeaderProps) {
  const progressPercentage = (currentStep / totalSteps) * 100

  return (
    <>
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {title} - Step {currentStep} of {totalSteps}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground min-w-[3rem]">
            {Math.round(progressPercentage)}%
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </>
  )
}
