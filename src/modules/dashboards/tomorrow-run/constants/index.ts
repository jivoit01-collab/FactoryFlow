/**
 * Tomorrow's run — who sees it, and where its API lives.
 *
 * The three rights are declared in factory_app `tomorrow_run` (see its
 * `permissions.py`). Either of the two working rights also opens the page,
 * matching the API: a right to pick without the right to see would be a
 * broken screen.
 */
export const TOMORROW_RUN_PERMISSIONS = {
  VIEW: 'tomorrow_run.can_view_tomorrow_run',
  PICK: 'tomorrow_run.can_pick_tomorrow_run',
  MANAGE: 'tomorrow_run.can_manage_tomorrow_run',
} as const;

export const TOMORROW_RUN_VIEW_PERMISSIONS: readonly string[] = [
  TOMORROW_RUN_PERMISSIONS.VIEW,
  TOMORROW_RUN_PERMISSIONS.PICK,
  TOMORROW_RUN_PERMISSIONS.MANAGE,
];

export const TOMORROW_RUN_ENDPOINTS = {
  PLAN: '/tomorrow-run/plan/',
  CHOICE: '/tomorrow-run/choice/',
  REBUILD: '/tomorrow-run/rebuild/',
  SHEETS: '/tomorrow-run/sheets/',
} as const;

/** The plan is read once at 7 pm and stands all day; a minute is plenty. */
export const TOMORROW_RUN_STALE_TIME = 60_000;
