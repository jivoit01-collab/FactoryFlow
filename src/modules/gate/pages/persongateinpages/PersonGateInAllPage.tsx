import { ArrowLeft, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useGlobalDateRange } from '@/core/store/hooks'
import { Button, Input } from '@/shared/components/ui'

import { usePersonEntries } from '../../api/personGateIn/personGateIn.queries'
import { DateRangePicker } from '../../components/DateRangePicker'

export default function PersonGateInAllPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange()

  // Get filters from URL
  const statusFilter = searchParams.get('status') || undefined
  const personTypeFilter = searchParams.get('person_type') || undefined
  const gateInFilter = searchParams.get('gate_in') || undefined

  // Convert date range to API params
  const apiParams = useMemo(() => {
    return {
      from_date: dateRange.from,
      to_date: dateRange.to,
      status: statusFilter,
      person_type: personTypeFilter ? Number(personTypeFilter) : undefined,
      gate_in: gateInFilter ? Number(gateInFilter) : undefined,
    }
  }, [dateRange, statusFilter, personTypeFilter, gateInFilter])

  const { data: entries = [], isLoading } = usePersonEntries(apiParams)

  // Filter entries based on search query only (date filtering is done by API)
  const filteredData = useMemo(() => {
    let filtered = entries

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (entry) =>
          entry.name_snapshot?.toLowerCase().includes(searchLower) ||
          entry.status?.toLowerCase().includes(searchLower) ||
          entry.remarks?.toLowerCase().includes(searchLower) ||
          entry.purpose?.toLowerCase().includes(searchLower) ||
          entry.gate_in?.name?.toLowerCase().includes(searchLower) ||
          entry.vehicle_no?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [entries, search])

  // Format date/time for display
  const formatDateTime = (dateTime?: string | null) => {
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
      case 'IN':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'OUT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  // Get person type badge class
  const getPersonTypeBadgeClass = (personType?: string) => {
    switch (personType?.toUpperCase()) {
      case 'VISITOR':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'LABOUR':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/visitor-labour')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">All Entries</h2>
            <p className="text-muted-foreground">
              View all visitor and labour gate entries
              {statusFilter && (
                <span className="ml-2 text-sm">
                  (Filtered by: <span className="font-medium">{statusFilter}</span>)
                </span>
              )}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate('/gate/visitor-labour/new')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, purpose, gate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-auto">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => {
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
          <p className="text-lg">No entries found</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full min-w-[800px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Name</th>
                  <th className="p-3 text-left text-sm font-medium">Type</th>
                  <th className="p-3 text-left text-sm font-medium">Gate In</th>
                  <th className="p-3 text-left text-sm font-medium">Entry Time</th>
                  <th className="p-3 text-left text-sm font-medium">Exit Time</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-left text-sm font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      navigate(`/gate/visitor-labour/entry/${entry.id}`)
                    }}
                  >
                    <td className="p-3 text-sm font-medium">{entry.name_snapshot || '-'}</td>
                    <td className="p-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPersonTypeBadgeClass(
                          entry.person_type?.name || (entry.visitor ? 'Visitor' : 'Labour')
                        )}`}
                      >
                        {entry.person_type?.name || (entry.visitor ? 'Visitor' : 'Labour')}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{entry.gate_in?.name || '-'}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDateTime(entry.entry_time)}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDateTime(entry.exit_time)}
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
                    <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate">
                      {entry.purpose || '-'}
                    </td>
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
