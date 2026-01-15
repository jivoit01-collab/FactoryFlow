import { z } from 'zod'
import { VALIDATION_MESSAGES, VALIDATION_LIMITS } from '@/config/constants'

export const qualityCheckResultSchema = z.object({
  parameter: z.string().min(1, VALIDATION_MESSAGES.required('Parameter')),
  expectedValue: z.string().min(1, VALIDATION_MESSAGES.required('Expected value')),
  actualValue: z.string().min(1, VALIDATION_MESSAGES.required('Actual value')),
  passed: z.boolean(),
  remarks: z.string().optional(),
})

export const qualityCheckSchema = z.object({
  gateInId: z.string().min(1, VALIDATION_MESSAGES.required('Gate In entry')),
  results: z
    .array(qualityCheckResultSchema)
    .min(1, 'At least one quality check result is required'),
  overallRemarks: z
    .string()
    .max(
      VALIDATION_LIMITS.description.max,
      VALIDATION_MESSAGES.maxLength('Remarks', VALIDATION_LIMITS.description.max)
    )
    .optional(),
  samplesTaken: z
    .number({ message: 'Samples must be a number' })
    .int('Samples must be a whole number')
    .positive('Samples must be greater than 0')
    .optional(),
})

export type QualityCheckFormData = z.infer<typeof qualityCheckSchema>
export type QualityCheckResultFormData = z.infer<typeof qualityCheckResultSchema>
