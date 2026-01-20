import { z } from 'zod'
import { VALIDATION_MESSAGES, VALIDATION_LIMITS, VALIDATION_PATTERNS } from '@/config/constants'

export const driverSchema = z.object({
  name: z
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
  mobile_no: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Mobile number'))
    .regex(VALIDATION_PATTERNS.phone, VALIDATION_MESSAGES.invalidPhone),
  license_no: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Driving license number'))
    .min(5, 'License number must be at least 5 characters')
    .max(20, 'License number must be at most 20 characters'),
  id_proof_type: z.string().min(1, VALIDATION_MESSAGES.required('ID proof type')),
  id_proof_number: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('ID proof number'))
    .min(5, 'ID proof number must be at least 5 characters')
    .max(50, 'ID proof number must be at most 50 characters'),
  photo: z.instanceof(File).optional(),
})

export type DriverFormData = z.infer<typeof driverSchema>