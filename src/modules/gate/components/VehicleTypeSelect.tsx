import { useState } from 'react'

import { SearchableSelect } from '@/shared/components'

import type { VehicleType } from '../api/vehicle/vehicle.api'
import { useVehicleTypes } from '../api/vehicle/vehicle.queries'

interface VehicleTypeSelectProps {
  value?: string
  onChange: (typeId: number, typeName: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
}

export function VehicleTypeSelect({
  value,
  onChange,
  placeholder = 'Select vehicle type',
  disabled = false,
  error,
  label,
  required = false,
}: VehicleTypeSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { data: vehicleTypes = [], isLoading, isError } = useVehicleTypes(isDropdownOpen)

  return (
    <SearchableSelect<VehicleType>
      value={value || undefined}
      items={vehicleTypes}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="vehicle-type-select"
      inputClassName="border-2 font-medium"
      getItemKey={(vt) => vt.id}
      getItemLabel={(vt) => vt.name}
      loadingText="Loading vehicle types..."
      emptyText="No vehicle types available"
      notFoundText="No vehicle types found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(vt) => {
        onChange(vt.id, vt.name)
      }}
      onClear={() => {
        onChange(0, '')
      }}
    />
  )
}
