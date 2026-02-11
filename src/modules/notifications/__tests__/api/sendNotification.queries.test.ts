// ═══════════════════════════════════════════════════════════════
// Send Notification Queries Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that all React Query hooks for notifications
// are exported as defined functions and wired correctly.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

const mockUseQuery = vi.fn(() => ({ data: undefined, isLoading: false }))
const mockUseMutation = vi.fn(() => ({ mutate: vi.fn(), isPending: false }))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}))

vi.mock('../../api/users.api', () => ({
  usersApi: { getUsers: vi.fn() },
}))

vi.mock('../../api/sendNotification.api', () => ({
  sendNotificationApi: { send: vi.fn() },
}))

import {
  NOTIFICATION_QUERY_KEYS,
  useCompanyUsers,
  useSendNotification,
} from '../../api/sendNotification.queries'

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION_QUERY_KEYS
// ═══════════════════════════════════════════════════════════════

describe('NOTIFICATION_QUERY_KEYS', () => {
  it('is defined', () => {
    expect(NOTIFICATION_QUERY_KEYS).toBeDefined()
  })

  it('has users key equal to ["company-users"]', () => {
    expect(NOTIFICATION_QUERY_KEYS.users).toEqual(['company-users'])
  })
})

// ═══════════════════════════════════════════════════════════════
// useCompanyUsers hook
// ═══════════════════════════════════════════════════════════════

describe('useCompanyUsers', () => {
  it('is exported as a function', () => {
    expect(typeof useCompanyUsers).toBe('function')
  })

  it('calls useQuery', () => {
    mockUseQuery.mockClear()
    useCompanyUsers()
    expect(mockUseQuery).toHaveBeenCalled()
  })

  it('passes queryKey matching NOTIFICATION_QUERY_KEYS.users', () => {
    mockUseQuery.mockClear()
    useCompanyUsers()
    const opts = mockUseQuery.mock.calls[0][0]
    expect(opts.queryKey).toEqual(['company-users'])
  })

  it('passes a queryFn', () => {
    mockUseQuery.mockClear()
    useCompanyUsers()
    const opts = mockUseQuery.mock.calls[0][0]
    expect(typeof opts.queryFn).toBe('function')
  })

  it('passes staleTime of 300000 (5 minutes)', () => {
    mockUseQuery.mockClear()
    useCompanyUsers()
    const opts = mockUseQuery.mock.calls[0][0]
    expect(opts.staleTime).toBe(300000)
  })
})

// ═══════════════════════════════════════════════════════════════
// useSendNotification hook
// ═══════════════════════════════════════════════════════════════

describe('useSendNotification', () => {
  it('is exported as a function', () => {
    expect(typeof useSendNotification).toBe('function')
  })

  it('calls useMutation', () => {
    mockUseMutation.mockClear()
    useSendNotification()
    expect(mockUseMutation).toHaveBeenCalled()
  })

  it('passes a mutationFn', () => {
    mockUseMutation.mockClear()
    useSendNotification()
    const opts = mockUseMutation.mock.calls[0][0]
    expect(typeof opts.mutationFn).toBe('function')
  })
})
