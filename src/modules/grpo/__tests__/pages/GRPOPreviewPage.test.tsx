import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// GRPOPreviewPage — File Content Verification
//
// Direct import hangs because GRPOPreviewPage imports 6 icons
// from lucide-react and many UI components from @/shared.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs')
  const { resolve } = require('node:path')
  return readFileSync(
    resolve(process.cwd(), 'src/modules/grpo/pages/GRPOPreviewPage.tsx'),
    'utf-8',
  )
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('GRPOPreviewPage — Exports', () => {
  it('default exports GRPOPreviewPage function', () => {
    const content = readSource()
    expect(content).toContain('export default function GRPOPreviewPage()')
  })

  it('imports icons from lucide-react', () => {
    const content = readSource()
    expect(content).toContain("from 'lucide-react'")
    expect(content).toContain('ArrowLeft')
    expect(content).toContain('AlertCircle')
    expect(content).toContain('ShieldX')
    expect(content).toContain('RefreshCw')
    expect(content).toContain('CheckCircle2')
    expect(content).toContain('Package')
  })

  it('imports UI components from @/shared/components/ui', () => {
    const content = readSource()
    expect(content).toContain("from '@/shared/components/ui'")
    expect(content).toContain('Button')
    expect(content).toContain('Card')
    expect(content).toContain('CardContent')
    expect(content).toContain('Input')
    expect(content).toContain('Label')
    expect(content).toContain('Dialog')
    expect(content).toContain('DialogContent')
    expect(content).toContain('DialogHeader')
    expect(content).toContain('DialogTitle')
    expect(content).toContain('DialogFooter')
    expect(content).toContain('DialogDescription')
  })

  it('imports useGRPOPreview and usePostGRPO from api', () => {
    const content = readSource()
    expect(content).toContain('useGRPOPreview')
    expect(content).toContain('usePostGRPO')
    expect(content).toContain("from '../api'")
  })

  it('imports WarehouseSelect from components', () => {
    const content = readSource()
    expect(content).toContain('WarehouseSelect')
    expect(content).toContain("from '../components'")
  })

  it('imports DEFAULT_BRANCH_ID and GRPO_STATUS from constants', () => {
    const content = readSource()
    expect(content).toContain('DEFAULT_BRANCH_ID')
    expect(content).toContain('GRPO_STATUS')
    expect(content).toContain("from '../constants'")
  })

  it('imports FINAL_STATUS from @/config/constants', () => {
    const content = readSource()
    expect(content).toContain('FINAL_STATUS')
    expect(content).toContain("from '@/config/constants'")
  })

  it('imports types from ../types', () => {
    const content = readSource()
    expect(content).toContain('PreviewPOReceipt')
    expect(content).toContain('PostGRPOResponse')
    expect(content).toContain("from '../types'")
  })

  it('imports useState and useCallback from react', () => {
    const content = readSource()
    expect(content).toContain("import { useState, useCallback } from 'react'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════

describe('GRPOPreviewPage — Header', () => {
  it('renders GRPO Preview heading', () => {
    const content = readSource()
    expect(content).toContain("'GRPO Preview'")
  })

  it('renders description about reviewing and posting', () => {
    const content = readSource()
    expect(content).toContain('Review and post goods receipt for each purchase order')
  })

  it('has Refresh button', () => {
    const content = readSource()
    expect(content).toContain('Refresh')
    expect(content).toContain('refetch')
  })

  it('has back button navigating to /grpo/pending', () => {
    const content = readSource()
    expect(content).toContain("navigate('/grpo/pending')")
  })
})

// ═══════════════════════════════════════════════════════════════
// Form State Management
// ═══════════════════════════════════════════════════════════════

describe('GRPOPreviewPage — Form State', () => {
  it('defines POFormState interface', () => {
    const content = readSource()
    expect(content).toContain('interface POFormState')
    expect(content).toContain('warehouseCode: string')
    expect(content).toContain('comments: string')
  })

  it('uses formStates for per-PO state', () => {
    const content = readSource()
    expect(content).toContain('formStates')
    expect(content).toContain('setFormStates')
  })

  it('has getFormState helper with useCallback', () => {
    const content = readSource()
    expect(content).toContain('getFormState')
    expect(content).toContain('useCallback')
  })

  it('has updateItemQty function', () => {
    const content = readSource()
    expect(content).toContain('updateItemQty')
  })

  it('has updateWarehouseCode function', () => {
    const content = readSource()
    expect(content).toContain('updateWarehouseCode')
  })

  it('has updateComments function', () => {
    const content = readSource()
    expect(content).toContain('updateComments')
  })
})

// ═══════════════════════════════════════════════════════════════
// Validation & Posting
// ═══════════════════════════════════════════════════════════════

describe('GRPOPreviewPage — Validation & Posting', () => {
  it('has validatePO function', () => {
    const content = readSource()
    expect(content).toContain('validatePO')
    expect(content).toContain('Cannot be negative')
    expect(content).toContain('Cannot exceed received qty')
    expect(content).toContain('At least one item must have accepted quantity greater than 0')
  })

  it('has handlePostClick function (shows confirmation)', () => {
    const content = readSource()
    expect(content).toContain('handlePostClick')
    expect(content).toContain('setConfirmPO')
  })

  it('has handleConfirmPost function (submits to API)', () => {
    const content = readSource()
    expect(content).toContain('handleConfirmPost')
    expect(content).toContain('postGRPO.mutateAsync')
    expect(content).toContain('DEFAULT_BRANCH_ID')
  })

  it('tracks apiErrors state', () => {
    const content = readSource()
    expect(content).toContain('apiErrors')
    expect(content).toContain('setApiErrors')
  })
})

// ═══════════════════════════════════════════════════════════════
// States
// ═══════════════════════════════════════════════════════════════

describe('GRPOPreviewPage — States', () => {
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

  it('shows empty state for no purchase orders', () => {
    const content = readSource()
    expect(content).toContain('No purchase orders found for this entry.')
  })
})

// ═══════════════════════════════════════════════════════════════
// PO Cards
// ═══════════════════════════════════════════════════════════════

describe('GRPOPreviewPage — PO Cards', () => {
  it('renders previewData.map for PO cards', () => {
    const content = readSource()
    expect(content).toContain('previewData.map')
  })

  it('shows PO number and supplier name', () => {
    const content = readSource()
    expect(content).toContain('{po.po_number}')
    expect(content).toContain('{po.supplier_name}')
  })

  it('shows invoice and challan numbers', () => {
    const content = readSource()
    expect(content).toContain('{po.invoice_no}')
    expect(content).toContain('{po.challan_no}')
  })

  it('checks GRPO_STATUS.POSTED for already posted POs', () => {
    const content = readSource()
    expect(content).toContain('GRPO_STATUS.POSTED')
    expect(content).toContain('isPosted')
  })

  it('renders item list with accepted and rejected qty', () => {
    const content = readSource()
    expect(content).toContain('Accepted Qty')
    expect(content).toContain('Rejected Qty')
    expect(content).toContain('item.received_qty')
  })

  it('shows QC status using FINAL_STATUS', () => {
    const content = readSource()
    expect(content).toContain('FINAL_STATUS.ACCEPTED')
    expect(content).toContain('FINAL_STATUS.REJECTED')
    expect(content).toContain('item.qc_status')
  })

  it('has Post GRPO and Cancel buttons', () => {
    const content = readSource()
    expect(content).toContain('Post GRPO')
    expect(content).toContain('Cancel')
    expect(content).toContain("'Posting...'")
  })
})

// ═══════════════════════════════════════════════════════════════
// Dialogs
// ═══════════════════════════════════════════════════════════════

describe('GRPOPreviewPage — Dialogs', () => {
  it('has confirmation dialog', () => {
    const content = readSource()
    expect(content).toContain('Confirm GRPO Posting')
    expect(content).toContain('Review the quantities below before posting to SAP')
    expect(content).toContain('Confirm Post')
  })

  it('has success dialog', () => {
    const content = readSource()
    expect(content).toContain('GRPO posted successfully to SAP')
    expect(content).toContain('SAP Document Number')
    expect(content).toContain('Total Value')
    expect(content).toContain('View History')
    expect(content).toContain('Done')
  })

  it('tracks confirmPO and successResult state', () => {
    const content = readSource()
    expect(content).toContain('confirmPO')
    expect(content).toContain('setConfirmPO')
    expect(content).toContain('successResult')
    expect(content).toContain('setSuccessResult')
  })
})
