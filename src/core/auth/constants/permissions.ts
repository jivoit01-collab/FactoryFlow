import { Role } from './roles'

export const Permission = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',

  // Gate In
  VIEW_GATE_IN: 'view_gate_in',
  CREATE_GATE_IN: 'create_gate_in',
  EDIT_GATE_IN: 'edit_gate_in',
  DELETE_GATE_IN: 'delete_gate_in',

  // Quality Check
  VIEW_QUALITY_CHECK: 'view_quality_check',
  CREATE_QUALITY_CHECK: 'create_quality_check',
  EDIT_QUALITY_CHECK: 'edit_quality_check',
  DELETE_QUALITY_CHECK: 'delete_quality_check',

  // Users (Admin only)
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),

  [Role.SUPERVISOR]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_GATE_IN,
    Permission.CREATE_GATE_IN,
    Permission.EDIT_GATE_IN,
    Permission.VIEW_QUALITY_CHECK,
    Permission.CREATE_QUALITY_CHECK,
    Permission.EDIT_QUALITY_CHECK,
  ],

  [Role.OPERATOR]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_GATE_IN,
    Permission.CREATE_GATE_IN,
    Permission.EDIT_GATE_IN,
  ],

  [Role.QUALITY_INSPECTOR]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_GATE_IN,
    Permission.VIEW_QUALITY_CHECK,
    Permission.CREATE_QUALITY_CHECK,
    Permission.EDIT_QUALITY_CHECK,
  ],
}
