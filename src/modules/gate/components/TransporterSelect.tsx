import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check, Loader2, Plus, HelpCircle } from 'lucide-react'
import {
  Input,
  Label,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/shared/components/ui'
import { useTransporterNames, useTransporterById } from '../api/transporter.queries'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
import { CreateTransporterDialog } from './CreateTransporterDialog'
import type { TransporterName, Transporter } from '../api/transporter.api'

export interface TransporterDetails {
  name: string
  contact_person: string
  mobile_no: string
}

interface TransporterSelectProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  /** Externally provided transporter details (e.g., from vehicle data) */
  externalDetails?: TransporterDetails | null
}

export function TransporterSelect({
  value,
  onChange,
  placeholder = 'Select transporter',
  disabled = false,
  error,
  label,
  required = false,
  externalDetails,
}: TransporterSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedTransporterDetails, setSelectedTransporterDetails] = useState<Transporter | null>(
    null
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch lightweight transporter names when dropdown is open
  const { data: transporterNames = [], isLoading } = useTransporterNames(isOpen && !disabled)

  // Fetch full transporter details when one is selected
  const { data: transporterDetails } = useTransporterById(selectedId, selectedId !== null)

  const debouncedSearch = useDebounce(searchTerm, 100)

  // Filter transporters based on search term
  const filteredTransporters = transporterNames.filter((transporter) =>
    transporter.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const prevTransporterDetailsRef = useRef(transporterDetails)
  const prevValueRef = useRef(value)

  // Update selected transporter details when fetched
  const syncTransporterDetails = useCallback(() => {
    if (transporterDetails && transporterDetails !== prevTransporterDetailsRef.current) {
      prevTransporterDetailsRef.current = transporterDetails
      setSelectedTransporterDetails(transporterDetails)
    }
  }, [transporterDetails])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with fetched data is a valid pattern
    syncTransporterDetails()
  }, [syncTransporterDetails])

  // Find selected transporter from value or display value directly when disabled
  const syncWithValue = useCallback(() => {
    // When disabled, just show the value directly without lookup
    if (disabled && value) {
      setSearchTerm(value)
      return
    }

    if (value && transporterNames.length > 0) {
      const transporter = transporterNames.find(
        (t) => t.name === value || t.id.toString() === value
      )
      if (transporter) {
        setSelectedId(transporter.id)
        setSearchTerm(transporter.name)
      }
    } else if (value !== prevValueRef.current && !value) {
      prevValueRef.current = value
      setSelectedId(null)
      setSelectedTransporterDetails(null)
      setSearchTerm('')
    }
  }, [value, transporterNames, disabled])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with props is a valid pattern
    syncWithValue()
    prevValueRef.current = value
  }, [syncWithValue, value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (transporter: TransporterName) => {
    setSelectedId(transporter.id)
    setSearchTerm(transporter.name)
    onChange(transporter.name)
    setIsOpen(false)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
    if (!e.target.value) {
      onChange('')
      setSelectedId(null)
      setSelectedTransporterDetails(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && filteredTransporters.length === 1) {
      handleSelect(filteredTransporters[0])
    }
  }

  const handleCreateSuccess = (transporterName: string) => {
    onChange(transporterName)
    setIsOpen(false)
  }

  const handleAddNewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center gap-1">
          <Label htmlFor="transporter-select">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              {externalDetails ? (
                <div className="space-y-2">
                  <div className="space-y-1.5 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{' '}
                      <span className="text-muted-foreground">{externalDetails.name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Contact Person:</span>{' '}
                      <span className="text-muted-foreground">
                        {externalDetails.contact_person}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Mobile Number:</span>{' '}
                      <span className="text-muted-foreground">{externalDetails.mobile_no}</span>
                    </div>
                  </div>
                </div>
              ) : selectedTransporterDetails ? (
                <div className="space-y-2">
                  <div className="space-y-1.5 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedTransporterDetails.name}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Contact Person:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedTransporterDetails.contact_person}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Mobile Number:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedTransporterDetails.mobile_no}
                      </span>
                    </div>
                  </div>
                </div>
              ) : selectedId ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading transporter details...
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Please select a transporter to view details.
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="transporter-select"
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              'pr-10 cursor-text',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading ? (
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
                Loading transporters...
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={handleAddNewClick}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Transporter
                  </Button>
                </div>
                {filteredTransporters.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchTerm ? 'No transporters found' : 'No transporters available'}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredTransporters.map((transporter) => (
                      <li
                        key={transporter.id}
                        className={cn(
                          'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                          selectedId === transporter.id && 'bg-accent'
                        )}
                        onClick={() => handleSelect(transporter)}
                      >
                        <span className="text-sm">{transporter.name}</span>
                        {selectedId === transporter.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <CreateTransporterDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
