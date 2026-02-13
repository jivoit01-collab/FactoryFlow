import { z } from 'zod';

export const grpoPostItemSchema = z.object({
  po_item_receipt_id: z.number(),
  accepted_qty: z.number().min(0, 'Quantity cannot be negative'),
});

export const grpoPostSchema = z
  .object({
    vehicle_entry_id: z.number(),
    po_receipt_id: z.number(),
    items: z.array(grpoPostItemSchema).min(1, 'At least one item is required'),
    branch_id: z.number({ error: 'Branch is required' }),
    warehouse_code: z.string().optional(),
    comments: z.string().optional(),
  })
  .refine((data) => data.items.some((item) => item.accepted_qty > 0), {
    message: 'At least one item must have accepted quantity greater than 0',
    path: ['items'],
  });

export type GRPOPostFormData = z.infer<typeof grpoPostSchema>;
