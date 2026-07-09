import { z } from 'zod';

const decimalString = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(Number(value)), `${label} must be a number`)
    .refine((value) => Number(value) > 0, `${label} must be greater than zero`);

export const returnableItemSchema = z.object({
  id: z.number().optional(),
  item_code: z.string().optional(),
  item_name: z.string().min(1, 'Item name is required').max(250),
  description: z.string().optional(),
  serial_no: z.string().optional(),
  make_model: z.string().optional(),
  uom: z.string().optional(),
  quantity_out: decimalString('Quantity'),
  condition_out: z.enum(['WORKING', 'FAULTY', 'DAMAGED', 'NEW', 'OTHER']).optional(),
  estimated_value: z.string().optional(),
  remarks: z.string().optional(),
});

export const returnableGatePassSchema = z.object({
  // Plain number, not z.coerce — coercion widens the *input* type to unknown,
  // which makes zodResolver incompatible with the form's field types.
  department: z.number().nullable().optional(),
  requested_by_name: z.string().optional(),
  contact_no: z.string().optional(),
  purpose: z.enum([
    'REPAIR',
    'EXCHANGE',
    'CALIBRATION',
    'JOB_WORK',
    'WARRANTY_CLAIM',
    'TESTING',
    'DEMO_TRIAL',
    'OTHER',
  ]),
  purpose_detail: z.string().optional(),
  party_name: z.string().min(1, 'Party name is required').max(200),
  party_contact: z.string().optional(),
  party_address: z.string().optional(),
  party_gstin: z.string().optional(),
  expected_return_date: z.string().min(1, 'Expected return date is required'),
  asset: z.number().nullable().optional(),
  work_order: z.number().nullable().optional(),
  items_input: z.array(returnableItemSchema).min(1, 'Add at least one item'),
});

export type ReturnableGatePassFormValues = z.infer<typeof returnableGatePassSchema>;

/**
 * The gate must identify the vehicle and driver, either by picking an existing
 * record or by typing the details in. Enforced here so the form fails before the
 * request does.
 */
export const returnableGateOutSchema = z
  .object({
    vehicle: z.number().nullable().optional(),
    driver: z.number().nullable().optional(),
    transporter: z.number().nullable().optional(),
    vehicle_number_manual: z.string().optional(),
    driver_name_manual: z.string().optional(),
    driver_mobile: z.string().optional(),
    security_name: z.string().optional(),
    out_remarks: z.string().optional(),
  })
  .refine((data) => Boolean(data.vehicle) || Boolean(data.vehicle_number_manual?.trim()), {
    message: 'Select a vehicle or enter the vehicle number',
    path: ['vehicle_number_manual'],
  })
  .refine((data) => Boolean(data.driver) || Boolean(data.driver_name_manual?.trim()), {
    message: 'Select a driver or enter the driver name',
    path: ['driver_name_manual'],
  });

export type ReturnableGateOutFormValues = z.infer<typeof returnableGateOutSchema>;

export const reasonSchema = z.object({
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters'),
});

export type ReasonFormValues = z.infer<typeof reasonSchema>;
