import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@/shared/components/ui'
import { useCreateVehicle } from '../api/vehicle.queries'
import { useTransporters } from '../api/transporter.queries'
import { vehicleSchema, type VehicleFormData } from '../schemas/vehicle.schema'
import type { ApiError } from '@/core/api/types'
import { TransporterSelect } from './TransporterSelect'

interface CreateVehicleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (vehicleNumber: string) => void
}

export function CreateVehicleDialog({ open, onOpenChange, onSuccess }: CreateVehicleDialogProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})
  const [selectedTransporterId, setSelectedTransporterId] = useState<number | null>(null)
  const createVehicle = useCreateVehicle()
  // Only fetch transporters when dialog is open
  const { data: transporters = [] } = useTransporters(open)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicle_number: '',
      vehicle_type: 'TRUCK',
      transporter: 0,
      capacity_ton: '',
    },
  })

  const [transporterName, setTransporterName] = useState('')

  // Reset form and errors when dialog opens/closes
  useEffect(() => {
    if (open) {
      reset()
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting state on dialog open is a valid pattern
      setApiErrors({})

      setSelectedTransporterId(null)

      setTransporterName('')
    }
  }, [open, reset])

  // Update transporter ID when transporter name changes
  useEffect(() => {
    if (transporterName && transporters.length > 0) {
      const transporter = transporters.find((t) => t.name === transporterName)
      if (transporter) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing state with form value is a valid pattern
        setSelectedTransporterId(transporter.id)
        setValue('transporter', transporter.id)
      } else {
        setSelectedTransporterId(null)
        setValue('transporter', 0)
      }
    } else {
      setSelectedTransporterId(null)
      setValue('transporter', 0)
    }
  }, [transporterName, transporters, setValue])

  const onSubmit = async (data: VehicleFormData) => {
    if (!selectedTransporterId) {
      setApiErrors({ transporter: 'Please select a transporter' })
      return
    }

    setApiErrors({})
    try {
      const result = await createVehicle.mutateAsync({
        ...data,
        transporter: selectedTransporterId,
      })
      reset()
      onOpenChange(false)
      if (onSuccess) {
        onSuccess(result.vehicle_number)
      }
    } catch (error) {
      // Handle API errors
      const apiError = error as ApiError

      if (apiError.errors) {
        // Map API errors to form fields
        const fieldErrors: Record<string, string> = {}
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            // Map API field names to form field names
            const formField =
              field === 'vehicle_number'
                ? 'vehicle_number'
                : field === 'vehicle_type'
                  ? 'vehicle_type'
                  : field === 'capacity_ton'
                    ? 'capacity_ton'
                    : field
            fieldErrors[formField] = messages[0]
            setError(formField as keyof VehicleFormData, {
              type: 'server',
              message: messages[0],
            })
          }
        })
        setApiErrors(fieldErrors)
      } else {
        // General error message
        setApiErrors({ general: apiError.message || 'Failed to create vehicle' })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new vehicle. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="vehicle_number">
              Vehicle Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vehicle_number"
              placeholder="HR55AB1234"
              {...register('vehicle_number')}
              disabled={createVehicle.isPending}
              className={
                errors.vehicle_number || apiErrors.vehicle_number ? 'border-destructive' : ''
              }
            />
            {errors.vehicle_number && (
              <p className="text-sm text-destructive">{errors.vehicle_number.message}</p>
            )}
            {apiErrors.vehicle_number && !errors.vehicle_number && (
              <p className="text-sm text-destructive">{apiErrors.vehicle_number}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle_type">
              Vehicle Type <span className="text-destructive">*</span>
            </Label>
            <select
              id="vehicle_type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('vehicle_type')}
              disabled={createVehicle.isPending}
            >
              <option value="TRUCK">Truck</option>
              <option value="CONTAINER">Container</option>
              <option value="TEMPO">Tempo</option>
              <option value="TRACTOR">Tractor</option>
            </select>
            {errors.vehicle_type && (
              <p className="text-sm text-destructive">{errors.vehicle_type.message}</p>
            )}
            {apiErrors.vehicle_type && !errors.vehicle_type && (
              <p className="text-sm text-destructive">{apiErrors.vehicle_type}</p>
            )}
          </div>

          <div className="space-y-2">
            <TransporterSelect
              value={transporterName}
              onChange={(value) => setTransporterName(value)}
              placeholder="Select transporter"
              label="Transporter"
              required
            />
            {apiErrors.transporter && (
              <p className="text-sm text-destructive">{apiErrors.transporter}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity_ton">
              Vehicle Capacity (Tons) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="capacity_ton"
              type="text"
              placeholder="e.g., 18"
              {...register('capacity_ton')}
              disabled={createVehicle.isPending}
              className={errors.capacity_ton || apiErrors.capacity_ton ? 'border-destructive' : ''}
            />
            {errors.capacity_ton && (
              <p className="text-sm text-destructive">{errors.capacity_ton.message}</p>
            )}
            {apiErrors.capacity_ton && !errors.capacity_ton && (
              <p className="text-sm text-destructive">{apiErrors.capacity_ton}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createVehicle.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createVehicle.isPending}>
              {createVehicle.isPending ? 'Creating...' : 'Create Vehicle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
