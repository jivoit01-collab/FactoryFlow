import { describe, it, expect } from 'vitest'
import type {
  ArrivalSlipStatus,
  InspectionWorkflowStatus,
  InspectionFinalStatus,
  ParameterType,
  MaterialType,
  CreateMaterialTypeRequest,
  QCParameter,
  CreateQCParameterRequest,
  ParameterResult,
  UpdateParameterResultRequest,
  ArrivalSlipForQC,
  PendingInspection,
  Inspection,
  CreateInspectionRequest,
  ApprovalRequest,
  QCDashboardCounts,
} from '../../types'

// ═══════════════════════════════════════════════════════════════
// Union Types
// ═══════════════════════════════════════════════════════════════

describe('ArrivalSlipStatus', () => {
  it('accepts DRAFT', () => {
    const status: ArrivalSlipStatus = 'DRAFT'
    expect(status).toBe('DRAFT')
  })

  it('accepts SUBMITTED', () => {
    const status: ArrivalSlipStatus = 'SUBMITTED'
    expect(status).toBe('SUBMITTED')
  })

  it('accepts REJECTED', () => {
    const status: ArrivalSlipStatus = 'REJECTED'
    expect(status).toBe('REJECTED')
  })
})

describe('InspectionWorkflowStatus', () => {
  it('accepts all 5 workflow statuses', () => {
    const statuses: InspectionWorkflowStatus[] = [
      'DRAFT',
      'SUBMITTED',
      'QA_CHEMIST_APPROVED',
      'QAM_APPROVED',
      'COMPLETED',
    ]
    expect(statuses).toHaveLength(5)
    statuses.forEach((s) => expect(typeof s).toBe('string'))
  })
})

describe('InspectionFinalStatus', () => {
  it('accepts all 4 final statuses', () => {
    const statuses: InspectionFinalStatus[] = [
      'PENDING',
      'ACCEPTED',
      'REJECTED',
      'HOLD',
    ]
    expect(statuses).toHaveLength(4)
    statuses.forEach((s) => expect(typeof s).toBe('string'))
  })
})

describe('ParameterType', () => {
  it('accepts all 4 parameter types', () => {
    const types: ParameterType[] = ['NUMERIC', 'TEXT', 'BOOLEAN', 'RANGE']
    expect(types).toHaveLength(4)
    types.forEach((t) => expect(typeof t).toBe('string'))
  })
})

// ═══════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════

describe('MaterialType', () => {
  it('is usable with required fields', () => {
    const mt: MaterialType = { id: 1, code: 'CAP', name: 'Cap', description: 'Blue cap' }
    expect(mt.id).toBe(1)
    expect(mt.code).toBe('CAP')
    expect(mt.name).toBe('Cap')
    expect(mt.description).toBe('Blue cap')
  })
})

describe('CreateMaterialTypeRequest', () => {
  it('works with required fields only', () => {
    const req: CreateMaterialTypeRequest = { code: 'CAP', name: 'Cap' }
    expect(req.code).toBe('CAP')
    expect(req.description).toBeUndefined()
  })

  it('works with optional description', () => {
    const req: CreateMaterialTypeRequest = { code: 'CAP', name: 'Cap', description: 'A cap' }
    expect(req.description).toBe('A cap')
  })
})

describe('QCParameter', () => {
  it('is usable with required fields', () => {
    const param: QCParameter = {
      id: 1,
      parameter_code: 'VISC',
      parameter_name: 'Viscosity',
      standard_value: '100',
      parameter_type: 'NUMERIC',
      min_value: 90,
      max_value: 110,
      uom: 'cP',
      sequence: 1,
      is_mandatory: true,
    }
    expect(param.parameter_code).toBe('VISC')
    expect(param.parameter_type).toBe('NUMERIC')
    expect(param.min_value).toBe(90)
    expect(param.max_value).toBe(110)
  })
})

describe('CreateQCParameterRequest', () => {
  it('works with required fields only', () => {
    const req: CreateQCParameterRequest = {
      parameter_code: 'PH',
      parameter_name: 'pH Value',
      standard_value: '7',
      parameter_type: 'NUMERIC',
      uom: 'pH',
      sequence: 1,
      is_mandatory: true,
    }
    expect(req.parameter_code).toBe('PH')
    expect(req.min_value).toBeUndefined()
  })
})

describe('ParameterResult', () => {
  it('is usable with all fields', () => {
    const result: ParameterResult = {
      id: 1,
      parameter_master: 10,
      parameter_code: 'PH',
      parameter_name: 'pH Value',
      standard_value: '7',
      parameter_type: 'NUMERIC',
      min_value: '6',
      max_value: '8',
      uom: 'pH',
      result_value: '7.2',
      result_numeric: 7.2,
      is_within_spec: true,
      remarks: 'OK',
    }
    expect(result.result_numeric).toBe(7.2)
    expect(result.is_within_spec).toBe(true)
  })
})

describe('UpdateParameterResultRequest', () => {
  it('works with required fields only', () => {
    const req: UpdateParameterResultRequest = {
      parameter_master_id: 10,
      result_value: '7.2',
    }
    expect(req.parameter_master_id).toBe(10)
    expect(req.result_numeric).toBeUndefined()
  })
})

