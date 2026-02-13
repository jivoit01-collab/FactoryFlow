import { useState } from 'react'

import { SearchableSelect } from '@/shared/components'

import { useWarehouses } from '../api'
import type { Warehouse } from '../types'

interface WarehouseSelectProps {
  value?: string
  onChange: (warehouseCode: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
}

export function WarehouseSelect({
  value,
  onChange,
  placeholder = 'Select warehouse',
  disabled = false,
  error,
  label,
  required = false,
}: WarehouseSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const { data: warehouses = [], isLoading } = useWarehouses(isDropdownOpen)

  return (
    <SearchableSelect<Warehouse>
      value={value}
      items={warehouses}
      isLoading={isLoading}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="warehouse-select"
      inputClassName="h-8 text-sm"
      getItemKey={(w) => w.warehouse_code}
      getItemLabel={(w) => `${w.warehouse_name} (${w.warehouse_code})`}
      filterFn={(w, search) =>
        w.warehouse_name.toLowerCase().includes(search.toLowerCase()) ||
        w.warehouse_code.toLowerCase().includes(search.toLowerCase())
      }
      renderItem={(warehouse) => (
        <div>
          <span className="text-sm">{warehouse.warehouse_name}</span>
          <span className="text-xs text-muted-foreground ml-2">({warehouse.warehouse_code})</span>
        </div>
      )}
      loadingText="Loading warehouses..."
      emptyText="No warehouses available"
      notFoundText="No warehouses found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(warehouse) => {
        onChange(warehouse.warehouse_code)
      }}
      onClear={() => {
        onChange('')
      }}
    />
  )
}
