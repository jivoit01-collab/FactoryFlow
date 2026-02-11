import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — UnitSelect (FCV)
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/components/UnitSelect.tsx'),
  'utf-8',
)

describe('UnitSelect', () => {
  // ─── Imports ────────────────────────────────────────────────

  it('imports useState from react', () => {
    expect(content).toContain("import { useState } from 'react'")
  })

  it('imports useUnitChoices hook', () => {
    expect(content).toContain('useUnitChoices')
  })

  it('imports SearchableSelect from shared components', () => {
    expect(content).toContain("import { SearchableSelect } from '@/shared/components'")
  })

  it('imports UnitChoice type', () => {
    expect(content).toContain("import type { UnitChoice } from '../api/maintenance/maintenance.api'")
  })

  // ─── Props Interface ──────────────────────────────────────

  it('defines UnitSelectProps interface', () => {
    expect(content).toContain('interface UnitSelectProps')
  })

  it('accepts onChange callback with unitId and unitName', () => {
    expect(content).toContain('onChange: (unitId: string, unitName: string) => void')
  })

  it('accepts initialDisplayText prop', () => {
    expect(content).toContain('initialDisplayText?: string')
  })

  it('has default placeholder', () => {
    expect(content).toContain("placeholder = 'Select unit'")
  })

  // ─── Component Structure ──────────────────────────────────

  it('uses isDropdownOpen state for lazy loading', () => {
    expect(content).toContain('const [isDropdownOpen, setIsDropdownOpen] = useState(false)')
  })

  it('passes isDropdownOpen to useUnitChoices', () => {
    expect(content).toContain('useUnitChoices(isDropdownOpen)')
  })

  it('renders SearchableSelect with UnitChoice generic', () => {
    expect(content).toContain('SearchableSelect<UnitChoice>')
  })

  it('uses unit-select as inputId', () => {
    expect(content).toContain("inputId=\"unit-select\"")
  })

  it('passes units directly without filtering', () => {
    expect(content).toContain('items={units}')
  })

  // ─── Callbacks ────────────────────────────────────────────

  it('calls onChange with unit id toString and name on item select', () => {
    expect(content).toContain('onChange(unit.id.toString(), unit.name)')
  })

  it('calls onChange with empty strings on clear', () => {
    expect(content).toContain("onChange('', '')")
  })

  it('uses getItemKey with unit id', () => {
    expect(content).toContain('getItemKey={(u) => u.id}')
  })

  it('uses getItemLabel with unit name', () => {
    expect(content).toContain('getItemLabel={(u) => u.name}')
  })

  // ─── Display Texts ────────────────────────────────────────

  it('shows loading text for units', () => {
    expect(content).toContain('loadingText="Loading units..."')
  })

  it('shows empty text when no units', () => {
    expect(content).toContain('emptyText="No units available"')
  })

  it('shows not found text when search has no results', () => {
    expect(content).toContain('notFoundText="No units found"')
  })
})
