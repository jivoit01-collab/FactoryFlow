import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, AlertCircle, ShieldX, ChevronRight } from 'lucide-react'
import { Button, Card, CardContent } from '@/shared/components/ui'
import { usePendingInspections } from '../api/inspection/inspection.queries'
import { WORKFLOW_STATUS_CONFIG } from '../constants'
import type { InspectionWorkflowStatus } from '../types'
import type { ApiError } from '@/core/api/types'

// Status filter configuration
const STATUS_FILTERS = {
  all: {
    label: 'All',
    title: 'All Inspections',
    description: 'All arrival slips and inspections',
    filter: () => true,
  },
  actionable: {
    label: 'Actionable',
    title: 'Pending Actions',
    description: 'Items requiring attention',
    filter: (item: { has_inspection: boolean; inspection_status: string | null }) =>
      !item.has_inspection ||
      item.inspection_status === 'DRAFT' ||
      item.inspection_status === 'SUBMITTED' ||
      item.inspection_status === 'QA_CHEMIST_APPROVED',
  },
  pending: {
    label: 'Pending',
    title: 'Pending Inspections',
    description: 'Arrival slips awaiting QC inspection',
    filter: (item: { has_inspection: boolean }) => !item.has_inspection,
  },
  draft: {
    label: 'Draft',
    title: 'Draft Inspections',
    description: 'Inspections started but not submitted',
    filter: (item: { has_inspection: boolean; inspection_status: string | null }) =>
      item.has_inspection && item.inspection_status === 'DRAFT',
  },
  approved: {
    label: 'Approved',
    title: 'Approved Inspections',
    description: 'Completed and approved inspections',
    filter: (item: { has_inspection: boolean; inspection_status: string | null }) =>
      item.has_inspection &&
      (item.inspection_status === 'QAM_APPROVED' || item.inspection_status === 'COMPLETED'),
  },
  rejected: {
    label: 'Rejected',
    title: 'Rejected Inspections',
    description: 'Rejected inspections',
    filter: (item: { has_inspection: boolean; inspection_status: string | null }) =>
      item.has_inspection && item.inspection_status === 'REJECTED',
  },
} as const

type StatusFilterKey = keyof typeof STATUS_FILTERS

// Status badge styling - consistent with Gate module
const getStatusBadgeClass = (status: string | null, hasInspection: boolean) => {
  if (!hasInspection) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  }
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    case 'SUBMITTED':
    case 'QA_CHEMIST_APPROVED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'QAM_APPROVED':
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
}

export default function PendingInspectionsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: pendingInspections = [], isLoading, refetch, error } = usePendingInspections()

  // Get status filter from URL
  const statusFilter = (searchParams.get('status') as StatusFilterKey) || 'all'
  const currentFilter = STATUS_FILTERS[statusFilter] || STATUS_FILTERS.all

  // Filter inspections based on status
  const filteredInspections = useMemo(() => {
    return pendingInspections.filter(currentFilter.filter)
  }, [pendingInspections, currentFilter])

  // Check if error is a permission error (403)
  const apiError = error as ApiError | null
  const isPermissionError = apiError?.status === 403

  // Handle filter change
  const handleFilterChange = (filter: StatusFilterKey) => {
    if (filter === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ status: filter })
    }
  }

  // Format date/time - consistent with Gate module
  const formatDateTime = (dateTime?: string | null) => {
    if (!dateTime) return '-'
    try {
      const date = new Date(dateTime)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateTime
    }
  }

  return (
    <div className="space-y-6">
      {/* Header - Consistent with Gate module */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate('/qc')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">{currentFilter.title}</h2>
          </div>
          <p className="text-muted-foreground">{currentFilter.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs - More compact */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_FILTERS) as StatusFilterKey[]).map((key) => (
          <Button
            key={key}
            variant={statusFilter === key ? 'default' : 'outline'}
            size="sm"
            className="h-8"
            onClick={() => handleFilterChange(key)}
          >
            {STATUS_FILTERS[key].label}
          </Button>
        ))}
      </div>

      {/* Permission Error - Compact like Gate */}
      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to view pending inspections.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* General Error - Compact like Gate */}
      {error && !isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'An error occurred while loading pending inspections.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredInspections.length === 0 && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
          No {currentFilter.label.toLowerCase()} inspections
        </div>
      )}

      {/* Inspections List - Compact rows like Gate module */}
      {!isLoading && !error && filteredInspections.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {currentFilter.label} ({filteredInspections.length})
            </h3>
          </div>

          <div className="space-y-2">
            {filteredInspections.map((item) => {
              const status = item.has_inspection ? item.inspection_status : null
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
                <div
                  key={item.arrival_slip.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={handleRowClick}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-medium text-sm">{item.arrival_slip.entry_no}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${
                        item.has_inspection && statusConfig
                          ? getStatusBadgeClass(status, item.has_inspection)
                          : getStatusBadgeClass(null, false)
                      }`}
                    >
                      {item.has_inspection && statusConfig ? statusConfig.label : 'Pending'}
                    </span>
                    <span className="text-xs text-muted-foreground hidden md:inline truncate">
                      {item.arrival_slip.item_name} • {item.arrival_slip.party_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {item.arrival_slip.billing_qty} {item.arrival_slip.billing_uom}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.arrival_slip.submitted_at)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
