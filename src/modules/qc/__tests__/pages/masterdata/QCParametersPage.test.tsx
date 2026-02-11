import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// QCParametersPage — File Content Verification
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/pages/masterdata/QCParametersPage.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('QCParametersPage — Exports', () => {
  it('default exports QCParametersPage function', () => {
    const content = readSource()
    expect(content).toContain('export default function QCParametersPage()')
  })

  it('imports from lucide-react', () => {
    const content = readSource()
    expect(content).toContain("from 'lucide-react'")
    expect(content).toContain('FlaskConical')
    expect(content).toContain('Plus')
    expect(content).toContain('Edit')
    expect(content).toContain('Trash2')
  })

  it('imports UI components including Checkbox', () => {
    const content = readSource()
    expect(content).toContain("from '@/shared/components/ui'")
    expect(content).toContain('Checkbox')
    expect(content).toContain('Dialog')
    expect(content).toContain('Input')
    expect(content).toContain('Label')
  })

  it('uses MaterialTypeSelect component for material type filter', () => {
    const content = readSource()
    expect(content).toContain('MaterialTypeSelect')
  })

  it('imports qcParameter query hooks', () => {
    const content = readSource()
    expect(content).toContain('useQCParametersByMaterialType')
    expect(content).toContain('useCreateQCParameter')
    expect(content).toContain('useUpdateQCParameter')
    expect(content).toContain('useDeleteQCParameter')
  })

  it('imports PARAMETER_TYPE_LABELS from constants', () => {
    const content = readSource()
    expect(content).toContain('PARAMETER_TYPE_LABELS')
    expect(content).toContain("from '../../constants'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Material Type Selection
// ═══════════════════════════════════════════════════════════════

describe('QCParametersPage — Material Type Filter', () => {
  it('has selectedMaterialType state', () => {
    const content = readSource()
    expect(content).toContain('selectedMaterialType')
    expect(content).toContain('setSelectedMaterialType')
  })

  it('loads parameters for selected material type', () => {
    const content = readSource()
    expect(content).toContain(
      'useQCParametersByMaterialType(selectedMaterialType)',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// CRUD Operations
// ═══════════════════════════════════════════════════════════════

describe('QCParametersPage — CRUD', () => {
  it('has dialog for create/edit', () => {
    const content = readSource()
    expect(content).toContain('isDialogOpen')
    expect(content).toContain('handleOpenDialog')
  })

  it('has form data with parameter fields', () => {
    const content = readSource()
    expect(content).toContain("parameter_code: ''")
    expect(content).toContain("parameter_name: ''")
    expect(content).toContain("standard_value: ''")
    expect(content).toContain("parameter_type: 'TEXT'")
    expect(content).toContain("uom: ''")
    expect(content).toContain('sequence: 1')
    expect(content).toContain('is_mandatory: true')
  })

  it('tracks editing state', () => {
    const content = readSource()
    expect(content).toContain('editingParam')
    expect(content).toContain('setEditingParam')
  })

  it('has delete functionality', () => {
    const content = readSource()
    expect(content).toContain('deleteParameter')
  })

  it('uses useScrollToError for error display', () => {
    const content = readSource()
    expect(content).toContain('useScrollToError(apiErrors)')
  })
})

// ═══════════════════════════════════════════════════════════════
// Parameter Types
// ═══════════════════════════════════════════════════════════════

describe('QCParametersPage — Parameter Types', () => {
  it('supports ParameterType type', () => {
    const content = readSource()
    expect(content).toContain('ParameterType')
  })

  it('references PARAMETER_TYPE_LABELS for display', () => {
    const content = readSource()
    expect(content).toContain('PARAMETER_TYPE_LABELS')
  })
})
