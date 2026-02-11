import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// ApprovalQueuePage — File Content Verification
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/pages/ApprovalQueuePage.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('ApprovalQueuePage — Exports', () => {
  it('default exports ApprovalQueuePage function', () => {
    const content = readSource()
    expect(content).toContain('export default function ApprovalQueuePage()')
  })

  it('imports from lucide-react', () => {
    const content = readSource()
    expect(content).toContain("from 'lucide-react'")
    expect(content).toContain('FlaskConical')
    expect(content).toContain('ArrowLeft')
    expect(content).toContain('Eye')
  })

  it('imports UI components', () => {
    const content = readSource()
    expect(content).toContain("from '@/shared/components/ui'")
    expect(content).toContain('Button')
    expect(content).toContain('Card')
    expect(content).toContain('CardContent')
    expect(content).toContain('CardHeader')
    expect(content).toContain('CardTitle')
  })

  it('imports usePermission from @/core/auth', () => {
    const content = readSource()
    expect(content).toContain("import { usePermission } from '@/core/auth'")
  })

  it('imports QC_PERMISSIONS from @/config/permissions', () => {
    const content = readSource()
    expect(content).toContain("import { QC_PERMISSIONS } from '@/config/permissions'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════

describe('ApprovalQueuePage — Header', () => {
  it('renders "Approval Queue" heading', () => {
    const content = readSource()
    expect(content).toContain('Approval Queue')
  })

  it('renders subtitle', () => {
    const content = readSource()
    expect(content).toContain('Review and approve inspections')
  })
})

// ═══════════════════════════════════════════════════════════════
// Tabs
// ═══════════════════════════════════════════════════════════════

describe('ApprovalQueuePage — Tabs', () => {
  it('defines TabType as chemist | manager', () => {
    const content = readSource()
    expect(content).toMatch(/type\s+TabType\s*=\s*['"]chemist['"]\s*\|\s*['"]manager['"]/)
  })

  it('has QA Chemist Queue tab', () => {
    const content = readSource()
    expect(content).toContain('QA Chemist Queue')
    expect(content).toContain('chemistCount')
  })

  it('has QA Manager Queue tab', () => {
    const content = readSource()
    expect(content).toContain('QA Manager Queue')
    expect(content).toContain('managerCount')
  })

  it('permission-gates tabs', () => {
    const content = readSource()
    expect(content).toContain('canApproveAsChemist')
    expect(content).toContain('canApproveAsQAM')
  })
})

// ═══════════════════════════════════════════════════════════════
// States
// ═══════════════════════════════════════════════════════════════

describe('ApprovalQueuePage — States', () => {
  it('shows loading state', () => {
    const content = readSource()
    expect(content).toContain('isLoading')
    expect(content).toContain('Loading...')
  })

  it('shows empty state', () => {
    const content = readSource()
    expect(content).toContain('No Pending Approvals')
  })

  it('handles permission error', () => {
    const content = readSource()
    expect(content).toContain('isPermissionError')
    expect(content).toContain('Permission Denied')
  })

  it('has Review button for each inspection', () => {
    const content = readSource()
    expect(content).toContain('Review')
    expect(content).toContain("navigate(`/qc/inspections/${item.arrival_slip.id}`)")
  })
})
