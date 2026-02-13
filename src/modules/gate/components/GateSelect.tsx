import { useMemo, useState } from 'react'

import { SearchableSelect } from '@/shared/components'

import type { Gate } from '../api/personGateIn/personGateIn.api'
import { useGates } from '../api/personGateIn/personGateIn.queries'

interface GateSelectProps {
  value?: string
  onChange: (gateId: number | null, gateName: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  /** Only show active gates */
  activeOnly?: boolean
}

export function GateSelect({
  value,
  onChange,
  placeholder = 'Select gate',
  disabled = false,
  error,
  label,
  required = false,
  activeOnly = true,
}: GateSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { data: gates = [], isLoading, isError } = useGates(isDropdownOpen)

  const filteredGates = useMemo(
    () => (activeOnly ? gates.filter((g) => g.is_active) : gates),
    [gates, activeOnly]
  )

  return (
    <SearchableSelect<Gate>
      value={value || undefined}
      items={filteredGates}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="gate-select"
      inputClassName="border-2 font-medium"
      getItemKey={(g) => g.id}
      getItemLabel={(g) => g.name}
      loadingText="Loading gates..."
      emptyText="No gates available"
      notFoundText="No gates found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(gate) => {
        onChange(gate.id, gate.name)
      }}
      onClear={() => {
        onChange(null, '')
      }}
    />
  )
}
