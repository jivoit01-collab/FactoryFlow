import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  History,
  List,
  PackageCheck,
  RefreshCw,
  ShieldX,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import type { ApiError } from '@/core/api/types'
import { Button, Card, CardContent } from '@/shared/components/ui'

import { usePendingGRPOEntries } from '../api'
import { useGRPOHistory } from '../api'
import { GRPO_STATUS } from '../constants'

// Status configuration for overview grid
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: Clock,
    link: '/grpo/history?status=pending',
  },
  posted: {
    label: 'Posted',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: CheckCircle2,
    link: '/grpo/history?status=posted',
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: XCircle,
    link: '/grpo/history?status=failed',
  },
}

const STATUS_ORDER = ['pending', 'posted', 'failed'] as const

// Format date/time for display
const formatDateTime = (dateTime?: string) => {
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

export default function GRPODashboardPage() {
  const navigate = useNavigate()

  const { data: pendingEntries = [], isLoading, error, refetch } = usePendingGRPOEntries()
  const { data: historyEntries = [] } = useGRPOHistory()

  const apiError = error as ApiError | null
  const isPermissionError = apiError?.status === 403

  // Calculate counts
  const totalPendingPOs = pendingEntries.reduce((sum, e) => sum + e.pending_po_count, 0)

  const historyCounts = {
    pending: historyEntries.filter((h) => h.status === GRPO_STATUS.PENDING).length,
    posted: historyEntries.filter((h) => h.status === GRPO_STATUS.POSTED).length,
    failed: historyEntries.filter(
      (h) => h.status === GRPO_STATUS.FAILED || h.status === GRPO_STATUS.PARTIALLY_POSTED
    ).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">GRPO Posting</h2>
          <p className="text-muted-foreground">
            Post goods receipts to SAP after gate entry completion
          </p>
        </div>
        <Button onClick={() => navigate('/grpo/pending')} className="w-full sm:w-auto">
          <List className="h-4 w-4 mr-2" />
          View Pending
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Permission Error */}
          {isPermissionError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
              <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-destructive">Permission Denied</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'You do not have permission to view this data.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* General API Error */}
          {error && !isPermissionError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'An error occurred while loading the dashboard.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Summary Card */}
          <Card
            className="bg-primary/5 border-primary/20 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/grpo/pending')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Pending GRPO</span>
                </div>
                <span className="text-3xl font-bold text-primary">{pendingEntries.length}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                      {totalPendingPOs}
                    </span>{' '}
                    POs pending
                  </span>
                  <span>
                    <span className="font-semibold text-primary">{pendingEntries.length}</span>{' '}
                    Entries
                  </span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Pending Entries */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Pending Entries</h3>
              <button
                onClick={() => navigate('/grpo/pending')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Show more
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {pendingEntries.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-sm text-muted-foreground border rounded-lg">
                No pending entries
              </div>
            ) : (
              <div className="space-y-2">
                {pendingEntries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.vehicle_entry_id}
                    className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/grpo/preview/${entry.vehicle_entry_id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-medium text-sm">{entry.entry_no}</span>
                      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {entry.pending_po_count} PO{entry.pending_po_count !== 1 ? 's' : ''} pending
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.entry_time)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Overview */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Posting History</h3>
            <div className="grid grid-cols-3 gap-3">
              {STATUS_ORDER.map((statusKey) => {
                const config = STATUS_CONFIG[statusKey]
                const Icon = config.icon
                const count = historyCounts[statusKey] || 0

                return (
                  <Card
                    key={statusKey}
                    className={`${config.bgColor} border cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => navigate(config.link)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className={`text-xl font-bold ${config.color}`}>{count}</span>
                      </div>
                      <p className={`mt-1 text-xs font-medium ${config.color}`}>{config.label}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/grpo/pending')}
              >
                <List className="h-5 w-5" />
                <span className="text-xs">Pending Entries</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/grpo/history')}
              >
                <History className="h-5 w-5" />
                <span className="text-xs">Posting History</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
