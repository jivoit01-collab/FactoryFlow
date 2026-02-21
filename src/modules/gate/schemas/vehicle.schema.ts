import { z } from 'zod';

import { VALIDATION_MESSAGES } from '@/config/constants';

export const vehicleSchema = z.object({
  vehicle_number: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Vehicle number'))
    .transform((val) => val.toUpperCase().replace(/\s/g, '')),
  vehicle_type: z
    .number({ error: 'Vehicle type is required' })
    .positive('Vehicle type must be selected'),
  transporter: z
    .number({ message: 'Transporter is required' })
    .positive('Transporter must be selected'),
  capacity_ton: z
    .string()
    .min(1, VALIDATION_MESSAGES.required('Vehicle capacity'))
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Capacity must be a positive number',
    ),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;
