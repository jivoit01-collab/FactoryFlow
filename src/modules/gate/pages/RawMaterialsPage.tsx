import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import { Button, Input } from '@/shared/components/ui'
import { useVehicleEntries } from '../api/vehicleEntry.queries'
import { DateRangePicker } from '../components/DateRangePicker'
import { useGlobalDateRange } from '@/core/store/hooks'

// Status label mapping
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  QC_COMPLETED: 'QC Completed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
}

export default function RawMaterialsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange()
  
  // Get status filter from URL
  const statusFilter = searchParams.get('status') || undefined
  
  // Convert date range to API params
  const apiParams = useMemo(() => {
    return {
      from_date: dateRange.from,
      to_date: dateRange.to,
      entry_type: 'RAW_MATERIAL',
      status: statusFilter,
    }
  }, [dateRange, statusFilter])
  
  const { data: entries = [], isLoading } = useVehicleEntries(apiParams)
  
  // Clear status filter
  const clearStatusFilter = () => {
    searchParams.delete('status')
    setSearchParams(searchParams)
  }

  // Filter entries based on search query only (date filtering is done by API)
  const filteredData = useMemo(() => {
    let filtered = entries

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (entry) =>
          entry.entry_no?.toLowerCase().includes(searchLower) ||
          entry.status?.toLowerCase().includes(searchLower) ||
          entry.remarks?.toLowerCase().includes(searchLower) ||
          entry.vehicle?.vehicle_number?.toLowerCase().includes(searchLower) ||
          entry.driver?.name?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [entries, search])

  // Format date/time for display
  const formatDateTime = (dateTime?: string) => {
    if (!dateTime) return '-'
    try {
      const date = new Date(dateTime)
      return date.toLocaleString('en-US', {
        year: 'numeric',
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
      case 'QC_COMPLETED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'REJECTED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Raw Materials (RM/PM/Assets)</h2>
          <p className="text-muted-foreground">
            Manage raw materials, packing materials, and assets gate entries
          </p>
        </div>
        <Button onClick={() => navigate('/gate/raw-materials/new')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by entry number, status, or remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-auto">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => {
              // Handle the DateRange type (not single Date)
              if (date && 'from' in date) {
                setDateRange(date)
              } else {
                setDateRange(undefined)
              }
            }}
            mode="range"
          />
        </div>
      </div>

      {/* Status Filter Badge */}
      {statusFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by status:</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${getStatusBadgeClass(statusFilter)}`}
          >
            {STATUS_LABELS[statusFilter] || statusFilter}
            <button
              onClick={clearStatusFilter}
              className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
          <p className="text-lg">No entries present</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full min-w-[700px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Entry No.</th>
                  <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                  <th className="p-3 text-left text-sm font-medium">Driver</th>
                  <th className="p-3 text-left text-sm font-medium">Entry Time</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-left text-sm font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      navigate(`/gate/raw-materials/edit/${entry.id}/step1`)
                    }}
                  >
                    <td className="p-3 text-sm font-medium">{entry.entry_no || '-'}</td>
                    <td className="p-3 text-sm">{entry.vehicle?.vehicle_number || '-'}</td>
                    <td className="p-3 text-sm">{entry.driver?.name || '-'}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDateTime(entry.entry_time)}
                    </td>
                    <td className="p-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                          entry.status || ''
                        )}`}
                      >
                        {entry.status || '-'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{entry.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
