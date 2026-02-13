import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, FileText, Package, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ENTRY_STATUS } from '@/config/constants'
import type { ApiError } from '@/core/api'
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui'
import { useScrollToError } from '@/shared/hooks'
import {
  getErrorMessage,
  getServerErrorMessage,
  isNotFoundError as checkNotFoundError,
  isServerError as checkServerError,
} from '@/shared/utils'
import { cn } from '@/shared/utils'

import {
  useCreateMaintenanceEntry,
  useMaintenanceEntry,
  useUpdateMaintenanceEntry,
} from '../../api/maintenance/maintenance.queries'
import { useVehicleEntry } from '../../api/vehicle/vehicleEntry.queries'
import {
  DepartmentSelect,
  FillDataAlert,
  MaintenanceTypeSelect,
  StepFooter,
  StepHeader,
  UnitSelect,
} from '../../components'
import { useEntryId } from '../../hooks'

// Urgency level options
const URGENCY_OPTIONS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

interface FormData {
  maintenanceType: string
  maintenanceTypeName: string // Display name from API
  supplierName: string
  materialDescription: string
  partNumber: string
  quantity: string
  unit: string
  unitName: string
  invoiceNumber: string
  equipmentId: string
  receivingDepartment: string
  receivingDepartmentName: string // Display name from API
  urgencyLevel: string
  remarks: string
}

