import { z } from 'zod'
import { VALIDATION_MESSAGES, VALIDATION_LIMITS, VALIDATION_PATTERNS } from '@/config/constants'

export const gateInSchema = z.object({
  vehicleNumber: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Vehicle number'))
    .regex(VALIDATION_PATTERNS.vehicleNumber, VALIDATION_MESSAGES.invalidVehicleNumber)
    .transform((val) => val.toUpperCase()),
  driverName: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Driver name'))
    .min(
      VALIDATION_LIMITS.name.min,
      VALIDATION_MESSAGES.minLength('Driver name', VALIDATION_LIMITS.name.min)
    )
    .max(
      VALIDATION_LIMITS.name.max,
      VALIDATION_MESSAGES.maxLength('Driver name', VALIDATION_LIMITS.name.max)
    ),
  driverPhone: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Driver phone'))
    .regex(VALIDATION_PATTERNS.phone, VALIDATION_MESSAGES.invalidPhone),
  materialType: z.string().min(1, VALIDATION_MESSAGES.required('Material type')),
  quantity: z
    .number({ message: 'Quantity must be a number' })
    .positive('Quantity must be greater than 0'),
  unit: z.string().min(1, VALIDATION_MESSAGES.required('Unit')),
  supplierName: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Supplier name'))
    .max(
      VALIDATION_LIMITS.name.max,
      VALIDATION_MESSAGES.maxLength('Supplier name', VALIDATION_LIMITS.name.max)
    ),
  poNumber: z.string().optional(),
  remarks: z
    .string()
    .max(
      VALIDATION_LIMITS.description.max,
      VALIDATION_MESSAGES.maxLength('Remarks', VALIDATION_LIMITS.description.max)
    )
    .optional(),
})

export type GateInFormData = z.infer<typeof gateInSchema>
