import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, AlertCircle, ShieldX, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { useGRPOHistory } from '../api'
import { GRPO_STATUS_CONFIG, GRPO_STATUS } from '../constants'
import type { GRPOStatus, GRPOHistoryEntry } from '../types'
import type { ApiError } from '@/core/api/types'

// Status filter configuration
const STATUS_FILTERS = {
  all: {
    label: 'All',
    filter: () => true,
  },
  pending: {
    label: 'Pending',
    filter: (entry: GRPOHistoryEntry) => entry.status === GRPO_STATUS.PENDING,
  },
  posted: {
    label: 'Posted',
    filter: (entry: GRPOHistoryEntry) => entry.status === GRPO_STATUS.POSTED,
  },
  failed: {
    label: 'Failed',
    filter: (entry: GRPOHistoryEntry) =>
      entry.status === GRPO_STATUS.FAILED || entry.status === GRPO_STATUS.PARTIALLY_POSTED,
  },
} as const

type StatusFilterKey = keyof typeof STATUS_FILTERS

// Status badge styling
const getStatusBadgeClass = (status: GRPOStatus) => {
  switch (status) {
    case 'POSTED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'FAILED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'PARTIALLY_POSTED':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    case 'PENDING':
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  }
}

// Format date/time for display
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

export default function GRPOHistoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: historyEntries = [], isLoading, refetch, error } = useGRPOHistory()

  // Get status filter from URL
  const statusFilter = (searchParams.get('status') as StatusFilterKey) || 'all'
  const currentFilter = STATUS_FILTERS[statusFilter] || STATUS_FILTERS.all

  // Filter entries based on status
  const filteredEntries = useMemo(() => {
    return historyEntries.filter(currentFilter.filter)
  }, [historyEntries, currentFilter])

  const handleFilterChange = (filter: StatusFilterKey) => {
    if (filter === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ status: filter })
    }
  }

  const apiError = error as ApiError | null
  const isPermissionError = apiError?.status === 403

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/grpo')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Posting History</h2>
          </div>
          <p className="text-muted-foreground">View all GRPO postings to SAP</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
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

      {/* Permission Error */}
      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to view posting history.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* General Error */}
      {error && !isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'An error occurred while loading posting history.'}
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
      {!isLoading && !error && filteredEntries.length === 0 && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
          No {currentFilter.label.toLowerCase()} postings
        </div>
      )}

      {/* History List */}
      {!isLoading && !error && filteredEntries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {currentFilter.label} ({filteredEntries.length})
            </h3>
          </div>

          <div className="space-y-2">
            {filteredEntries.map((entry) => {
              const statusConfig = GRPO_STATUS_CONFIG[entry.status]

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/grpo/history/${entry.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-medium text-sm">{entry.entry_no}</span>
                    <span className="text-xs text-muted-foreground">{entry.po_number}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${getStatusBadgeClass(entry.status)}`}
                    >
                      {statusConfig?.label || entry.status}
                    </span>
                    {entry.sap_doc_num && (
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        SAP #{entry.sap_doc_num}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.posted_at || entry.created_at)}
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
