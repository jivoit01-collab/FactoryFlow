import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  DayPicker,
  type DayPickerProps,
  type MonthCaptionProps,
  useNavigation,
} from 'react-day-picker'

import { cn } from '@/shared/utils'

import { Button } from './button'

export type CalendarProps = DayPickerProps & {
  onTodayClick?: (date: Date) => void
  hideTodayButton?: boolean
}

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  onTodayClick,
  hideTodayButton = false,
  ...props
}: CalendarProps) {
  const CustomMonthCaption = ({ calendarMonth }: MonthCaptionProps) => {
    const { goToMonth } = useNavigation()
    const date = (calendarMonth as { date: Date }).date

    return (
      <div className="flex items-center justify-between px-3 pt-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goToMonth(new Date(date.getFullYear(), date.getMonth() - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{format(date, 'LLLL yyyy')}</span>
          {!hideTodayButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date()
                goToMonth(today)
                onTodayClick?.(today)
              }}
            >
              Today
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => goToMonth(new Date(date.getFullYear(), date.getMonth() + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-6',
        month: 'space-y-4',

        table: 'w-full border-collapse',
        caption: 'relative flex items-center justify-center pt-1',
        caption_label: 'text-sm font-medium',

        nav: 'space-x-1 flex items-center',
        nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',

        head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center',

        day: 'h-9 w-9 p-0 font-normal text-center rounded-md hover:bg-accent hover:text-accent-foreground',

        day_today: 'bg-accent text-accent-foreground font-semibold',

        day_selected: 'bg-primary text-primary-foreground hover:bg-primary',

        day_range_start: 'bg-primary text-primary-foreground rounded-l-md',

        day_range_middle: 'bg-primary/20 text-foreground rounded-none',

        day_range_end: 'bg-primary text-primary-foreground rounded-r-md',

        day_outside: 'text-muted-foreground opacity-40',
        day_disabled: 'text-muted-foreground opacity-40',

        ...classNames,
      }}
      modifiersClassNames={{
        selected: 'bg-primary text-primary-foreground hover:bg-primary/90',
        range_start:
          'bg-primary text-primary-foreground hover:bg-primary/90 rounded-l-md rounded-r-none',
        range_middle: 'bg-primary/20 text-foreground rounded-none',
        range_end:
          'bg-primary text-primary-foreground hover:bg-primary/90 rounded-r-md rounded-l-none',
        today: 'bg-accent text-accent-foreground font-semibold',
      }}
      components={{ MonthCaption: CustomMonthCaption }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'
