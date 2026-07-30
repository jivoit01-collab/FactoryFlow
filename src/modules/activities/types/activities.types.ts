/**
 * Activity Center types — mirror of the backend `activity_center` serializers.
 */

/**
 * How a pending job is attributed.
 * - `OWNED`  — the record names this user; nobody else will do it.
 * - `QUEUE`  — a shared backlog for everyone holding the permission; the first to
 *              act clears it for all of them.
 */
export type ActivityMode = 'OWNED' | 'QUEUE';

export interface PendingActivity {
  source_key: string;
  label: string;
  module: string;
  mode: ActivityMode;
  permission: string;
  record_id: number;
  reference: string | null;
  status: string | null;
  since: string | null;
  age_days: number | null;
  is_overdue: boolean;
  /** Frontend route for the record, or null when the module has no detail page. */
  url: string | null;
}

export interface CompletedActivity {
  source_key: string;
  label: string;
  module: string;
  record_id: number;
  reference: string | null;
  status: string | null;
  completed_at: string | null;
  url: string | null;
}

export interface ModuleBreakdown {
  module: string;
  pending: number;
  overdue: number;
  completed: number;
}

export interface ActivitySummary {
  pending: number;
  overdue: number;
  owned: number;
  queued: number;
  completed: number;
  since: string;
  modules: ModuleBreakdown[];
}

export interface UserActivityRow {
  user_id: number;
  full_name: string;
  email: string;
  employee_code: string;
  is_superuser: boolean;
  /** Jobs assigned to this user alone. */
  owned_pending: number;
  owned_overdue: number;
  /** Shared-queue jobs — also counted for every other holder, so never sum this column. */
  queue_pending: number;
  completed: number;
}

export interface AllUsersActivity {
  since: string;
  users: UserActivityRow[];
}

export interface UserActivityDetail {
  user: {
    user_id: number;
    full_name: string;
    email: string;
    employee_code: string;
    groups: string[];
  };
  summary: ActivitySummary;
  pending: PendingActivity[];
  completed: CompletedActivity[];
}

export interface ActivityDefinition {
  source_key: string;
  label: string;
  module: string;
  mode: ActivityMode;
  permission: string;
  model: string;
  overdue_after_days: number;
  /** True when the signed-in user holds the permission for this job. */
  is_mine: boolean;
}
