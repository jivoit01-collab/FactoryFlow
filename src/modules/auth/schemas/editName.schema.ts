import { z } from 'zod';

import { VALIDATION_MESSAGES } from '@/config/constants';

// The width of User.full_name in factory_app. Not VALIDATION_LIMITS.name (100):
// names imported from SAP Portal can run longer, and their owners must still be
// able to save them.
export const FULL_NAME_MAX_LENGTH = 150;

export const editNameSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.required('Name'))
    .max(FULL_NAME_MAX_LENGTH, VALIDATION_MESSAGES.maxLength('Name', FULL_NAME_MAX_LENGTH)),
});

export type EditNameFormData = z.infer<typeof editNameSchema>;
