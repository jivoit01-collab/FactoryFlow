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
import { useDriverNames, useDriverById } from '../api/driver/driver.queries'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
import { CreateDriverDialog } from './CreateDriverDialog'
import type { DriverName, Driver } from '../api/driver/driver.api'

interface DriverSelectProps {
  value?: string
  onChange: (driver: {
    driverId: number
    driverName: string
    mobileNumber: string
    drivingLicenseNumber: string
    idProofType: string
    idProofNumber: string
    driverPhoto: string | null
  }) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
}

export function DriverSelect({
  value,
  onChange,
  placeholder = 'Select driver',
  disabled = false,
  error,
  label,
  required = false,
}: DriverSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDriverDetails, setSelectedDriverDetails] = useState<Driver | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch lightweight driver names when dropdown is open
  const { data: driverNames = [], isLoading } = useDriverNames(isOpen && !disabled)

  // Fetch full driver details when one is selected
  const { data: driverDetails } = useDriverById(selectedId, selectedId !== null)

  const debouncedSearch = useDebounce(searchTerm, 100)

  // Filter drivers based on search term (name)
  const filteredDrivers = driverNames.filter((driver) =>
    driver.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const prevDriverDetailsRef = useRef(driverDetails)
  const prevValueRef = useRef(value)
  const onChangeRef = useRef(onChange)

  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Update selected driver details when fetched and call onChange with full details
  const syncDriverDetails = useCallback(() => {
    if (driverDetails && driverDetails !== prevDriverDetailsRef.current) {
      prevDriverDetailsRef.current = driverDetails
      setSelectedDriverDetails(driverDetails)
      // Call onChange with full driver details
      onChangeRef.current({
        driverId: driverDetails.id,
        driverName: driverDetails.name,
        mobileNumber: driverDetails.mobile_no,
        drivingLicenseNumber: driverDetails.license_no,
        idProofType: driverDetails.id_proof_type,
        idProofNumber: driverDetails.id_proof_number,
        driverPhoto: driverDetails.photo,
      })
    }
  }, [driverDetails])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with fetched data is a valid pattern
    syncDriverDetails()
  }, [syncDriverDetails])

  // Find selected driver from value or display value directly when disabled
  const syncWithValue = useCallback(() => {
    // When disabled, just show the value directly without lookup
    if (disabled && value) {
      setSearchTerm(value)
      return
    }

    if (value && driverNames.length > 0) {
      const driver = driverNames.find((d) => d.name === value || d.id.toString() === value)
      if (driver) {
        setSelectedId(driver.id)
        setSearchTerm(driver.name)
      }
    } else if (value !== prevValueRef.current && !value) {
      prevValueRef.current = value
      setSelectedId(null)
      setSelectedDriverDetails(null)
      setSearchTerm('')
    }
  }, [value, driverNames, disabled])

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

  const handleSelect = (driver: DriverName) => {
    setSelectedId(driver.id)
    setSearchTerm(driver.name)
    // Full details and onChange will be called when driverDetails is fetched
    setIsOpen(false)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
    if (!e.target.value) {
      onChange({
        driverId: 0,
        driverName: '',
        mobileNumber: '',
        drivingLicenseNumber: '',
        idProofType: '',
        idProofNumber: '',
        driverPhoto: null,
      })
      setSelectedId(null)
      setSelectedDriverDetails(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && filteredDrivers.length === 1) {
      handleSelect(filteredDrivers[0])
    }
  }

  const handleCreateSuccess = (driverId: number, driverName: string) => {
    // After creating a new driver, set the selected ID to trigger details fetch
    // The driver list will be refreshed due to query invalidation
    setSelectedId(driverId)
    setSearchTerm(driverName)
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
          <Label htmlFor="driver-select">
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
              {selectedDriverDetails ? (
                <div className="space-y-2">
                  <div className="space-y-1.5 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{' '}
                      <span className="text-muted-foreground">{selectedDriverDetails.name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Mobile Number:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedDriverDetails.mobile_no}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">License Number:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedDriverDetails.license_no}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">ID Proof Type:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedDriverDetails.id_proof_type}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">ID Proof Number:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedDriverDetails.id_proof_number}
                      </span>
                    </div>
                  </div>
                </div>
              ) : selectedId ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading driver details...
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Please select a driver to view details.
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
            id="driver-select"
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
                Loading drivers...
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
                    Add New Driver
                  </Button>
                </div>
                {filteredDrivers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchTerm ? 'No drivers found' : 'No drivers available'}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredDrivers.map((driver) => (
                      <li
                        key={driver.id}
                        className={cn(
                          'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                          selectedId === driver.id && 'bg-accent'
                        )}
                        onClick={() => handleSelect(driver)}
                      >
                        <span className="text-sm">{driver.name}</span>
                        {selectedId === driver.id && <Check className="h-4 w-4 text-primary" />}
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
      <CreateDriverDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
