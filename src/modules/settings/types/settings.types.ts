// ============================================================================
// Action Points
// ============================================================================

export interface ActionPoint {
  key: string;
  label: string;
  category: string;
  description: string;
  context_keys: string[];
}

export interface ActionPointsResponse {
  categories: Record<string, ActionPoint[]>;
}

// ============================================================================
// Condition Types
// ============================================================================

export interface ConditionParamSchema {
  name: string;
  type: 'enum' | 'number' | 'boolean' | 'time' | 'enum_multi';
  label: string;
  options?: string[];
  required?: boolean;
  default_value?: unknown;
  help_text?: string;
}

export interface ConditionType {
  key: string;
  label: string;
  category: string;
  description: string;
  params_schema: ConditionParamSchema[];
  compatible_actions: string[];
}

// ============================================================================
// Workflow Rules
// ============================================================================

export interface WorkflowRule {
  id: number;
  name: string;
  description: string;
  action_key: string;
  condition_type: string;
  params: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  modified_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRuleCreate {
  name: string;
  description?: string;
  action_key: string;
  condition_type: string;
  params: Record<string, unknown>;
  is_active?: boolean;
  sort_order?: number;
}

export interface WorkflowRuleUpdate {
  name?: string;
  description?: string;
  params?: Record<string, unknown>;
  is_active?: boolean;
  sort_order?: number;
}

// ============================================================================
// Rule Check
// ============================================================================

export interface RuleCheckResult {
  rule_id: number;
  rule_name: string;
  condition_type: string;
  passed: boolean;
  description: string;
}

// ============================================================================
// Audit Log
// ============================================================================

export type AuditAction = 'CREATED' | 'UPDATED' | 'TOGGLED' | 'DELETED';

export interface RuleAuditLog {
  id: number;
  rule: number;
  rule_name: string;
  action: AuditAction;
  old_value: Record<string, unknown>;
  new_value: Record<string, unknown>;
  changed_by_name: string | null;
  changed_at: string;
  reason: string;
}
