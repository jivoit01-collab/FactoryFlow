import { useState, useEffect, useMemo, useRef, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Plus,
  Trash2,
  ArrowLeft,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'
import { useOpenPOs } from '../../api/po/po.queries'
import { useCreatePOReceipt, usePOReceipts } from '../../api/po/poReceipt.queries'
import { useVehicleEntry } from '../../api/vehicle/vehicleEntry.queries'
import { useEntryId } from '../../hooks'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
import { isServerError as checkServerError, getServerErrorMessage } from '../../utils'
import type { ApiError } from '@/core/api/types'
import type { PurchaseOrder } from '../../api/po/po.api'

interface POItemFormData {
  po_item_code: string
  item_name: string
  ordered_qty: number
  received_qty: number // Previously received from other gate entries
  received_qty_now: number // What user is entering now
  remaining_qty_initial: number // Initial remaining from PO (ordered - previously received)
  remaining_qty: number // Auto-calculated: remaining_qty_initial - received_qty_now
  uom: string
}

interface POFormData {
  id: string // Unique ID for this PO form
  supplierName: string
  supplierCode: string
  poNumber: string
  items: POItemFormData[]
}

export default function Step3Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { entryId, entryIdNumber, isEditMode } = useEntryId()
  const totalSteps = 5
  const currentStep = 3

  // Stable ID generation using useId
  const baseId = useId()
  const poFormCounterRef = useRef(1)

  // Fetch existing PO receipts in edit mode
  const {
    data: existingPOReceipts = [],
    isLoading: isLoadingPOReceipts,
    error: poReceiptsError,
  } = usePOReceipts(isEditMode && entryIdNumber ? entryIdNumber : null)

  // State to track if we should behave like create mode (when Fill Data is clicked)
  const [fillDataMode, setFillDataMode] = useState(false)
  // State to track if Update button has been clicked (enables editing)
  const [updateMode, setUpdateMode] = useState(false)
  // State to keep button disabled after API success until navigation completes
  const [isNavigating, setIsNavigating] = useState(false)
  const effectiveEditMode = isEditMode && !fillDataMode

  // Fetch vehicle entry to check status
  const { data: vehicleEntryData } = useVehicleEntry(
    isEditMode && entryIdNumber ? entryIdNumber : null
  )

  // State for multiple PO forms - start with one empty form
  // Note: We use baseId with initial counter of 1 for stable initial ID
  const [poForms, setPoForms] = useState<POFormData[]>([
    {
      id: 'po-initial-1',
      supplierName: '',
      supplierCode: '',
      poNumber: '',
      items: [],
    },
  ])

  // Track which PO dropdown is open and its search term
  const [openPODropdown, setOpenPODropdown] = useState<string | null>(null)
  const [poSearchTerms, setPOSearchTerms] = useState<Record<string, string>>({})

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Track which PO forms have fill data mode enabled (for handling API errors)
  const [fillDataModeForPO, setFillDataModeForPO] = useState<Record<string, boolean>>({})

  const handleSupplierNameChange = (poFormId: string, value: string) => {
    if (effectiveEditMode && !updateMode) return
    setPoForms((prev) =>
      prev.map((form) => (form.id === poFormId ? { ...form, supplierName: value } : form))
    )
    // Clear errors
    if (apiErrors[`${poFormId}_supplierName`]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`${poFormId}_supplierName`]
        return newErrors
      })
    }
  }

  const handleSupplierCodeChange = (poFormId: string, value: string) => {
    if (effectiveEditMode && !fillDataModeForPO[poFormId] && !updateMode) return
    setPoForms((prev) =>
      prev.map((form) => (form.id === poFormId ? { ...form, supplierCode: value } : form))
    )
    // Clear errors
    if (apiErrors[`${poFormId}_supplierCode`]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`${poFormId}_supplierCode`]
        return newErrors
      })
    }
  }

  const handlePOFocus = (poFormId: string) => {
    if (effectiveEditMode && !fillDataModeForPO[poFormId] && !updateMode) return
    const form = poForms.find((f) => f.id === poFormId)
    if (form?.supplierCode) {
      setOpenPODropdown(poFormId)
    }
  }

  const handlePOSelect = (poFormId: string, po: PurchaseOrder) => {
    if (effectiveEditMode && !fillDataModeForPO[poFormId] && !updateMode) return

    setPoForms((prev) =>
      prev.map((form) => {
        if (form.id === poFormId) {
          return {
            ...form,
            poNumber: po.po_number,
            supplierName: po.supplier_name,
            supplierCode: po.supplier_code,
            items: po.items.map((item) => {
              const orderedQty = parseFloat(item.ordered_qty)
              const receivedQty = parseFloat(item.received_qty || '0') // Previously received
              const remainingQtyFromPO = parseFloat(item.remaining_qty) // Remaining from PO
              return {
                po_item_code: item.po_item_code,
                item_name: item.item_name,
                ordered_qty: orderedQty,
                received_qty: receivedQty, // Previously received
                received_qty_now: 0, // User will enter this
                remaining_qty_initial: remainingQtyFromPO, // Store initial remaining
                remaining_qty: remainingQtyFromPO, // Will be recalculated when user enters received_qty_now
                uom: item.uom,
              }
            }),
          }
        }
        return form
      })
    )
    setOpenPODropdown(null)
    setPOSearchTerms((prev) => ({ ...prev, [poFormId]: '' }))
  }

  const handleReceivedQtyChange = (poFormId: string, itemCode: string, value: string) => {
    if (effectiveEditMode && !fillDataModeForPO[poFormId] && !updateMode) return

    const receivedQtyNow = parseFloat(value) || 0
    setPoForms((prev) =>
      prev.map((form) => {
        if (form.id === poFormId) {
          return {
            ...form,
            items: form.items.map((item) => {
              if (item.po_item_code === itemCode) {
                // Calculate remaining: remaining_qty_initial - received_qty_now
                const newRemainingQty = Math.max(0, item.remaining_qty_initial - receivedQtyNow)
                return {
                  ...item,
                  received_qty_now: receivedQtyNow,
                  remaining_qty: newRemainingQty,
                }
              }
              return item
            }),
          }
        }
        return form
      })
    )
    // Clear error for this field and general error if user starts entering value
    if (receivedQtyNow > 0) {
      setApiErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`${poFormId}_item_${itemCode}`]
        delete newErrors[`${poFormId}_received`]
        return newErrors
      })
    } else if (apiErrors[`${poFormId}_item_${itemCode}`]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`${poFormId}_item_${itemCode}`]
        return newErrors
      })
    }
  }

  const handleAddPO = () => {
    // Don't allow adding in edit mode unless fillDataMode is active or any PO has fill data mode
    const hasAnyFillDataMode = Object.values(fillDataModeForPO).some((mode) => mode === true)
    if (effectiveEditMode && !fillDataMode && !hasAnyFillDataMode) return

    // Generate unique ID using counter
    poFormCounterRef.current += 1
    const newId = `${baseId}-po-${poFormCounterRef.current}`

    setPoForms((prev) => [
      ...prev,
      {
        id: newId,
        supplierName: '',
        supplierCode: '',
        poNumber: '',
        items: [],
      },
    ])

    // Clear any errors when adding new PO
    setApiErrors({})
  }

  const handleRemovePO = (poFormId: string) => {
    // Don't allow removing in edit mode unless fillDataMode is active or this PO has fill data mode
    const hasAnyFillDataMode = Object.values(fillDataModeForPO).some((mode) => mode === true)
    const thisPOFillDataMode = fillDataModeForPO[poFormId] || false

    if (
      effectiveEditMode &&
      !fillDataMode &&
      !hasAnyFillDataMode &&
      !thisPOFillDataMode &&
      !updateMode
    )
      return
    if (poForms.length === 1) return // Don't allow removing the last one

    setPoForms((prev) => prev.filter((form) => form.id !== poFormId))

    // Clean up fill data mode for removed PO
    if (fillDataModeForPO[poFormId]) {
      setFillDataModeForPO((prev) => {
        const newState = { ...prev }
        delete newState[poFormId]
        return newState
      })
    }

    // Clean up PO search terms for removed PO
    setPOSearchTerms((prev) => {
      const newState = { ...prev }
      delete newState[poFormId]
      return newState
    })
  }

  const handleFillData = () => {
    setFillDataMode(true)
    poFormCounterRef.current += 1
    setPoForms([
      {
        id: `${baseId}-po-${poFormCounterRef.current}`,
        supplierName: '',
        supplierCode: '',
        poNumber: '',
        items: [],
      },
    ])
    setApiErrors({})
  }

  const handleFillDataForPO = (poFormId: string) => {
    setFillDataModeForPO((prev) => ({ ...prev, [poFormId]: true }))
    // Clear the PO form data to allow fresh entry
    setPoForms((prev) =>
      prev.map((form) =>
        form.id === poFormId
          ? {
              ...form,
              supplierName: '',
              supplierCode: '',
              poNumber: '',
              items: [],
            }
          : form
      )
    )
    setApiErrors({})
  }

  // Load existing PO receipts when in edit mode
  useEffect(() => {
    if (effectiveEditMode && existingPOReceipts.length > 0) {
      const forms: POFormData[] = existingPOReceipts.map((receipt, index) => ({
        id: `po-${receipt.po_number}-${index}`,
        supplierName: receipt.supplier_name,
        supplierCode: receipt.supplier_code,
        poNumber: receipt.po_number,
        items: receipt.items.map((item) => {
          // In edit mode, we need to reconstruct the data
          // The received_qty in the receipt is what was received in this entry
          // We'd need to fetch the PO to get the initial remaining_qty
          // For now, we'll use a placeholder
          const orderedQty = item.ordered_qty
          const receivedQtyNow = item.received_qty
          return {
            po_item_code: item.po_item_code,
            item_name: item.item_name,
            ordered_qty: orderedQty,
            received_qty: 0, // Previously received - would need to fetch from PO
            received_qty_now: receivedQtyNow, // What was received in this entry
            remaining_qty_initial: orderedQty, // Placeholder - would need PO data
            remaining_qty: orderedQty - receivedQtyNow,
            uom: item.uom,
          }
        }),
      }))
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with fetched data is a valid pattern
      setPoForms(forms)
    }
  }, [effectiveEditMode, existingPOReceipts])

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/raw-materials/edit/${entryId}/step2`)
    } else {
      navigate(`/gate/raw-materials/new/step2?entryId=${entryId}`)
    }
  }

  const createPOReceipt = useCreatePOReceipt(entryIdNumber || 0)

  const handleNext = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing. Please go back to step 1.' })
      return
    }

    // In edit mode (and not fill data mode and not update mode), just navigate without API call
    if (effectiveEditMode && !updateMode) {
      navigate(`/gate/raw-materials/edit/${entryId}/step4`)
      return
    }

    // Validation
    for (const form of poForms) {
      if (!form.supplierName.trim()) {
        setApiErrors({ [`${form.id}_supplierName`]: 'Please enter supplier name' })
        return
      }
      if (!form.supplierCode.trim()) {
        setApiErrors({ [`${form.id}_supplierCode`]: 'Please enter supplier code' })
        return
      }
      if (!form.poNumber) {
        setApiErrors({ [`${form.id}_poNumber`]: 'Please select a PO' })
        return
      }
      if (form.items.length === 0) {
        setApiErrors({ [`${form.id}_items`]: 'Please select a PO to load items' })
        return
      }
      // Check if at least one item has received quantity > 0
      const hasReceivedQty = form.items.some((item) => item.received_qty_now > 0)
      if (!hasReceivedQty) {
        // Set errors on all items that don't have received_qty_now > 0
        const itemErrors: Record<string, string> = {
          [`${form.id}_received`]: 'Please enter received quantities for at least one item',
        }
        form.items.forEach((item) => {
          if (!item.received_qty_now || item.received_qty_now <= 0) {
            itemErrors[`${form.id}_item_${item.po_item_code}`] = 'Please enter received quantity'
          }
        })
        setApiErrors(itemErrors)
        return
      }
    }

    setApiErrors({})

    try {
      // Submit all PO receipts
      for (const poForm of poForms) {
        await createPOReceipt.mutateAsync({
          po_number: poForm.poNumber,
          supplier_code: poForm.supplierCode,
          supplier_name: poForm.supplierName,
          items: poForm.items
            .filter((item) => item.received_qty_now > 0)
            .map((item) => ({
              po_item_code: item.po_item_code,
              item_name: item.item_name,
              ordered_qty: item.ordered_qty,
              received_qty: item.received_qty_now, // Send the new received quantity
              uom: item.uom,
            })),
        })
      }

      // Navigate to step 4
      setIsNavigating(true)
      if (isEditMode) {
        navigate(`/gate/raw-materials/edit/${entryId}/step4`)
      } else {
        navigate(`/gate/raw-materials/new/step4?entryId=${entryId}`)
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
        setApiErrors({ general: apiError.message || 'Failed to save PO receipts' })
      }
    }
  }

  const progressPercentage = (currentStep / totalSteps) * 100

  // Check if error is "not found" error
  const isNotFoundError = Boolean(
    poReceiptsError &&
    (() => {
      const error = poReceiptsError as unknown as ApiError
      const errorMessage = error.message?.toLowerCase() || ''
      const is404 = error.status === 404
      return is404 || errorMessage.includes('not found')
    })()
  )

  // Check if error is a server error (5xx)
  const hasServerError = checkServerError(poReceiptsError)

  // Check if PO receipts data exists
  const hasPOReceiptsData = existingPOReceipts.length > 0
  // Check if there's no data (empty array or not found error)
  const hasNoPOReceiptsData =
    effectiveEditMode && !isLoadingPOReceipts && (!hasPOReceiptsData || isNotFoundError)

  // Fields are read-only when in edit mode and there's an error and fill data mode is not active
  // OR when data exists and updateMode is not active
  const isReadOnly =
    (effectiveEditMode && hasPOReceiptsData && !updateMode && !fillDataMode) ||
    (effectiveEditMode && hasNoPOReceiptsData && !fillDataMode)
  const canUpdate =
    effectiveEditMode && vehicleEntryData?.status !== 'COMPLETED' && hasPOReceiptsData

  const handleUpdate = () => {
    setUpdateMode(true)
  }

  if (effectiveEditMode && isLoadingPOReceipts) {
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

      {/* Server error message */}
      {hasServerError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {getServerErrorMessage()}
        </div>
      )}

      {/* Show Fill Data button when no PO receipts data exists */}
      {hasNoPOReceiptsData && !fillDataMode && !hasServerError && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>
                {isNotFoundError
                  ? (() => {
                      const error = poReceiptsError as unknown as ApiError
                      return error.message || 'PO receipts not found'
                    })()
                  : 'No PO receipts found for this entry.'}
              </span>
            </div>
            <Button onClick={handleFillData} size="sm">
              Fill Data
            </Button>
          </div>
        </div>
      )}

      {apiErrors.general && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {apiErrors.general}
        </div>
      )}

      <div className="space-y-6">
        {/* PO Forms */}
        {poForms.map((poForm) => (
          <POCard
            key={poForm.id}
            poForm={poForm}
            isReadOnly={isReadOnly}
            fillDataMode={fillDataModeForPO[poForm.id] || false}
            onSupplierNameChange={(value) => handleSupplierNameChange(poForm.id, value)}
            onSupplierCodeChange={(value) => handleSupplierCodeChange(poForm.id, value)}
            onPOFocus={() => handlePOFocus(poForm.id)}
            onPOSelect={(po) => handlePOSelect(poForm.id, po)}
            onReceivedQtyChange={(itemCode, value) =>
              handleReceivedQtyChange(poForm.id, itemCode, value)
            }
            onRemove={() => handleRemovePO(poForm.id)}
            canRemove={poForms.length > 1}
            apiErrors={apiErrors}
            openPODropdown={openPODropdown === poForm.id}
            onClosePODropdown={() => setOpenPODropdown(null)}
            poSearchTerm={poSearchTerms[poForm.id] || ''}
            onPOSearchChange={(value) =>
              setPOSearchTerms((prev) => ({ ...prev, [poForm.id]: value }))
            }
            onFillData={() => handleFillDataForPO(poForm.id)}
          />
        ))}

        {/* Add New PO Button */}
        {(() => {
          // Show button if:
          // 1. Not in edit mode (create mode)
          // 2. Page-level fill data mode is active
          // 3. Any PO form has fill data mode enabled
          const hasAnyFillDataMode = Object.values(fillDataModeForPO).some((mode) => mode === true)
          return !effectiveEditMode || fillDataMode || hasAnyFillDataMode
        })() && (
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={handleAddPO}>
              <Plus className="h-4 w-4 mr-2" />
              Add New PO
            </Button>
          </div>
        )}
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
          {effectiveEditMode && canUpdate && !updateMode && (
            <Button type="button" onClick={handleUpdate}>
              Update
            </Button>
          )}
          <Button
            type="button"
            onClick={handleNext}
            disabled={createPOReceipt.isPending || isNavigating}
          >
            {effectiveEditMode && !updateMode && !fillDataMode
              ? 'Next →'
              : createPOReceipt.isPending || isNavigating
                ? 'Saving...'
                : 'Save and Next →'}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface POCardProps {
  poForm: POFormData
  isReadOnly: boolean
  fillDataMode: boolean
  onSupplierNameChange: (value: string) => void
  onSupplierCodeChange: (value: string) => void
  onPOFocus: () => void
  onPOSelect: (po: PurchaseOrder) => void
  onReceivedQtyChange: (itemCode: string, value: string) => void
  onRemove: () => void
  canRemove: boolean
  apiErrors: Record<string, string>
  openPODropdown: boolean
  onClosePODropdown: () => void
  poSearchTerm: string
  onPOSearchChange: (value: string) => void
  onFillData: () => void
}

function POCard({
  poForm,
  isReadOnly,
  fillDataMode,
  onSupplierNameChange,
  onSupplierCodeChange,
  onPOFocus,
  onPOSelect,
  onReceivedQtyChange,
  onRemove,
  canRemove,
  apiErrors,
  openPODropdown,
  onClosePODropdown,
  poSearchTerm,
  onPOSearchChange,
  onFillData,
}: POCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedPOSearch = useDebounce(poSearchTerm, 100)

  // Fetch POs only when dropdown is opened and supplier code exists
  const shouldFetchPOs = openPODropdown && !!poForm.supplierCode
  const {
    data: purchaseOrders = [],
    isLoading: isLoadingPOs,
    error: poError,
  } = useOpenPOs(poForm.supplierCode || undefined, shouldFetchPOs)

  // Check if error is an API error that should show Fill Data button
  const isPOError = Boolean(
    poError &&
    (() => {
      const error = poError as unknown as ApiError
      const errorMessage = error.message?.toLowerCase() || ''
      const errorDetail = (error as any).response?.data?.detail?.toLowerCase() || ''
      return (
        error.status === 400 ||
        errorMessage.includes('required') ||
        errorMessage.includes('invalid') ||
        errorDetail.includes('required') ||
        errorDetail.includes('invalid')
      )
    })()
  )

  // Effective read-only: true if isReadOnly OR (there's a PO error and fillDataMode is false)
  // Also check updateMode from parent
  const effectiveReadOnly = isReadOnly || (isPOError && !fillDataMode)

  // Filter POs based on search
  const filteredPOs = useMemo(() => {
    if (!debouncedPOSearch.trim()) return purchaseOrders
    const searchLower = debouncedPOSearch.toLowerCase()
    return purchaseOrders.filter(
      (po) =>
        po.po_number.toLowerCase().includes(searchLower) ||
        po.supplier_name.toLowerCase().includes(searchLower)
    )
  }, [purchaseOrders, debouncedPOSearch])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClosePODropdown()
      }
    }

    if (openPODropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openPODropdown, onClosePODropdown])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Supplier & Purchase Order
          </CardTitle>
          {canRemove && (
            <Button type="button" variant="outline" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Show PO API error with Fill Data button */}
          {isPOError && !fillDataMode && (
            <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    {(() => {
                      const error = poError as unknown as ApiError
                      const detail = (error as any).response?.data?.detail
                      return detail || error.message || 'Error loading purchase orders'
                    })()}
                  </span>
                </div>
                <Button onClick={onFillData} size="sm">
                  Fill Data
                </Button>
              </div>
            </div>
          )}

          {/* Supplier Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`supplier-code-${poForm.id}`}>
                Supplier Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`supplier-code-${poForm.id}`}
                placeholder="Enter supplier code"
                value={poForm.supplierCode}
                onChange={(e) => onSupplierCodeChange(e.target.value)}
                disabled={effectiveReadOnly}
                className={cn(
                  apiErrors[`${poForm.id}_supplierCode`] && 'border-destructive',
                  effectiveReadOnly && 'cursor-not-allowed opacity-50'
                )}
              />
              {apiErrors[`${poForm.id}_supplierCode`] && (
                <p className="text-sm text-destructive">{apiErrors[`${poForm.id}_supplierCode`]}</p>
              )}
            </div>

            {/* PO Number */}
            <div className="space-y-2">
              <Label htmlFor={`po-number-${poForm.id}`}>
                PO Number <span className="text-destructive">*</span>
              </Label>
              <div ref={containerRef} className="relative">
                <div className="relative">
                  <Input
                    id={`po-number-${poForm.id}`}
                    placeholder="Click to select PO"
                    value={poForm.poNumber}
                    onFocus={onPOFocus}
                    onChange={(e) => {
                      onPOSearchChange(e.target.value)
                      if (e.target.value) {
                        onPOFocus()
                      }
                    }}
                    disabled={effectiveReadOnly || !poForm.supplierCode}
                    className={cn(
                      'pr-10',
                      apiErrors[`${poForm.id}_poNumber`] && 'border-destructive',
                      (!poForm.supplierCode || effectiveReadOnly) && 'cursor-not-allowed opacity-50'
                    )}
                  />
                  <ChevronDown
                    className={cn(
                      'absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none transition-transform',
                      openPODropdown && 'rotate-180'
                    )}
                  />
                </div>

                {openPODropdown && poForm.supplierCode && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                    {isLoadingPOs ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredPOs.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {poSearchTerm
                          ? 'No POs found'
                          : 'Enter supplier code and click to load POs'}
                      </div>
                    ) : (
                      <div className="py-1">
                        {filteredPOs.map((po) => (
                          <button
                            key={po.po_number}
                            type="button"
                            className={cn(
                              'w-full text-left px-4 py-2 hover:bg-accent focus:bg-accent focus:outline-none flex items-center justify-between',
                              poForm.poNumber === po.po_number && 'bg-accent'
                            )}
                            onClick={() => onPOSelect(po)}
                          >
                            <div>
                              <div className="font-medium">{po.po_number}</div>
                              <div className="text-sm text-muted-foreground">
                                {po.supplier_name}
                              </div>
                            </div>
                            {poForm.poNumber === po.po_number && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {apiErrors[`${poForm.id}_poNumber`] && (
                <p className="text-sm text-destructive">{apiErrors[`${poForm.id}_poNumber`]}</p>
              )}
              {!poForm.supplierCode && (
                <p className="text-sm text-muted-foreground">
                  Please enter supplier code first to select a PO
                </p>
              )}
            </div>
          </div>

          {/* Supplier Name */}
          <div className="space-y-2">
            <Label htmlFor={`supplier-name-${poForm.id}`}>
              Supplier Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`supplier-name-${poForm.id}`}
              placeholder="Enter supplier name"
              value={poForm.supplierName}
              onChange={(e) => onSupplierNameChange(e.target.value)}
              disabled={effectiveReadOnly}
              className={cn(
                apiErrors[`${poForm.id}_supplierName`] && 'border-destructive',
                effectiveReadOnly && 'cursor-not-allowed opacity-50'
              )}
            />
            {apiErrors[`${poForm.id}_supplierName`] && (
              <p className="text-sm text-destructive">{apiErrors[`${poForm.id}_supplierName`]}</p>
            )}
          </div>

          {/* Items Section */}
          {poForm.items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Items</Label>
                {apiErrors[`${poForm.id}_received`] && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {apiErrors[`${poForm.id}_received`]}
                  </p>
                )}
              </div>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium">PO Item Code</th>
                        <th className="p-3 text-left text-sm font-medium">Item Name</th>
                        <th className="p-3 text-left text-sm font-medium">Ordered Qty</th>
                        <th className="p-3 text-left text-sm font-medium">Received Qty</th>
                        <th className="p-3 text-left text-sm font-medium">Received Now</th>
                        <th className="p-3 text-left text-sm font-medium">Remaining Qty</th>
                        <th className="p-3 text-left text-sm font-medium">Unit of Measurement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poForm.items.map((item) => (
                        <tr key={item.po_item_code} className="border-t">
                          <td className="p-3 text-sm">{item.po_item_code}</td>
                          <td className="p-3 text-sm">{item.item_name}</td>
                          <td className="p-3 text-sm">{item.ordered_qty}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {item.received_qty > 0 ? item.received_qty : '-'}
                          </td>
                          <td className="p-3 text-sm">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              max={item.remaining_qty_initial}
                              placeholder="0.000"
                              value={item.received_qty_now || ''}
                              onChange={(e) =>
                                onReceivedQtyChange(item.po_item_code, e.target.value)
                              }
                              disabled={effectiveReadOnly}
                              className={cn(
                                'w-24',
                                apiErrors[`${poForm.id}_item_${item.po_item_code}`] &&
                                  'border-destructive',
                                effectiveReadOnly && 'cursor-not-allowed opacity-50'
                              )}
                            />
                            {apiErrors[`${poForm.id}_item_${item.po_item_code}`] && (
                              <p className="text-xs text-destructive mt-1">
                                {apiErrors[`${poForm.id}_item_${item.po_item_code}`]}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-sm font-medium">{item.remaining_qty}</td>
                          <td className="p-3 text-sm">{item.uom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
