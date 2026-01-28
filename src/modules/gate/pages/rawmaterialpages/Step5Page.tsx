import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ArrowLeft, AlertCircle, Save, RefreshCw, Lock } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'
import { cn } from '@/shared/utils'
import type { ApiError } from '@/core/api/types'
import { usePOReceipts } from '../../api/poReceipt.queries'
import { qualityControlApi, type QualityControl } from '../../api/qualityControl.api'
import { useVehicleEntry } from '../../api/vehicleEntry.queries'
import { useEntryId } from '../../hooks'

interface ItemFormData {
  poItemId: number // ID to use for API call
  poItemCode: string
  itemName: string
  poNumber: string
  qcStatus: string
  batchNo: string
  expiryDate: string
  remarks: string
}

export default function Step5Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { entryId, entryIdNumber, isEditMode } = useEntryId()
  const totalSteps = 5
  const currentStep = 5

  // State to track if we should behave like create mode (when Fill Data is clicked)
  const [fillDataMode, setFillDataMode] = useState(false)
  // State to keep button disabled after click until navigation completes
  const [isNavigating, setIsNavigating] = useState(false)
  const effectiveEditMode = isEditMode && !fillDataMode

  // Fetch vehicle entry to check status
  const { data: vehicleEntryData } = useVehicleEntry(
    isEditMode && entryIdNumber ? entryIdNumber : null
  )

  // Fetch PO receipts to get items
  const {
    data: poReceipts = [],
    isLoading: isLoadingPOReceipts,
    error: poReceiptsError,
  } = usePOReceipts(entryIdNumber || null)

  // State to track QC data for each item
  const [qcDataMap, setQcDataMap] = useState<Record<number, QualityControl | null>>({})
  const [isLoadingQC, setIsLoadingQC] = useState(false)
  const [qcErrors, setQcErrors] = useState<Record<number, ApiError>>({})

  // State to track which items are being saved
  const [savingItems, setSavingItems] = useState<Record<number, boolean>>({})
  // State to track which items are in edit mode (for individual update)
  const [itemEditModes, setItemEditModes] = useState<Record<number, boolean>>({})
  // State to track which items have been saved successfully
  const [savedItems, setSavedItems] = useState<Record<number, boolean>>({})

  // Flatten all items from all PO receipts into a single array
  const allItems = useMemo(() => {
    const items: ItemFormData[] = []
    poReceipts.forEach((receipt) => {
      receipt.items.forEach((item, index) => {
        // Use item.id if available, otherwise generate a temporary ID
        const poItemId = item.id || (receipt.id || 0) * 1000 + index
        items.push({
          poItemId,
          poItemCode: item.po_item_code,
          itemName: item.item_name,
          poNumber: receipt.po_number,
          qcStatus: 'PENDING',
          batchNo: '',
          expiryDate: '',
          remarks: '',
        })
      })
    })
    return items
  }, [poReceipts])

  // Form state for each item
  const [itemForms, setItemForms] = useState<Record<number, ItemFormData>>({})
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Fetch QC data for each item in edit mode
  useEffect(() => {
    if (effectiveEditMode && allItems.length > 0 && !isLoadingQC) {
      setIsLoadingQC(true)
      const fetchQCData = async () => {
        const qcData: Record<number, QualityControl | null> = {}
        const errors: Record<number, ApiError> = {}

        for (const item of allItems) {
          try {
            const qc = await qualityControlApi.get(item.poItemId)
            qcData[item.poItemId] = qc
          } catch (error) {
            const apiError = error as ApiError
            if (apiError.status !== 404) {
              errors[item.poItemId] = apiError
            } else {
              qcData[item.poItemId] = null
            }
          }
        }

        setQcDataMap(qcData)
        setQcErrors(errors)
        setIsLoadingQC(false)
      }

      fetchQCData()
    }
  }, [effectiveEditMode, allItems])

  // Initialize form data when items are loaded (only on first load)
  useEffect(() => {
    if (allItems.length > 0 && Object.keys(itemForms).length === 0) {
      const initialForms: Record<number, ItemFormData> = {}
      const initialSaved: Record<number, boolean> = {}

      allItems.forEach((item) => {
        // Use default values initially
        initialForms[item.poItemId] = { ...item }
        initialSaved[item.poItemId] = false
      })
      setItemForms(initialForms)
      setSavedItems(initialSaved)
    }
  }, [allItems])

  // Load QC data into forms when fetched in edit mode
  useEffect(() => {
    if (effectiveEditMode && Object.keys(qcDataMap).length > 0) {
      const updatedForms: Record<number, ItemFormData> = {}
      const updatedSaved: Record<number, boolean> = {}

      allItems.forEach((item) => {
        const qcData = qcDataMap[item.poItemId]
        if (qcData) {
          // Load existing QC data
          updatedForms[item.poItemId] = {
            ...item,
            qcStatus: qcData.qc_status,
            batchNo: qcData.batch_no,
            expiryDate: qcData.expiry_date || '',
            remarks: qcData.remarks || '',
          }
          updatedSaved[item.poItemId] = true
        } else {
          // No QC data - use default values if not already set
          updatedForms[item.poItemId] = itemForms[item.poItemId] || { ...item }
          updatedSaved[item.poItemId] = false
        }
      })
      setItemForms(updatedForms)
      setSavedItems(updatedSaved)
    }
  }, [effectiveEditMode, qcDataMap, allItems])

  const handleItemChange = (poItemId: number, field: keyof ItemFormData, value: string) => {
    // Check if this item is editable
    const hasExistingData = qcDataMap[poItemId] !== null && qcDataMap[poItemId] !== undefined
    const isItemInEditMode = itemEditModes[poItemId]
    const isItemSaved = savedItems[poItemId]

    // Item is not editable if: saved (and not in edit mode) OR (has existing data from API and not in edit mode)
    if (
      (isItemSaved && !isItemInEditMode) ||
      (effectiveEditMode && hasExistingData && !isItemInEditMode)
    )
      return

    setItemForms((prev) => ({
      ...prev,
      [poItemId]: {
        ...prev[poItemId],
        [field]: value,
      },
    }))
    // Clear error for this field
    const errorKey = `${poItemId}_${field}`
    if (apiErrors[errorKey]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
    // Mark item as unsaved if it was previously saved
    if (savedItems[poItemId]) {
      setSavedItems((prev) => ({ ...prev, [poItemId]: false }))
    }
  }

  const handleFillData = () => {
    setFillDataMode(true)
    // Reset form data to defaults
    const initialForms: Record<number, ItemFormData> = {}
    allItems.forEach((item) => {
      initialForms[item.poItemId] = { ...item }
    })
    setItemForms(initialForms)
    setSavedItems({})
    setItemEditModes({})
    setApiErrors({})
  }

  const handleItemUpdate = (poItemId: number) => {
    setItemEditModes((prev) => ({ ...prev, [poItemId]: true }))
  }

  const handleSaveItem = async (poItemId: number) => {
    const formData = itemForms[poItemId]
    if (!formData) return

    // Validation
    if (!formData.batchNo.trim()) {
      setApiErrors((prev) => ({ ...prev, [`${poItemId}_batchNo`]: 'Please enter batch number' }))
      return
    }
    if (!formData.expiryDate.trim()) {
      setApiErrors((prev) => ({ ...prev, [`${poItemId}_expiryDate`]: 'Please enter expiry date' }))
      return
    }

    setSavingItems((prev) => ({ ...prev, [poItemId]: true }))

    // Clear previous errors for this item
    setApiErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[`${poItemId}_general`]
      delete newErrors[`${poItemId}_batchNo`]
      delete newErrors[`${poItemId}_expiryDate`]
      delete newErrors[`${poItemId}_qcStatus`]
      delete newErrors[`${poItemId}_remarks`]
      return newErrors
    })

    try {
      await qualityControlApi.create(poItemId, {
        qc_status: formData.qcStatus,
        batch_no: formData.batchNo,
        expiry_date: formData.expiryDate,
        remarks: formData.remarks || undefined,
      })

      // Mark as saved and update QC data map
      setSavedItems((prev) => ({ ...prev, [poItemId]: true }))
      setQcDataMap((prev) => ({
        ...prev,
        [poItemId]: {
          id: poItemId,
          qc_status: formData.qcStatus,
          batch_no: formData.batchNo,
          expiry_date: formData.expiryDate,
          remarks: formData.remarks,
          sample_collected: false,
          inspected_by: 0,
          inspection_time: new Date().toISOString(),
          is_locked: false,
        },
      }))
      // Exit edit mode for this item
      setItemEditModes((prev) => ({ ...prev, [poItemId]: false }))
      // Invalidate gateEntryFullView query so Review page shows updated data
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] })
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[`${poItemId}_${field}`] = messages[0]
          }
        })
        setApiErrors((prev) => ({ ...prev, ...fieldErrors }))
      } else {
        setApiErrors((prev) => ({
          ...prev,
          [`${poItemId}_general`]: apiError.message || 'Failed to save quality control data',
        }))
      }
    } finally {
      setSavingItems((prev) => ({ ...prev, [poItemId]: false }))
    }
  }

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/raw-materials/edit/${entryId}/step4`)
    } else {
      navigate(`/gate/raw-materials/new/step4?entryId=${entryId || 'test-12345'}`)
    }
  }

  const handleNext = () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing. Please go back to step 1.' })
      return
    }

    // Navigate to final review page
    setIsNavigating(true)
    if (isEditMode) {
      navigate(`/gate/raw-materials/edit/${entryId}/review`)
    } else {
      navigate(`/gate/raw-materials/new/review?entryId=${entryId}`)
    }
  }

  const progressPercentage = (currentStep / totalSteps) * 100

  // Check if any items have QC data
  const hasAnyQCData = Object.values(qcDataMap).some((qc) => qc !== null)
  const hasNoQCData = effectiveEditMode && !isLoadingQC && allItems.length > 0 && !hasAnyQCData

  // Check if all items are saved
  const allItemsSaved = allItems.length > 0 && allItems.every((item) => savedItems[item.poItemId])

  if (isLoadingPOReceipts || (isEditMode && isLoadingQC)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (poReceiptsError) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load PO receipts. Please go back and try again.</span>
        </div>
      </div>
    )
  }

  if (allItems.length === 0) {
    return (
      <div className="space-y-6 pb-6">
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>No items found. Please go back to step 3 and add PO items.</span>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={handlePrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Material Inward - Step {currentStep} of {totalSteps}
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

      {/* Show Fill Data button when QC data doesn't exist */}
      {hasNoQCData && !fillDataMode && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>No quality control data found for these items.</span>
            </div>
            <Button onClick={handleFillData} size="sm">
              Fill Data
            </Button>
          </div>
        </div>
      )}

      {/* Show QC errors if any */}
      {Object.keys(qcErrors).length > 0 && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Some items failed to load quality control data. Please try again.</span>
        </div>
      )}

      {apiErrors.general && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {apiErrors.general}
        </div>
      )}

      <div className="space-y-6">
        {/* Quality Check & Inspection Section */}
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Quality Check & Inspection
          </h3>

          {/* Item Forms */}
          <div className="space-y-4">
            {allItems.map((item) => {
              const formData = itemForms[item.poItemId] || item
              const qcData = qcDataMap[item.poItemId]
              const hasExistingData = qcData !== null && qcData !== undefined
              const isItemInEditMode = itemEditModes[item.poItemId]
              const isSaving = savingItems[item.poItemId]
              const isSaved = savedItems[item.poItemId]

              // Item is locked if: is_locked is true OR status is PASSED/FAILED
              const isItemLocked =
                hasExistingData &&
                (qcData.is_locked || qcData.qc_status === 'PASSED' || qcData.qc_status === 'FAILED')

              // Item is read-only if: locked OR saved (and not in edit mode) OR (has existing data AND not in edit mode) OR (no QC data exists for any item - waiting for Fill Data)
              const isItemReadOnly =
                isItemLocked ||
                (isSaved && !isItemInEditMode) ||
                (effectiveEditMode && hasExistingData && !isItemInEditMode) ||
                hasNoQCData
              // Can update if: (saved OR has existing data) AND not locked AND not already in edit mode AND entry is not completed
              const canItemUpdate =
                (isSaved || hasExistingData) &&
                !isItemLocked &&
                !isItemInEditMode &&
                vehicleEntryData?.status !== 'COMPLETED'
              // Show save button if: not locked AND not read-only
              const showSaveButton = !isItemLocked && !isItemReadOnly

              return (
                <Card
                  key={item.poItemId}
                  className={cn(
                    isSaved && !isItemLocked && 'border-green-500/50',
                    isItemLocked && 'border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10'
                  )}
                >
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>
                        Item: {formData.itemName} | PO: {formData.poNumber}
                      </span>
                      <div className="flex items-center gap-2">
                        {isItemLocked ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Lock className="h-4 w-4" />
                            Locked ({qcData?.qc_status})
                          </span>
                        ) : isSaved ? (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Saved
                          </span>
                        ) : null}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Item-specific error */}
                    {apiErrors[`${item.poItemId}_general`] && (
                      <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {apiErrors[`${item.poItemId}_general`]}
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`qcStatus-${item.poItemId}`}>
                          Quality Status <span className="text-destructive">*</span>
                        </Label>
                        <select
                          id={`qcStatus-${item.poItemId}`}
                          className={cn(
                            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            apiErrors[`${item.poItemId}_qcStatus`] && 'border-destructive',
                            isItemReadOnly && 'cursor-not-allowed opacity-50'
                          )}
                          value={formData.qcStatus}
                          onChange={(e) =>
                            handleItemChange(item.poItemId, 'qcStatus', e.target.value)
                          }
                          disabled={isItemReadOnly || isSaving}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="PASSED">Passed</option>
                          <option value="FAILED">Failed</option>
                        </select>
                        {apiErrors[`${item.poItemId}_qcStatus`] && (
                          <p className="text-sm text-destructive">
                            {apiErrors[`${item.poItemId}_qcStatus`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`batchNo-${item.poItemId}`}>
                          Batch / Lot Number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`batchNo-${item.poItemId}`}
                          placeholder="BATCH-2026-001"
                          value={formData.batchNo}
                          onChange={(e) =>
                            handleItemChange(item.poItemId, 'batchNo', e.target.value)
                          }
                          disabled={isItemReadOnly || isSaving}
                          className={cn(
                            apiErrors[`${item.poItemId}_batchNo`] && 'border-destructive',
                            isItemReadOnly && 'cursor-not-allowed opacity-50'
                          )}
                        />
                        {apiErrors[`${item.poItemId}_batchNo`] && (
                          <p className="text-sm text-destructive">
                            {apiErrors[`${item.poItemId}_batchNo`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`expiryDate-${item.poItemId}`}>
                          Expiry Date (if applicable) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`expiryDate-${item.poItemId}`}
                          type="date"
                          placeholder="dd-mm-yyyy"
                          value={formData.expiryDate}
                          onChange={(e) =>
                            handleItemChange(item.poItemId, 'expiryDate', e.target.value)
                          }
                          disabled={isItemReadOnly || isSaving}
                          className={cn(
                            apiErrors[`${item.poItemId}_expiryDate`] && 'border-destructive',
                            isItemReadOnly && 'cursor-not-allowed opacity-50'
                          )}
                        />
                        {apiErrors[`${item.poItemId}_expiryDate`] && (
                          <p className="text-sm text-destructive">
                            {apiErrors[`${item.poItemId}_expiryDate`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`remarks-${item.poItemId}`}>Remarks</Label>
                        <textarea
                          id={`remarks-${item.poItemId}`}
                          rows={3}
                          className={cn(
                            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                            apiErrors[`${item.poItemId}_remarks`] && 'border-destructive',
                            isItemReadOnly && 'cursor-not-allowed opacity-50'
                          )}
                          placeholder="Enter remarks..."
                          value={formData.remarks}
                          onChange={(e) =>
                            handleItemChange(item.poItemId, 'remarks', e.target.value)
                          }
                          disabled={isItemReadOnly || isSaving}
                        />
                        {apiErrors[`${item.poItemId}_remarks`] && (
                          <p className="text-sm text-destructive">
                            {apiErrors[`${item.poItemId}_remarks`]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Item Actions */}
                    <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                      {canItemUpdate && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleItemUpdate(item.poItemId)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Update
                        </Button>
                      )}
                      {showSaveButton && !isItemReadOnly && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveItem(item.poItemId)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              {isItemInEditMode ? 'Save Changes' : 'Save'}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={handlePrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
              navigate('/gate/raw-materials')
            }}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleNext} disabled={isNavigating}>
            {isNavigating
              ? 'Loading...'
              : allItemsSaved || effectiveEditMode
                ? 'Next →'
                : 'Skip to Review →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
