import { z } from 'zod';

/**
 * The forms' own checks — the ones worth catching before a round trip.
 *
 * Kept deliberately thin. The server owns the rules that need to look at other
 * rows (is this meter reading below the last one, is this the same bill
 * twice, does this vehicle even run on CNG), and duplicating those here would
 * give two answers to one question.
 */

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);

/** A number typed into a text box: blank is "not given", not zero. */
const optionalNumber = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || Number(value) >= 0, 'Enter a number');

const positiveNumber = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => Number(value) > 0, `${label} must be more than zero`);

export const fleetVehicleSchema = z.object({
  vehicle_number: requiredText('Vehicle number').transform((value) =>
    value.toUpperCase().replace(/\s/g, ''),
  ),
  nickname: z.string().trim().optional(),
  category: requiredText('Category'),
  fuel_type: requiredText('Fuel type'),
  status: requiredText('Status'),
  make_model: z.string().trim().optional(),
  purchase_date: z.string().optional(),
  purchase_value: optionalNumber,
  assigned_to: z.string().trim().optional(),
  department: z.string().trim().optional(),
  opening_odometer: optionalNumber,
  remarks: z.string().trim().optional(),
});

export type FleetVehicleFormData = z.infer<typeof fleetVehicleSchema>;

export const fuelEntrySchema = z.object({
  vehicle: z.number().positive('Choose the vehicle'),
  entry_date: requiredText('Date'),
  fuel_type: z.string().optional(),
  odometer: positiveNumber('Meter reading'),
  quantity: positiveNumber('Quantity'),
  amount: optionalNumber,
  rate: optionalNumber,
  is_tank_full: z.boolean(),
  station_name: z.string().trim().optional(),
  bill_number: z.string().trim().optional(),
  payment_mode: z.string().optional(),
  filled_by: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
  odometer_note: z.string().trim().optional(),
});

export type FuelEntryFormData = z.infer<typeof fuelEntrySchema>;

export const serviceEntrySchema = z.object({
  vehicle: z.number().positive('Choose the vehicle'),
  entry_date: requiredText('Date'),
  odometer: optionalNumber,
  kind: requiredText('Type of work'),
  workshop_name: z.string().trim().optional(),
  description: z.string().trim().optional(),
  parts_amount: optionalNumber,
  labour_amount: optionalNumber,
  total_amount: optionalNumber,
  bill_number: z.string().trim().optional(),
  payment_mode: z.string().optional(),
  next_service_date: z.string().optional(),
  next_service_odometer: optionalNumber,
  down_days: optionalNumber,
  remarks: z.string().trim().optional(),
});

export type ServiceEntryFormData = z.infer<typeof serviceEntrySchema>;

export const vehicleDocumentSchema = z.object({
  vehicle: z.number().positive('Choose the vehicle'),
  doc_type: requiredText('Document'),
  expiry_date: requiredText('Expiry date'),
  document_number: z.string().trim().optional(),
  issuing_authority: z.string().trim().optional(),
  issue_date: z.string().optional(),
  amount: optionalNumber,
  remarks: z.string().trim().optional(),
});

export type VehicleDocumentFormData = z.infer<typeof vehicleDocumentSchema>;

export const dailyReadingSchema = z.object({
  vehicle: z.number().positive('Choose the vehicle'),
  reading_date: requiredText('Date'),
  odometer: positiveNumber('Meter reading'),
  remarks: z.string().trim().optional(),
});

export type DailyReadingFormData = z.infer<typeof dailyReadingSchema>;
