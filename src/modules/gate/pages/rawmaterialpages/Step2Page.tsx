import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Shield, Clock } from 'lucide-react'
import {
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'
import { useCreateSecurityCheck, useSecurityCheck } from '../../api/securityCheck.queries'
import { useVehicleEntry } from '../../api/vehicleEntry.queries'
import { useEntryId } from '../../hooks'
import {
  StepHeader,
  StepFooter,
  StepLoadingSpinner,
  FillDataAlert,
} from '../../components'
import { WIZARD_CONFIG } from '../../constants'
import { isNotFoundError as checkNotFoundError, getErrorMessage } from '../../utils'
import { cn } from '@/shared/utils'
import type { ApiError } from '@/core/api'

export default function Step2Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { entryId, entryIdNumber, isEditMode } = useEntryId()
  const currentStep = WIZARD_CONFIG.STEPS.SECURITY_CHECK
  const createSecurityCheck = useCreateSecurityCheck(entryIdNumber || 0)
  const {
    data: securityCheckData,
    isLoading: isLoadingSecurityCheck,
    error: securityCheckError,
  } = useSecurityCheck(isEditMode && entryIdNumber ? entryIdNumber : null)
  const { data: vehicleEntryData } = useVehicleEntry(
    isEditMode && entryIdNumber ? entryIdNumber : null
  )

  // State to track if we should behave like create mode (when Fill Data is clicked)
  const [fillDataMode, setFillDataMode] = useState(false)
  // State to track if Update button has been clicked (enables editing)
  const [updateMode, setUpdateMode] = useState(false)
  // State to keep button disabled after API success until navigation completes
  const [isNavigating, setIsNavigating] = useState(false)
  const effectiveEditMode = isEditMode && !fillDataMode

  // Check if error is "not found" error
  const isNotFoundError = checkNotFoundError(securityCheckError)

  // Fields are read-only when:
  // 1. In edit mode AND update mode is not active AND there's no not found error, OR
  // 2. There's a not found error AND fill data mode is not active
  const isReadOnly =
    (effectiveEditMode && !updateMode && !isNotFoundError) || (isNotFoundError && !fillDataMode)
  const canUpdate = effectiveEditMode && vehicleEntryData?.status !== 'COMPLETED'

  // Form state
  const [formData, setFormData] = useState({
    vehicleCondition: '',
    fireExtinguisherAvailable: '',
    tyreCondition: '',
    sealNumberBefore: '',
    sealNumberAfter: '',
    alcoholTestRequired: 'Not Required',
    entryTime: '',
    inspectedByName: '',
    remarks: '',
  })

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Auto-capture entry time (only in create mode or fill data mode)
  useEffect(() => {
    if (!effectiveEditMode) {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      setFormData((prev) => ({
        ...prev,
        entryTime: `${hours}:${minutes}`,
      }))
    }
  }, [effectiveEditMode])

  // Load security check data when in edit mode
  useEffect(() => {
    if (effectiveEditMode && securityCheckData) {
      // Convert API boolean values to form dropdown values
      const vehicleCondition = securityCheckData.vehicle_condition_ok
        ? 'Loaded' // Default to Loaded if true, could be Empty or Loaded
        : 'Partially Loaded'

      const tyreCondition = securityCheckData.tyre_condition_ok
        ? 'Good' // Default to Good if true, could be Good or Fair
        : 'Poor'

      const fireExtinguisher = securityCheckData.fire_extinguisher_available ? 'Yes' : 'No'

      // Convert alcohol test data
      let alcoholTest = 'Not Required'
      if (securityCheckData.alcohol_test_done) {
        alcoholTest = securityCheckData.alcohol_test_passed ? 'Passed' : 'Failed'
      }

      // Parse inspection_time to get time component
      let entryTime = ''
      if (securityCheckData.inspection_time) {
        try {
          const date = new Date(securityCheckData.inspection_time)
          const hours = date.getHours().toString().padStart(2, '0')
          const minutes = date.getMinutes().toString().padStart(2, '0')
          entryTime = `${hours}:${minutes}`
        } catch {
          // If parsing fails, use current time
          const now = new Date()
          const hours = now.getHours().toString().padStart(2, '0')
          const minutes = now.getMinutes().toString().padStart(2, '0')
          entryTime = `${hours}:${minutes}`
        }
      }

      setFormData({
        vehicleCondition,
        fireExtinguisherAvailable: fireExtinguisher,
        tyreCondition,
        sealNumberBefore: securityCheckData.seal_no_before || '',
        sealNumberAfter: securityCheckData.seal_no_after || '',
        alcoholTestRequired: alcoholTest,
        entryTime,
        inspectedByName: securityCheckData.inspected_by_name || '',
        remarks: securityCheckData.remarks || '',
      })
    }
  }, [effectiveEditMode, securityCheckData])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (apiErrors[field]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/raw-materials/edit/${entryId}/step1`)
    } else {
      navigate('/gate/raw-materials/new')
    }
  }

  const handleFillData = () => {
    setFillDataMode(true)
    // Auto-capture entry time when switching to fill data mode
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    setFormData((prev) => ({
      ...prev,
      entryTime: `${hours}:${minutes}`,
    }))
  }

  const handleUpdate = () => {
    setUpdateMode(true)
  }

  const handleNext = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing. Please go back to step 1.' })
      return
    }

    // In edit mode (and not fill data mode and not update mode), just navigate without API call
    if (effectiveEditMode && !updateMode) {
      navigate(`/gate/raw-materials/edit/${entryId}/step3`)
      return
    }

    setApiErrors({})

    // Validation
    if (!formData.vehicleCondition) {
      setApiErrors({ vehicleCondition: 'Please select vehicle condition' })
      return
    }
    if (!formData.fireExtinguisherAvailable) {
      setApiErrors({ fireExtinguisherAvailable: 'Please select fire extinguisher availability' })
      return
    }
    if (!formData.tyreCondition) {
      setApiErrors({ tyreCondition: 'Please select tyre condition' })
      return
    }
    if (!formData.sealNumberBefore) {
      setApiErrors({ sealNumberBefore: 'Please enter seal number (before)' })
      return
    }
    if (!formData.inspectedByName) {
      setApiErrors({ inspectedByName: 'Please enter inspector name' })
      return
    }

    try {
      // Convert form values to API format (booleans)
      // vehicle_condition_ok: true if condition is acceptable (Empty or Loaded are typically OK)
      const vehicleConditionOk =
        formData.vehicleCondition === 'Empty' || formData.vehicleCondition === 'Loaded'

      // tyre_condition_ok: true if condition is acceptable (Good or Fair)
      const tyreConditionOk = formData.tyreCondition === 'Good' || formData.tyreCondition === 'Fair'

      // fire_extinguisher_available: true if Yes
      const fireExtinguisherAvailable = formData.fireExtinguisherAvailable === 'Yes'

      // Alcohol test logic
      const alcoholTestDone = formData.alcoholTestRequired !== 'Not Required'
      const alcoholTestPassed = formData.alcoholTestRequired === 'Passed'

      await createSecurityCheck.mutateAsync({
        vehicle_condition_ok: vehicleConditionOk,
        tyre_condition_ok: tyreConditionOk,
        fire_extinguisher_available: fireExtinguisherAvailable,
        seal_no_before: formData.sealNumberBefore,
        seal_no_after: formData.sealNumberAfter || undefined,
        alcohol_test_done: alcoholTestDone,
        alcohol_test_passed: alcoholTestDone ? alcoholTestPassed : undefined,
        inspected_by_name: formData.inspectedByName,
        remarks: formData.remarks || undefined,
      })

      // Navigate to step 3
      setIsNavigating(true)
      if (isEditMode) {
        navigate(`/gate/raw-materials/edit/${entryId}/step3`)
      } else {
        navigate(`/gate/raw-materials/new/step3?entryId=${entryId}`)
      }
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0]
          }
        })
        setApiErrors(fieldErrors)
      } else {
        setApiErrors({ general: apiError.message || 'Failed to save security checks' })
      }
    }
  }

  // Format time for display
  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour12 = parseInt(hours) % 12 || 12
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  if (effectiveEditMode && isLoadingSecurityCheck) {
    return <StepLoadingSpinner />
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={currentStep} error={apiErrors.general} />

      {/* Show not found error with Fill Data button */}
      {effectiveEditMode && isNotFoundError && !fillDataMode && (
        <FillDataAlert
          message={getErrorMessage(securityCheckError, 'Security check not found')}
          onFillData={handleFillData}
        />
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
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    apiErrors.vehicleCondition && 'border-destructive'
                  )}
                  value={formData.vehicleCondition}
                  onChange={(e) => handleInputChange('vehicleCondition', e.target.value)}
                  disabled={isReadOnly || createSecurityCheck.isPending}
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
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    apiErrors.fireExtinguisherAvailable && 'border-destructive'
                  )}
                  value={formData.fireExtinguisherAvailable}
                  onChange={(e) => handleInputChange('fireExtinguisherAvailable', e.target.value)}
                  disabled={isReadOnly || createSecurityCheck.isPending}
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
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    apiErrors.tyreCondition && 'border-destructive'
                  )}
                  value={formData.tyreCondition}
                  onChange={(e) => handleInputChange('tyreCondition', e.target.value)}
                  disabled={isReadOnly || createSecurityCheck.isPending}
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
                  onChange={(e) => handleInputChange('sealNumberBefore', e.target.value)}
                  disabled={isReadOnly || createSecurityCheck.isPending}
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
                  onChange={(e) => handleInputChange('sealNumberAfter', e.target.value)}
                  disabled={isReadOnly || createSecurityCheck.isPending}
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
                  onChange={(e) => handleInputChange('alcoholTestRequired', e.target.value)}
                  disabled={isReadOnly || createSecurityCheck.isPending}
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
                  onChange={(e) => handleInputChange('entryTime', e.target.value)}
                  disabled={isReadOnly || createSecurityCheck.isPending}
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
                  onChange={(e) => handleInputChange('inspectedByName', e.target.value)}
                  disabled={isReadOnly || createSecurityCheck.isPending}
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
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  disabled={isReadOnly || createSecurityCheck.isPending}
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
      <StepFooter
        onPrevious={handlePrevious}
        onCancel={() => {
          queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
          navigate('/gate/raw-materials')
        }}
        onNext={handleNext}
        showUpdate={effectiveEditMode && canUpdate && !updateMode}
        onUpdate={handleUpdate}
        isSaving={createSecurityCheck.isPending || isNavigating}
        isEditMode={effectiveEditMode}
        isUpdateMode={updateMode}
      />
    </div>
  )
}