describe('ArrivalSlipForQC', () => {
  it('is usable with all fields', () => {
    const slip: ArrivalSlipForQC = {
      id: 1,
      po_item_receipt: 100,
      po_item_code: 'ITM001',
      item_name: 'Blue Cap',
      po_receipt_id: 50,
      vehicle_entry_id: 25,
      entry_no: 'VE-001',
      particulars: 'Testing',
      arrival_datetime: '2024-01-01T00:00:00Z',
      weighing_required: true,
      party_name: 'Supplier A',
      billing_qty: '100',
      billing_uom: 'KG',
      in_time_to_qa: null,
      truck_no_as_per_bill: 'MH01AB1234',
      commercial_invoice_no: 'INV001',
      eway_bill_no: 'EWB001',
      bilty_no: 'BLT001',
      has_certificate_of_analysis: true,
      has_certificate_of_quantity: false,
      status: 'DRAFT',
      is_submitted: false,
      submitted_at: null,
      submitted_by: null,
      submitted_by_name: null,
      remarks: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
    expect(slip.id).toBe(1)
    expect(slip.status).toBe('DRAFT')
  })
})

describe('PendingInspection', () => {
  it('is usable with required fields', () => {
    const pending: PendingInspection = {
      arrival_slip: {
        id: 1,
        po_item_receipt: 1,
        po_item_code: 'X',
        item_name: 'X',
        po_receipt_id: 1,
        vehicle_entry_id: 1,
        entry_no: 'VE-1',
        particulars: '',
        arrival_datetime: '',
        weighing_required: false,
        party_name: '',
        billing_qty: '0',
        billing_uom: 'KG',
        in_time_to_qa: null,
        truck_no_as_per_bill: '',
        commercial_invoice_no: '',
        eway_bill_no: '',
        bilty_no: '',
        has_certificate_of_analysis: false,
        has_certificate_of_quantity: false,
        status: 'SUBMITTED',
        is_submitted: true,
        submitted_at: null,
        submitted_by: null,
        submitted_by_name: null,
        remarks: '',
        created_at: '',
        updated_at: '',
      },
      has_inspection: false,
      inspection_status: null,
    }
    expect(pending.has_inspection).toBe(false)
    expect(pending.inspection_status).toBeNull()
  })
})

describe('Inspection', () => {
  it('is usable with all fields including nested parameter_results', () => {
    const inspection: Inspection = {
      id: 1,
      arrival_slip: 10,
      arrival_slip_id: 10,
      arrival_slip_status: 'SUBMITTED',
      po_item_receipt_id: 5,
      po_item_code: 'ITM001',
      item_name: 'Blue Cap',
      vehicle_entry_id: 3,
      entry_no: 'VE-001',
      report_no: 'RPT-001',
      internal_lot_no: 'LOT-001',
      inspection_date: '2024-01-01',
      description_of_material: 'Blue plastic cap',
      sap_code: 'SAP001',
      supplier_name: 'Supplier A',
      manufacturer_name: 'Manufacturer B',
      supplier_batch_lot_no: 'BATCH001',
      unit_packing: '100pcs',
      purchase_order_no: 'PO-001',
      invoice_bill_no: 'INV001',
      vehicle_no: 'MH01AB1234',
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
    }
    expect(inspection.workflow_status).toBe('DRAFT')
    expect(inspection.parameter_results).toEqual([])
  })
})

describe('CreateInspectionRequest', () => {
  it('works with required fields only', () => {
    const req: CreateInspectionRequest = {
      inspection_date: '2024-01-01',
      description_of_material: 'Cap',
      sap_code: 'SAP001',
      supplier_name: 'Supplier',
      manufacturer_name: 'Manufacturer',
      supplier_batch_lot_no: 'BATCH001',
      unit_packing: '100pcs',
      purchase_order_no: 'PO-001',
      invoice_bill_no: 'INV001',
      vehicle_no: 'MH01',
      material_type_id: 1,
    }
    expect(req.material_type_id).toBe(1)
    expect(req.remarks).toBeUndefined()
  })
})

describe('ApprovalRequest', () => {
  it('works with no fields (all optional)', () => {
    const req: ApprovalRequest = {}
    expect(req.remarks).toBeUndefined()
    expect(req.final_status).toBeUndefined()
  })

  it('works with all optional fields', () => {
    const req: ApprovalRequest = { remarks: 'Approved', final_status: 'ACCEPTED' }
    expect(req.remarks).toBe('Approved')
    expect(req.final_status).toBe('ACCEPTED')
  })
})

describe('QCDashboardCounts', () => {
  it('is usable with all fields', () => {
    const counts: QCDashboardCounts = {
      pending_inspection: 5,
      draft: 3,
      awaiting_chemist: 2,
      awaiting_manager: 1,
      approved_today: 4,
      rejected: 0,
    }
    expect(counts.pending_inspection).toBe(5)
    expect(counts.draft).toBe(3)
    expect(counts.rejected).toBe(0)
  })
})
