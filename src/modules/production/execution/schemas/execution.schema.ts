import { z } from 'zod';

// ============================================================================
// Production Run Schemas
// ============================================================================

export const createRunSchema = z.object({
  sap_doc_entry: z.number({ required_error: 'SAP order is required' }),
  line_id: z.number({ required_error: 'Production line is required' }),
  date: z.string().min(1, 'Date is required'),
  brand: z.string().min(1, 'Brand is required'),
  pack: z.string().min(1, 'Pack is required'),
  sap_order_no: z.string().min(1, 'SAP order number is required'),
  rated_speed: z.string().optional(),
});

export type CreateRunFormData = z.infer<typeof createRunSchema>;

// ============================================================================
// Hourly Log Schema
// ============================================================================

export const createLogSchema = z.object({
  time_slot: z.string().min(1, 'Time slot is required'),
  time_start: z.string().min(1, 'Start time is required'),
  time_end: z.string().min(1, 'End time is required'),
  produced_cases: z
    .number({ required_error: 'Produced cases is required' })
    .int()
    .min(0, 'Must be 0 or more'),
  machine_status: z.enum(['RUNNING', 'IDLE', 'BREAKDOWN', 'CHANGEOVER'], {
    required_error: 'Machine status is required',
  }),
  recd_minutes: z
    .number({ required_error: 'Recorded minutes is required' })
    .int()
    .min(0)
    .max(60, 'Cannot exceed 60 minutes'),
  breakdown_detail: z.string().optional(),
  remarks: z.string().optional(),
});

export type CreateLogFormData = z.infer<typeof createLogSchema>;

// ============================================================================
// Breakdown Schema
// ============================================================================

export const createBreakdownSchema = z
  .object({
    machine_id: z.number({ required_error: 'Machine is required' }),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    breakdown_minutes: z
      .number({ required_error: 'Breakdown minutes is required' })
      .int()
      .positive('Must be greater than 0'),
    type: z.enum(['LINE', 'EXTERNAL'], { required_error: 'Type is required' }),
    reason: z.string().min(1, 'Reason is required'),
    remarks: z.string().optional(),
    is_unrecovered: z.boolean().optional(),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: 'End time must be after start time',
    path: ['end_time'],
  });

export type CreateBreakdownFormData = z.infer<typeof createBreakdownSchema>;

// ============================================================================
// Material Usage Schema
// ============================================================================

export const createMaterialSchema = z.object({
  material_code: z.string().min(1, 'Material code is required'),
  material_name: z.string().min(1, 'Material name is required'),
  opening_qty: z.string().min(1, 'Opening quantity is required'),
  issued_qty: z.string().min(1, 'Issued quantity is required'),
  closing_qty: z.string().min(1, 'Closing quantity is required'),
  uom: z.string().min(1, 'UoM is required'),
  batch_number: z
    .number({ required_error: 'Batch number is required' })
    .int()
    .min(1)
    .max(3),
});

export type CreateMaterialFormData = z.infer<typeof createMaterialSchema>;

// ============================================================================
// Machine Runtime Schema
// ============================================================================

export const createRuntimeSchema = z.object({
  machine_id: z.number({ required_error: 'Machine is required' }),
  machine_type: z.enum(
    ['FILLER', 'CAPPER', 'CONVEYOR', 'LABELER', 'CODING', 'SHRINK_PACK', 'STICKER_LABELER', 'TAPPING_MACHINE'],
    { required_error: 'Machine type is required' },
  ),
  runtime_minutes: z
    .number({ required_error: 'Runtime is required' })
    .int()
    .min(0),
  downtime_minutes: z
    .number({ required_error: 'Downtime is required' })
    .int()
    .min(0),
  remarks: z.string().optional(),
});

export type CreateRuntimeFormData = z.infer<typeof createRuntimeSchema>;

// ============================================================================
// Manpower Schema
// ============================================================================

export const createManpowerSchema = z.object({
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT'], {
    required_error: 'Shift is required',
  }),
  worker_count: z
    .number({ required_error: 'Worker count is required' })
    .int()
    .positive('Must be at least 1'),
  supervisor: z.string().min(1, 'Supervisor is required'),
  engineer: z.string().min(1, 'Engineer is required'),
  remarks: z.string().optional(),
});

export type CreateManpowerFormData = z.infer<typeof createManpowerSchema>;

// ============================================================================
// Line Clearance Schema
// ============================================================================

export const createClearanceSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  line_id: z.number({ required_error: 'Production line is required' }),
  sap_doc_entry: z.number().optional(),
});

export type CreateClearanceFormData = z.infer<typeof createClearanceSchema>;

// ============================================================================
// Waste Log Schema
// ============================================================================

