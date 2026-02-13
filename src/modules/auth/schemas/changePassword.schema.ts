import { z } from 'zod';

import { VALIDATION_LIMITS, VALIDATION_MESSAGES } from '@/config/constants';

export const changePasswordSchema = z
  .object({
    old_password: z
      .string()
      .min(1, VALIDATION_MESSAGES.required('Current password'))
      .min(
        VALIDATION_LIMITS.password.min,
        VALIDATION_MESSAGES.minLength('Current password', VALIDATION_LIMITS.password.min),
      )
      .max(
        VALIDATION_LIMITS.password.max,
        VALIDATION_MESSAGES.maxLength('Current password', VALIDATION_LIMITS.password.max),
      ),
    new_password: z
      .string()
      .min(1, VALIDATION_MESSAGES.required('New password'))
      .min(
        VALIDATION_LIMITS.password.min,
        VALIDATION_MESSAGES.minLength('New password', VALIDATION_LIMITS.password.min),
      )
      .max(
        VALIDATION_LIMITS.password.max,
        VALIDATION_MESSAGES.maxLength('New password', VALIDATION_LIMITS.password.max),
      ),
  })
  .refine((data) => data.old_password !== data.new_password, {
    message: 'New password must be different from current password',
    path: ['new_password'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const CHANGE_PASSWORD_FORM_DEFAULTS: ChangePasswordFormData = {
  old_password: '',
  new_password: '',
};
