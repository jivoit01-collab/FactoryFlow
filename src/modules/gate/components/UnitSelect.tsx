import { useState } from 'react'
import { useUnitChoices } from '../api/maintenance/maintenance.queries'
import { SearchableSelect } from '@/shared/components'
import type { UnitChoice } from '../api/maintenance/maintenance.api'

interface UnitSelectProps {
  value?: string
  onChange: (unitId: string, unitName: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  /** Initial display text to show without fetching units (for edit mode) */
  initialDisplayText?: string
}

export function UnitSelect({
  value,
  onChange,
  placeholder = 'Select unit',
  disabled = false,
  error,
  label,
  required = false,
  initialDisplayText,
}: UnitSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { data: units = [], isLoading, isError } = useUnitChoices(isDropdownOpen)

  return (
    <SearchableSelect<UnitChoice>
      value={value || undefined}
      items={units}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="unit-select"
      inputClassName="border-2 font-medium"
      defaultDisplayText={initialDisplayText}
      getItemKey={(u) => u.id}
      getItemLabel={(u) => u.name}
      loadingText="Loading units..."
      emptyText="No units available"
      notFoundText="No units found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(unit) => {
        onChange(unit.id.toString(), unit.name)
      }}
      onClear={() => {
        onChange('', '')
      }}
    />
  )
}
