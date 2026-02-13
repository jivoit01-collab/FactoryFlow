export const Role = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  OPERATOR: 'operator',
  QUALITY_INSPECTOR: 'quality_inspector',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Administrator',
  [Role.SUPERVISOR]: 'Supervisor',
  [Role.OPERATOR]: 'Operator',
  [Role.QUALITY_INSPECTOR]: 'Quality Inspector',
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.ADMIN]: 100,
  [Role.SUPERVISOR]: 75,
  [Role.QUALITY_INSPECTOR]: 50,
  [Role.OPERATOR]: 25,
};