export default function Step3Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { entryId, entryIdNumber, isEditMode } = useEntryId()
  const currentStep = 3
  const totalSteps = 4

  // API hooks
  const createMaintenanceEntry = useCreateMaintenanceEntry(entryIdNumber || 0)
  const updateMaintenanceEntry = useUpdateMaintenanceEntry(entryIdNumber || 0)
  const {
    data: maintenanceData,
    isLoading: isLoadingMaintenance,
    error: maintenanceError,
  } = useMaintenanceEntry(isEditMode && entryIdNumber ? entryIdNumber : null)
  const { data: vehicleEntryData } = useVehicleEntry(
    isEditMode && entryIdNumber ? entryIdNumber : null
  )

  // State
  const [fillDataMode, setFillDataMode] = useState(false)
  const [updateMode, setUpdateMode] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const effectiveEditMode = isEditMode && !fillDataMode

  // Check if error is "not found" error
  const isNotFoundError = checkNotFoundError(maintenanceError)
  // Check if error is a server error (5xx)
  const hasServerError = checkServerError(maintenanceError)

  // Fields are read-only when:
  // 1. In edit mode AND update mode is not active AND there's no not found error, OR
  // 2. There's a not found error AND fill data mode is not active
  const isReadOnly =
    (effectiveEditMode && !updateMode && !isNotFoundError) || (isNotFoundError && !fillDataMode)
  const canUpdate = effectiveEditMode && vehicleEntryData?.status !== ENTRY_STATUS.COMPLETED

  // Form state
  const [formData, setFormData] = useState<FormData>({
    maintenanceType: '',
    maintenanceTypeName: '',
    supplierName: '',
    materialDescription: '',
    partNumber: '',
    quantity: '',
    unit: '',
    unitName: '',
    invoiceNumber: '',
    equipmentId: '',
    receivingDepartment: '',
    receivingDepartmentName: '',
    urgencyLevel: '',
    remarks: '',
  })

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Scroll to first error when errors occur
  useScrollToError(apiErrors)

  // Load maintenance data when in edit mode
  useEffect(() => {
    if (effectiveEditMode && maintenanceData) {
      // Extract ID and name from nested objects
      const maintenanceTypeId =
        typeof maintenanceData.maintenance_type === 'object'
          ? maintenanceData.maintenance_type?.id?.toString() || ''
          : maintenanceData.maintenance_type?.toString() || ''
      const maintenanceTypeName =
        typeof maintenanceData.maintenance_type === 'object'
          ? maintenanceData.maintenance_type?.type_name || ''
          : ''
      const receivingDeptId =
        typeof maintenanceData.receiving_department === 'object'
          ? maintenanceData.receiving_department?.id?.toString() || ''
          : maintenanceData.receiving_department?.toString() || ''
      const receivingDeptName =
        typeof maintenanceData.receiving_department === 'object'
          ? maintenanceData.receiving_department?.name || ''
          : ''

      const unitId =
        typeof maintenanceData.unit === 'object'
          ? maintenanceData.unit?.id?.toString() || ''
          : maintenanceData.unit?.toString() || ''
      const unitName =
        typeof maintenanceData.unit === 'object' ? maintenanceData.unit?.name || '' : ''

      setFormData({
        maintenanceType: maintenanceTypeId,
        maintenanceTypeName: maintenanceTypeName,
        supplierName: maintenanceData.supplier_name || '',
        materialDescription: maintenanceData.material_description || '',
        partNumber: maintenanceData.part_number || '',
        quantity: maintenanceData.quantity?.toString() || '',
        unit: unitId,
        unitName: unitName,
        invoiceNumber: maintenanceData.invoice_number || '',
        equipmentId: maintenanceData.equipment_id || '',
        receivingDepartment: receivingDeptId,
        receivingDepartmentName: receivingDeptName,
        urgencyLevel: maintenanceData.urgency_level || '',
        remarks: maintenanceData.remarks || '',
      })
    }
  }, [effectiveEditMode, maintenanceData])

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (isReadOnly) return
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
      navigate(`/gate/maintenance/edit/${entryId}/step2`)
    } else {
      navigate(`/gate/maintenance/new/step2?entryId=${entryId}`)
    }
  }

  const handleCancel = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    navigate('/gate/maintenance')
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

    // In edit mode (and not fill data mode and not update mode), navigate to attachments page
    if (effectiveEditMode && !updateMode) {
      navigate(`/gate/maintenance/edit/${entryId}/attachments`)
      return
    }

    setApiErrors({})

    // Validation
    if (!formData.maintenanceType) {
      setApiErrors({ maintenanceType: 'Please select maintenance type' })
      return
    }
    if (!formData.supplierName.trim()) {
      setApiErrors({ supplierName: 'Please enter supplier name' })
      return
    }
    if (!formData.materialDescription.trim()) {
      setApiErrors({ materialDescription: 'Please enter material description' })
      return
    }
    if (formData.materialDescription.trim().length < 5) {
      setApiErrors({ materialDescription: 'Material description must be atlaest 5 ' })
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
    if (!formData.receivingDepartment) {
      setApiErrors({ receivingDepartment: 'Please select receiving department' })
      return
    }
    if (!formData.urgencyLevel) {
      setApiErrors({ urgencyLevel: 'Please select urgency level' })
      return
    }

    try {
      const requestData = {
        maintenance_type: parseInt(formData.maintenanceType),
        supplier_name: formData.supplierName.trim(),
        material_description: formData.materialDescription.trim(),
        part_number: formData.partNumber.trim() || undefined,
        quantity: parseFloat(formData.quantity),
        unit: parseInt(formData.unit),
        invoice_number: formData.invoiceNumber.trim() || undefined,
        equipment_id: formData.equipmentId.trim() || undefined,
        receiving_department: parseInt(formData.receivingDepartment),
        urgency_level: formData.urgencyLevel,
        remarks: formData.remarks.trim() || undefined,
      }

      // Use update API when in edit mode with update mode active
      if (isEditMode && updateMode) {
        await updateMaintenanceEntry.mutateAsync(requestData)
      } else {
        await createMaintenanceEntry.mutateAsync(requestData)
      }

      // Navigate to attachments page
      setIsNavigating(true)
      if (isEditMode) {
        navigate(`/gate/maintenance/edit/${entryId}/attachments`)
      } else {
        navigate(`/gate/maintenance/new/attachments?entryId=${entryId}`)
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
        setApiErrors({ general: apiError.message || 'Failed to save maintenance entry' })
      }
    }
  }

  const isLoading = effectiveEditMode && isLoadingMaintenance

  // Select styling classes
  const selectClassName =
    'flex h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        title="Maintenance Entry"
        error={hasServerError ? getServerErrorMessage() : apiErrors.general}
      />

      {/* Fill Data Alert */}
      {effectiveEditMode && isNotFoundError && !fillDataMode && (
        <FillDataAlert
          message={getErrorMessage(maintenanceError, 'Maintenance entry not found')}
          onFillData={handleFillData}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Maintenance Type & Work Order */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <MaintenanceTypeSelect
                  value={formData.maintenanceType || undefined}
                  onChange={(typeId, typeName) => {
                    handleInputChange('maintenanceType', typeId)
                    setFormData((prev) => ({ ...prev, maintenanceTypeName: typeName }))
                  }}
                  placeholder="Select maintenance type"
                  disabled={isReadOnly}
                  error={apiErrors.maintenanceType}
                  label="Maintenance Type"
                  required
                  initialDisplayText={formData.maintenanceTypeName || undefined}
                />
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
                {/* Supplier Name */}
                <div className="space-y-2">
                  <Label htmlFor="supplierName">
                    Supplier Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="supplierName"
                    value={formData.supplierName}
                    onChange={(e) => handleInputChange('supplierName', e.target.value)}
                    placeholder="Enter supplier name"
                    disabled={isReadOnly}
                    className={cn(
                      'border-2 font-medium',
                      apiErrors.supplierName && 'border-destructive'
                    )}
                  />
                  {apiErrors.supplierName && (
                    <p className="text-sm text-destructive">{apiErrors.supplierName}</p>
                  )}
                </div>

                {/* Part Number/Model Number */}
                <div className="space-y-2">
                  <Label htmlFor="partNumber">Part Number / Model Number</Label>
                  <Input
                    id="partNumber"
                    value={formData.partNumber}
                    onChange={(e) => handleInputChange('partNumber', e.target.value)}
                    placeholder="Enter part/model number"
                    disabled={isReadOnly}
                    className="border-2 font-medium"
                  />
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
                    placeholder="Enter material description"
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

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantity <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    placeholder="Enter quantity"
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
                <UnitSelect
                  value={formData.unit || undefined}
                  onChange={(unitId, unitName) => {
                    handleInputChange('unit', unitId)
                    setFormData((prev) => ({ ...prev, unitName }))
                  }}
                  placeholder="Select unit"
                  disabled={isReadOnly}
                  error={apiErrors.unit}
                  label="Unit"
                  required
                  initialDisplayText={formData.unitName || undefined}
                />
              </div>
            </CardContent>
          </Card>

          {/* Documentation & Department */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentation & Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
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

                {/* Equipment ID */}
                <div className="space-y-2">
                  <Label htmlFor="equipmentId">Equipment ID (Machine ID)</Label>
                  <Input
                    id="equipmentId"
                    value={formData.equipmentId}
                    onChange={(e) => handleInputChange('equipmentId', e.target.value)}
                    placeholder="Enter equipment/machine ID"
                    disabled={isReadOnly}
                    className="border-2 font-medium"
                  />
                </div>

                {/* Receiving Department */}
                <DepartmentSelect
                  value={formData.receivingDepartment ? Number(formData.receivingDepartment) : ''}
                  onChange={(departmentId) => {
                    handleInputChange('receivingDepartment', departmentId.toString())
                    setFormData((prev) => ({ ...prev, receivingDepartmentName: '' }))
                  }}
                  placeholder="Select department"
                  disabled={isReadOnly}
                  error={apiErrors.receivingDepartment}
                  label="Receiving Department"
                  required
                  initialDisplayText={formData.receivingDepartmentName || undefined}
                />

                {/* Urgency Level */}
                <div className="space-y-2">
                  <Label htmlFor="urgencyLevel">
                    Urgency Level <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="urgencyLevel"
                    className={cn(selectClassName, apiErrors.urgencyLevel && 'border-destructive')}
                    value={formData.urgencyLevel}
                    onChange={(e) => handleInputChange('urgencyLevel', e.target.value)}
                    disabled={isReadOnly}
                  >
                    <option value="">Select urgency level</option>
                    {URGENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {apiErrors.urgencyLevel && (
                    <p className="text-sm text-destructive">{apiErrors.urgencyLevel}</p>
                  )}
                </div>

                {/* Remarks - Full width */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    placeholder="Enter any additional remarks"
                    disabled={isReadOnly}
                    rows={2}
                    className="flex w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Urgency Warning for Critical/High */}
          {(formData.urgencyLevel === 'CRITICAL' || formData.urgencyLevel === 'HIGH') && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {formData.urgencyLevel === 'CRITICAL' ? 'Critical' : 'High'} Priority Item
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  This maintenance request has been marked as {formData.urgencyLevel.toLowerCase()}{' '}
                  priority. Please ensure proper handling and expedited processing.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <StepFooter
        onPrevious={handlePrevious}
        onCancel={handleCancel}
        onNext={handleNext}
        showUpdate={effectiveEditMode && canUpdate && !updateMode}
        onUpdate={handleUpdate}
        isSaving={
          createMaintenanceEntry.isPending || updateMaintenanceEntry.isPending || isNavigating
        }
        isEditMode={effectiveEditMode}
        isUpdateMode={updateMode}
        nextLabel={effectiveEditMode && !updateMode ? 'Next' : 'Save & Next'}
      />
    </div>
  )
}
