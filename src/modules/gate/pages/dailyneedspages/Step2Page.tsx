import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateSecurityCheck, useSecurityCheck } from '../../api/securityCheck/securityCheck.queries'
import { useVehicleEntry } from '../../api/vehicle/vehicleEntry.queries'
import { useEntryId } from '../../hooks'
import { SecurityCheckFormShell, type SecurityCheckFormData } from '../../components'
import { isNotFoundError as checkNotFoundError, isServerError as checkServerError, getErrorMessage, getServerErrorMessage } from '../../utils'
import type { ApiError } from '@/core/api'

export default function Step2Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { entryId, entryIdNumber, isEditMode } = useEntryId()
  const currentStep = 2
  const totalSteps = 3
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
  // Check if error is a server error (5xx)
  const hasServerError = checkServerError(securityCheckError)

  // Fields are read-only when:
  // 1. In edit mode AND update mode is not active AND there's no not found error, OR
  // 2. There's a not found error AND fill data mode is not active
  const isReadOnly =
    (effectiveEditMode && !updateMode && !isNotFoundError) || (isNotFoundError && !fillDataMode)
  const canUpdate = effectiveEditMode && vehicleEntryData?.status !== 'COMPLETED'

  // Form state
  const [formData, setFormData] = useState<SecurityCheckFormData>({
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Setting initial time on mount is a valid pattern
      setFormData((prev: SecurityCheckFormData) => ({
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
        ? 'Loaded'
        : 'Partially Loaded'

      const tyreCondition = securityCheckData.tyre_condition_ok ? 'Good' : 'Poor'

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
          const now = new Date()
          const hours = now.getHours().toString().padStart(2, '0')
          const minutes = now.getMinutes().toString().padStart(2, '0')
          entryTime = `${hours}:${minutes}`
        }
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with fetched data is a valid pattern
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
    setFormData((prev: SecurityCheckFormData) => ({ ...prev, [field]: value }))
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
      navigate(`/gate/daily-needs/edit/${entryId}/step1`)
    } else {
      navigate('/gate/daily-needs/new')
    }
  }

  const handleCancel = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    navigate('/gate/daily-needs')
  }

  const handleFillData = () => {
    setFillDataMode(true)
    // Auto-capture entry time when switching to fill data mode
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    setFormData((prev: SecurityCheckFormData) => ({
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
      navigate(`/gate/daily-needs/edit/${entryId}/step3`)
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
      const vehicleConditionOk =
        formData.vehicleCondition === 'Empty' || formData.vehicleCondition === 'Loaded'
      const tyreConditionOk = formData.tyreCondition === 'Good' || formData.tyreCondition === 'Fair'
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
        navigate(`/gate/daily-needs/edit/${entryId}/step3`)
      } else {
        navigate(`/gate/daily-needs/new/step3?entryId=${entryId}`)
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

  return (
    <SecurityCheckFormShell
      formData={formData}
      onFormChange={handleInputChange}
      isReadOnly={isReadOnly}
      isLoading={effectiveEditMode && isLoadingSecurityCheck}
      isSaving={createSecurityCheck.isPending || isNavigating}
      apiErrors={apiErrors}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onPrevious={handlePrevious}
      onCancel={handleCancel}
      onNext={handleNext}
      onUpdate={handleUpdate}
      isEditMode={effectiveEditMode}
      canUpdate={canUpdate}
      updateMode={updateMode}
      showFillDataAlert={effectiveEditMode && isNotFoundError && !fillDataMode}
      onFillData={handleFillData}
      fillDataMessage={getErrorMessage(securityCheckError, 'Security check not found')}
      serverError={hasServerError ? getServerErrorMessage() : null}
      headerTitle="Daily Needs Entry"
    />
  )
}
