import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, FileText, Clock, CheckCircle2 } from 'lucide-react'
import { Button, Card, CardContent } from '@/shared/components/ui'
import { useVehicleEntries, useVehicleEntriesCount } from '../api/vehicleEntry.queries'
import { DateRangePicker } from '../components/DateRangePicker'
import { useGlobalDateRange } from '@/core/store/hooks'

// Status counts for Construction (only 3 statuses)
interface StatusCounts {
  draft: number
  in_progress: number
  completed: number
}

// Ordered list of statuses for Construction
const STATUS_ORDER: (keyof StatusCounts)[] = ['draft', 'in_progress', 'completed']

// Status configuration with colors and icons
const STATUS_CONFIG: Record<
  string,
  {
    label: string
    color: string
    bgColor: string
    icon: React.ElementType
    key: keyof StatusCounts
  }
> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: FileText,
    key: 'draft',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: Clock,
    key: 'in_progress',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: CheckCircle2,
    key: 'completed',
  },
}

export default function ConstructionDashboard() {
  const navigate = useNavigate()
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange()

  // Convert date range to API params
  const apiParams = useMemo(() => {
    return {
      from_date: dateRange.from,
      to_date: dateRange.to,
      entry_type: 'CONSTRUCTION',
    }
  }, [dateRange])

  // Fetch recent entries with entry_type and date filter
  const { data: apiEntries = [], isLoading: entriesLoading } = useVehicleEntries(apiParams)

  // Fetch status counts with the same filters
  const { data: countData, isLoading: countLoading } = useVehicleEntriesCount(apiParams)

  // Transform API count response to StatusCounts object
  const statusCounts = useMemo((): StatusCounts => {
    const defaultCounts: StatusCounts = {
      draft: 0,
      in_progress: 0,
      completed: 0,
    }

    if (!countData?.total_vehicle_entries) return defaultCounts

    countData.total_vehicle_entries.forEach(({ status, count }) => {
      const key = status.toLowerCase() as keyof StatusCounts
      if (key in defaultCounts) {
        defaultCounts[key] = count
      }
    })

    return defaultCounts
  }, [countData])

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

  // Format status badge
  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Construction (Civil/Building Work)</h2>
          <p className="text-muted-foreground">
            Manage construction materials and building work gate entries
          </p>
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
          <Button onClick={() => navigate('/gate/construction/new')} className="w-full sm:w-auto">
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
            onClick={() => navigate('/gate/construction/all')}
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
                onClick={() => navigate(`/gate/construction/edit/${entry.id}/step1`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-sm">{entry.entry_no}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(
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
          <div className="grid grid-cols-3 gap-3">
            {STATUS_ORDER.map((statusKey) => {
              const statusUpper = statusKey.toUpperCase()
              const config = STATUS_CONFIG[statusUpper]
              if (!config) return null

              const Icon = config.icon
              const count = statusCounts[statusKey] || 0

              return (
                <Card
                  key={statusKey}
                  className={`${config.bgColor} border cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => navigate(`/gate/construction/all?status=${statusUpper}`)}
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
        )}
      </div>
    </div>
  )
}
