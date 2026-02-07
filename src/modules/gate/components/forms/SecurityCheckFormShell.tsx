import { Shield, Clock, AlertCircle } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'
import { useScrollToError } from '@/shared/hooks'
import { cn } from '@/shared/utils'

// Type definitions
export interface SecurityCheckFormData {
  vehicleCondition: string
  fireExtinguisherAvailable: string
  tyreCondition: string
  sealNumberBefore: string
  sealNumberAfter: string
  alcoholTestRequired: string
  entryTime: string
  inspectedByName: string
  remarks: string
}

export interface SecurityCheckFormShellProps {
  // Form data (controlled component)
  formData: SecurityCheckFormData
  onFormChange: (field: string, value: string) => void

  // State flags
  isReadOnly: boolean
  isLoading: boolean
  isSaving: boolean

  // Errors
  apiErrors: Record<string, string>

  // Step configuration
  currentStep: number
  totalSteps: number

  // Navigation callbacks
  onPrevious: () => void
  onCancel: () => void
  onNext: () => void
  onUpdate?: () => void

  // Edit mode configuration
  isEditMode: boolean
  canUpdate: boolean
  updateMode: boolean

  // Optional: not found state for edit mode
  showFillDataAlert?: boolean
  onFillData?: () => void
  fillDataMessage?: string

  // Server error message (5xx errors)
  serverError?: string | null

  // Custom content (optional)
  headerTitle?: string
}

