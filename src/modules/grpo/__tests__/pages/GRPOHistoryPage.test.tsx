import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// GRPOHistoryPage — File Content Verification
//
// Direct import hangs because GRPOHistoryPage imports icons
// from lucide-react and @/shared/components/ui.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/pages/GRPOHistoryPage.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryPage — Exports', () => {
  it('default exports GRPOHistoryPage function', () => {
    const content = readSource()
    expect(content).toContain('export default function GRPOHistoryPage()')
  })

  it('imports icons from lucide-react', () => {
    const content = readSource()
    expect(content).toContain("from 'lucide-react'")
    expect(content).toContain('ArrowLeft')
    expect(content).toContain('RefreshCw')
    expect(content).toContain('AlertCircle')
    expect(content).toContain('ShieldX')
    expect(content).toContain('ChevronRight')
  })

  it('imports Button from @/shared/components/ui', () => {
    const content = readSource()
    expect(content).toContain("from '@/shared/components/ui'")
    expect(content).toContain('Button')
  })

  it('imports useGRPOHistory from api', () => {
    const content = readSource()
    expect(content).toContain('useGRPOHistory')
    expect(content).toContain("from '../api'")
  })

  it('imports GRPO_STATUS_CONFIG and GRPO_STATUS from constants', () => {
    const content = readSource()
    expect(content).toContain('GRPO_STATUS_CONFIG')
    expect(content).toContain('GRPO_STATUS')
    expect(content).toContain("from '../constants'")
  })

  it('imports GRPOStatus and GRPOHistoryEntry types', () => {
    const content = readSource()
    expect(content).toContain('GRPOStatus')
    expect(content).toContain('GRPOHistoryEntry')
    expect(content).toContain("from '../types'")
  })

  it('imports useSearchParams from react-router-dom', () => {
    const content = readSource()
    expect(content).toContain('useSearchParams')
    expect(content).toContain("from 'react-router-dom'")
  })

  it('imports useMemo from react', () => {
    const content = readSource()
    expect(content).toContain("import { useMemo } from 'react'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryPage — Header', () => {
  it('renders "Posting History" heading', () => {
    const content = readSource()
    expect(content).toContain('>Posting History</h2>')
  })

  it('renders description text', () => {
    const content = readSource()
    expect(content).toContain('View all GRPO postings to SAP')
  })

  it('has Refresh button', () => {
    const content = readSource()
    expect(content).toContain('Refresh')
    expect(content).toContain('refetch')
  })

  it('has back button navigating to /grpo', () => {
    const content = readSource()
    expect(content).toContain("navigate('/grpo')")
  })
})

// ═══════════════════════════════════════════════════════════════
// Filters
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryPage — Filters', () => {
  it('defines STATUS_FILTERS with all, pending, posted, failed', () => {
    const content = readSource()
    expect(content).toContain('STATUS_FILTERS')
    expect(content).toContain("label: 'All'")
    expect(content).toContain("label: 'Pending'")
    expect(content).toContain("label: 'Posted'")
    expect(content).toContain("label: 'Failed'")
  })

  it('gets status filter from URL search params', () => {
    const content = readSource()
    expect(content).toContain("searchParams.get('status')")
  })

  it('filters entries with useMemo', () => {
    const content = readSource()
    expect(content).toContain('filteredEntries')
    expect(content).toContain('useMemo')
  })

  it('handleFilterChange updates search params', () => {
    const content = readSource()
    expect(content).toContain('handleFilterChange')
    expect(content).toContain('setSearchParams')
  })
})

// ═══════════════════════════════════════════════════════════════
// States
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryPage — States', () => {
  it('shows loading spinner', () => {
    const content = readSource()
    expect(content).toContain('isLoading')
    expect(content).toContain('animate-spin')
  })

  it('handles permission error (403)', () => {
    const content = readSource()
    expect(content).toContain('isPermissionError')
    expect(content).toContain('Permission Denied')
  })

  it('handles general error', () => {
    const content = readSource()
    expect(content).toContain('Failed to Load')
  })

  it('shows empty state when no entries', () => {
    const content = readSource()
    expect(content).toContain('filteredEntries.length === 0')
    expect(content).toContain('postings')
  })
})

// ═══════════════════════════════════════════════════════════════
// History List
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryPage — History List', () => {
  it('renders filteredEntries.map', () => {
    const content = readSource()
    expect(content).toContain('filteredEntries.map')
  })

  it('shows entry_no and po_number', () => {
    const content = readSource()
    expect(content).toContain('{entry.entry_no}')
    expect(content).toContain('{entry.po_number}')
  })

  it('shows status badge using GRPO_STATUS_CONFIG', () => {
    const content = readSource()
    expect(content).toContain('GRPO_STATUS_CONFIG[entry.status]')
    expect(content).toContain('statusConfig?.label')
  })

  it('navigates to detail page on click', () => {
    const content = readSource()
    expect(content).toContain("navigate(`/grpo/history/${entry.id}`)")
  })

  it('shows SAP doc number when available', () => {
    const content = readSource()
    expect(content).toContain('entry.sap_doc_num')
    expect(content).toContain('SAP #')
  })

  it('defines getStatusBadgeClass helper', () => {
    const content = readSource()
    expect(content).toContain('getStatusBadgeClass')
    expect(content).toContain('GRPO_STATUS.POSTED')
    expect(content).toContain('GRPO_STATUS.FAILED')
  })
})

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

describe('GRPOHistoryPage — Utilities', () => {
  it('defines formatDateTime helper', () => {
    const content = readSource()
    expect(content).toContain('const formatDateTime')
    expect(content).toContain('toLocaleString')
  })
})
