import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════

const mockHasAnyPermission = vi.fn(() => false)

vi.mock('@/core/auth', () => ({
  usePermission: () => ({ hasAnyPermission: mockHasAnyPermission }),
}))

vi.mock('@/config/permissions', () => ({
  QC_PERMISSIONS: {
    ARRIVAL_SLIP: {
      CREATE: 'quality_control.add_materialarrivalslip',
      EDIT: 'quality_control.change_materialarrivalslip',
      SUBMIT: 'quality_control.can_submit_arrival_slip',
      VIEW: 'quality_control.view_materialarrivalslip',
    },
    INSPECTION: {
      CREATE: 'quality_control.add_rawmaterialinspection',
      EDIT: 'quality_control.change_rawmaterialinspection',
      SUBMIT: 'quality_control.can_submit_inspection',
      VIEW: 'quality_control.view_rawmaterialinspection',
    },
    APPROVAL: {
      APPROVE_AS_CHEMIST: 'quality_control.can_approve_as_chemist',
      APPROVE_AS_QAM: 'quality_control.can_approve_as_qam',
      REJECT: 'quality_control.can_reject_inspection',
    },
    MASTER_DATA: {
      MANAGE_MATERIAL_TYPES: 'quality_control.can_manage_material_types',
      MANAGE_QC_PARAMETERS: 'quality_control.can_manage_qc_parameters',
    },
  },
}))

vi.mock('../../constants', () => ({
  WORKFLOW_STATUS: {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    QA_CHEMIST_APPROVED: 'QA_CHEMIST_APPROVED',
    QAM_APPROVED: 'QAM_APPROVED',
    COMPLETED: 'COMPLETED',
  },
}))

