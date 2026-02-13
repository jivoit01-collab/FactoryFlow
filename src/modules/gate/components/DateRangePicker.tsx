import { format } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/shared/components/ui/button'
import { Calendar } from '@/shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils'

interface DateRangePickerProps {
  date?: Date | DateRange
  onDateChange?: (date: Date | DateRange | undefined) => void
  mode?: 'single' | 'range'
  className?: string
}

export function DateRangePicker({
  date,
  onDateChange,
  mode = 'range',
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingDate, setPendingDate] = useState<Date | DateRange | undefined>(date)
  const [activeQuickRange, setActiveQuickRange] = useState<number | null>(null)

  const handleSelect = (selectedDate: Date | DateRange | undefined) => {
    setPendingDate(selectedDate)
    setActiveQuickRange(null) // Clear quick range selection when manually selecting
  }

  const handleDone = () => {
    onDateChange?.(pendingDate)
    setIsOpen(false)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // Reset to current date when opening
      setPendingDate(date)
      setActiveQuickRange(null)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPendingDate(undefined)
    onDateChange?.(undefined)
    setActiveQuickRange(null)
  }

  const handleQuickRange = (days: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - days)
    setPendingDate({ from: startDate, to: today })
    setActiveQuickRange(days)
  }

  const formatDateDisplay = () => {
    if (!date) return 'Select date'

    if (mode === 'single' && date instanceof Date) {
      return format(date, 'PPP')
    }

    if (mode === 'range' && 'from' in date) {
      const { from, to } = date
      if (from && to) {
        return `${format(from, 'LLL dd, y')} - ${format(to, 'LLL dd, y')}`
      }
      if (from) {
        return `${format(from, 'LLL dd, y')} - ...`
      }
    }

    return 'Select date'
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal h-9',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1">{formatDateDisplay()}</span>
          {date && (
            <button
              type="button"
              aria-label="Clear date"
              className="ml-2 h-4 w-4 opacity-50 hover:opacity-100 inline-flex items-center justify-center"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="bottom"
        sideOffset={8}
        className="
          p-0 bg-background
          w-auto
          max-w-[95vw]
          sm:w-[680px]
        "
      >
        {mode === 'single' ? (
          <Calendar
            initialFocus
            mode="single"
            defaultMonth={pendingDate instanceof Date ? pendingDate : undefined}
            selected={pendingDate instanceof Date ? pendingDate : undefined}
            onSelect={handleSelect}
            numberOfMonths={1}
            onTodayClick={handleSelect}
          />
        ) : (
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={pendingDate && 'from' in pendingDate ? pendingDate.from : undefined}
            selected={pendingDate && 'from' in pendingDate ? pendingDate : undefined}
            onSelect={handleSelect}
            numberOfMonths={2}
            onTodayClick={(today) => handleSelect({ from: today, to: today })}
            hideTodayButton={true}
          />
        )}
        <div className="p-3 border-t bg-background/30">
          <div className="flex gap-2">
            {mode === 'range' && (
              <>
                <Button
                  variant={activeQuickRange === 7 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickRange(7)}
                >
                  Last 7 days
                </Button>
                <Button
                  variant={activeQuickRange === 30 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickRange(30)}
                >
                  Last 30 days
                </Button>
              </>
            )}
            <Button size="sm" className="ml-auto" onClick={handleDone}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
