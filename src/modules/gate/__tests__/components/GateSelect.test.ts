import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — GateSelect (FCV)
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/components/GateSelect.tsx'),
  'utf-8',
)

describe('GateSelect', () => {
  // ─── Imports ────────────────────────────────────────────────

  it('imports useState and useMemo from react', () => {
    expect(content).toContain("import { useState, useMemo } from 'react'")
  })

  it('imports useGates hook', () => {
    expect(content).toContain('useGates')
  })

  it('imports SearchableSelect from shared components', () => {
    expect(content).toContain("import { SearchableSelect } from '@/shared/components'")
  })

  it('imports Gate type', () => {
    expect(content).toContain("import type { Gate } from '../api/personGateIn/personGateIn.api'")
  })

  // ─── Props Interface ──────────────────────────────────────

  it('defines GateSelectProps interface', () => {
    expect(content).toContain('interface GateSelectProps')
  })

  it('accepts onChange callback with nullable gateId and gateName', () => {
    expect(content).toContain('onChange: (gateId: number | null, gateName: string) => void')
  })

  it('accepts activeOnly prop with default true', () => {
    expect(content).toContain('activeOnly = true')
  })

  it('does not have initialDisplayText prop (not needed for gate)', () => {
    expect(content).not.toContain('initialDisplayText')
  })

  // ─── Active Filtering ─────────────────────────────────────

  it('filters gates by is_active when activeOnly is true', () => {
    expect(content).toContain('activeOnly ? gates.filter((g) => g.is_active) : gates')
  })

  it('memoizes filtered gates', () => {
    expect(content).toContain('useMemo(')
    expect(content).toContain('[gates, activeOnly]')
  })

  it('passes filteredGates to SearchableSelect items', () => {
    expect(content).toContain('items={filteredGates}')
  })

  // ─── Component Structure ──────────────────────────────────

  it('renders SearchableSelect with Gate generic', () => {
    expect(content).toContain('SearchableSelect<Gate>')
  })

  it('uses gate-select as inputId', () => {
    expect(content).toContain("inputId=\"gate-select\"")
  })

  // ─── Callbacks ────────────────────────────────────────────

  it('calls onChange with gate id and name on item select', () => {
    expect(content).toContain('onChange(gate.id, gate.name)')
  })

  it('calls onChange with null and empty string on clear', () => {
    expect(content).toContain("onChange(null, '')")
  })

  it('uses getItemKey with gate id', () => {
    expect(content).toContain('getItemKey={(g) => g.id}')
  })

  it('uses getItemLabel with gate name', () => {
    expect(content).toContain('getItemLabel={(g) => g.name}')
  })

  // ─── Display Texts ────────────────────────────────────────

  it('shows loading text for gates', () => {
    expect(content).toContain('loadingText="Loading gates..."')
  })

  it('shows empty text when no gates', () => {
    expect(content).toContain('emptyText="No gates available"')
  })

  it('shows not found text when search has no results', () => {
    expect(content).toContain('notFoundText="No gates found"')
  })
})