// Format time for display
const formatTime = (time: string) => {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour12 = parseInt(hours) % 12 || 12
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minutes} ${ampm}`
}

export function SecurityCheckFormShell({
  formData,
  onFormChange,
  isReadOnly,
  isLoading,
  isSaving,
  apiErrors,
  currentStep,
  totalSteps,
  onPrevious,
  onCancel,
  onNext,
  onUpdate,
  isEditMode,
  canUpdate,
  updateMode,
  showFillDataAlert = false,
  onFillData,
  fillDataMessage = 'Security check not found',
  serverError,
  headerTitle = 'Material Inward',
}: SecurityCheckFormShellProps) {
  const progressPercentage = (currentStep / totalSteps) * 100

  // Scroll to first error when errors occur
  useScrollToError(apiErrors)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {headerTitle} - Step {currentStep} of {totalSteps}
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

      {(serverError || apiErrors.general) && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {serverError || apiErrors.general}
        </div>
      )}

      {/* Show not found error with Fill Data button */}
      {showFillDataAlert && onFillData && (
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {fillDataMessage}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={onFillData}>
              Fill Data
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Security Checks Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicleCondition">
                  Vehicle Condition <span className="text-destructive">*</span>
                </Label>
                <select
                  id="vehicleCondition"
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    apiErrors.vehicleCondition && 'border-destructive'
                  )}
                  value={formData.vehicleCondition}
                  onChange={(e) => onFormChange('vehicleCondition', e.target.value)}
                  disabled={isReadOnly || isSaving}
                >
                  <option value="">Select condition</option>
                  <option value="Empty">Empty</option>
                  <option value="Loaded">Loaded</option>
                  <option value="Partially Loaded">Partially Loaded</option>
                </select>
                {apiErrors.vehicleCondition && (
                  <p className="text-sm text-destructive">{apiErrors.vehicleCondition}</p>
                )}
                {apiErrors.vehicle_condition_ok && (
                  <p className="text-sm text-destructive">{apiErrors.vehicle_condition_ok}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fireExtinguisherAvailable">
                  Fire Extinguisher Available <span className="text-destructive">*</span>
                </Label>
                <select
                  id="fireExtinguisherAvailable"
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    apiErrors.fireExtinguisherAvailable && 'border-destructive'
                  )}
                  value={formData.fireExtinguisherAvailable}
                  onChange={(e) => onFormChange('fireExtinguisherAvailable', e.target.value)}
                  disabled={isReadOnly || isSaving}
                >
                  <option value="">Select option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {apiErrors.fireExtinguisherAvailable && (
                  <p className="text-sm text-destructive">{apiErrors.fireExtinguisherAvailable}</p>
                )}
                {apiErrors.fire_extinguisher_available && (
                  <p className="text-sm text-destructive">
                    {apiErrors.fire_extinguisher_available}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tyreCondition">
                  Tyre Condition <span className="text-destructive">*</span>
                </Label>
                <select
                  id="tyreCondition"
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    apiErrors.tyreCondition && 'border-destructive'
                  )}
                  value={formData.tyreCondition}
                  onChange={(e) => onFormChange('tyreCondition', e.target.value)}
                  disabled={isReadOnly || isSaving}
                >
                  <option value="">Select condition</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Needs Replacement">Needs Replacement</option>
                </select>
                {apiErrors.tyreCondition && (
                  <p className="text-sm text-destructive">{apiErrors.tyreCondition}</p>
                )}
                {apiErrors.tyre_condition_ok && (
                  <p className="text-sm text-destructive">{apiErrors.tyre_condition_ok}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sealNumberBefore">
                  Seal Number (Before) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sealNumberBefore"
                  placeholder="Enter seal number"
                  value={formData.sealNumberBefore}
                  onChange={(e) => onFormChange('sealNumberBefore', e.target.value)}
                  disabled={isReadOnly || isSaving}
                  className={cn(
                    apiErrors.sealNumberBefore || apiErrors.seal_no_before
                      ? 'border-destructive'
                      : ''
                  )}
                />
                {apiErrors.sealNumberBefore && (
                  <p className="text-sm text-destructive">{apiErrors.sealNumberBefore}</p>
                )}
                {apiErrors.seal_no_before && (
                  <p className="text-sm text-destructive">{apiErrors.seal_no_before}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sealNumberAfter">Seal Number (After)</Label>
                <Input
                  id="sealNumberAfter"
                  placeholder="Enter seal number after inspection"
                  value={formData.sealNumberAfter}
                  onChange={(e) => onFormChange('sealNumberAfter', e.target.value)}
                  disabled={isReadOnly || isSaving}
                  className={cn(apiErrors.seal_no_after ? 'border-destructive' : '')}
                />
                {apiErrors.seal_no_after && (
                  <p className="text-sm text-destructive">{apiErrors.seal_no_after}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="alcoholTestRequired">Alcohol Test Required</Label>
                <select
                  id="alcoholTestRequired"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.alcoholTestRequired}
                  onChange={(e) => onFormChange('alcoholTestRequired', e.target.value)}
                  disabled={isReadOnly || isSaving}
                >
                  <option value="Not Required">Not Required</option>
                  <option value="Required">Required</option>
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entryTime">
                  Entry Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="entryTime"
                  type="time"
                  value={formData.entryTime}
                  onChange={(e) => onFormChange('entryTime', e.target.value)}
                  disabled={isReadOnly || isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspectedByName">
                  Inspected By Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="inspectedByName"
                  placeholder="Enter inspector name"
                  value={formData.inspectedByName}
                  onChange={(e) => onFormChange('inspectedByName', e.target.value)}
                  disabled={isReadOnly || isSaving}
                  className={cn(
                    apiErrors.inspectedByName || apiErrors.inspected_by_name
                      ? 'border-destructive'
                      : ''
                  )}
                />
                {apiErrors.inspectedByName && (
                  <p className="text-sm text-destructive">{apiErrors.inspectedByName}</p>
                )}
                {apiErrors.inspected_by_name && (
                  <p className="text-sm text-destructive">{apiErrors.inspected_by_name}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <textarea
                  id="remarks"
                  rows={3}
                  className={cn(
                    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    apiErrors.remarks && 'border-destructive'
                  )}
                  placeholder="Enter any additional remarks..."
                  value={formData.remarks}
                  onChange={(e) => onFormChange('remarks', e.target.value)}
                  disabled={isReadOnly || isSaving}
                />
                {apiErrors.remarks && (
                  <p className="text-sm text-destructive">{apiErrors.remarks}</p>
                )}
              </div>
            </div>

            {/* Entry Time Info Box */}
            <div className="mt-4 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Entry Time (Auto-captured)
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatTime(formData.entryTime)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onPrevious}>
          ← Previous
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {isEditMode ? (
          <>
            {canUpdate && !updateMode && onUpdate && (
              <Button type="button" onClick={onUpdate}>
                Update
              </Button>
            )}
            <Button type="button" onClick={onNext} disabled={isSaving}>
              {updateMode ? (isSaving ? 'Saving...' : 'Save and Next →') : 'Next →'}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={onNext} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save and Next →'}
          </Button>
        )}
      </div>
    </div>
  )
}
