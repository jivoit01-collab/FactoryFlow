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
  Scale,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Home,
} from 'lucide-react'
import {
  Button,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'
import { useScrollToError } from '@/shared/hooks'
import { cn } from '@/shared/utils'
import type { ApiError } from '@/core/api/types'
import { isServerError as checkServerError, getServerErrorMessage } from '@/shared/utils'
import { useGateEntryFullView, useCompleteGateEntry } from '../../api/gateEntryFullView/gateEntryFullView.queries'
import { securityCheckApi } from '../../api/securityCheck/securityCheck.api'
import { useEntryId } from '../../hooks'
import { ENTRY_STATUS, FINAL_STATUS } from '@/config/constants'

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusColor = () => {
    const upper = status.toUpperCase()
    switch (upper) {
      case ENTRY_STATUS.COMPLETED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case ENTRY_STATUS.DRAFT:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'PASSED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'FAILED':
      case FINAL_STATUS.REJECTED:
      case 'QC REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case FINAL_STATUS.PENDING:
      case FINAL_STATUS.HOLD:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      case FINAL_STATUS.ACCEPTED:
      case 'QC ACCEPTED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
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
        Gate entry has been successfully completed
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row opacity-0 animate-fade-in-delay-3">
        <Button size="lg" onClick={onNavigateToDashboard} className="min-w-[200px]">
          <Package className="mr-2 h-5 w-5" />
          Raw Material Dashboard
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

  const [isSubmittingSecurity, setIsSubmittingSecurity] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [securityJustSubmitted, setSecurityJustSubmitted] = useState(false)

  const handleNavigateToList = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] })
    navigate('/gate/raw-materials')
  }

  const handleNavigateToHome = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] })
    queryClient.invalidateQueries({ queryKey: ['gateEntryFullView'] })
    navigate('/')
  }
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})

  // Scroll to first error when errors occur
  useScrollToError(apiErrors)

  // Fetch full gate entry data
  const { data: gateEntry, isLoading, error: fetchError } = useGateEntryFullView(entryIdNumber)

  const completeGateEntry = useCompleteGateEntry()

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/raw-materials/edit/${entryId}/step5`)
    } else {
      navigate(`/gate/raw-materials/new/step5?entryId=${entryId}`)
    }
  }

  const handleSubmitSecurity = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing.' })
      return
    }

    setApiErrors({})
    setIsSubmittingSecurity(true)

    try {
      // Get security data to retrieve the security ID
      const securityData = await securityCheckApi.get(entryIdNumber!)

      if (!securityData.id) {
        setApiErrors({
          general: 'Security check data not found. Please complete security check first.',
        })
        setIsSubmittingSecurity(false)
        return
      }

      // Submit security check (this locks Step 2 from updates)
      await securityCheckApi.submit(securityData.id)

      // Mark that security was just submitted so we can show Complete Entry button
      setSecurityJustSubmitted(true)

      // Refresh the gate entry data
      queryClient.invalidateQueries({ queryKey: ['gateEntryFullView', entryIdNumber] })
    } catch (error) {
      const apiError = error as ApiError & { detail?: string }
      const errorMessage = apiError.message || apiError.detail || 'Failed to submit security check'
      setApiErrors({ general: errorMessage })
    } finally {
      setIsSubmittingSecurity(false)
    }
  }

  const handleComplete = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing.' })
      return
    }

    setApiErrors({})
    setIsCompleting(true)

    try {
      // Complete the gate entry
      await completeGateEntry.mutateAsync(entryIdNumber!)

      // Show success screen
      setShowSuccess(true)
    } catch (error) {
      const apiError = error as ApiError & { detail?: string }
      // Show user-friendly error message
      setApiErrors({ general: 'Cannot complete the entry at the moment. Please try again later.' })
      console.error('Complete entry error:', apiError.message || apiError.detail)
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

  const isAlreadyCompleted = gateEntry.gate_entry.status === ENTRY_STATUS.COMPLETED

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileCheck className="h-8 w-8" />
          Final Review
        </h2>
        <p className="text-muted-foreground">Review all details before completing the gate entry</p>
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
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-muted-foreground text-xs">Entry Number</Label>
                <p className="font-medium">{gateEntry.gate_entry.entry_no}</p>
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
                <p className="font-medium">{gateEntry.vehicle.vehicle_type.name}</p>
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

        {/* Weighment */}
        {gateEntry.weighment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Weighment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Gross Weight</Label>
                  <p className="font-medium text-lg">
                    {gateEntry.weighment.gross_weight.toLocaleString()} kg
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Tare Weight</Label>
                  <p className="font-medium text-lg">
                    {gateEntry.weighment.tare_weight.toLocaleString()} kg
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Net Weight</Label>
                  <p className="font-medium text-lg text-primary">
                    {gateEntry.weighment.net_weight.toLocaleString()} kg
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Weighbridge Slip No.</Label>
                  <p className="font-medium">{gateEntry.weighment.weighbridge_slip_no}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PO Receipts */}
        {gateEntry.po_receipts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Purchase Order Receipts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {gateEntry.po_receipts.map((receipt, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid gap-4 md:grid-cols-4 mb-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">PO Number</Label>
                      <p className="font-medium">{receipt.po_number}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Supplier Code</Label>
                      <p className="font-medium">{receipt.supplier_code}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Supplier Name</Label>
                      <p className="font-medium">{receipt.supplier_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Created By</Label>
                      <p className="font-medium">{receipt.created_by}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Item</th>
                          <th className="text-right p-2">Ordered</th>
                          <th className="text-right p-2">Received</th>
                          <th className="text-right p-2">Short</th>
                          <th className="text-center p-2">UOM</th>
                          <th className="text-center p-2 min-w-[120px]">QC Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipt.items.map((item, itemIndex) => (
                          <tr key={itemIndex} className="border-b">
                            <td className="p-2">
                              <div>
                                <p className="font-medium">{item.item_name}</p>
                                <p className="text-xs text-muted-foreground">{item.item_code}</p>
                              </div>
                            </td>
                            <td className="text-right p-2">{item.ordered_qty.toLocaleString()}</td>
                            <td className="text-right p-2">{item.received_qty.toLocaleString()}</td>
                            <td className="text-right p-2 text-destructive">
                              {item.short_qty > 0 ? `-${item.short_qty.toLocaleString()}` : '0'}
                            </td>
                            <td className="text-center p-2">{item.uom}</td>
                            <td className="text-center p-2">
                              {item.qc_status ? (
                                <StatusBadge status={item.qc_status.display} />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Security Inspection Status */}
        {!isAlreadyCompleted && (
          <Card className="border-primary/50">
            <CardContent className="pt-6">
              {gateEntry.security_check?.is_submitted || securityJustSubmitted ? (
                <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Security check submitted. Ready to complete entry.</span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      Security Inspection Pending
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Submit security check to proceed with completing the entry
                    </p>
                  </div>
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
            <>
              {!gateEntry?.security_check?.is_submitted && !securityJustSubmitted ? (
                <Button
                  type="button"
                  onClick={handleSubmitSecurity}
                  disabled={isSubmittingSecurity}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {isSubmittingSecurity ? 'Submitting...' : 'Submit Security'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={isCompleting}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isCompleting ? 'Completing...' : 'Complete Entry'}
                </Button>
              )}
            </>
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
