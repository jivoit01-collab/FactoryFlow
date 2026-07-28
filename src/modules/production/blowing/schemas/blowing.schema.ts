import { z } from 'zod';

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : Number(v)));

export const runFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  machine_id: z.coerce.number().int().positive('Select a machine'),
  preform_spec_id: z.coerce.number().int().positive('Select a preform spec'),
  preform_boxes_used: z.coerce.number().min(0).default(0),
  machine_start_reading: optionalNumber,
  machine_stop_reading: optionalNumber,
  utility_units: z.coerce.number().min(0).default(0),
  total_counter_production: z.coerce.number().int().min(0).default(0),
  rejection_pcs: z.coerce.number().int().min(0).default(0),
  operator_count: z.coerce.number().int().min(0).default(0),
  contract_labour_count: z.coerce.number().int().min(0).default(0),
  own_labour_count: z.coerce.number().int().min(0).default(0),
  scrap_carton_value: z.coerce.number().min(0).default(0),
  remarks: z.string().optional().default(''),
});

export type RunFormData = z.infer<typeof runFormSchema>;
export type RunFormInput = z.input<typeof runFormSchema>;

export const machineFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  heads: optionalNumber,
  sap_warehouse_code: z.string().optional().default(''),
  depreciation_per_day: z.coerce.number().min(0).default(0),
});
export type MachineFormData = z.infer<typeof machineFormSchema>;
export type MachineFormInput = z.input<typeof machineFormSchema>;

export const preformSpecFormSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  gram: z.coerce.number().positive('Gram must be > 0'),
  preforms_per_box: z.coerce.number().int().positive('Preforms per box must be > 0'),
  preform_rate_per_bottle: z.coerce.number().min(0).default(0),
  sap_item_code: z.string().optional().default(''),
  sap_item_name: z.string().optional().default(''),
  bottle_weight_g: optionalNumber,
  bottles_per_kg: optionalNumber,
  mould_cost: optionalNumber,
  mould_life_bottles: optionalNumber,
  std_make_cost_per_bottle: optionalNumber,
  std_reject_pct: optionalNumber,
  std_units_per_bottle: optionalNumber,
});
export type PreformSpecFormData = z.infer<typeof preformSpecFormSchema>;
export type PreformSpecFormInput = z.input<typeof preformSpecFormSchema>;

export const rateConfigFormSchema = z.object({
  effective_from: z.string().min(1, 'Effective date is required'),
  operator_rate_per_day: z.coerce.number().min(0),
  labour_rate_per_day: z.coerce.number().min(0),
  electricity_rate_per_unit: z.coerce.number().min(0),
  scrap_rate_per_bottle: z.coerce.number().min(0),
  packing_rate_per_bottle: z.coerce.number().min(0),
  maintenance_per_day: z.coerce.number().min(0).default(0),
  factory_overhead_per_day: z.coerce.number().min(0).default(0),
  qa_cost_per_day: z.coerce.number().min(0).default(0),
});
export type RateConfigFormData = z.infer<typeof rateConfigFormSchema>;
export type RateConfigFormInput = z.input<typeof rateConfigFormSchema>;

export const stopProductionSchema = z.object({
  produced_pcs: z.coerce.number().min(0, 'Bottles produced is required'),
  remarks: z.string().optional().default(''),
});
export type StopProductionFormData = z.infer<typeof stopProductionSchema>;
export type StopProductionFormInput = z.input<typeof stopProductionSchema>;

export const addBreakdownSchema = z.object({
  breakdown_category_id: optionalNumber,
  machine_id: optionalNumber,
  reason: z.string().min(1, 'Reason is required'),
  produced_pcs: z.coerce.number().min(0).default(0),
  remarks: z.string().optional().default(''),
});
export type AddBreakdownFormData = z.infer<typeof addBreakdownSchema>;
export type AddBreakdownFormInput = z.input<typeof addBreakdownSchema>;

// Manual (backfill) entries — user supplies explicit start & end time.
export const addManualSegmentSchema = z
  .object({
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    produced_pcs: z.coerce.number().min(0).default(0),
    remarks: z.string().optional().default(''),
  })
  .superRefine((val, ctx) => {
    if (val.start_time && val.end_time && new Date(val.end_time) <= new Date(val.start_time)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_time'],
        message: 'End time must be after start time.',
      });
    }
  });
export type AddManualSegmentFormData = z.infer<typeof addManualSegmentSchema>;
export type AddManualSegmentFormInput = z.input<typeof addManualSegmentSchema>;

export const addManualBreakdownSchema = z
  .object({
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    breakdown_category_id: optionalNumber,
    machine_id: optionalNumber,
    reason: z.string().min(1, 'Reason is required'),
    remarks: z.string().optional().default(''),
  })
  .superRefine((val, ctx) => {
    if (val.start_time && val.end_time && new Date(val.end_time) <= new Date(val.start_time)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_time'],
        message: 'End time must be after start time.',
      });
    }
  });
export type AddManualBreakdownFormData = z.infer<typeof addManualBreakdownSchema>;
export type AddManualBreakdownFormInput = z.input<typeof addManualBreakdownSchema>;

export const completeRunSchema = z.object({
  total_counter_production: z.coerce.number().int().min(1, 'Total production is required'),
  rejection_pcs: z.coerce.number().int().min(0).default(0),
  operator_count: z.coerce.number().int().min(0).default(0),
  contract_labour_count: z.coerce.number().int().min(0).default(0),
  own_labour_count: z.coerce.number().int().min(0).default(0),
  machine_start_reading: optionalNumber,
  machine_stop_reading: optionalNumber,
  utility_units: z.coerce.number().min(0).default(0),
  scrap_carton_value: z.coerce.number().min(0).default(0),
});
export type CompleteRunFormData = z.infer<typeof completeRunSchema>;
export type CompleteRunFormInput = z.input<typeof completeRunSchema>;

export const buyPriceFormSchema = z.object({
  preform_spec_id: z.coerce.number().int().positive('Select a bottle size'),
  supplier_name: z.string().optional().default(''),
  effective_from: z.string().min(1, 'Effective date is required'),
  buy_price: z.coerce.number().positive('Buy price must be > 0'),
  freight_per_bottle: z.coerce.number().min(0).default(0),
  duties_per_bottle: z.coerce.number().min(0).default(0),
  carrying_pct_annual: z.coerce.number().min(0).default(0),
  inventory_days: z.coerce.number().int().min(0).default(30),
  qa_allowance_pct: z.coerce.number().min(0).default(0),
  risk_premium_per_bottle: z.coerce.number().min(0).default(0),
});
export type BuyPriceFormData = z.infer<typeof buyPriceFormSchema>;
export type BuyPriceFormInput = z.input<typeof buyPriceFormSchema>;
