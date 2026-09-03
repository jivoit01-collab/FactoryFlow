import { z } from 'zod';

/** Reject requires a non-trivial reason (the backend also enforces this server-side). */
export const rejectInvoiceSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .min(3, 'Please enter a reason (at least 3 characters).')
    .max(1000, 'Reason is too long.'),
});

export type RejectInvoiceFormData = z.infer<typeof rejectInvoiceSchema>;
