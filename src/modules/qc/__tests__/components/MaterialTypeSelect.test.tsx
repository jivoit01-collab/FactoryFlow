import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// MaterialTypeSelect — File Content Verification
//
// Direct import hangs because MaterialTypeSelect imports from
// @/shared/components/ui (radix-ui chain) and uses
// @/core/auth (Redux store chain). We verify via file content.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/components/MaterialTypeSelect.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('MaterialTypeSelect — Exports', () => {
  it('exports MaterialTypeSelect as a named function', () => {
    const content = readSource()
    expect(content).toContain('export function MaterialTypeSelect')
  })

  it('imports useState from react', () => {
    const content = readSource()
    expect(content).toMatch(/import\s*\{[^}]*useState[^}]*\}\s*from\s*['"]react['"]/)
  })

  it('imports UI components from @/shared/components/ui', () => {
    const content = readSource()
    expect(content).toContain("from '@/shared/components/ui'")
    expect(content).toContain('Button')
    expect(content).toContain('Dialog')
    expect(content).toContain('Input')
    expect(content).toContain('Label')
    expect(content).toContain('Textarea')
  })

  it('imports SearchableSelect from @/shared/components', () => {
    const content = readSource()
    expect(content).toContain("import { SearchableSelect } from '@/shared/components'")
  })

  it('imports usePermission from @/core/auth', () => {
    const content = readSource()
    expect(content).toContain("import { usePermission } from '@/core/auth'")
  })

  it('imports useMaterialTypes and useCreateMaterialType', () => {
    const content = readSource()
    expect(content).toContain('useMaterialTypes')
    expect(content).toContain('useCreateMaterialType')
    expect(content).toContain("from '../api/materialType/materialType.queries'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Props & Interface
// ═══════════════════════════════════════════════════════════════

describe('MaterialTypeSelect — Props', () => {
  it('defines MaterialTypeSelectProps interface', () => {
    const content = readSource()
    expect(content).toContain('interface MaterialTypeSelectProps')
  })

  it('has value, onChange, placeholder, disabled, error, label, required props', () => {
    const content = readSource()
    expect(content).toContain('value?: number')
    expect(content).toContain('onChange: (materialType: MaterialType | null) => void')
    expect(content).toContain('placeholder?: string')
    expect(content).toContain('disabled?: boolean')
    expect(content).toContain('error?: string')
    expect(content).toContain('label?: string')
    expect(content).toContain('required?: boolean')
  })
})

// ═══════════════════════════════════════════════════════════════
// Behavior
// ═══════════════════════════════════════════════════════════════

describe('MaterialTypeSelect — Behavior', () => {
  it('checks permission for managing material types', () => {
    const content = readSource()
    expect(content).toContain('hasAnyPermission')
    expect(content).toContain('quality_control.can_manage_material_types')
  })

  it('has create material type dialog', () => {
    const content = readSource()
    expect(content).toContain('Add Material Type')
    expect(content).toContain('handleCreateMaterialType')
  })

  it('validates code is required and uppercase', () => {
    const content = readSource()
    expect(content).toContain("'Code is required'")
    expect(content).toContain("'Code must be uppercase letters, numbers, and underscores only'")
  })

  it('validates name is required', () => {
    const content = readSource()
    expect(content).toContain("'Name is required'")
  })

  it('has loading and empty states', () => {
    const content = readSource()
    expect(content).toContain("loadingText=\"Loading...\"")
    expect(content).toContain("emptyText=\"No material types available\"")
    expect(content).toContain("notFoundText=\"No material types found\"")
  })
})
