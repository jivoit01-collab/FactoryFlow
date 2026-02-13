import { useMemo, useState } from 'react'

import { SearchableSelect } from '@/shared/components'

import type { Contractor } from '../api/personGateIn/personGateIn.api'
import { useContractors } from '../api/personGateIn/personGateIn.queries'

interface ContractorSelectProps {
  value?: string
  onChange: (contractorId: number, contractorName: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  /** Only show active contractors */
  activeOnly?: boolean
  /** Initial display text to show without fetching contractors (for edit mode) */
  initialDisplayText?: string
}

export function ContractorSelect({
  value,
  onChange,
  placeholder = 'Select contractor',
  disabled = false,
  error,
  label,
  required = false,
  activeOnly = true,
  initialDisplayText,
}: ContractorSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { data: contractors = [], isLoading, isError } = useContractors(isDropdownOpen)

  const filteredContractors = useMemo(
    () => (activeOnly ? contractors.filter((c) => c.is_active) : contractors),
    [contractors, activeOnly]
  )

  return (
    <SearchableSelect<Contractor>
      value={value || undefined}
      items={filteredContractors}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="contractor-select"
      inputClassName="border-2 font-medium"
      defaultDisplayText={initialDisplayText}
      getItemKey={(c) => c.id}
      getItemLabel={(c) => c.contractor_name}
      loadingText="Loading contractors..."
      emptyText="No contractors available"
      notFoundText="No contractors found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(contractor) => {
        onChange(contractor.id, contractor.contractor_name)
      }}
      onClear={() => {
        onChange(0, '')
      }}
    />
  )
}
