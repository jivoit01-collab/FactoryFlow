import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/shared/components/ui'
import { QCItemsTable } from '../components/QCItemsTable'
import { QCStatusBadge } from '../components/QCStatusBadge'
import { QCStatus, type QCItem, type QCSummary } from '../types/qualityCheck.types'
import { QC_STATUS_COLORS, QC_STATUS_LABELS } from '../constants/qualityCheck.constants'
import { DateRangePicker } from '@/modules/gate/components/DateRangePicker'
import type { DateRange } from 'react-day-picker'

// Helper function to get start of day
const getStartOfDay = (date: Date = new Date()): Date => {
  const newDate = new Date(date)
  newDate.setHours(0, 0, 0, 0)
  return newDate
}

// Mock data - renders instantly without API call
const MOCK_ITEMS: QCItem[] = [
  {
    id: 1,
    grnNumber: 'GRN-2026-0123',
    itemName: 'Sodium Chloride',
    batchNo: 'BATCH-2026-001',
    vendor: 'ABC Chemicals Ltd',
    receivedDate: '2026-01-12',
    status: QCStatus.PENDING,
  },
  {
    id: 2,
    grnNumber: 'GRN-2026-0122',
    itemName: 'HDPE Bottles 500ml',
    batchNo: 'BATCH-2026-002',
    vendor: 'XYZ Packaging Co',
    receivedDate: '2026-01-11',
    status: QCStatus.PASSED,
  },
  {
    id: 3,
    grnNumber: 'GRN-2026-0121',
    itemName: 'Citric Acid',
    batchNo: 'BATCH-2026-003',
    vendor: 'ABC Chemicals Ltd',
    receivedDate: '2026-01-11',
    status: QCStatus.FAILED,
  },
]

const MOCK_SUMMARY: QCSummary = {
  pending: 1,
  passed: 1,
  failed: 1,
  onHold: 0,
}

// Status order for display
const STATUS_ORDER: QCStatus[] = [
  QCStatus.PENDING,
  QCStatus.PASSED,
  QCStatus.FAILED,
  QCStatus.ON_HOLD,
]

// Status icons
const STATUS_ICONS: Record<QCStatus, React.ElementType> = {
  [QCStatus.PENDING]: Clock,
  [QCStatus.PASSED]: CheckCircle2,
  [QCStatus.FAILED]: XCircle,
  [QCStatus.ON_HOLD]: PauseCircle,
}

export default function QCDashboardPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<QCStatus | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateMode, setDateMode] = useState<'single' | 'range'>('range')
  const today = getStartOfDay()
  const [selectedDate, setSelectedDate] = useState<Date | DateRange | undefined>({
    from: today,
    to: today,
  })

  // Use mock data directly - no API call, instant render
  const items = MOCK_ITEMS
  const summary = MOCK_SUMMARY

  // Filter items by status and search query
  const filteredItems = useMemo(() => {
    let result = items

    // Filter by status
    if (statusFilter) {
      result = result.filter((item) => item.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(
        (item) =>
          item.grnNumber.toLowerCase().includes(query) ||
          item.itemName.toLowerCase().includes(query) ||
          item.batchNo.toLowerCase().includes(query) ||
          item.vendor.toLowerCase().includes(query)
      )
    }

    return result
  }, [items, statusFilter, searchQuery])

  // Get recent entries (2 most recent)
  const recentEntries = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const dateA = new Date(a.receivedDate).getTime()
        const dateB = new Date(b.receivedDate).getTime()
        return dateB - dateA
      })
      .slice(0, 2)
  }, [items])

  const handleStartQC = (item: QCItem) => {
    navigate(`/quality-check/${item.id}`)
  }

  const handleSummaryCardClick = (status: QCStatus) => {
    setStatusFilter(statusFilter === status ? null : status)
  }

  const handleDateChange = (date: Date | DateRange | undefined) => {
    setSelectedDate(date)
  }

  const handleModeChange = (newMode: 'single' | 'range') => {
    setDateMode(newMode)

    if (newMode === 'single') {
      if (selectedDate && typeof selectedDate === 'object' && 'from' in selectedDate) {
        setSelectedDate(selectedDate.from || getStartOfDay())
      } else if (selectedDate instanceof Date) {
        setSelectedDate(selectedDate)
      } else {
        setSelectedDate(getStartOfDay())
      }
    } else {
      const date = selectedDate instanceof Date ? selectedDate : getStartOfDay()
      setSelectedDate({ from: date, to: date })
    }
  }

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

  // Get status counts from summary
  const statusCounts: Record<QCStatus, number> = {
    [QCStatus.PENDING]: summary.pending,
    [QCStatus.PASSED]: summary.passed,
    [QCStatus.FAILED]: summary.failed,
    [QCStatus.ON_HOLD]: summary.onHold,
  }

  return (
    <div className="space-y-6">
      {/* Header Section - matching Gate module exactly */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Factory Quality Check</h2>
          <p className="text-muted-foreground">
            QC Inspection for Raw Materials & Packaging Materials
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <DateRangePicker
              date={selectedDate}
              onDateChange={handleDateChange}
              mode={dateMode}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={dateMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('single')}
              className="min-h-[36px]"
            >
              Single Date
            </Button>
            <Button
              variant={dateMode === 'range' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('range')}
              className="min-h-[36px]"
            >
              Date Range
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Entries Section - Compact */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Recent Entries</h3>
          <button
            onClick={() => setStatusFilter(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Show all
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground border rounded-lg">
            No entries yet
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-3 py-3 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer min-h-[52px]"
                onClick={() => navigate(`/quality-check/${entry.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-sm">{entry.grnNumber}</span>
                  <QCStatusBadge status={entry.status} />
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {entry.itemName} • {entry.vendor}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.receivedDate)}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_ORDER.map((status) => {
            const colors = QC_STATUS_COLORS[status]
            const Icon = STATUS_ICONS[status]
            const count = statusCounts[status]
            const isActive = statusFilter === status

            return (
              <Card
                key={status}
                className={`${colors.bgColor} border cursor-pointer hover:shadow-md transition-shadow ${
                  isActive ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={() => handleSummaryCardClick(status)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <Icon className={`h-4 w-4 ${colors.color}`} />
                    <span className={`text-xl font-bold ${colors.color}`}>{count}</span>
                  </div>
                  <p className={`mt-1 text-xs font-medium ${colors.color}`}>
                    {QC_STATUS_LABELS[status]}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Items Table with Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg font-semibold">
              {statusFilter
                ? `Items - ${QC_STATUS_LABELS[statusFilter]}`
                : 'Items Pending QC'}
            </CardTitle>
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search GRN, item, batch, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <QCItemsTable
            items={filteredItems}
            onStartQC={handleStartQC}
          />
        </CardContent>
      </Card>
    </div>
  )
}
