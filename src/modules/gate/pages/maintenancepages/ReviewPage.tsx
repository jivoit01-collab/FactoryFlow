import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  FileCheck,
  ArrowLeft,
  AlertCircle,
  Truck,
  User,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  Home,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import {
  Button,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
} from '@/shared/components/ui'
import { useScrollToError } from '@/shared/hooks'
import { cn } from '@/shared/utils'
import type { ApiError } from '@/core/api/types'
import { isServerError as checkServerError, getServerErrorMessage } from '../../utils'
import { useMaintenanceFullView, useCompleteMaintenanceEntry } from '../../api/maintenance/maintenance.queries'
import { securityCheckApi } from '../../api/securityCheck/securityCheck.api'
import { useEntryId } from '../../hooks'

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusColor = () => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor())}>
      {status}
    </span>
  )
}

// Urgency badge component
function UrgencyBadge({ level }: { level: string }) {
  const getUrgencyColor = () => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getUrgencyColor())}>
      {level}
    </span>
  )
}

// Check/Cross icon
function BooleanIcon({ value }: { value: boolean }) {
  return value ? (
    <CheckCircle2 className="h-5 w-5 text-green-500" />
  ) : (
    <XCircle className="h-5 w-5 text-red-500" />
  )
}

// Success Screen Component with animated checkmark
function SuccessScreen({
  onNavigateToDashboard,
  onNavigateToHome,
}: {
  onNavigateToDashboard: () => void
  onNavigateToHome: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Animated Checkmark */}
      <div className="relative mb-8">
        <svg className="h-32 w-32 text-green-500" viewBox="0 0 100 100">
          {/* Circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="animate-draw-circle"
            style={{ strokeDasharray: 283, strokeDashoffset: 283 }}
          />
          {/* Checkmark */}
          <path
            d="M30 50 L45 65 L70 35"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw-check"
            style={{ strokeDasharray: 60, strokeDashoffset: 60 }}
          />
        </svg>
      </div>

      {/* Success Message */}
      <h1 className="mb-2 text-3xl font-bold text-foreground opacity-0 animate-fade-in-delay-1">
        Entry Completed!
      </h1>
      <p className="mb-12 text-muted-foreground opacity-0 animate-fade-in-delay-2">
        Maintenance gate entry has been successfully completed
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row opacity-0 animate-fade-in-delay-3">
        <Button size="lg" onClick={onNavigateToDashboard} className="min-w-[200px]">
          <Wrench className="mr-2 h-5 w-5" />
          Maintenance Dashboard
        </Button>
        <Button size="lg" variant="outline" onClick={onNavigateToHome} className="min-w-[200px]">
          <Home className="mr-2 h-5 w-5" />
          Home
        </Button>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { entryId, entryIdNumber, isEditMode } = useEntryId()

  const [securityInspectionCompleted, setSecurityInspectionCompleted] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleNavigateToList = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    queryClient.invalidateQueries({ queryKey: ['maintenanceFullView'] })
    navigate('/gate/maintenance')
  }

  const handleNavigateToHome = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    queryClient.invalidateQueries({ queryKey: ['maintenanceFullView'] })
    navigate('/')
  }
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Scroll to first error when errors occur
  useScrollToError(apiErrors)

  // Fetch full maintenance entry data
  const { data: gateEntry, isLoading, error: fetchError } = useMaintenanceFullView(entryIdNumber)

  const completeMaintenanceEntry = useCompleteMaintenanceEntry()

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/maintenance/edit/${entryId}/step3`)
    } else {
      navigate(`/gate/maintenance/new/step3?entryId=${entryId}`)
    }
  }

  const handleComplete = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing.' })
      return
    }

    const isSecurityAlreadySubmitted = gateEntry?.security_check?.is_submitted

    // Only require toggle confirmation if security is not already submitted
    if (!isSecurityAlreadySubmitted && !securityInspectionCompleted) {
      setApiErrors({ general: 'Please confirm that security inspection is completed.' })
      return
    }

    setApiErrors({})
    setIsCompleting(true)

    try {
      // Only submit security check if not already submitted and security check exists
      if (!isSecurityAlreadySubmitted && gateEntry?.security_check) {
        // Step 1: Get security data to retrieve the security ID
        const securityData = await securityCheckApi.get(entryIdNumber!)

        if (!securityData.id) {
          setApiErrors({
            general: 'Security check data not found. Please complete security check first.',
          })
          setIsCompleting(false)
          return
        }

        // Step 2: Submit security check (this locks Step 2 from updates)
        await securityCheckApi.submit(securityData.id)
      }

      // Step 3: Complete the gate entry
      await completeMaintenanceEntry.mutateAsync(entryIdNumber!)

      // Show success screen
      setShowSuccess(true)
    } catch (error) {
      const apiError = error as ApiError & { detail?: string }
      const errorMessage = apiError.message || apiError.detail || 'Failed to complete gate entry'
      setApiErrors({ general: errorMessage })
    } finally {
      setIsCompleting(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Show success screen after completion
  if (showSuccess) {
    return (
      <SuccessScreen
        onNavigateToDashboard={handleNavigateToList}
        onNavigateToHome={handleNavigateToHome}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (fetchError) {
    const errorMessage = checkServerError(fetchError)
      ? getServerErrorMessage()
      : 'Failed to load gate entry details. Please try again.'
    return (
      <div className="space-y-6 pb-6">
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
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

  if (!gateEntry) {
    return null
  }

  const isAlreadyCompleted = gateEntry.gate_entry.status === 'COMPLETED'
  const maintenanceDetails = gateEntry.maintenance_details

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileCheck className="h-8 w-8" />
          Final Review
        </h2>
        <p className="text-muted-foreground">
          Review all details before completing the maintenance gate entry
        </p>
      </div>

      {apiErrors.general && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {apiErrors.general}
        </div>
      )}

      <div className="space-y-6">
        {/* Gate Entry Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Gate Entry Information
              </span>
              <StatusBadge status={gateEntry.gate_entry.status} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label className="text-muted-foreground text-xs">Entry Number</Label>
                <p className="font-medium">{gateEntry.gate_entry.entry_no}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Entry Type</Label>
                <p className="font-medium">{gateEntry.gate_entry.entry_type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Created At</Label>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {formatDateTime(gateEntry.gate_entry.created_at)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Locked</Label>
                <p className="font-medium">{gateEntry.gate_entry.is_locked ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-muted-foreground text-xs">Vehicle Number</Label>
                <p className="font-medium">{gateEntry.vehicle.vehicle_number}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Vehicle Type</Label>
                <p className="font-medium">{gateEntry.vehicle.vehicle_type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Capacity</Label>
                <p className="font-medium">{gateEntry.vehicle.capacity_ton} Tons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Driver Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-muted-foreground text-xs">Driver Name</Label>
                <p className="font-medium">{gateEntry.driver.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Mobile Number</Label>
                <p className="font-medium">{gateEntry.driver.mobile_no}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">License Number</Label>
                <p className="font-medium">{gateEntry.driver.license_no}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Check */}
        {gateEntry.security_check && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Security Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <BooleanIcon value={gateEntry.security_check.vehicle_condition_ok} />
                  <span className="text-sm">Vehicle Condition OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <BooleanIcon value={gateEntry.security_check.tyre_condition_ok} />
                  <span className="text-sm">Tyre Condition OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <BooleanIcon value={gateEntry.security_check.alcohol_test_passed} />
                  <span className="text-sm">Alcohol Test Passed</span>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Inspected By</Label>
                  <p className="font-medium">{gateEntry.security_check.inspected_by}</p>
                </div>
              </div>
              {gateEntry.security_check.remarks && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-muted-foreground text-xs">Remarks</Label>
                  <p className="text-sm">{gateEntry.security_check.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Maintenance Details */}
        {maintenanceDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance Details
                </span>
                <UrgencyBadge level={maintenanceDetails.urgency_level} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Urgency Warning */}
              {(maintenanceDetails.urgency_level === 'CRITICAL' ||
                maintenanceDetails.urgency_level === 'HIGH') && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {maintenanceDetails.urgency_level === 'CRITICAL' ? 'Critical' : 'High'} Priority
                      Item
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Please ensure expedited processing.
                    </p>
                  </div>
                </div>
              )}

              {/* Work Order & Type */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Work Order Number</Label>
                  <p className="font-medium text-primary">{maintenanceDetails.work_order_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Maintenance Type</Label>
                  <p className="font-medium">{maintenanceDetails.maintenance_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Supplier Name</Label>
                  <p className="font-medium">{maintenanceDetails.supplier_name}</p>
                </div>
              </div>

              {/* Material Info */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4" />
                  Material Information
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground text-xs">Material Description</Label>
                    <p className="font-medium">{maintenanceDetails.material_description}</p>
                  </div>
                  {maintenanceDetails.part_number && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Part Number / Model Number</Label>
                      <p className="font-medium">{maintenanceDetails.part_number}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-xs">Quantity</Label>
                    <p className="font-medium text-lg text-primary">
                      {maintenanceDetails.quantity} {maintenanceDetails.unit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Documentation & Assignment */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4" />
                  Documentation & Assignment
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {maintenanceDetails.invoice_number && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Invoice Number</Label>
                      <p className="font-medium">{maintenanceDetails.invoice_number}</p>
                    </div>
                  )}
                  {maintenanceDetails.equipment_id && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Equipment ID</Label>
                      <p className="font-medium">{maintenanceDetails.equipment_id}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-xs">Receiving Department</Label>
                    <p className="font-medium">{maintenanceDetails.receiving_department}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Inward Time</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatDateTime(maintenanceDetails.inward_time)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Created By</Label>
                    <p className="font-medium">{maintenanceDetails.created_by}</p>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {maintenanceDetails.remarks && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Remarks / Notes</Label>
                  <p className="text-sm">{maintenanceDetails.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Security Inspection Confirmation */}
        {!isAlreadyCompleted && (
          <Card className="border-primary/50">
            <CardContent className="pt-6">
              {gateEntry.security_check?.is_submitted ? (
                <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Security check already submitted</span>
                </div>
              ) : gateEntry.security_check ? (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      Is Security Inspection Completed?
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Confirm that all security checks have been performed and verified
                    </p>
                  </div>
                  <Switch
                    checked={securityInspectionCompleted}
                    onChange={setSecurityInspectionCompleted}
                    disabled={completeMaintenanceEntry.isPending}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">No security check data found</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={handlePrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={handleNavigateToList}>
            Cancel
          </Button>
          {!isAlreadyCompleted && (
            <Button
              type="button"
              onClick={handleComplete}
              disabled={
                isCompleting ||
                (gateEntry?.security_check &&
                  !gateEntry?.security_check?.is_submitted &&
                  !securityInspectionCompleted)
              }
              className={cn(
                gateEntry?.security_check &&
                  !gateEntry?.security_check?.is_submitted &&
                  !securityInspectionCompleted &&
                  'opacity-50 cursor-not-allowed'
              )}
            >
              {isCompleting ? 'Completing...' : 'Complete Entry'}
            </Button>
          )}
          {isAlreadyCompleted && (
            <Button
              type="button"
              onClick={handleNavigateToList}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Entry Completed
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