export const createWasteSchema = z.object({
  production_run_id: z.number({ required_error: 'Production run is required' }),
  material_code: z.string().min(1, 'Material code is required'),
  material_name: z.string().min(1, 'Material name is required'),
  wastage_qty: z.string().min(1, 'Wastage quantity is required'),
  uom: z.string().min(1, 'UoM is required'),
  reason: z.string().min(1, 'Reason is required'),
});

export type CreateWasteFormData = z.infer<typeof createWasteSchema>;

// ============================================================================
// Resource Schemas
// ============================================================================

export const createElectricitySchema = z.object({
  description: z.string().min(1, 'Description is required'),
  units_consumed: z.string().min(1, 'Units consumed is required'),
  rate_per_unit: z.string().min(1, 'Rate is required'),
});

export type CreateElectricityFormData = z.infer<typeof createElectricitySchema>;

export const createWaterSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  volume_consumed: z.string().min(1, 'Volume consumed is required'),
  rate_per_unit: z.string().min(1, 'Rate is required'),
});

export type CreateWaterFormData = z.infer<typeof createWaterSchema>;

export const createGasSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  qty_consumed: z.string().min(1, 'Quantity consumed is required'),
  rate_per_unit: z.string().min(1, 'Rate is required'),
});

export type CreateGasFormData = z.infer<typeof createGasSchema>;

export const createCompressedAirSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  units_consumed: z.string().min(1, 'Units consumed is required'),
  rate_per_unit: z.string().min(1, 'Rate is required'),
});

export type CreateCompressedAirFormData = z.infer<typeof createCompressedAirSchema>;

export const createLabourSchema = z.object({
  worker_name: z.string().min(1, 'Worker name is required'),
  hours_worked: z.string().min(1, 'Hours worked is required'),
  rate_per_hour: z.string().min(1, 'Rate is required'),
});

export type CreateLabourFormData = z.infer<typeof createLabourSchema>;

export const createMachineCostSchema = z.object({
  machine_name: z.string().min(1, 'Machine name is required'),
  hours_used: z.string().min(1, 'Hours used is required'),
  rate_per_hour: z.string().min(1, 'Rate is required'),
});

export type CreateMachineCostFormData = z.infer<typeof createMachineCostSchema>;

export const createOverheadSchema = z.object({
  expense_name: z.string().min(1, 'Expense name is required'),
  amount: z.string().min(1, 'Amount is required'),
});

export type CreateOverheadFormData = z.infer<typeof createOverheadSchema>;

// ============================================================================
// QC Schemas
// ============================================================================

export const createInProcessQCSchema = z.object({
  checked_at: z.string().min(1, 'Check time is required'),
  parameter: z.string().min(1, 'Parameter is required'),
  acceptable_min: z.string().optional(),
  acceptable_max: z.string().optional(),
  actual_value: z.string().optional(),
  result: z.enum(['PASS', 'FAIL', 'NA'], { required_error: 'Result is required' }),
  remarks: z.string().optional(),
});

export type CreateInProcessQCFormData = z.infer<typeof createInProcessQCSchema>;

export const finalQCParameterSchema = z.object({
  name: z.string().min(1, 'Parameter name is required'),
  expected: z.string().min(1, 'Expected value is required'),
  actual: z.string().min(1, 'Actual value is required'),
  result: z.enum(['PASS', 'FAIL', 'NA'], { required_error: 'Result is required' }),
});

export const createFinalQCSchema = z.object({
  checked_at: z.string().min(1, 'Check time is required'),
  overall_result: z.enum(['PASS', 'FAIL', 'CONDITIONAL'], {
    required_error: 'Overall result is required',
  }),
  parameters: z.array(finalQCParameterSchema).min(1, 'At least one parameter is required'),
  remarks: z.string().optional(),
});

export type CreateFinalQCFormData = z.infer<typeof createFinalQCSchema>;

// ============================================================================
// Checklist Entry Schema
// ============================================================================

export const createChecklistSchema = z.object({
  machine_id: z.number({ required_error: 'Machine is required' }),
  machine_type: z.enum(
    ['FILLER', 'CAPPER', 'CONVEYOR', 'LABELER', 'CODING', 'SHRINK_PACK', 'STICKER_LABELER', 'TAPPING_MACHINE'],
    { required_error: 'Machine type is required' },
  ),
  date: z.string().min(1, 'Date is required'),
  template_id: z.number({ required_error: 'Template is required' }),
  task_description: z.string().min(1, 'Task description is required'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY'], {
    required_error: 'Frequency is required',
  }),
  status: z.enum(['OK', 'NOT_OK', 'NA'], { required_error: 'Status is required' }),
  operator: z.string().optional(),
  shift_incharge: z.string().optional(),
  remarks: z.string().optional(),
});

export type CreateChecklistFormData = z.infer<typeof createChecklistSchema>;
