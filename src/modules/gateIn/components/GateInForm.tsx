import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components/ui'
import { useScrollToError } from '@/shared/hooks'
import { gateInSchema, type GateInFormData } from '../schemas/gateIn.schema'
import { GATE_IN_FORM_DEFAULTS, MATERIAL_TYPES, UNITS } from '../constants/gateIn.constants'

interface GateInFormProps {
  defaultValues?: Partial<GateInFormData>
  onSubmit: (data: GateInFormData) => void
  isLoading?: boolean
  isEdit?: boolean
}

export function GateInForm({
  defaultValues,
  onSubmit,
  isLoading,
  isEdit = false,
}: GateInFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GateInFormData>({
    resolver: zodResolver(gateInSchema),
    defaultValues: { ...GATE_IN_FORM_DEFAULTS, ...defaultValues },
  })

  useScrollToError(errors)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
          <Input
            id="vehicleNumber"
            placeholder="MH12AB1234"
            {...register('vehicleNumber')}
            disabled={isLoading}
          />
          {errors.vehicleNumber && (
            <p className="text-sm text-destructive">{errors.vehicleNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="driverName">Driver Name *</Label>
          <Input
            id="driverName"
            placeholder="Enter driver name"
            {...register('driverName')}
            disabled={isLoading}
          />
          {errors.driverName && (
            <p className="text-sm text-destructive">{errors.driverName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="driverPhone">Driver Phone *</Label>
          <Input
            id="driverPhone"
            placeholder="9876543210"
            {...register('driverPhone')}
            disabled={isLoading}
          />
          {errors.driverPhone && (
            <p className="text-sm text-destructive">{errors.driverPhone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplierName">Supplier Name *</Label>
          <Input
            id="supplierName"
            placeholder="Enter supplier name"
            {...register('supplierName')}
            disabled={isLoading}
          />
          {errors.supplierName && (
            <p className="text-sm text-destructive">{errors.supplierName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="materialType">Material Type *</Label>
          <select
            id="materialType"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register('materialType')}
            disabled={isLoading}
          >
            <option value="">Select material type</option>
            {MATERIAL_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.materialType && (
            <p className="text-sm text-destructive">{errors.materialType.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            placeholder="Enter quantity"
            {...register('quantity', { valueAsNumber: true })}
            disabled={isLoading}
          />
          {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <select
            id="unit"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register('unit')}
            disabled={isLoading}
          >
            {UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
          {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="poNumber">PO Number</Label>
          <Input
            id="poNumber"
            placeholder="Enter PO number (optional)"
            {...register('poNumber')}
            disabled={isLoading}
          />
          {errors.poNumber && <p className="text-sm text-destructive">{errors.poNumber.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <textarea
          id="remarks"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Enter any additional remarks (optional)"
          {...register('remarks')}
          disabled={isLoading}
        />
        {errors.remarks && <p className="text-sm text-destructive">{errors.remarks.message}</p>}
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
