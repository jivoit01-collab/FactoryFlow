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
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Home,
  FileText,
  Phone,
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
import { cn } from '@/shared/utils'
import type { ApiError } from '@/core/api/types'
import {
  useDailyNeedFullView,
  useCompleteDailyNeedEntry,
} from '../../api/dailyNeedFullView.queries'
import { securityCheckApi } from '../../api/securityCheck.api'
import { useEntryId } from '../../hooks'

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusColor = () => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'PASSED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'PENDING':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    }
  }

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor())}>
      {status}
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
        Daily needs gate entry has been successfully completed
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row opacity-0 animate-fade-in-delay-3">
        <Button size="lg" onClick={onNavigateToDashboard} className="min-w-[200px]">
          <Package className="mr-2 h-5 w-5" />
          Daily Needs Dashboard
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
    queryClient.invalidateQueries({ queryKey: ['dailyNeedFullView'] })
    navigate('/gate/daily-needs')
  }

  const handleNavigateToHome = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    queryClient.invalidateQueries({ queryKey: ['dailyNeedFullView'] })
    navigate('/')
  }
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Fetch full daily need entry data
  const { data: gateEntry, isLoading, error: fetchError } = useDailyNeedFullView(entryIdNumber)

  const completeDailyNeedEntry = useCompleteDailyNeedEntry()

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/daily-needs/edit/${entryId}/step3`)
    } else {
      navigate(`/gate/daily-needs/new/step3?entryId=${entryId}`)
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
      await completeDailyNeedEntry.mutateAsync(entryIdNumber!)

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
    return (
      <div className="space-y-6 pb-6">
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load gate entry details. Please try again.</span>
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
  const dailyNeed = gateEntry.daily_need_details

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileCheck className="h-8 w-8" />
          Final Review
        </h2>
        <p className="text-muted-foreground">
          Review all details before completing the daily needs gate entry
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
                  <BooleanIcon value={gateEntry.security_check.fire_extinguisher_available} />
                  <span className="text-sm">Fire Extinguisher Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <BooleanIcon value={gateEntry.security_check.alcohol_test_done} />
                  <span className="text-sm">Alcohol Test Done</span>
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

        {/* Daily Need Details */}
        {dailyNeed && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Daily Need Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Material Info */}
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Category</Label>
                  <p className="font-medium">{dailyNeed.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Material Name</Label>
                  <p className="font-medium">{dailyNeed.material_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Supplier / Vendor</Label>
                  <p className="font-medium">{dailyNeed.supplier_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Receiving Department</Label>
                  <p className="font-medium">{dailyNeed.receiving_department}</p>
                </div>
              </div>

              {/* Quantity */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Quantity</Label>
                  <p className="font-medium text-lg text-primary">
                    {dailyNeed.quantity} {dailyNeed.unit}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Supervisor</Label>
                  <p className="font-medium">{dailyNeed.canteen_supervisor || '-'}</p>
                </div>
              </div>

              {/* Documentation */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4" />
                  Documentation & Contact
                </h4>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Bill / Challan Number</Label>
                    <p className="font-medium">{dailyNeed.bill_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Delivery Challan Number</Label>
                    <p className="font-medium">{dailyNeed.delivery_challan_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Vehicle / Person Name</Label>
                    <p className="font-medium">{dailyNeed.vehicle_or_person_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Contact Number
                    </Label>
                    <p className="font-medium">{dailyNeed.contact_number || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {dailyNeed.remarks && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Remarks / Notes</Label>
                  <p className="text-sm">{dailyNeed.remarks}</p>
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
                    disabled={completeDailyNeedEntry.isPending}
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
