import { z } from 'zod';

// ============================================================================
// Production Run Schema
// ============================================================================

export const createRunSchema = z.object({
  production_plan_id: z.number({ required_error: 'Production plan is required' }).positive(),
  line_id: z.number({ required_error: 'Production line is required' }).positive(),
  date: z.string().min(1, 'Date is required'),
  brand: z.string().optional(),
  pack: z.string().optional(),
  sap_order_no: z.string().optional(),
  rated_speed: z.number().positive('Rated speed must be positive').optional(),
});

export type CreateRunFormData = z.infer<typeof createRunSchema>;

// ============================================================================
// Hourly Production Log Schema
// ============================================================================

export const productionLogSchema = z.object({
  time_slot: z.string().min(1, 'Time slot is required'),
  time_start: z.string().min(1, 'Start time is required'),
  time_end: z.string().min(1, 'End time is required'),
  produced_cases: z.number().min(0, 'Cases cannot be negative').optional().default(0),
  machine_status: z.enum(['RUNNING', 'IDLE', 'BREAKDOWN', 'CHANGEOVER']).optional().default('RUNNING'),
  recd_minutes: z
    .number()
    .min(0, 'Minutes cannot be negative')
    .max(60, 'Minutes cannot exceed 60')
    .optional()
    .default(0),
  breakdown_detail: z.string().optional().default(''),
  remarks: z.string().optional().default(''),
});

export type ProductionLogFormData = z.infer<typeof productionLogSchema>;

// ============================================================================
// Breakdown Schema
// ============================================================================

export const breakdownSchema = z
  .object({
    machine_id: z.number({ required_error: 'Machine is required' }).positive(),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().optional(),
    breakdown_minutes: z.number().min(0).optional(),
    type: z.enum(['LINE', 'EXTERNAL'], { required_error: 'Breakdown type is required' }),
    is_unrecovered: z.boolean().optional().default(false),
    reason: z.string().min(1, 'Reason is required'),
    remarks: z.string().optional().default(''),
  })
  .refine(
    (data) => {
      if (data.end_time && data.start_time) {
        return data.end_time >= data.start_time;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    },
  );

export type BreakdownFormData = z.infer<typeof breakdownSchema>;

// ============================================================================
// Material Usage Schema
// ============================================================================

export const materialUsageSchema = z.object({
  material_code: z.string().optional().default(''),
  material_name: z.string().min(1, 'Material name is required'),
  opening_qty: z.number().min(0, 'Quantity cannot be negative').optional().default(0),
  issued_qty: z.number().min(0, 'Quantity cannot be negative').optional().default(0),
  closing_qty: z.number().min(0, 'Quantity cannot be negative').optional().default(0),
  uom: z.string().optional().default(''),
  batch_number: z.number().int().min(1).max(3).optional().default(1),
});

export type MaterialUsageFormData = z.infer<typeof materialUsageSchema>;

// ============================================================================
// Machine Runtime Schema
// ============================================================================

export const machineRuntimeSchema = z.object({
  machine_id: z.number().optional(),
  machine_type: z.enum([
    'FILLER',
    'CAPPER',
    'CONVEYOR',
    'LABELER',
    'CODING',
    'SHRINK_PACK',
    'STICKER_LABELER',
    'TAPPING_MACHINE',
  ]),
  runtime_minutes: z.number().min(0, 'Minutes cannot be negative').optional().default(0),
  downtime_minutes: z.number().min(0, 'Minutes cannot be negative').optional().default(0),
  remarks: z.string().optional().default(''),
});

export type MachineRuntimeFormData = z.infer<typeof machineRuntimeSchema>;

// ============================================================================
// Line Clearance Schema
// ============================================================================

export const clearanceSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  line_id: z.number({ required_error: 'Production line is required' }).positive(),
  production_plan_id: z.number({ required_error: 'Production plan is required' }).positive(),
  document_id: z.string().optional().default(''),
});

export type ClearanceFormData = z.infer<typeof clearanceSchema>;

export const clearanceItemUpdateSchema = z.object({
  id: z.number(),
  result: z.enum(['YES', 'NO', 'NA']),
  remarks: z.string().optional().default(''),
});

export type ClearanceItemUpdateFormData = z.infer<typeof clearanceItemUpdateSchema>;

// ============================================================================
// Checklist Entry Schema
// ============================================================================

export const checklistEntrySchema = z.object({
  machine_id: z.number({ required_error: 'Machine is required' }).positive(),
  template_id: z.number({ required_error: 'Template is required' }).positive(),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['OK', 'NOT_OK', 'NA']).optional().default('NA'),
  operator: z.string().optional().default(''),
  shift_incharge: z.string().optional().default(''),
  remarks: z.string().optional().default(''),
});

export type ChecklistEntryFormData = z.infer<typeof checklistEntrySchema>;

// ============================================================================
// Waste Log Schema
// ============================================================================

export const wasteLogSchema = z.object({
  production_run_id: z.number({ required_error: 'Production run is required' }).positive(),
  material_code: z.string().optional().default(''),
  material_name: z.string().min(1, 'Material name is required'),
  wastage_qty: z
    .number({ required_error: 'Wastage quantity is required' })
    .positive('Quantity must be greater than 0'),
  uom: z.string().optional().default(''),
  reason: z.string().optional().default(''),
});

export type WasteLogFormData = z.infer<typeof wasteLogSchema>;

// ============================================================================
// Manpower Schema
// ============================================================================

export const manpowerSchema = z.object({
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT'], { required_error: 'Shift is required' }),
  worker_count: z.number().int().min(0, 'Cannot be negative').optional().default(0),
  supervisor: z.string().optional().default(''),
  engineer: z.string().optional().default(''),
  remarks: z.string().optional().default(''),
});

export type ManpowerFormData = z.infer<typeof manpowerSchema>;
