import { z } from 'zod';

export const createBOMRequestSchema = z.object({
  production_run_id: z.number({ required_error: 'Production run is required' }),
  required_qty: z.string().min(1, 'Required quantity is required'),
  remarks: z.string().optional().default(''),
});

export type CreateBOMRequestFormData = z.infer<typeof createBOMRequestSchema>;

export const rejectBOMRequestSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export type RejectBOMRequestFormData = z.infer<typeof rejectBOMRequestSchema>;

export const createFGReceiptSchema = z.object({
  production_run_id: z.number({ required_error: 'Production run is required' }),
  posting_date: z.string().min(1, 'Posting date is required'),
});

export type CreateFGReceiptFormData = z.infer<typeof createFGReceiptSchema>;
