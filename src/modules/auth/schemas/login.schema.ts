import { z } from 'zod'
import { VALIDATION_LIMITS, VALIDATION_MESSAGES } from '@/config/constants'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Email'))
    .email(VALIDATION_MESSAGES.invalidEmail)
    .max(
      VALIDATION_LIMITS.email.max,
      VALIDATION_MESSAGES.maxLength('Email', VALIDATION_LIMITS.email.max)
    ),
  password: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Password'))
    .min(
      VALIDATION_LIMITS.password.min,
      VALIDATION_MESSAGES.minLength('Password', VALIDATION_LIMITS.password.min)
    )
    .max(
      VALIDATION_LIMITS.password.max,
      VALIDATION_MESSAGES.maxLength('Password', VALIDATION_LIMITS.password.max)
    ),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const LOGIN_FORM_DEFAULTS: LoginFormData = {
  email: '',
  password: '',
}
