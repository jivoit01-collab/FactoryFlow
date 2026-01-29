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
import { useVehicleNames, useVehicleById } from '../api/vehicle/vehicle.queries'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
import { CreateVehicleDialog } from './CreateVehicleDialog'
import type { VehicleName, Vehicle } from '../api/vehicle/vehicle.api'

interface VehicleSelectProps {
  value?: string
  onChange: (vehicle: {
    vehicleId: number
    vehicleNumber: string
    vehicleType: string
    vehicleCapacity: string
    transporterName: string
    transporterContactPerson: string
    transporterMobile: string
  }) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
}

export function VehicleSelect({
  value,
  onChange,
  placeholder = 'Select vehicle',
  disabled = false,
  error,
  label,
  required = false,
}: VehicleSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<Vehicle | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch lightweight vehicle names when dropdown is open
  const { data: vehicleNames = [], isLoading } = useVehicleNames(isOpen && !disabled)

  // Fetch full vehicle details when one is selected
  const { data: vehicleDetails } = useVehicleById(selectedId, selectedId !== null)

  const debouncedSearch = useDebounce(searchTerm, 100)

  // Filter vehicles based on search term (vehicle number)
  const filteredVehicles = vehicleNames.filter((vehicle) =>
    vehicle.vehicle_number.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const prevVehicleDetailsRef = useRef(vehicleDetails)
  const prevValueRef = useRef(value)
  const onChangeRef = useRef(onChange)

  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Update selected vehicle details when fetched and call onChange with full details
  const syncVehicleDetails = useCallback(() => {
    if (vehicleDetails && vehicleDetails !== prevVehicleDetailsRef.current) {
      prevVehicleDetailsRef.current = vehicleDetails
      setSelectedVehicleDetails(vehicleDetails)
      // Call onChange with full vehicle details
      const vehicleTypeMap: Record<string, string> = {
        TRUCK: 'TRUCK',
        CONTAINER: 'CONTAINER',
        TEMPO: 'TEMPO',
        TRACTOR: 'TRACTOR',
      }
      onChangeRef.current({
        vehicleId: vehicleDetails.id,
        vehicleNumber: vehicleDetails.vehicle_number,
        vehicleType: vehicleTypeMap[vehicleDetails.vehicle_type] || vehicleDetails.vehicle_type,
        vehicleCapacity: `${vehicleDetails.capacity_ton} Tons`,
        transporterName: vehicleDetails.transporter?.name || '',
        transporterContactPerson: vehicleDetails.transporter?.contact_person || '',
        transporterMobile: vehicleDetails.transporter?.mobile_no || '',
      })
    }
  }, [vehicleDetails])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with fetched data is a valid pattern
    syncVehicleDetails()
  }, [syncVehicleDetails])

  // Find selected vehicle from value or display value directly when disabled
  const syncWithValue = useCallback(() => {
    // When disabled, just show the value directly without lookup
    if (disabled && value) {
      setSearchTerm(value)
      return
    }

    if (value && vehicleNames.length > 0) {
      const vehicle = vehicleNames.find(
        (v) => v.vehicle_number === value || v.id.toString() === value
      )
      if (vehicle) {
        setSelectedId(vehicle.id)
        setSearchTerm(vehicle.vehicle_number)
      }
    } else if (value !== prevValueRef.current && !value) {
      prevValueRef.current = value
      setSelectedId(null)
      setSelectedVehicleDetails(null)
      setSearchTerm('')
    }
  }, [value, vehicleNames, disabled])

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

  const handleSelect = (vehicle: VehicleName) => {
    setSelectedId(vehicle.id)
    setSearchTerm(vehicle.vehicle_number)
    // Full details and onChange will be called when vehicleDetails is fetched
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
        vehicleId: 0,
        vehicleNumber: '',
        vehicleType: '',
        vehicleCapacity: '',
        transporterName: '',
        transporterContactPerson: '',
        transporterMobile: '',
      })
      setSelectedId(null)
      setSelectedVehicleDetails(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && filteredVehicles.length === 1) {
      handleSelect(filteredVehicles[0])
    }
  }

  const handleCreateSuccess = (vehicleNumber: string) => {
    // After creating a new vehicle, set the search term
    // The vehicle list will be refreshed due to query invalidation
    setSearchTerm(vehicleNumber)
    setIsOpen(false)
  }

  const handleAddNewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    setIsDialogOpen(true)
  }

  const selectedTransporter = selectedVehicleDetails?.transporter || null

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center gap-1">
          <Label htmlFor="vehicle-select">
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
              {selectedVehicleDetails ? (
                <div className="space-y-2">
                  <div className="space-y-1.5 text-sm">
                    <div>
                      <span className="font-medium">Vehicle Number:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedVehicleDetails.vehicle_number}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Vehicle Type:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedVehicleDetails.vehicle_type}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Capacity:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedVehicleDetails.capacity_ton} Tons
                      </span>
                    </div>
                    {selectedTransporter && (
                      <div>
                        <span className="font-medium">Transporter:</span>{' '}
                        <span className="text-muted-foreground">{selectedTransporter.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedId ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading vehicle details...
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Please select a vehicle to view details.
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
            id="vehicle-select"
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
                Loading vehicles...
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
                    Add New Vehicle
                  </Button>
                </div>
                {filteredVehicles.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchTerm ? 'No vehicles found' : 'No vehicles available'}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredVehicles.map((vehicle) => (
                      <li
                        key={vehicle.id}
                        className={cn(
                          'px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between',
                          selectedId === vehicle.id && 'bg-accent'
                        )}
                        onClick={() => handleSelect(vehicle)}
                      >
                        <span className="text-sm">{vehicle.vehicle_number}</span>
                        {selectedId === vehicle.id && <Check className="h-4 w-4 text-primary" />}
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
      <CreateVehicleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
