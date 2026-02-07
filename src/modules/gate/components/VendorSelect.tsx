import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { Input, Label } from '@/shared/components/ui'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
import { useVendors } from '../api/po/po.queries'
import type { Vendor } from '../api/po/po.api'

interface VendorSelectProps {
  value?: string
  onChange: (vendor: Vendor | null) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
}

export function VendorSelect({
  value,
  onChange,
  placeholder = 'Search vendor by name or code',
  disabled = false,
  error,
  label,
  required = false,
}: VendorSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Only fetch when dropdown opens
  const { data: vendors = [], isLoading } = useVendors(isOpen)

  const debouncedSearch = useDebounce(searchTerm, 100)

  // Filter vendors by name or code
  const filteredVendors = vendors.filter(
    (v) =>
      v.vendor_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      v.vendor_code.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  // Sync search term when value changes or vendors load
  useEffect(() => {
    if (value && vendors.length > 0) {
      const selected = vendors.find((v) => v.vendor_code === value)
      if (selected) {
        setSearchTerm(`${selected.vendor_name} (${selected.vendor_code})`)
      }
    } else if (!value) {
      setSearchTerm('')
    }
  }, [value, vendors])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // Reset search term to selected value when closing
        if (value && vendors.length > 0) {
          const selected = vendors.find((v) => v.vendor_code === value)
          if (selected) {
            setSearchTerm(`${selected.vendor_name} (${selected.vendor_code})`)
          }
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, value, vendors])

  const handleSelect = (vendor: Vendor) => {
    setSearchTerm(`${vendor.vendor_name} (${vendor.vendor_code})`)
    onChange(vendor)
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
      onChange(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && filteredVendors.length === 1) {
      handleSelect(filteredVendors[0])
    }
  }

  return (
    <div className="space-y-2">
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
              'pr-10',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading && isOpen ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
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
                Loading vendors...
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchTerm ? 'No vendors found' : 'No vendors available'}
              </div>
            ) : (
              <ul className="py-1">
                {filteredVendors.map((vendor) => (
                  <li
                    key={vendor.vendor_code}
                    className={cn(
                      'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                      value === vendor.vendor_code && 'bg-accent'
                    )}
                    onClick={() => handleSelect(vendor)}
                  >
                    <div>
                      <span className="text-sm font-medium">{vendor.vendor_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({vendor.vendor_code})
                      </span>
                    </div>
                    {value === vendor.vendor_code && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
