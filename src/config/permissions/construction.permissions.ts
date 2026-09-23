/**
 * Construction projects — the campus's own building work.
 *
 * Nine permissions and no more: the Django app sets `default_permissions = ()`
 * on every model, so there is deliberately no `view_project` beside
 * `can_view_project` to grant by mistake.
 */
export const CONSTRUCTION_MODULE_PREFIX = 'construction_projects';

export const CONSTRUCTION_PERMISSIONS = {
  /** Projects the caller manages or is site in-charge of. */
  VIEW_PROJECT: 'construction_projects.can_view_project',
  /** Every project in the company, attached or not. */
  VIEW_ALL_PROJECTS: 'construction_projects.can_view_all_projects',
  CREATE_PROJECT: 'construction_projects.can_create_project',
  EDIT_PROJECT: 'construction_projects.can_edit_project',
  /** Decides a project's budget and dates, and its revisions. */
  APPROVE_PROJECT: 'construction_projects.can_approve_project',
  LOG_DAILY_WORK: 'construction_projects.can_log_daily_work',
  RECORD_EXPENSE: 'construction_projects.can_record_expense',
  /** Checks the day's payments. A different job from sanctioning a budget, and
   *  usually a different person — the PM, not the director. */
  APPROVE_EXPENSE: 'construction_projects.can_approve_expense',
  CLOSE_PROJECT: 'construction_projects.can_close_project',
} as const;

export type ConstructionPermission =
  (typeof CONSTRUCTION_PERMISSIONS)[keyof typeof CONSTRUCTION_PERMISSIONS];

/** Anybody who may open the approvals queue — either kind of approver. */
export const CONSTRUCTION_REVIEWER_ACCESS = [
  CONSTRUCTION_PERMISSIONS.APPROVE_PROJECT,
  CONSTRUCTION_PERMISSIONS.APPROVE_EXPENSE,
] as const;

/** Anybody who may open the module at all. */
export const CONSTRUCTION_ACCESS = [
  CONSTRUCTION_PERMISSIONS.VIEW_PROJECT,
  CONSTRUCTION_PERMISSIONS.VIEW_ALL_PROJECTS,
] as const;
