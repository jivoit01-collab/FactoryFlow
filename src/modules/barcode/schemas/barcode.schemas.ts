import { z } from 'zod';

export const generateBoxesSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  item_name: z.string().optional().default(''),
  batch_number: z.string().min(1, 'Batch number is required'),
  qty: z.coerce.number().positive('Quantity must be positive'),
  box_count: z.coerce.number().int().min(1).max(500, 'Max 500 boxes at once'),
  uom: z.string().optional().default(''),
  mfg_date: z.string().min(1, 'Manufacturing date is required'),
  exp_date: z.string().min(1, 'Expiry date is required'),
  warehouse: z.string().min(1, 'Warehouse is required'),
  production_line: z.string().optional().default(''),
  production_run_id: z.coerce.number().int().optional(),
});

export const createPalletSchema = z.object({
  box_ids: z.array(z.number().int()).min(1, 'Select at least one box'),
  warehouse: z.string().min(1, 'Warehouse is required'),
  production_line: z.string().optional().default(''),
  production_run_id: z.coerce.number().int().optional(),
});

export const voidSchema = z.object({
  reason: z.string().optional().default(''),
});

export type GenerateBoxesFormData = z.infer<typeof generateBoxesSchema>;
export type CreatePalletFormData = z.infer<typeof createPalletSchema>;
export type VoidFormData = z.infer<typeof voidSchema>;