import {
  useInspectionPermissions,
  useArrivalSlipPermissions,
  useMasterDataPermissions,
} from '../../hooks/useInspectionPermissions'
import type { Inspection } from '../../types'

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function makeInspection(overrides: Partial<Inspection> = {}): Inspection {
  return {
    id: 1,
    arrival_slip: 1,
    arrival_slip_id: 1,
    arrival_slip_status: 'SUBMITTED',
    po_item_receipt_id: 1,
    po_item_code: 'X',
    item_name: 'X',
    vehicle_entry_id: 1,
    entry_no: 'VE-1',
    report_no: 'RPT-1',
    internal_lot_no: 'LOT-1',
    inspection_date: '2024-01-01',
    description_of_material: 'Material',
    sap_code: 'SAP',
    supplier_name: 'Supplier',
    manufacturer_name: 'Manufacturer',
    supplier_batch_lot_no: 'BATCH',
    unit_packing: '100',
    purchase_order_no: 'PO-1',
    invoice_bill_no: 'INV-1',
    vehicle_no: 'MH01',
    material_type: 1,
    material_type_name: 'Cap',
    final_status: 'PENDING',
    qa_chemist: null,
    qa_chemist_name: null,
    qa_chemist_approved_at: null,
    qa_chemist_remarks: '',
    qam: null,
    qam_name: null,
    qam_approved_at: null,
    qam_remarks: '',
    workflow_status: 'DRAFT',
    is_locked: false,
    remarks: '',
    parameter_results: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// useInspectionPermissions
// ═══════════════════════════════════════════════════════════════

describe('useInspectionPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasAnyPermission.mockReturnValue(false)
  })

  // ─── All flags false when no permissions ─────────────────────

  it('returns all action flags false when no permissions', () => {
    const { result } = renderHook(() => useInspectionPermissions(makeInspection()))
    expect(result.current.canCreateInspection).toBe(false)
    expect(result.current.canEditInspection).toBe(false)
    expect(result.current.canSubmitInspection).toBe(false)
    expect(result.current.canApproveAsChemist).toBe(false)
    expect(result.current.canApproveAsQAM).toBe(false)
    expect(result.current.canReject).toBe(false)
  })

  it('returns all UI flags false when no permissions', () => {
    const { result } = renderHook(() => useInspectionPermissions(makeInspection()))
    expect(result.current.showSaveButton).toBe(false)
    expect(result.current.showSubmitButton).toBeFalsy()
    expect(result.current.showChemistApproval).toBe(false)
    expect(result.current.showQAMApproval).toBe(false)
    expect(result.current.showRejectButton).toBe(false)
  })

  // ─── DRAFT state + permissions ───────────────────────────────

  it('showSaveButton true when has edit permission and inspection is DRAFT', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const inspection = makeInspection({ workflow_status: 'DRAFT', is_locked: false })
    const { result } = renderHook(() => useInspectionPermissions(inspection))
    expect(result.current.showSaveButton).toBe(true)
  })

  it('showSaveButton false when inspection is locked', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const inspection = makeInspection({ workflow_status: 'DRAFT', is_locked: true })
    const { result } = renderHook(() => useInspectionPermissions(inspection))
    expect(result.current.showSaveButton).toBe(false)
  })

  it('showSubmitButton true when has permission, inspection is DRAFT and not locked', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const inspection = makeInspection({ workflow_status: 'DRAFT', is_locked: false })
    const { result } = renderHook(() => useInspectionPermissions(inspection))
    expect(result.current.showSubmitButton).toBeTruthy()
  })

  // ─── SUBMITTED state ─────────────────────────────────────────

  it('showChemistApproval true when SUBMITTED and has chemist permission', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const inspection = makeInspection({ workflow_status: 'SUBMITTED' })
    const { result } = renderHook(() => useInspectionPermissions(inspection))
    expect(result.current.showChemistApproval).toBe(true)
  })

  it('showRejectButton true when SUBMITTED and has reject permission', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const inspection = makeInspection({ workflow_status: 'SUBMITTED' })
    const { result } = renderHook(() => useInspectionPermissions(inspection))
    expect(result.current.showRejectButton).toBe(true)
  })

  // ─── QA_CHEMIST_APPROVED state ───────────────────────────────

  it('showQAMApproval true when QA_CHEMIST_APPROVED and has QAM permission', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const inspection = makeInspection({ workflow_status: 'QA_CHEMIST_APPROVED' })
    const { result } = renderHook(() => useInspectionPermissions(inspection))
    expect(result.current.showQAMApproval).toBe(true)
  })

  it('showRejectButton true when QA_CHEMIST_APPROVED and has reject permission', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const inspection = makeInspection({ workflow_status: 'QA_CHEMIST_APPROVED' })
    const { result } = renderHook(() => useInspectionPermissions(inspection))
    expect(result.current.showRejectButton).toBe(true)
  })

  // ─── Completed / QAM_APPROVED state ──────────────────────────

  it('isCompleted true when QAM_APPROVED', () => {
    const inspection = makeInspection({ workflow_status: 'QAM_APPROVED' })
    const { result } = renderHook(() => useInspectionPermissions(inspection))
    expect(result.current.isCompleted).toBe(true)
  })

  it('isCompleted true when COMPLETED', () => {
    const inspection = makeInspection({ workflow_status: 'COMPLETED' })
    const { result } = renderHook(() => useInspectionPermissions(inspection))
    expect(result.current.isCompleted).toBe(true)
  })

  // ─── Null inspection ─────────────────────────────────────────

  it('handles null inspection (creation mode)', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const { result } = renderHook(() => useInspectionPermissions(null))
    // isDraft is true when inspection is null
    expect(result.current.showSaveButton).toBe(true)
    expect(result.current.canEditFields).toBe(true)
  })

  it('canEditFields matches showSaveButton', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const inspection = makeInspection({ workflow_status: 'DRAFT' })
    const { result } = renderHook(() => useInspectionPermissions(inspection))
    expect(result.current.canEditFields).toBe(result.current.showSaveButton)
  })
})

// ═══════════════════════════════════════════════════════════════
// useArrivalSlipPermissions
// ═══════════════════════════════════════════════════════════════

describe('useArrivalSlipPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasAnyPermission.mockReturnValue(false)
  })

  it('returns all flags false when no permissions', () => {
    const { result } = renderHook(() => useArrivalSlipPermissions())
    expect(result.current.canCreate).toBe(false)
    expect(result.current.canEdit).toBe(false)
    expect(result.current.canSubmit).toBe(false)
    expect(result.current.canView).toBe(false)
  })

  it('returns object with exactly 4 permission flags', () => {
    const { result } = renderHook(() => useArrivalSlipPermissions())
    expect(Object.keys(result.current)).toEqual(['canCreate', 'canEdit', 'canSubmit', 'canView'])
  })
})

// ═══════════════════════════════════════════════════════════════
// useMasterDataPermissions
// ═══════════════════════════════════════════════════════════════

describe('useMasterDataPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasAnyPermission.mockReturnValue(false)
  })

  it('returns all flags false when no permissions', () => {
    const { result } = renderHook(() => useMasterDataPermissions())
    expect(result.current.canManageMaterialTypes).toBe(false)
    expect(result.current.canManageQCParameters).toBe(false)
  })

  it('returns object with exactly 2 permission flags', () => {
    const { result } = renderHook(() => useMasterDataPermissions())
    expect(Object.keys(result.current)).toEqual(['canManageMaterialTypes', 'canManageQCParameters'])
  })
})
