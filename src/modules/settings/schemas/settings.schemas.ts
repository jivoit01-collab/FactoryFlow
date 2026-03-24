import { z } from 'zod';

// ============================================================================
// Create Rule Schema
// ============================================================================

export const createRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(200),
  description: z.string().optional().default(''),
  action_key: z.string().min(1, 'Action point is required'),
  condition_type: z.string().min(1, 'Condition type is required'),
  params: z.record(z.unknown()).default({}),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export type CreateRuleFormData = z.infer<typeof createRuleSchema>;

// ============================================================================
// Update Rule Schema
// ============================================================================

export const updateRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(200),
  description: z.string().optional().default(''),
  params: z.record(z.unknown()).default({}),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export type UpdateRuleFormData = z.infer<typeof updateRuleSchema>;
