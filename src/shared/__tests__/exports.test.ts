import { describe, it, expect, vi } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Mock ALL heavy transitive dependencies to prevent resolution hangs
// ═══════════════════════════════════════════════════════════════

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

// Mock each lucide-react icon as a stub component
const DummyIcon = () => null
vi.mock('lucide-react', () => new Proxy({ __esModule: true }, {
  get: (_t, p) => p === '__esModule' ? true : DummyIcon,
}))

vi.mock('@/config/constants', () => ({
  DEBOUNCE_DELAY: { search: 300, input: 150, resize: 100 },
  APP_DEFAULTS: { dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
}))

// Mock ALL individual UI sub-module files to prevent Radix UI resolution
const mkProxy = () => new Proxy({ __esModule: true }, {
  get: (_t: any, p: string) => p === '__esModule' ? true : (() => null),
})
vi.mock('@/shared/components/ui/button', () => mkProxy())
vi.mock('@/shared/components/ui/card', () => mkProxy())
vi.mock('@/shared/components/ui/input', () => mkProxy())
vi.mock('@/shared/components/ui/label', () => mkProxy())
vi.mock('@/shared/components/ui/sheet', () => mkProxy())
vi.mock('@/shared/components/ui/separator', () => mkProxy())
vi.mock('@/shared/components/ui/avatar', () => mkProxy())
vi.mock('@/shared/components/ui/dialog', () => mkProxy())
vi.mock('@/shared/components/ui/dropdown-menu', () => mkProxy())
vi.mock('@/shared/components/ui/tooltip', () => mkProxy())
vi.mock('@/shared/components/ui/badge', () => mkProxy())
vi.mock('@/shared/components/ui/collapsible', () => mkProxy())
vi.mock('@/shared/components/ui/popover', () => mkProxy())
vi.mock('@/shared/components/ui/calendar', () => mkProxy())
vi.mock('@/shared/components/ui/switch', () => mkProxy())
vi.mock('@/shared/components/ui/checkbox', () => mkProxy())
vi.mock('@/shared/components/ui/textarea', () => mkProxy())

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

// Mock ErrorBoundary, PageLoadError, SearchableSelect
vi.mock('@/shared/components/ErrorBoundary', () => ({
  ErrorBoundary: () => null,
}))
vi.mock('@/shared/components/PageLoadError', () => ({
  PageLoadError: () => null,
}))
vi.mock('@/shared/components/SearchableSelect', () => ({
  SearchableSelect: () => null,
}))

// ═══════════════════════════════════════════════════════════════
// Dashboard Component Exports
// ═══════════════════════════════════════════════════════════════

describe('Dashboard Component Exports', () => {
  it('exports all dashboard components from dashboard/index', async () => {
    const mod = await import('@/shared/components/dashboard')

    expect(mod.DashboardHeader).toBeDefined()
    expect(mod.DashboardLoading).toBeDefined()
    expect(mod.DashboardError).toBeDefined()
    expect(mod.StatusOverviewGrid).toBeDefined()
    expect(mod.SummaryCard).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// Shared Components Index Structure Verification
// (Dynamic import of @/shared/components hangs due to deep Radix UI
// dependency chain through export * from './ui'. Instead, we verify
// the barrel file structure via file content analysis.)
// ═══════════════════════════════════════════════════════════════

describe('Shared Components Index structure', () => {
  it('shared/components/index.ts contains expected re-export statements', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const content = readFileSync(
      resolve(process.cwd(), 'src/shared/components/index.ts'),
      'utf-8',
    )

    // Verify dashboard re-export
    expect(content).toContain("export * from './dashboard'")
    // Verify UI re-export
    expect(content).toContain("export * from './ui'")
    // Verify ErrorBoundary
    expect(content).toContain('ErrorBoundary')
    // Verify PageLoadError
    expect(content).toContain('PageLoadError')
    // Verify SearchableSelect
    expect(content).toContain('SearchableSelect')
  })
})

// ═══════════════════════════════════════════════════════════════
// Hooks Exports
// ═══════════════════════════════════════════════════════════════

describe('Hooks Exports', () => {
  it('exports all hooks from hooks/index', async () => {
    const mod = await import('@/shared/hooks')

    expect(mod.useCurrentTime).toBeDefined()
    expect(typeof mod.useCurrentTime).toBe('function')
    expect(mod.getCurrentTimeHHMM).toBeDefined()
    expect(typeof mod.getCurrentTimeHHMM).toBe('function')
    expect(mod.getTimeFromDatetime).toBeDefined()
    expect(typeof mod.getTimeFromDatetime).toBe('function')
    expect(mod.useEditFormState).toBeDefined()
    expect(typeof mod.useEditFormState).toBe('function')
    expect(mod.useDebounce).toBeDefined()
    expect(typeof mod.useDebounce).toBe('function')
    expect(mod.useLocalStorage).toBeDefined()
    expect(typeof mod.useLocalStorage).toBe('function')
    expect(mod.useScrollToError).toBeDefined()
    expect(typeof mod.useScrollToError).toBe('function')
    expect(mod.useFormErrors).toBeDefined()
    expect(typeof mod.useFormErrors).toBe('function')
  })
})

// ═══════════════════════════════════════════════════════════════
// Utils Exports
// ═══════════════════════════════════════════════════════════════

describe('Utils Exports', () => {
  it('exports cn utility', async () => {
    const { cn } = await import('@/shared/utils')
    expect(cn).toBeDefined()
    expect(typeof cn).toBe('function')
  })

  it('exports all error utility functions', async () => {
    const mod = await import('@/shared/utils')

    expect(mod.getErrorMessage).toBeDefined()
    expect(mod.getErrorDetailLower).toBeDefined()
    expect(mod.isNotFoundError).toBeDefined()
    expect(mod.isServerError).toBeDefined()
    expect(mod.isUnauthorizedError).toBeDefined()
    expect(mod.isForbiddenError).toBeDefined()
    expect(mod.isValidationError).toBeDefined()
    expect(mod.getSmartErrorMessage).toBeDefined()
    expect(mod.getFieldErrors).toBeDefined()
    expect(mod.getServerErrorMessage).toBeDefined()
    expect(mod.getUnauthorizedErrorMessage).toBeDefined()
    expect(mod.getForbiddenErrorMessage).toBeDefined()
    expect(mod.getNotFoundErrorMessage).toBeDefined()
  })

  it('exports all form condition utility functions', async () => {
    const mod = await import('@/shared/utils')

    expect(mod.isReadOnly).toBeDefined()
    expect(mod.canPerformAction).toBeDefined()
    expect(mod.isEditingAllowed).toBeDefined()
    expect(mod.canModifyItem).toBeDefined()
    expect(mod.isEntryCompleted).toBeDefined()
    expect(mod.isEntryDraft).toBeDefined()
    expect(mod.isEntryInProgress).toBeDefined()
    expect(mod.canEditEntry).toBeDefined()
    expect(mod.hasNoData).toBeDefined()
    expect(mod.hasDataAvailable).toBeDefined()
  })

  it('exports storage and format utilities', async () => {
    const mod = await import('@/shared/utils')

    expect(mod.storage).toBeDefined()
    expect(mod.sessionStorage).toBeDefined()
    expect(mod.formatDate).toBeDefined()
    expect(mod.formatTime).toBeDefined()
    expect(mod.formatDateTime).toBeDefined()
    expect(mod.formatNumber).toBeDefined()
    expect(mod.formatCurrency).toBeDefined()
  })
})
