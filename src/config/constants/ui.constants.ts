export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
} as const

export const TABLE_CONFIG = {
  defaultSortOrder: 'desc' as const,
  dateColumns: ['createdAt', 'updatedAt'],
} as const

export const SIDEBAR_CONFIG = {
  collapsedWidth: 64,
  expandedWidth: 256,
  mobileBreakpoint: 768,
} as const

export const TOAST_CONFIG = {
  duration: 5000,
  position: 'bottom-right' as const,
} as const

export const DEBOUNCE_DELAY = {
  search: 300,
  input: 150,
  resize: 100,
} as const
