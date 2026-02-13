import { AlertCircle, ArrowLeft, Eye, FlaskConical, RefreshCw, ShieldX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { QC_PERMISSIONS } from '@/config/permissions'
import type { ApiError } from '@/core/api/types'
import { usePermission } from '@/core/auth'
import { useGlobalDateRange } from '@/core/store/hooks'
import { DateRangePicker } from '@/modules/gate/components'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui'

import {
  useAwaitingChemistInspections,
  useAwaitingQAMInspections,
} from '../api/inspection/inspection.queries'
import { WORKFLOW_STATUS_CONFIG } from '../constants'
import type { Inspection, InspectionWorkflowStatus } from '../types'

type TabType = 'chemist' | 'manager'

export default function ApprovalQueuePage() {
  const navigate = useNavigate()
  const { hasAnyPermission } = usePermission()
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange()

  const dateParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
    }),
    [dateRange]
  )

  // Fetch from dedicated backend endpoints
  const {
    data: chemistQueue = [],
    isLoading: chemistLoading,
    error: chemistError,
    refetch: refetchChemist,
  } = useAwaitingChemistInspections(dateParams)

  const {
    data: managerQueue = [],
    isLoading: managerLoading,
    error: managerError,
    refetch: refetchManager,
  } = useAwaitingQAMInspections(dateParams)

  const isLoading = chemistLoading || managerLoading
  const error = chemistError || managerError

  // Check if error is a permission error (403)
  const apiError = error as ApiError | null
  const isPermissionError = apiError?.status === 403

  // Permission checks for approval tabs
  const canApproveAsChemist = hasAnyPermission([QC_PERMISSIONS.APPROVAL.APPROVE_AS_CHEMIST])
  const canApproveAsQAM = hasAnyPermission([QC_PERMISSIONS.APPROVAL.APPROVE_AS_QAM])

  // Determine default tab based on permissions
  const defaultTab: TabType = canApproveAsChemist ? 'chemist' : 'manager'
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab)

  // Compute effective tab - ensure user can't view a tab they don't have permission for
  const effectiveTab =
    activeTab === 'chemist' && !canApproveAsChemist && canApproveAsQAM
      ? 'manager'
      : activeTab === 'manager' && !canApproveAsQAM && canApproveAsChemist
        ? 'chemist'
        : activeTab

  // Select data based on active tab
  const filteredInspections: Inspection[] =
    effectiveTab === 'chemist' ? chemistQueue : managerQueue

  const refetch = () => {
    refetchChemist()
    refetchManager()
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
              Approval Queue
            </h2>
          </div>
          <p className="text-muted-foreground">Review and approve inspections</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => {
              if (date && 'from' in date) {
                setDateRange(date)
              } else {
                setDateRange(undefined)
              }
            }}
          />
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs - Only show tabs user has permission for */}
      <div className="flex gap-2">
        {canApproveAsChemist && (
          <Button
            variant={effectiveTab === 'chemist' ? 'default' : 'outline'}
            onClick={() => setActiveTab('chemist')}
          >
            QA Chemist Queue ({chemistQueue.length})
          </Button>
        )}
        {canApproveAsQAM && (
          <Button
            variant={effectiveTab === 'manager' ? 'default' : 'outline'}
            onClick={() => setActiveTab('manager')}
          >
            QA Manager Queue ({managerQueue.length})
          </Button>
        )}
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
                  {apiError?.message || 'You do not have permission to view the approval queue.'}
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
                  {apiError?.message || 'An error occurred while loading the approval queue.'}
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
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredInspections.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <FlaskConical className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">No Pending Approvals</p>
                <p className="text-sm text-muted-foreground">
                  There are no inspections awaiting{' '}
                  {effectiveTab === 'chemist' ? 'QA Chemist' : 'QA Manager'} approval.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approvals Table */}
      {!isLoading && !error && filteredInspections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {effectiveTab === 'chemist'
                ? 'Awaiting QA Chemist Approval'
                : 'Awaiting QA Manager Approval'}{' '}
              ({filteredInspections.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Report No.</th>
                    <th className="text-left p-3 font-medium">Particulars</th>
                    <th className="text-left p-3 font-medium">Supplier</th>
                    <th className="text-left p-3 font-medium">Inspection Date</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-center p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInspections.map((item) => {
                    const statusConfig =
                      WORKFLOW_STATUS_CONFIG[item.workflow_status as InspectionWorkflowStatus]

                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <span className="font-medium">{item.report_no || item.entry_no}</span>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.description_of_material}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">{item.supplier_name}</td>
                        <td className="p-3 text-muted-foreground">
                          {item.inspection_date
                            ? formatDateTime(item.inspection_date)
                            : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/qc/inspections/${item.arrival_slip}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
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
