import { describe, it, expect } from 'vitest'
import type {
  Warehouse,
  GRPOStatus,
  QCStatus,
  PendingGRPOEntry,
  PreviewItem,
  PreviewPOReceipt,
  PostGRPORequest,
  PostGRPOResponse,
  GRPOHistoryLine,
  GRPOHistoryEntry,
} from '../../types/grpo.types'

// ═══════════════════════════════════════════════════════════════
// Type Assertion Tests
// ═══════════════════════════════════════════════════════════════
// These tests verify that types compile correctly and that
// objects conforming to the interfaces can be created.
// ═══════════════════════════════════════════════════════════════

describe('GRPO Types', () => {
  // ─── Warehouse ──────────────────────────────────────────────

  it('Warehouse interface accepts valid shape', () => {
    const warehouse: Warehouse = {
      warehouse_code: 'WH-001',
      warehouse_name: 'Main Warehouse',
    }
    expect(warehouse.warehouse_code).toBe('WH-001')
    expect(warehouse.warehouse_name).toBe('Main Warehouse')
  })

  // ─── GRPOStatus ─────────────────────────────────────────────

  it('GRPOStatus accepts valid union members', () => {
    const statuses: GRPOStatus[] = ['PENDING', 'POSTED', 'FAILED', 'PARTIALLY_POSTED']
    expect(statuses).toHaveLength(4)
  })

  // ─── QCStatus ───────────────────────────────────────────────

  it('QCStatus accepts valid union members', () => {
    const statuses: QCStatus[] = [
      'PENDING',
      'ACCEPTED',
      'REJECTED',
      'NO_ARRIVAL_SLIP',
      'ARRIVAL_SLIP_PENDING',
      'INSPECTION_PENDING',
    ]
    expect(statuses).toHaveLength(6)
  })

  // ─── PendingGRPOEntry ──────────────────────────────────────

  it('PendingGRPOEntry interface accepts valid shape', () => {
    const entry: PendingGRPOEntry = {
      vehicle_entry_id: 1,
      entry_no: 'VE-001',
      status: 'active',
      entry_time: '2025-01-01T00:00:00Z',
      total_po_count: 3,
      posted_po_count: 1,
      pending_po_count: 2,
      is_fully_posted: false,
    }
    expect(entry.vehicle_entry_id).toBe(1)
    expect(entry.is_fully_posted).toBe(false)
  })

  // ─── PreviewItem ───────────────────────────────────────────

  it('PreviewItem interface accepts valid shape', () => {
    const item: PreviewItem = {
      po_item_receipt_id: 1,
      item_code: 'ITEM-001',
      item_name: 'Test Item',
      ordered_qty: 100,
      received_qty: 80,
      accepted_qty: 75,
      rejected_qty: 5,
      uom: 'KG',
      qc_status: 'ACCEPTED',
    }
    expect(item.po_item_receipt_id).toBe(1)
    expect(item.qc_status).toBe('ACCEPTED')
  })

  // ─── PreviewPOReceipt ──────────────────────────────────────

  it('PreviewPOReceipt interface accepts valid shape', () => {
    const receipt: PreviewPOReceipt = {
      vehicle_entry_id: 1,
      entry_no: 'VE-001',
      entry_status: 'active',
      is_ready_for_grpo: true,
      po_receipt_id: 10,
      po_number: 'PO-001',
      supplier_code: 'SUP-001',
      supplier_name: 'Test Supplier',
      invoice_no: 'INV-001',
      invoice_date: '2025-01-01',
      challan_no: 'CH-001',
      items: [],
      grpo_status: null,
      sap_doc_num: null,
    }
    expect(receipt.is_ready_for_grpo).toBe(true)
    expect(receipt.grpo_status).toBeNull()
  })

  // ─── PostGRPORequest ───────────────────────────────────────

  it('PostGRPORequest interface accepts valid shape', () => {
    const request: PostGRPORequest = {
      vehicle_entry_id: 1,
      po_receipt_id: 10,
      items: [{ po_item_receipt_id: 1, accepted_qty: 50 }],
      branch_id: 2,
    }
    expect(request.items).toHaveLength(1)
  })

  it('PostGRPORequest accepts optional fields', () => {
    const request: PostGRPORequest = {
      vehicle_entry_id: 1,
      po_receipt_id: 10,
      items: [{ po_item_receipt_id: 1, accepted_qty: 50 }],
      branch_id: 2,
      warehouse_code: 'WH-001',
      comments: 'Test comment',
    }
    expect(request.warehouse_code).toBe('WH-001')
    expect(request.comments).toBe('Test comment')
  })

  // ─── PostGRPOResponse ──────────────────────────────────────

  it('PostGRPOResponse interface accepts valid shape', () => {
    const response: PostGRPOResponse = {
      success: true,
      grpo_posting_id: 1,
      sap_doc_entry: 100,
      sap_doc_num: 200,
      sap_doc_total: 50000,
      message: 'Posted successfully',
    }
    expect(response.success).toBe(true)
    expect(response.sap_doc_num).toBe(200)
  })

  // ─── GRPOHistoryLine ──────────────────────────────────────

  it('GRPOHistoryLine interface accepts valid shape', () => {
    const line: GRPOHistoryLine = {
      id: 1,
      item_code: 'ITEM-001',
      item_name: 'Test Item',
      quantity_posted: '50.00',
      base_entry: 100,
      base_line: 0,
    }
    expect(line.id).toBe(1)
    expect(line.quantity_posted).toBe('50.00')
  })

  it('GRPOHistoryLine accepts null for optional fields', () => {
    const line: GRPOHistoryLine = {
      id: 1,
      item_code: 'ITEM-001',
      item_name: 'Test Item',
      quantity_posted: '50.00',
      base_entry: null,
      base_line: null,
    }
    expect(line.base_entry).toBeNull()
    expect(line.base_line).toBeNull()
  })

  // ─── GRPOHistoryEntry ─────────────────────────────────────

  it('GRPOHistoryEntry interface accepts valid shape', () => {
    const entry: GRPOHistoryEntry = {
      id: 1,
      vehicle_entry: 10,
      entry_no: 'VE-001',
      po_receipt: 20,
      po_number: 'PO-001',
      sap_doc_entry: 100,
      sap_doc_num: 200,
      sap_doc_total: '50000.00',
      status: 'POSTED',
      error_message: null,
      posted_at: '2025-01-01T12:00:00Z',
      posted_by: 1,
      created_at: '2025-01-01T10:00:00Z',
      lines: [],
    }
    expect(entry.status).toBe('POSTED')
    expect(entry.error_message).toBeNull()
  })

  it('GRPOHistoryEntry accepts null for nullable fields', () => {
    const entry: GRPOHistoryEntry = {
      id: 1,
      vehicle_entry: 10,
      entry_no: 'VE-001',
      po_receipt: 20,
      po_number: 'PO-001',
      sap_doc_entry: null,
      sap_doc_num: null,
      sap_doc_total: '0.00',
      status: 'FAILED',
      error_message: 'SAP connection failed',
      posted_at: null,
      posted_by: null,
      created_at: '2025-01-01T10:00:00Z',
      lines: [],
    }
    expect(entry.sap_doc_entry).toBeNull()
    expect(entry.error_message).toBe('SAP connection failed')
  })
})
