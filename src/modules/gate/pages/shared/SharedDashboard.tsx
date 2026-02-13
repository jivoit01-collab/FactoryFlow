import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  XCircle,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { getEntryStatusClasses } from '@/config/constants'
import { useGlobalDateRange } from '@/core/store/hooks'
import { Button, Card, CardContent } from '@/shared/components/ui'

import { useVehicleEntries, useVehicleEntriesCount } from '../../api/vehicle/vehicleEntry.queries'
import { DateRangePicker } from '../../components/DateRangePicker'
import type { EntryFlowConfig } from '../../constants/entryFlowConfig'

interface StatusConfigItem {
  label: string
  color: string
  bgColor: string
  icon: React.ElementType
}

export interface DashboardStatusConfig {
  statusOrder: string[]
  statusConfig: Record<string, StatusConfigItem>
  gridCols: string
}

interface SharedDashboardProps {
  config: EntryFlowConfig
  statusConfig?: DashboardStatusConfig
}

// Default 3-status config used by construction, daily-needs, maintenance
const DEFAULT_STATUS_CONFIG: DashboardStatusConfig = {
  statusOrder: ['draft', 'in_progress', 'completed'],
  statusConfig: {
    DRAFT: {
      label: 'Draft',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: FileText,
    },
    IN_PROGRESS: {
      label: 'In Progress',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: Clock,
    },
    COMPLETED: {
      label: 'Completed',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: CheckCircle2,
    },
  },
  gridCols: 'grid-cols-3',
}

// 6-status config used by raw materials
export const RAW_MATERIAL_STATUS_CONFIG: DashboardStatusConfig = {
  statusOrder: ['draft', 'in_progress', 'qc_completed', 'completed', 'cancelled', 'rejected'],
  statusConfig: {
    DRAFT: {
      label: 'Draft',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: FileText,
    },
    IN_PROGRESS: {
      label: 'In Progress',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: Clock,
    },
    QC_COMPLETED: {
      label: 'QC Completed',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      icon: CheckCircle2,
    },
    COMPLETED: {
      label: 'Completed',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: CheckCircle2,
    },
    CANCELLED: {
      label: 'Cancelled',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: XCircle,
    },
    REJECTED: {
      label: 'Rejected',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      icon: AlertCircle,
    },
  },
  gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
}

export default function SharedDashboard({
  config,
  statusConfig = DEFAULT_STATUS_CONFIG,
}: SharedDashboardProps) {
  const navigate = useNavigate()
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange()

  // Convert date range to API params
  const apiParams = useMemo(() => {
    return {
      from_date: dateRange.from,
      to_date: dateRange.to,
      entry_type: config.entryType,
    }
  }, [dateRange, config.entryType])

  // Fetch recent entries with entry_type and date filter
  const { data: apiEntries = [], isLoading: entriesLoading } = useVehicleEntries(apiParams)

  // Fetch status counts with the same filters
  const { data: countData, isLoading: countLoading } = useVehicleEntriesCount(apiParams)

  // Transform API count response to status counts object
  const statusCounts = useMemo((): Record<string, number> => {
    const defaultCounts: Record<string, number> = {}
    statusConfig.statusOrder.forEach((key) => {
      defaultCounts[key] = 0
    })

    if (!countData?.total_vehicle_entries) return defaultCounts

    countData.total_vehicle_entries.forEach(
      ({ status, count }: { status: string; count: number }) => {
        const key = status.toLowerCase()
        if (key in defaultCounts) {
          defaultCounts[key] = count
        }
      }
    )

    return defaultCounts
  }, [countData, statusConfig.statusOrder])

  const entries = apiEntries
  const isLoading = entriesLoading || countLoading

  // Get 2 most recent entries
  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => {
        const dateA = a.entry_time ? new Date(a.entry_time).getTime() : 0
        const dateB = b.entry_time ? new Date(b.entry_time).getTime() : 0
        return dateB - dateA
      })
      .slice(0, 2)
  }, [entries])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{config.dashboardTitle}</h2>
          <p className="text-muted-foreground">{config.dashboardDescription}</p>
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
          <Button
            onClick={() => navigate(`${config.routePrefix}/new`)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Entry
          </Button>
        </div>
      </div>

      {/* Recent Entries Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Recent Entries</h3>
          <button
            onClick={() => navigate(`${config.routePrefix}/all`)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Show more
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : recentEntries.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground border rounded-lg">
            No entries yet
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`${config.routePrefix}/edit/${entry.id}/step1`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-sm">{entry.entry_no}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getEntryStatusClasses(
                      entry.status || ''
                    )}`}
                  >
                    {entry.status}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {entry.vehicle?.vehicle_number} • {entry.driver?.name}
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

      {/* Status Overview Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Status Overview</h3>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className={`grid ${statusConfig.gridCols} gap-3`}>
            {statusConfig.statusOrder.map((statusKey) => {
              const statusUpper = statusKey.toUpperCase()
              const sc = statusConfig.statusConfig[statusUpper]
              if (!sc) return null

              const Icon = sc.icon
              const count = statusCounts[statusKey] || 0

              return (
                <Card
                  key={statusKey}
                  className={`${sc.bgColor} border cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => navigate(`${config.routePrefix}/all?status=${statusUpper}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <Icon className={`h-4 w-4 ${sc.color}`} />
                      <span className={`text-xl font-bold ${sc.color}`}>{count}</span>
                    </div>
                    <p className={`mt-1 text-xs font-medium ${sc.color}`}>{sc.label}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
