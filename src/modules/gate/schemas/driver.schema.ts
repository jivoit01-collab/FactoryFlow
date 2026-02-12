import { z } from 'zod'

import { VALIDATION_LIMITS, VALIDATION_MESSAGES, VALIDATION_PATTERNS } from '@/config/constants'

// ID proof type options
export const ID_PROOF_TYPES = ['Aadhar', 'PAN Card', 'Voter ID', 'Other'] as const
export type IdProofType = (typeof ID_PROOF_TYPES)[number]

// Validation config for ID proofs (pattern, length, messages)
export const ID_PROOF_VALIDATION = {
  Aadhar: {
    pattern: VALIDATION_PATTERNS.aadhar,
    maxLength: 12,
    message: 'Aadhar number must be exactly 12 digits',
    placeholder: '123456789012',
  },
  'PAN Card': {
    pattern: VALIDATION_PATTERNS.panCard,
    maxLength: 10,
    message: 'PAN must be 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)',
    placeholder: 'ABCDE1234F',
  },
  'Voter ID': {
    pattern: VALIDATION_PATTERNS.voterId,
    maxLength: 10,
    message: 'Voter ID must be 3 letters + 7 digits (e.g., ABC1234567)',
    placeholder: 'ABC1234567',
  },
  Other: {
    pattern: null,
    maxLength: 50,
    message: '',
    placeholder: 'Enter ID proof number',
  },
} as const

export const driverSchema = z
  .object({
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
      .regex(
        VALIDATION_PATTERNS.drivingLicense,
        'License must be in format: State code + RTO + Year + Number (e.g., MH0220150001234)'
      ),
    id_proof_type: z.string().min(1, VALIDATION_MESSAGES.required('ID proof type')),
    id_proof_number: z.string().min(1, VALIDATION_MESSAGES.required('ID proof number')),
    photo: z.instanceof(File).optional(),
  })
  .superRefine((data, ctx) => {
    const { id_proof_type, id_proof_number } = data

    // Validate ID proof number based on type
    if (id_proof_type === 'Aadhar') {
      if (!VALIDATION_PATTERNS.aadhar.test(id_proof_number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ID_PROOF_VALIDATION.Aadhar.message,
          path: ['id_proof_number'],
        })
      }
    } else if (id_proof_type === 'PAN Card') {
      if (!VALIDATION_PATTERNS.panCard.test(id_proof_number.toUpperCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ID_PROOF_VALIDATION['PAN Card'].message,
          path: ['id_proof_number'],
        })
      }
    } else if (id_proof_type === 'Voter ID') {
      if (!VALIDATION_PATTERNS.voterId.test(id_proof_number.toUpperCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ID_PROOF_VALIDATION['Voter ID'].message,
          path: ['id_proof_number'],
        })
      }
    } else if (id_proof_type === 'Other') {
      // For "Other", just ensure minimum length
      if (id_proof_number.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ID proof number must be at least 5 characters',
          path: ['id_proof_number'],
        })
      }
    }
  })

export type DriverFormData = z.infer<typeof driverSchema>
