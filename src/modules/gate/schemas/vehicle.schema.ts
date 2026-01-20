import { z } from 'zod'
import { VALIDATION_MESSAGES, VALIDATION_LIMITS, VALIDATION_PATTERNS } from '@/config/constants'

export const vehicleSchema = z.object({
  vehicle_number: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Vehicle number'))
    .regex(VALIDATION_PATTERNS.vehicleNumber, VALIDATION_MESSAGES.invalidVehicleNumber)
    .transform((val) => val.toUpperCase()),
  vehicle_type: z.string().min(1, VALIDATION_MESSAGES.required('Vehicle type')),
  transporter: z
    .number({ message: 'Transporter is required' })
    .positive('Transporter must be selected'),
  capacity_ton: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Vehicle capacity'))
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Capacity must be a positive number'
    ),
})

export type VehicleFormData = z.infer<typeof vehicleSchema>