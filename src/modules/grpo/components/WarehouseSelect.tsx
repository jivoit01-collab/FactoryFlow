import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { Input, Label } from '@/shared/components/ui'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
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
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Only fetch when dropdown opens
  const { data: warehouses = [], isLoading } = useWarehouses(isOpen)

  const debouncedSearch = useDebounce(searchTerm, 100)

  // Filter warehouses by name or code
  const filteredWarehouses = warehouses.filter(
    (w) =>
      w.warehouse_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      w.warehouse_code.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  // Sync search term when value changes or warehouses load
  useEffect(() => {
    if (value && warehouses.length > 0) {
      const selected = warehouses.find((w) => w.warehouse_code === value)
      if (selected) {
        setSearchTerm(`${selected.warehouse_name} (${selected.warehouse_code})`)
      }
    } else if (!value) {
      setSearchTerm('')
    }
  }, [value, warehouses])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // Reset search term to selected value when closing
        if (value && warehouses.length > 0) {
          const selected = warehouses.find((w) => w.warehouse_code === value)
          if (selected) {
            setSearchTerm(`${selected.warehouse_name} (${selected.warehouse_code})`)
          }
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, value, warehouses])

  const handleSelect = (warehouse: Warehouse) => {
    setSearchTerm(`${warehouse.warehouse_name} (${warehouse.warehouse_code})`)
    onChange(warehouse.warehouse_code)
    setIsOpen(false)
  }

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
    if (!e.target.value) {
      onChange('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && filteredWarehouses.length === 1) {
      handleSelect(filteredWarehouses[0])
    }
  }

  return (
    <div className="space-y-1">
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'pr-10 h-8 text-sm',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading && isOpen ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            )}
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Loading warehouses...
              </div>
            ) : filteredWarehouses.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchTerm ? 'No warehouses found' : 'No warehouses available'}
              </div>
            ) : (
              <ul className="py-1">
                {filteredWarehouses.map((warehouse) => (
                  <li
                    key={warehouse.warehouse_code}
                    className={cn(
                      'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                      value === warehouse.warehouse_code && 'bg-accent'
                    )}
                    onClick={() => handleSelect(warehouse)}
                  >
                    <div>
                      <span className="text-sm">{warehouse.warehouse_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({warehouse.warehouse_code})
                      </span>
                    </div>
                    {value === warehouse.warehouse_code && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
