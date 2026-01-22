import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui'

interface StepFooterProps {
  /** Handler for previous button click */
  onPrevious?: () => void
  /** Handler for cancel button click */
  onCancel: () => void
  /** Handler for next/save button click */
  onNext: () => void
  /** Whether to show the previous button */
  showPrevious?: boolean
  /** Whether to show the update button (edit mode) */
  showUpdate?: boolean
  /** Handler for update button click */
  onUpdate?: () => void
  /** Whether the form is currently saving */
  isSaving?: boolean
  /** Whether the next button should be disabled */
  isNextDisabled?: boolean
  /** Label for the next button */
  nextLabel?: string
  /** Label when saving */
  savingLabel?: string
  /** Whether in edit mode (affects button labels) */
  isEditMode?: boolean
  /** Whether in update mode (user clicked Update button) */
  isUpdateMode?: boolean
}

/**
 * Shared footer component for wizard steps.
 * Displays navigation buttons: Previous, Cancel, Update (optional), and Next/Save.
 */
export function StepFooter({
  onPrevious,
  onCancel,
  onNext,
  showPrevious = true,
  showUpdate = false,
  onUpdate,
  isSaving = false,
  isNextDisabled = false,
  nextLabel,
  savingLabel = 'Saving...',
  isEditMode = false,
  isUpdateMode = false,
}: StepFooterProps) {
  // Determine next button label
  const getNextLabel = () => {
    if (nextLabel) return nextLabel
    if (isSaving) return savingLabel
    if (isEditMode && !isUpdateMode) return 'Next →'
    return 'Save and Next →'
  }

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
      {showPrevious && onPrevious ? (
        <Button type="button" variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
      ) : (
        <div /> // Spacer for alignment
      )}
      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {showUpdate && onUpdate && (
          <Button type="button" onClick={onUpdate}>
            Update
          </Button>
        )}
        <Button type="button" onClick={onNext} disabled={isSaving || isNextDisabled}>
          {getNextLabel()}
        </Button>
      </div>
    </div>
  )
}
