import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Package, FileCheck, FileText, AlertCircle } from 'lucide-react'
import {
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@/shared/components/ui'
import { useEntryId } from '../../hooks'
import { useVehicleEntry } from '../../api/vehicleEntry.queries'
import { useConstructionEntry, useCreateConstructionEntry, useUpdateConstructionEntry, useConstructionCategories } from '../../api/construction.queries'
import { FillDataAlert } from '../../components'
import { isNotFoundError as checkNotFoundError, isServerError as checkServerError, getErrorMessage, getServerErrorMessage } from '../../utils'
import { cn } from '@/shared/utils'
import type { ApiError } from '@/core/api'

// Unit options for dropdown
const UNIT_OPTIONS = [
  { value: 'PCS', label: 'Pieces (PCS)' },
  { value: 'KG', label: 'Kilograms (KG)' },
  { value: 'LTR', label: 'Liters (LTR)' },
  { value: 'BOX', label: 'Box' },
]

// Security approval options
const SECURITY_APPROVAL_OPTIONS = [
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
]

interface ConstructionFormData {
  // Project & Contractor Details
  projectName: string
  workOrderNumber: string
  contractorName: string
  contractorContact: string
  vehicleNumber: string
  // Material Details
  materialCategory: string
  materialDescription: string
  quantity: string
  unit: string
  challanNumber: string
  invoiceNumber: string
  // Approval & Responsibility
  siteEngineer: string
  securityApproval: string
  // Additional Information
  remarks: string
}

export default function Step3Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { entryId, entryIdNumber, isEditMode } = useEntryId()
  const currentStep = 3
  const totalSteps = 3
  const progressPercentage = (currentStep / totalSteps) * 100

  // API hooks
  const createConstructionEntry = useCreateConstructionEntry(entryIdNumber || 0)
  const updateConstructionEntry = useUpdateConstructionEntry(entryIdNumber || 0)
  const {
    data: constructionData,
    isLoading: isLoadingConstruction,
    error: constructionError,
  } = useConstructionEntry(isEditMode && entryIdNumber ? entryIdNumber : null)
  const { data: vehicleEntryData } = useVehicleEntry(
    isEditMode && entryIdNumber ? entryIdNumber : null
  )

  // State
  const [fillDataMode, setFillDataMode] = useState(false)
  const [updateMode, setUpdateMode] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [categoryDropdownOpened, setCategoryDropdownOpened] = useState(false)

  // Fetch categories only when dropdown is opened (lazy loading)
  const { data: categories = [], isLoading: isLoadingCategories } = useConstructionCategories(categoryDropdownOpened)

  const effectiveEditMode = isEditMode && !fillDataMode

  // Check if error is "not found" error
  const isNotFoundError = checkNotFoundError(constructionError)
  // Check if error is a server error (5xx)
  const hasServerError = checkServerError(constructionError)

  // Form state
  const [formData, setFormData] = useState<ConstructionFormData>({
    projectName: '',
    workOrderNumber: '',
    contractorName: '',
    contractorContact: '',
    vehicleNumber: '',
    materialCategory: '',
    materialDescription: '',
    quantity: '',
    unit: '',
    challanNumber: '',
    invoiceNumber: '',
    siteEngineer: '',
    securityApproval: '',
    remarks: '',
  })

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Fields are read-only when:
  // 1. In edit mode AND update mode is not active AND there's no not found error, OR
  // 2. There's a not found error AND fill data mode is not active
  const isReadOnly =
    (effectiveEditMode && !updateMode && !isNotFoundError) || (isNotFoundError && !fillDataMode)
  const canUpdate = effectiveEditMode && vehicleEntryData?.status !== 'COMPLETED'

  // Load construction data when in edit mode
  useEffect(() => {
    if (effectiveEditMode && constructionData) {
      // Extract category ID from nested object or direct value
      const categoryId = typeof constructionData.material_category === 'object'
        ? constructionData.material_category.id.toString()
        : constructionData.material_category?.toString() || ''

      setFormData({
        projectName: constructionData.project_name || '',
        workOrderNumber: constructionData.work_order_number || '',
        contractorName: constructionData.contractor_name || '',
        contractorContact: constructionData.contractor_contact || '',
        vehicleNumber: constructionData.vehicle_number || '',
        materialCategory: categoryId,
        materialDescription: constructionData.material_description || '',
        quantity: constructionData.quantity?.toString() || '',
        unit: constructionData.unit || '',
        challanNumber: constructionData.challan_number || '',
        invoiceNumber: constructionData.invoice_number || '',
        siteEngineer: constructionData.site_engineer || '',
        securityApproval: constructionData.security_approval || '',
        remarks: constructionData.remarks || '',
      })

      // Trigger category loading if we have a category
      if (categoryId) {
        setCategoryDropdownOpened(true)
      }
    }
  }, [effectiveEditMode, constructionData])

  const handleInputChange = (field: keyof ConstructionFormData, value: string) => {
    if (isReadOnly) return
    setFormData((prev) => ({ ...prev, [field]: value }))
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
      navigate(`/gate/construction/edit/${entryId}/step2`)
    } else {
      navigate(`/gate/construction/new/step2?entryId=${entryId}`)
    }
  }

  const handleCancel = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    navigate('/gate/construction')
  }

  const handleFillData = () => {
    setFillDataMode(true)
  }

  const handleUpdate = () => {
    setUpdateMode(true)
  }

  const handleNext = async () => {
    if (!entryId || !entryIdNumber) {
      setApiErrors({ general: 'Entry ID is missing. Please go back to step 1.' })
      return
    }

    // In edit mode (and not fill data mode and not update mode), navigate to review page
    if (effectiveEditMode && !updateMode) {
      navigate(`/gate/construction/edit/${entryId}/review`)
      return
    }

    setApiErrors({})

    // Validation
    if (!formData.projectName.trim()) {
      setApiErrors({ projectName: 'Please enter project/work order name' })
      return
    }
    if (!formData.contractorName.trim()) {
      setApiErrors({ contractorName: 'Please enter contractor name' })
      return
    }
    if (!formData.materialCategory) {
      setApiErrors({ materialCategory: 'Please select material category' })
      return
    }
    if (!formData.materialDescription.trim()) {
      setApiErrors({ materialDescription: 'Please enter material description' })
      return
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      setApiErrors({ quantity: 'Please enter a valid quantity' })
      return
    }
    if (!formData.unit) {
      setApiErrors({ unit: 'Please select unit' })
      return
    }
    if (!formData.siteEngineer.trim()) {
      setApiErrors({ siteEngineer: 'Please enter site engineer name' })
      return
    }
    if (!formData.securityApproval) {
      setApiErrors({ securityApproval: 'Please select security approval status' })
      return
    }

    try {
      const requestData = {
        project_name: formData.projectName.trim(),
        work_order_number: formData.workOrderNumber.trim() || undefined,
        contractor_name: formData.contractorName.trim(),
        contractor_contact: formData.contractorContact.trim() || undefined,
        vehicle_number: formData.vehicleNumber.trim() || undefined,
        material_category: parseInt(formData.materialCategory, 10),
        material_description: formData.materialDescription.trim(),
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        challan_number: formData.challanNumber.trim() || undefined,
        invoice_number: formData.invoiceNumber.trim() || undefined,
        site_engineer: formData.siteEngineer.trim(),
        security_approval: formData.securityApproval,
        remarks: formData.remarks.trim() || undefined,
      }

      // Use update API when in edit mode with update mode active
      if (isEditMode && updateMode) {
        await updateConstructionEntry.mutateAsync(requestData)
      } else {
        await createConstructionEntry.mutateAsync(requestData)
      }

      // Navigate to review page
      setIsNavigating(true)
      if (isEditMode) {
        navigate(`/gate/construction/edit/${entryId}/review`)
      } else {
        navigate(`/gate/construction/new/review?entryId=${entryId}`)
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
        setApiErrors({ general: apiError.message || 'Failed to save construction entry' })
      }
    }
  }

  const isLoading = effectiveEditMode && isLoadingConstruction
  const isSaving = createConstructionEntry.isPending || updateConstructionEntry.isPending || isNavigating

  // Select styling classes
  const selectClassName =
    'flex h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Construction Entry - Step {currentStep} of {totalSteps}
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

      {/* Server Error */}
      {hasServerError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {getServerErrorMessage()}
        </div>
      )}

      {/* General Error */}
      {!hasServerError && apiErrors.general && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {apiErrors.general}
        </div>
      )}

      {/* Fill Data Alert */}
      {effectiveEditMode && isNotFoundError && !fillDataMode && (
        <FillDataAlert
          message={getErrorMessage(constructionError, 'Construction entry not found')}
          onFillData={handleFillData}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project & Contractor Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Project & Contractor Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Project / Work Order Name */}
                <div className="space-y-2">
                  <Label htmlFor="projectName">
                    Project / Work Order Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="projectName"
                    value={formData.projectName}
                    onChange={(e) => handleInputChange('projectName', e.target.value)}
                    placeholder="Enter project or work order name"
                    disabled={isReadOnly}
                    className={cn(
                      'border-2 font-medium',
                      apiErrors.projectName && 'border-destructive'
                    )}
                  />
                  {apiErrors.projectName && (
                    <p className="text-sm text-destructive">{apiErrors.projectName}</p>
                  )}
                </div>

                {/* Work Order Number */}
                <div className="space-y-2">
                  <Label htmlFor="workOrderNumber">Work Order Number</Label>
                  <Input
                    id="workOrderNumber"
                    value={formData.workOrderNumber}
                    onChange={(e) => handleInputChange('workOrderNumber', e.target.value)}
                    placeholder="Enter work order number (auto-generated if empty)"
                    disabled={isReadOnly}
                    className="border-2 font-medium"
                  />
                </div>

                {/* Contractor Name */}
                <div className="space-y-2">
                  <Label htmlFor="contractorName">
                    Contractor Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contractorName"
                    value={formData.contractorName}
                    onChange={(e) => handleInputChange('contractorName', e.target.value)}
                    placeholder="Enter contractor name"
                    disabled={isReadOnly}
                    className={cn(
                      'border-2 font-medium',
                      apiErrors.contractorName && 'border-destructive'
                    )}
                  />
                  {apiErrors.contractorName && (
                    <p className="text-sm text-destructive">{apiErrors.contractorName}</p>
                  )}
                </div>

                {/* Contractor Contact */}
                <div className="space-y-2">
                  <Label htmlFor="contractorContact">Contractor Contact</Label>
                  <Input
                    id="contractorContact"
                    value={formData.contractorContact}
                    onChange={(e) => handleInputChange('contractorContact', e.target.value)}
                    placeholder="Enter contact number"
                    disabled={isReadOnly}
                    className="border-2 font-medium"
                  />
                </div>

                {/* Vehicle Number */}
                <div className="space-y-2">
                  <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                  <Input
                    id="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                    placeholder="Enter vehicle number (if applicable)"
                    disabled={isReadOnly}
                    className="border-2 font-medium"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Material Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Material Category */}
                <div className="space-y-2">
                  <Label htmlFor="materialCategory">
                    Material Category <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="materialCategory"
                    className={cn(
                      selectClassName,
                      apiErrors.materialCategory && 'border-destructive'
                    )}
                    value={formData.materialCategory}
                    onChange={(e) => handleInputChange('materialCategory', e.target.value)}
                    onFocus={() => setCategoryDropdownOpened(true)}
                    disabled={isReadOnly}
                  >
                    <option value="">
                      {isLoadingCategories ? 'Loading categories...' : 'Select material category'}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                  {apiErrors.materialCategory && (
                    <p className="text-sm text-destructive">{apiErrors.materialCategory}</p>
                  )}
                </div>

                {/* Quantity and Unit in same row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="quantity">
                      Quantity <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', e.target.value)}
                      placeholder="0"
                      disabled={isReadOnly}
                      className={cn(
                        'border-2 font-medium',
                        apiErrors.quantity && 'border-destructive'
                      )}
                    />
                    {apiErrors.quantity && (
                      <p className="text-sm text-destructive">{apiErrors.quantity}</p>
                    )}
                  </div>

                  {/* Unit */}
                  <div className="space-y-2">
                    <Label htmlFor="unit">
                      Unit <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="unit"
                      className={cn(selectClassName, apiErrors.unit && 'border-destructive')}
                      value={formData.unit}
                      onChange={(e) => handleInputChange('unit', e.target.value)}
                      disabled={isReadOnly}
                    >
                      <option value="">Select unit</option>
                      {UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {apiErrors.unit && (
                      <p className="text-sm text-destructive">{apiErrors.unit}</p>
                    )}
                  </div>
                </div>

                {/* Material Description - Full width */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="materialDescription">
                    Material Description <span className="text-destructive">*</span>
                  </Label>
                  <textarea
                    id="materialDescription"
                    value={formData.materialDescription}
                    onChange={(e) => handleInputChange('materialDescription', e.target.value)}
                    placeholder="Enter detailed description of materials"
                    disabled={isReadOnly}
                    rows={3}
                    className={cn(
                      'flex w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                      apiErrors.materialDescription && 'border-destructive'
                    )}
                  />
                  {apiErrors.materialDescription && (
                    <p className="text-sm text-destructive">{apiErrors.materialDescription}</p>
                  )}
                </div>

                {/* Challan Number */}
                <div className="space-y-2">
                  <Label htmlFor="challanNumber">Challan Number</Label>
                  <Input
                    id="challanNumber"
                    value={formData.challanNumber}
                    onChange={(e) => handleInputChange('challanNumber', e.target.value)}
                    placeholder="Enter challan number"
                    disabled={isReadOnly}
                    className="border-2 font-medium"
                  />
                </div>

                {/* Invoice Number */}
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                    placeholder="Enter invoice number"
                    disabled={isReadOnly}
                    className="border-2 font-medium"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval & Responsibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Approval & Responsibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Site Engineer */}
                <div className="space-y-2">
                  <Label htmlFor="siteEngineer">
                    Site Engineer <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="siteEngineer"
                    value={formData.siteEngineer}
                    onChange={(e) => handleInputChange('siteEngineer', e.target.value)}
                    placeholder="Enter site engineer name"
                    disabled={isReadOnly}
                    className={cn(
                      'border-2 font-medium',
                      apiErrors.siteEngineer && 'border-destructive'
                    )}
                  />
                  {apiErrors.siteEngineer && (
                    <p className="text-sm text-destructive">{apiErrors.siteEngineer}</p>
                  )}
                </div>

                {/* Security Approval */}
                <div className="space-y-2">
                  <Label htmlFor="securityApproval">
                    Security Approval <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="securityApproval"
                    className={cn(
                      selectClassName,
                      apiErrors.securityApproval && 'border-destructive'
                    )}
                    value={formData.securityApproval}
                    onChange={(e) => handleInputChange('securityApproval', e.target.value)}
                    disabled={isReadOnly}
                  >
                    <option value="">Select approval status</option>
                    {SECURITY_APPROVAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {apiErrors.securityApproval && (
                    <p className="text-sm text-destructive">{apiErrors.securityApproval}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  placeholder="Enter any additional remarks or notes"
                  disabled={isReadOnly}
                  rows={3}
                  className="flex w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={handlePrevious}>
          Previous
        </Button>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          {effectiveEditMode && canUpdate && !updateMode && (
            <Button type="button" variant="secondary" onClick={handleUpdate}>
              Update
            </Button>
          )}
          <Button
            type="button"
            onClick={handleNext}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : effectiveEditMode && !updateMode ? (
              'Review'
            ) : (
              'Save & Review'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
