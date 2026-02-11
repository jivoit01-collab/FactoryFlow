import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — ConstructionCategorySelect (FCV)
// ═══════════════════════════════════════════════════════════════
// Component imports from React Query hooks and shared components
// which hang Vite's module graph. File-content verification
// avoids this entirely.
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/components/ConstructionCategorySelect.tsx'),
  'utf-8',
)

describe('ConstructionCategorySelect', () => {
  // ─── Imports ────────────────────────────────────────────────

  it('imports useState from react', () => {
    expect(content).toContain("import { useState } from 'react'")
  })

  it('imports useConstructionCategories hook', () => {
    expect(content).toContain('useConstructionCategories')
  })

  it('imports SearchableSelect from shared components', () => {
    expect(content).toContain("import { SearchableSelect } from '@/shared/components'")
  })

  it('imports ConstructionCategory type', () => {
    expect(content).toContain('ConstructionCategory')
  })

  // ─── Props Interface ──────────────────────────────────────

  it('defines ConstructionCategorySelectProps interface', () => {
    expect(content).toContain('interface ConstructionCategorySelectProps')
  })

  it('accepts value prop', () => {
    expect(content).toContain('value?: string')
  })

  it('accepts onChange callback with categoryId and categoryName', () => {
    expect(content).toContain('onChange: (categoryId: string, categoryName: string) => void')
  })

  it('accepts placeholder prop with default', () => {
    expect(content).toContain("placeholder = 'Select material category'")
  })

  it('accepts disabled prop with default false', () => {
    expect(content).toContain('disabled = false')
  })

  it('accepts error prop', () => {
    expect(content).toContain('error?: string')
  })

  it('accepts label prop', () => {
    expect(content).toContain('label?: string')
  })

  it('accepts required prop with default false', () => {
    expect(content).toContain('required = false')
  })

  it('accepts initialDisplayText prop for edit mode', () => {
    expect(content).toContain('initialDisplayText?: string')
  })

  // ─── Component Structure ──────────────────────────────────

  it('uses isDropdownOpen state for lazy loading', () => {
    expect(content).toContain('const [isDropdownOpen, setIsDropdownOpen] = useState(false)')
  })

  it('passes isDropdownOpen to useConstructionCategories', () => {
    expect(content).toContain('useConstructionCategories(isDropdownOpen)')
  })

  it('renders SearchableSelect with ConstructionCategory generic', () => {
    expect(content).toContain('SearchableSelect<ConstructionCategory>')
  })

  it('uses construction-category-select as inputId', () => {
    expect(content).toContain("inputId=\"construction-category-select\"")
  })

  // ─── Callbacks ────────────────────────────────────────────

  it('calls onChange with category id and name on item select', () => {
    expect(content).toContain('onChange(category.id.toString(), category.category_name)')
  })

  it('calls onChange with empty strings on clear', () => {
    expect(content).toContain("onChange('', '')")
  })

  it('uses getItemKey with category id', () => {
    expect(content).toContain('getItemKey={(c) => c.id}')
  })

  it('uses getItemLabel with category_name', () => {
    expect(content).toContain('getItemLabel={(c) => c.category_name}')
  })

  it('passes onOpenChange to control dropdown state', () => {
    expect(content).toContain('onOpenChange={setIsDropdownOpen}')
  })

  // ─── Display Texts ────────────────────────────────────────

  it('shows loading text for categories', () => {
    expect(content).toContain('loadingText="Loading categories..."')
  })

  it('shows empty text when no categories', () => {
    expect(content).toContain('emptyText="No categories available"')
  })

  it('shows not found text when search has no results', () => {
    expect(content).toContain('notFoundText="No categories found"')
  })

  it('passes defaultDisplayText from initialDisplayText prop', () => {
    expect(content).toContain('defaultDisplayText={initialDisplayText}')
  })
})
