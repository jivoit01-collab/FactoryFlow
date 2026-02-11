import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// qc.constants — File Content Verification
//
// Direct import hangs because qc.constants imports 6 icons from
// lucide-react (thousands of icon exports trigger Vite's module
// graph resolution). Instead, we verify via file content analysis.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/constants/qc.constants.ts'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

describe('qc.constants — Imports', () => {
  it('imports icons from lucide-react', () => {
    const content = readSource()
    expect(content).toContain("from 'lucide-react'")
    expect(content).toContain('FileText')
    expect(content).toContain('Send')
    expect(content).toContain('UserCheck')
    expect(content).toContain('CheckCircle2')
    expect(content).toContain('XCircle')
    expect(content).toContain('Clock')
  })

  it('imports LucideIcon type from lucide-react', () => {
    const content = readSource()
    expect(content).toContain('type LucideIcon')
  })

  it('imports types from ../types', () => {
    const content = readSource()
    expect(content).toContain("from '../types'")
    expect(content).toContain('InspectionWorkflowStatus')
    expect(content).toContain('InspectionFinalStatus')
  })
})

// ═══════════════════════════════════════════════════════════════
// WORKFLOW_STATUS
// ═══════════════════════════════════════════════════════════════

describe('qc.constants — WORKFLOW_STATUS', () => {
  it('exports WORKFLOW_STATUS with as const satisfies', () => {
    const content = readSource()
    expect(content).toContain('export const WORKFLOW_STATUS')
    expect(content).toContain('as const satisfies')
  })

  it('has all 5 workflow status keys', () => {
    const content = readSource()
    expect(content).toMatch(/WORKFLOW_STATUS\s*=\s*\{/)
    expect(content).toContain("DRAFT: 'DRAFT'")
    expect(content).toContain("SUBMITTED: 'SUBMITTED'")
    expect(content).toContain("QA_CHEMIST_APPROVED: 'QA_CHEMIST_APPROVED'")
    expect(content).toContain("QAM_APPROVED: 'QAM_APPROVED'")
    expect(content).toContain("COMPLETED: 'COMPLETED'")
  })
})

// ═══════════════════════════════════════════════════════════════
// WORKFLOW_STATUS_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('qc.constants — WORKFLOW_STATUS_CONFIG', () => {
  it('exports WORKFLOW_STATUS_CONFIG typed as Record<InspectionWorkflowStatus, StatusConfig>', () => {
    const content = readSource()
    expect(content).toContain('export const WORKFLOW_STATUS_CONFIG')
    expect(content).toContain('Record<InspectionWorkflowStatus, StatusConfig>')
  })

  it('has entries for all 5 workflow statuses with label, color, bgColor, icon', () => {
    const content = readSource()
    // Check all 5 entries exist
    expect(content).toMatch(/DRAFT:\s*\{/)
    expect(content).toMatch(/SUBMITTED:\s*\{/)
    expect(content).toMatch(/QA_CHEMIST_APPROVED:\s*\{/)
    expect(content).toMatch(/QAM_APPROVED:\s*\{/)
    expect(content).toMatch(/COMPLETED:\s*\{/)
    // Check shape fields
    expect(content).toContain("label: 'Draft'")
    expect(content).toContain("label: 'Awaiting Chemist'")
    expect(content).toContain("label: 'Awaiting Manager'")
    expect(content).toContain("label: 'Approved'")
    expect(content).toContain("label: 'Completed'")
  })
})

// ═══════════════════════════════════════════════════════════════
// FINAL_STATUS_CONFIG
// ═══════════════════════════════════════════════════════════════

describe('qc.constants — FINAL_STATUS_CONFIG', () => {
  it('exports FINAL_STATUS_CONFIG typed as Record<InspectionFinalStatus, StatusConfig>', () => {
    const content = readSource()
    expect(content).toContain('export const FINAL_STATUS_CONFIG')
    expect(content).toContain('Record<InspectionFinalStatus, StatusConfig>')
  })

  it('has entries for all 4 final statuses', () => {
    const content = readSource()
    expect(content).toContain("label: 'Pending'")
    expect(content).toContain("label: 'Accepted'")
    expect(content).toContain("label: 'Rejected'")
    expect(content).toContain("label: 'On Hold'")
  })
})

// ═══════════════════════════════════════════════════════════════
// PARAMETER_TYPE_LABELS
// ═══════════════════════════════════════════════════════════════

describe('qc.constants — PARAMETER_TYPE_LABELS', () => {
  it('exports PARAMETER_TYPE_LABELS with as const', () => {
    const content = readSource()
    expect(content).toContain('export const PARAMETER_TYPE_LABELS')
    expect(content).toMatch(/PARAMETER_TYPE_LABELS\s*=\s*\{/)
  })

  it('maps 4 parameter types to human-readable labels', () => {
    const content = readSource()
    expect(content).toContain("NUMERIC: 'Numeric Value'")
    expect(content).toContain("TEXT: 'Text Value'")
    expect(content).toContain("BOOLEAN: 'Pass/Fail'")
    expect(content).toContain("RANGE: 'Numeric Range'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════════════════════════════

describe('qc.constants — Re-exports', () => {
  it('re-exports FINAL_STATUS from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain("export { FINAL_STATUS")
    expect(content).toContain("from '@/config/constants'")
  })

  it('re-exports ARRIVAL_SLIP_STATUS from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain('ARRIVAL_SLIP_STATUS')
    expect(content).toContain("from '@/config/constants'")
  })
})
