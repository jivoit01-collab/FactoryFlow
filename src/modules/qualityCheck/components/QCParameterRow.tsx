import { Input } from '@/shared/components/ui'
import { PassFailResult } from '../types/qualityCheck.types'
import { PASS_FAIL_OPTIONS } from '../constants/qualityCheck.constants'
import { cn } from '@/shared/utils'

interface QCParameterRowProps {
  parameter: string
  standardValue: string
  observedValue: string
  passFail: PassFailResult
  placeholder?: string
  onObservedValueChange: (value: string) => void
  onPassFailChange: (value: PassFailResult) => void
  disabled?: boolean
}

export function QCParameterRow({
  parameter,
  standardValue,
  observedValue,
  passFail,
  placeholder = 'Enter value',
  onObservedValueChange,
  onPassFailChange,
  disabled,
}: QCParameterRowProps) {
  return (
    <tr className="border-t">
      <td className="p-3 text-sm font-medium">{parameter}</td>
      <td className="p-3 text-sm text-muted-foreground">{standardValue}</td>
      <td className="p-3">
        <Input
          value={observedValue}
          onChange={(e) => onObservedValueChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="max-w-xs h-10"
        />
      </td>
      <td className="p-3">
        <select
          value={passFail}
          onChange={(e) => onPassFailChange(e.target.value as PassFailResult)}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full max-w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <option value={PassFailResult.NOT_CHECKED}>Select</option>
          {PASS_FAIL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
    </tr>
  )
}
