import { z } from 'zod';

export const grpoPostItemSchema = z.object({
  po_item_receipt_id: z.number(),
  accepted_qty: z.number().min(0, 'Quantity cannot be negative'),
  unit_price: z.number().min(0, 'Price cannot be negative').optional(),
  tax_code: z.string().optional(),
  gl_account: z.string().optional(),
  variety: z.string().optional(),
});

export const extraChargeSchema = z.object({
  expense_code: z.number({ required_error: 'Expense code is required' }),
  amount: z.number({ required_error: 'Amount is required' }).min(0, 'Amount cannot be negative'),
  remarks: z.string().optional(),
  tax_code: z.string().optional(),
});

export const grpoPostSchema = z
  .object({
    vehicle_entry_id: z.number(),
    po_receipt_id: z.number(),
    items: z.array(grpoPostItemSchema).min(1, 'At least one item is required'),
    branch_id: z.number({ error: 'Branch is required' }),
    warehouse_code: z.string().optional(),
    comments: z.string().optional(),
    vendor_ref: z.string().optional(),
    extra_charges: z.array(extraChargeSchema).optional(),
  })
  .refine((data) => data.items.some((item) => item.accepted_qty > 0), {
    message: 'At least one item must have accepted quantity greater than 0',
    path: ['items'],
  });

export type GRPOPostFormData = z.infer<typeof grpoPostSchema>;
export type ExtraChargeFormData = z.infer<typeof extraChargeSchema>;
