import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// MaterialTypesPage — File Content Verification
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/pages/masterdata/MaterialTypesPage.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('MaterialTypesPage — Exports', () => {
  it('default exports MaterialTypesPage function', () => {
    const content = readSource()
    expect(content).toContain('export default function MaterialTypesPage()')
  })

  it('imports from lucide-react', () => {
    const content = readSource()
    expect(content).toContain("from 'lucide-react'")
    expect(content).toContain('FlaskConical')
    expect(content).toContain('Plus')
    expect(content).toContain('Edit')
    expect(content).toContain('Trash2')
  })

  it('imports UI components', () => {
    const content = readSource()
    expect(content).toContain("from '@/shared/components/ui'")
    expect(content).toContain('Button')
    expect(content).toContain('Card')
    expect(content).toContain('Input')
    expect(content).toContain('Label')
    expect(content).toContain('Dialog')
  })

  it('imports materialType query hooks', () => {
    const content = readSource()
    expect(content).toContain('useMaterialTypes')
    expect(content).toContain('useCreateMaterialType')
    expect(content).toContain('useUpdateMaterialType')
    expect(content).toContain('useDeleteMaterialType')
  })

  it('imports useScrollToError from @/shared/hooks', () => {
    const content = readSource()
    expect(content).toContain("import { useScrollToError } from '@/shared/hooks'")
  })
})

// ═══════════════════════════════════════════════════════════════
// CRUD Operations
// ═══════════════════════════════════════════════════════════════

describe('MaterialTypesPage — CRUD', () => {
  it('has dialog for create/edit', () => {
    const content = readSource()
    expect(content).toContain('isDialogOpen')
    expect(content).toContain('setIsDialogOpen')
    expect(content).toContain('handleOpenDialog')
    expect(content).toContain('handleCloseDialog')
  })

  it('has form data state', () => {
    const content = readSource()
    expect(content).toContain('formData')
    expect(content).toContain("code: ''")
    expect(content).toContain("name: ''")
    expect(content).toContain("description: ''")
  })

  it('has save handler with validation', () => {
    const content = readSource()
    expect(content).toContain('handleSave')
    expect(content).toContain("'Code is required'")
    expect(content).toContain("'Name is required'")
  })

  it('tracks editing state for edit mode', () => {
    const content = readSource()
    expect(content).toContain('editingType')
    expect(content).toContain('setEditingType')
  })

  it('has delete functionality', () => {
    const content = readSource()
    expect(content).toContain('deleteMaterialType')
  })

  it('uses useScrollToError for error display', () => {
    const content = readSource()
    expect(content).toContain('useScrollToError(apiErrors)')
  })
})
