import { describe, it, expect, vi } from 'vitest'

// Mock dependencies to prevent resolution hangs
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const DummyIcon = () => null
vi.mock('lucide-react', () => new Proxy({ __esModule: true }, {
  get: (_t, p) => p === '__esModule' ? true : DummyIcon,
}))

// Mock individual dashboard component files to avoid deep resolution
vi.mock('@/shared/components/dashboard/DashboardHeader', () => ({
  DashboardHeader: () => null,
}))
vi.mock('@/shared/components/dashboard/DashboardLoading', () => ({
  DashboardLoading: () => null,
}))
vi.mock('@/shared/components/dashboard/DashboardError', () => ({
  DashboardError: () => null,
}))
vi.mock('@/shared/components/dashboard/StatusOverviewGrid', () => ({
  StatusOverviewGrid: () => null,
}))
vi.mock('@/shared/components/dashboard/SummaryCard', () => ({
  SummaryCard: () => null,
}))

describe('Dashboard Components Index Exports', () => {
  it('exports all dashboard components', async () => {
    const mod = await import('@/shared/components/dashboard')

    expect(mod.DashboardHeader).toBeDefined()
    expect(mod.DashboardLoading).toBeDefined()
    expect(mod.DashboardError).toBeDefined()
    expect(mod.StatusOverviewGrid).toBeDefined()
    expect(mod.SummaryCard).toBeDefined()
  })
})
