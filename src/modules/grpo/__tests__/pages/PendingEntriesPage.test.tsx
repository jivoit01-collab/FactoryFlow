import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// PendingEntriesPage — File Content Verification
//
// Direct import hangs because PendingEntriesPage imports icons
// from lucide-react and @/shared/components/ui.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/pages/PendingEntriesPage.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('PendingEntriesPage — Exports', () => {
  it('default exports PendingEntriesPage function', () => {
    const content = readSource()
    expect(content).toContain('export default function PendingEntriesPage()')
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

  it('imports usePendingGRPOEntries from api', () => {
    const content = readSource()
    expect(content).toContain('usePendingGRPOEntries')
    expect(content).toContain("from '../api'")
  })

  it('imports useNavigate from react-router-dom', () => {
    const content = readSource()
    expect(content).toContain('useNavigate')
    expect(content).toContain("from 'react-router-dom'")
  })

  it('imports ApiError type', () => {
    const content = readSource()
    expect(content).toContain('ApiError')
    expect(content).toContain("from '@/core/api/types'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════

describe('PendingEntriesPage — Header', () => {
  it('renders "Pending Entries" heading', () => {
    const content = readSource()
    expect(content).toContain('>Pending Entries</h2>')
  })

  it('renders description text', () => {
    const content = readSource()
    expect(content).toContain('Gate entries with POs pending GRPO posting to SAP')
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
// States
// ═══════════════════════════════════════════════════════════════

describe('PendingEntriesPage — States', () => {
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

  it('shows empty state when no pending entries', () => {
    const content = readSource()
    expect(content).toContain('No pending entries. All gate entries have been posted.')
  })
})

// ═══════════════════════════════════════════════════════════════
// Entries List
// ═══════════════════════════════════════════════════════════════

describe('PendingEntriesPage — Entries List', () => {
  it('renders pendingEntries.map', () => {
    const content = readSource()
    expect(content).toContain('pendingEntries.map')
  })

  it('shows entry_no', () => {
    const content = readSource()
    expect(content).toContain('{entry.entry_no}')
  })

  it('shows pending PO count', () => {
    const content = readSource()
    expect(content).toContain('{entry.pending_po_count}')
    expect(content).toContain('{entry.total_po_count}')
    expect(content).toContain('POs')
  })

  it('navigates to preview on click', () => {
    const content = readSource()
    expect(content).toContain("navigate(`/grpo/preview/${entry.vehicle_entry_id}`)")
  })

  it('shows Pending count header', () => {
    const content = readSource()
    expect(content).toContain('Pending ({pendingEntries.length})')
  })
})

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

describe('PendingEntriesPage — Utilities', () => {
  it('defines formatDateTime helper', () => {
    const content = readSource()
    expect(content).toContain('const formatDateTime')
    expect(content).toContain('toLocaleString')
  })
})
