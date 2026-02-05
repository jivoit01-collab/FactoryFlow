import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Package,
  UtensilsCrossed,
  Wrench,
  Building2,
  HardHat,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/shared/components/ui'
import { ROUTES } from '@/config/routes.config'
import { DateRangePicker } from '../components/DateRangePicker'
import type { DateRange } from 'react-day-picker'

// Helper function to get start of day
const getStartOfDay = (date: Date = new Date()): Date => {
  const newDate = new Date(date)
  newDate.setHours(0, 0, 0, 0)
  return newDate
}

interface GateModuleCard {
  title: string
  value: string | number
  icon: React.ReactNode
  route: string
  color: string
}

const gateModules: GateModuleCard[] = [
  {
    title: 'Raw Materials (RM/PM/Assets)',
    value: '0',
    icon: <Package className="h-5 w-5" />,
    route: ROUTES.GATE.children?.RAW_MATERIALS.path || '/gate/raw-materials',
    color: 'text-blue-600',
  },
  {
    title: 'Daily Needs (Food/Consumables)',
    value: '0',
    icon: <UtensilsCrossed className="h-5 w-5" />,
    route: ROUTES.GATE.children?.DAILY_NEEDS.path || '/gate/daily-needs',
    color: 'text-yellow-600',
  },
  {
    title: 'Maintenance (Spare parts/Tools)',
    value: '0',
    icon: <Wrench className="h-5 w-5" />,
    route: ROUTES.GATE.children?.MAINTENANCE.path || '/gate/maintenance',
    color: 'text-purple-600',
  },
  {
    title: 'Construction (Civil/Building Work)',
    value: '0',
    icon: <Building2 className="h-5 w-5" />,
    route: ROUTES.GATE.children?.CONSTRUCTION.path || '/gate/construction',
    color: 'text-orange-600',
  },
  {
    title: 'Visitor/Labour',
    value: '0',
    icon: <HardHat className="h-5 w-5" />,
    route: ROUTES.GATE.children?.CONTRACTOR_LABOR.path || '/gate/visitor-labour',
    color: 'text-red-600',
  },
]

export default function GateDashboardPage() {
  const navigate = useNavigate()
  const [dateMode, setDateMode] = useState<'single' | 'range'>('range')
  const today = getStartOfDay()
  const [selectedDate, setSelectedDate] = useState<Date | DateRange | undefined>({
    from: today,
    to: today,
  })

  const handleDateChange = (date: Date | DateRange | undefined) => {
    setSelectedDate(date)
    // TODO: Update dashboard data based on selected date/range
    console.log('Date changed:', date)
  }

  const handleModeChange = (newMode: 'single' | 'range') => {
    setDateMode(newMode)

    if (newMode === 'single') {
      // Convert range to single date (use 'from' date if available, or today)
      if (selectedDate && typeof selectedDate === 'object' && 'from' in selectedDate) {
        setSelectedDate(selectedDate.from || getStartOfDay())
      } else if (selectedDate instanceof Date) {
        setSelectedDate(selectedDate)
      } else {
        setSelectedDate(getStartOfDay())
      }
    } else {
      // Convert single date to range (same day range)
      const date = selectedDate instanceof Date ? selectedDate : getStartOfDay()
      setSelectedDate({ from: date, to: date })
    }
  }

  const formatDateForDisplay = (): string => {
    if (!selectedDate) return 'No date selected'

    if (selectedDate instanceof Date) {
      return format(selectedDate, 'EEEE, MMMM d, yyyy')
    }

    if ('from' in selectedDate) {
      const { from, to } = selectedDate
      if (from && to) {
        return `${format(from, 'MMMM d, yyyy')} - ${format(to, 'MMMM d, yyyy')}`
      }
      if (from) {
        return `${format(from, 'MMMM d, yyyy')} - ...`
      }
    }

    return 'Select a date'
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gate Management</h2>
          <p className="text-muted-foreground">Complete gate control for all movements</p>
        </div>
        <div className="flex items-center gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <DateRangePicker
              date={selectedDate}
              onDateChange={handleDateChange}
              mode={dateMode}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2 border-l pl-4">
            <Button
              variant={dateMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('single')}
            >
              Single Date
            </Button>
            <Button
              variant={dateMode === 'range' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('range')}
            >
              Date Range
            </Button>
          </div>
        </div>
      </div>

      {/* Top Modules - Gate Categories */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Top Modules</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {gateModules.map((module) => (
            <Card
              key={module.route}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => navigate(module.route)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{module.title}</CardTitle>
                <div className={module.color}>{module.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{module.value}</div>
                <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Gate Register Section */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Gate Register</h3>
          <p className="text-sm text-muted-foreground">{formatDateForDisplay()}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedDate
            ? 'Gate entries for the selected date(s) will be displayed here.'
            : 'Select a date or date range to view gate entries.'}
        </p>
      </div>
    </div>
  )
}
