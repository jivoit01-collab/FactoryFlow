import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Loader2, Plus, HelpCircle } from 'lucide-react'
import {
  Input,
  Label,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/shared/components/ui'
import { useVehicles } from '../api/vehicle.queries'
import { cn } from '@/shared/utils'
import { useDebounce } from '@/shared/hooks'
import { CreateVehicleDialog } from './CreateVehicleDialog'
import type { Vehicle } from '../api/vehicle.api'

interface VehicleSelectProps {
  value?: string
  onChange: (vehicle: {
    vehicleId: number
    vehicleNumber: string
    vehicleType: string
    vehicleCapacity: string
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
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: vehicles = [], isLoading } = useVehicles()
  const debouncedSearch = useDebounce(searchTerm, 100)

  // Filter vehicles based on search term (vehicle number)
  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.vehicle_number.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  // Find selected vehicle from value
  useEffect(() => {
    if (value && vehicles.length > 0) {
      const vehicle = vehicles.find((v) => v.vehicle_number === value || v.id.toString() === value)
      if (vehicle) {
        setSelectedVehicle(vehicle)
        setSearchTerm(vehicle.vehicle_number)
      }
    } else if (!value) {
      setSelectedVehicle(null)
      setSearchTerm('')
    }
  }, [value, vehicles])

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

  const handleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setSearchTerm(vehicle.vehicle_number)
    // Map API vehicle_type to display format
    const vehicleTypeMap: Record<string, string> = {
      TRUCK: 'TRUCK',
      CONTAINER: 'CONTAINER',
      TEMPO: 'TEMPO',
      TRACTOR: 'TRACTOR',
    }
    onChange({
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicle_number,
      vehicleType: vehicleTypeMap[vehicle.vehicle_type] || vehicle.vehicle_type,
      vehicleCapacity: `${vehicle.capacity_ton} Tons`,
    })
    setIsOpen(false)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
    if (!e.target.value) {
      onChange({ vehicleId: 0, vehicleNumber: '', vehicleType: '', vehicleCapacity: '' })
      setSelectedVehicle(null)
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
    const newVehicle = vehicles.find((v) => v.vehicle_number === vehicleNumber)
    if (newVehicle) {
      handleSelect(newVehicle)
    }
    setIsOpen(false)
  }

  const handleAddNewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    setIsDialogOpen(true)
  }

  const selectedTransporter = selectedVehicle?.transporter || null

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
              {selectedVehicle ? (
                <div className="space-y-2">
                  <div className="space-y-1.5 text-sm">
                    <div>
                      <span className="font-medium">Vehicle Number:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedVehicle.vehicle_number}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Vehicle Type:</span>{' '}
                      <span className="text-muted-foreground">{selectedVehicle.vehicle_type}</span>
                    </div>
                    <div>
                      <span className="font-medium">Capacity:</span>{' '}
                      <span className="text-muted-foreground">
                        {selectedVehicle.capacity_ton} Tons
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
                          selectedVehicle?.id === vehicle.id && 'bg-accent'
                        )}
                        onClick={() => handleSelect(vehicle)}
                      >
                        <span className="text-sm">{vehicle.vehicle_number}</span>
                        {selectedVehicle?.id === vehicle.id && (
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
      <CreateVehicleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
