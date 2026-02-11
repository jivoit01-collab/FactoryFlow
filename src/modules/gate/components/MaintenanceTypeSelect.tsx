import { useState, useMemo } from 'react'
import { useMaintenanceTypes } from '../api/maintenance/maintenance.queries'
import { SearchableSelect } from '@/shared/components'
import type { MaintenanceType } from '../api/maintenance/maintenance.api'

interface MaintenanceTypeSelectProps {
  value?: string
  onChange: (typeId: string, typeName: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  /** Initial display text to show without fetching types (for edit mode) */
  initialDisplayText?: string
}

export function MaintenanceTypeSelect({
  value,
  onChange,
  placeholder = 'Select maintenance type',
  disabled = false,
  error,
  label,
  required = false,
  initialDisplayText,
}: MaintenanceTypeSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { data: types = [], isLoading, isError } = useMaintenanceTypes(isDropdownOpen)

  const activeTypes = useMemo(() => types.filter((t) => t.is_active), [types])

  return (
    <SearchableSelect<MaintenanceType>
      value={value || undefined}
      items={activeTypes}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="maintenance-type-select"
      inputClassName="border-2 font-medium"
      defaultDisplayText={initialDisplayText}
      getItemKey={(t) => t.id}
      getItemLabel={(t) => t.type_name}
      loadingText="Loading maintenance types..."
      emptyText="No maintenance types available"
      notFoundText="No maintenance types found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(type) => {
        onChange(type.id.toString(), type.type_name)
      }}
      onClear={() => {
        onChange('', '')
      }}
    />
  )
}
