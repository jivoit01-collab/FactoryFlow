import { useNavigate } from 'react-router-dom'
import { FlaskConical, ArrowLeft, RefreshCw, AlertCircle, ShieldX } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'
import { usePendingInspections } from '../api/inspection/inspection.queries'
import { WORKFLOW_STATUS_CONFIG } from '../constants'
import type { InspectionWorkflowStatus } from '../types'
import type { ApiError } from '@/core/api/types'

export default function PendingInspectionsPage() {
  const navigate = useNavigate()
  const { data: pendingInspections = [], isLoading, refetch, error } = usePendingInspections()

  // Check if error is a permission error (403)
  const apiError = error as ApiError | null
  const isPermissionError = apiError?.status === 403

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

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/qc')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FlaskConical className="h-8 w-8" />
              Pending Inspections
            </h2>
          </div>
          <p className="text-muted-foreground">
            Arrival slips submitted for QC inspection
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Permission Error State */}
      {isPermissionError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <ShieldX className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive">Permission Denied</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'You do not have permission to view pending inspections.'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please contact your administrator if you believe this is an error.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Error State */}
      {error && !isPermissionError && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-yellow-800 dark:text-yellow-400">
                  Failed to Load Data
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'An error occurred while loading pending inspections.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Loading pending inspections...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && pendingInspections.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <FlaskConical className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">No Pending Inspections</p>
                <p className="text-sm text-muted-foreground">
                  There are no arrival slips awaiting QC inspection.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspections Table */}
      {!isLoading && !error && pendingInspections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Arrival Slips ({pendingInspections.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Entry No.</th>
                    <th className="text-left p-3 font-medium">Particulars</th>
                    <th className="text-left p-3 font-medium">Party Name</th>
                    <th className="text-left p-3 font-medium">Billing Qty</th>
                    <th className="text-left p-3 font-medium">Submitted At</th>
                    <th className="text-center p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInspections.map((item) => {
                    const status = item.has_inspection
                      ? item.inspection_status
                      : null
                    const statusConfig = status
                      ? WORKFLOW_STATUS_CONFIG[status as InspectionWorkflowStatus]
                      : null

                    const handleRowClick = () => {
                      if (item.has_inspection) {
                        navigate(`/qc/inspections/${item.arrival_slip.id}`)
                      } else {
                        navigate(`/qc/inspections/${item.arrival_slip.id}/new`)
                      }
                    }

                    return (
                      <tr
                        key={item.arrival_slip.id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={handleRowClick}
                      >
                        <td className="p-3">
                          <span className="font-medium">{item.arrival_slip.entry_no}</span>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{item.arrival_slip.item_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.arrival_slip.particulars}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">{item.arrival_slip.party_name}</td>
                        <td className="p-3">
                          {item.arrival_slip.billing_qty} {item.arrival_slip.billing_uom}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {item.arrival_slip.submitted_at
                            ? formatDateTime(item.arrival_slip.submitted_at)
                            : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {item.has_inspection && statusConfig ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                            >
                              {statusConfig.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
