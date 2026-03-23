import { z } from 'zod';

// ============================================================================
// Material Schema
// ============================================================================

export const materialSchema = z.object({
  component_code: z.string().min(1, 'Component code is required'),
  component_name: z.string().min(1, 'Component name is required'),
  required_qty: z.number({ required_error: 'Quantity is required' }).positive('Quantity must be greater than 0'),
  uom: z.string().optional(),
  warehouse_code: z.string().optional(),
});

// ============================================================================
// Create Plan Schema
// ============================================================================

export const createPlanSchema = z
  .object({
    item_code: z.string().min(1, 'Item is required'),
    item_name: z.string().min(1, 'Item name is required'),
    uom: z.string().optional(),
    warehouse_code: z.string().optional(),
    planned_qty: z
      .number({ required_error: 'Planned quantity is required' })
      .positive('Quantity must be greater than 0'),
    target_start_date: z.string().min(1, 'Start date is required'),
    due_date: z.string().min(1, 'Due date is required'),
    branch_id: z.number().nullable().optional(),
    remarks: z.string().optional(),
    materials: z.array(materialSchema).optional(),
  })
  .refine((data) => data.due_date >= data.target_start_date, {
    message: 'Due date must be on or after start date',
    path: ['due_date'],
  });

export type CreatePlanFormData = z.infer<typeof createPlanSchema>;

// ============================================================================
// Update Plan Schema
// ============================================================================

export const updatePlanSchema = z
  .object({
    item_code: z.string().min(1, 'Item is required').optional(),
    item_name: z.string().min(1, 'Item name is required').optional(),
    uom: z.string().optional(),
    warehouse_code: z.string().optional(),
    planned_qty: z.number().positive('Quantity must be greater than 0').optional(),
    target_start_date: z.string().optional(),
    due_date: z.string().optional(),
    branch_id: z.number().nullable().optional(),
    remarks: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.target_start_date && data.due_date) {
        return data.due_date >= data.target_start_date;
      }
      return true;
    },
    {
      message: 'Due date must be on or after start date',
      path: ['due_date'],
    },
  );

export type UpdatePlanFormData = z.infer<typeof updatePlanSchema>;

// ============================================================================
// Weekly Plan Schema
// ============================================================================

export const createWeeklyPlanSchema = z
  .object({
    week_number: z
      .number({ required_error: 'Week number is required' })
      .int()
      .positive('Week number must be positive'),
    week_label: z.string().optional(),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    target_qty: z
      .number({ required_error: 'Target quantity is required' })
      .positive('Quantity must be greater than 0'),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  });

export type CreateWeeklyPlanFormData = z.infer<typeof createWeeklyPlanSchema>;

// ============================================================================
// Daily Entry Schema
// ============================================================================

export const createDailyEntrySchema = z.object({
  production_date: z.string().min(1, 'Production date is required'),
  produced_qty: z
    .number({ required_error: 'Quantity is required' })
    .positive('Quantity must be greater than 0'),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']).nullable().optional(),
  remarks: z.string().optional(),
});

export type CreateDailyEntryFormData = z.infer<typeof createDailyEntrySchema>;
