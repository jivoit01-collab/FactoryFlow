import { z } from 'zod';

// ============================================================================
// Production Run Schemas
// ============================================================================

export const createRunSchema = z.object({
  sap_doc_entry: z.number().nullable().optional(),
  line_id: z.number({ required_error: 'Production line is required' }),
  date: z.string().min(1, 'Date is required'),
  product: z.string().optional().default(''),
  required_qty: z.string().optional(),
  rated_speed: z.string().optional(),
  machine_ids: z.array(z.number()).optional().default([]),
  labour_count: z.number().int().min(0).optional().default(0),
  other_manpower_count: z.number().int().min(0).optional().default(0),
  supervisor: z.string().optional().default(''),
  operators: z.string().optional().default(''),
  materials: z.array(z.object({
    material_code: z.string(),
    material_name: z.string(),
    opening_qty: z.string().default('0'),
    issued_qty: z.string().default('0'),
    uom: z.string().default(''),
  })).optional().default([]),
});

export type CreateRunFormData = z.infer<typeof createRunSchema>;

// ============================================================================
// Add Breakdown Schema (timeline action)
// ============================================================================

export const addBreakdownSchema = z.object({
  breakdown_category_id: z.number({ required_error: 'Breakdown type is required' }),
  reason: z.string().min(1, 'Reason is required'),
  produced_cases: z.string().optional().default('0'),
  remarks: z.string().optional(),
});

export type AddBreakdownFormData = z.infer<typeof addBreakdownSchema>;

// ============================================================================
// Stop Production Schema
// ============================================================================

export const stopProductionSchema = z.object({
  produced_cases: z.string().min(1, 'Cases produced is required'),
  remarks: z.string().optional(),
});

export type StopProductionFormData = z.infer<typeof stopProductionSchema>;

// ============================================================================
// Complete Run Schema
// ============================================================================

export const completeRunSchema = z.object({
  total_production: z.string().min(1, 'Total production is required'),
});

export type CompleteRunFormData = z.infer<typeof completeRunSchema>;

// ============================================================================
// Material Usage Schema
// ============================================================================

export const createMaterialSchema = z.object({
  material_code: z.string().min(1, 'Material code is required'),
  material_name: z.string().min(1, 'Material name is required'),
  opening_qty: z.string().min(1, 'Opening quantity is required'),
  issued_qty: z.string().min(1, 'Issued quantity is required'),
  closing_qty: z.string().optional(),
  uom: z.string().min(1, 'UoM is required'),
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
  production_run_id: z.number().optional(),
  date: z.string().min(1, 'Date is required'),
  line_id: z.number({ required_error: 'Production line is required' }),
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
  description: z.string().optional().default(''),
  worker_count: z.number({ required_error: 'Worker count is required' }).int().min(1),
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
