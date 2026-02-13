import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/core/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock('@/core/api/types', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.status = status;
    }
  },
}));

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    QUALITY_CONTROL_V2: {
      PENDING_INSPECTIONS: '/api/v2/qc/pending-inspections/',
      INSPECTION_BY_ID: (id: number) => `/api/v2/qc/inspections/${id}/`,
      INSPECTION_FOR_SLIP: (slipId: number) => `/api/v2/qc/arrival-slips/${slipId}/inspection/`,
      INSPECTION_PARAMETERS: (id: number) => `/api/v2/qc/inspections/${id}/parameters/`,
      INSPECTION_SUBMIT: (id: number) => `/api/v2/qc/inspections/${id}/submit/`,
      APPROVE_CHEMIST: (id: number) => `/api/v2/qc/inspections/${id}/approve-chemist/`,
      APPROVE_QAM: (id: number) => `/api/v2/qc/inspections/${id}/approve-qam/`,
      REJECT_INSPECTION: (id: number) => `/api/v2/qc/inspections/${id}/reject/`,
    },
  },
}));

import { inspectionApi } from '../../../api/inspection/inspection.api';

// ═══════════════════════════════════════════════════════════════
// inspectionApi
// ═══════════════════════════════════════════════════════════════

describe('inspectionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: [] });
    mockPost.mockResolvedValue({ data: { id: 1 } });
  });

  it('is defined as an object', () => {
    expect(inspectionApi).toBeDefined();
    expect(typeof inspectionApi).toBe('object');
  });

  // ─── getPendingList ───────────────────────────────────────────

  it('getPendingList calls apiClient.get with correct endpoint', async () => {
    await inspectionApi.getPendingList();
    expect(mockGet).toHaveBeenCalledWith('/api/v2/qc/pending-inspections/');
  });

  it('getPendingList returns response.data', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1 }] });
    const result = await inspectionApi.getPendingList();
    expect(result).toEqual([{ id: 1 }]);
  });

  // ─── getById ──────────────────────────────────────────────────

  it('getById calls apiClient.get with inspection id', async () => {
    mockGet.mockResolvedValue({ data: { id: 5 } });
    await inspectionApi.getById(5);
    expect(mockGet).toHaveBeenCalledWith('/api/v2/qc/inspections/5/');
  });

  // ─── getForSlip ───────────────────────────────────────────────

  it('getForSlip returns data when inspection exists', async () => {
    mockGet.mockResolvedValue({ data: { id: 10, arrival_slip: 3 } });
    const result = await inspectionApi.getForSlip(3);
    expect(result).toEqual({ id: 10, arrival_slip: 3 });
  });

  it('getForSlip returns null on 404', async () => {
    const error404 = Object.assign(new Error('Not found'), { status: 404 });
    mockGet.mockRejectedValue(error404);
    const result = await inspectionApi.getForSlip(999);
    expect(result).toBeNull();
  });

  it('getForSlip rethrows non-404 errors', async () => {
    const error500 = Object.assign(new Error('Server error'), { status: 500 });
    mockGet.mockRejectedValue(error500);
    await expect(inspectionApi.getForSlip(1)).rejects.toThrow('Server error');
  });

  // ─── create ───────────────────────────────────────────────────

  it('create calls apiClient.post with slipId endpoint and data', async () => {
    const data = {
      inspection_date: '2024-01-01',
      description_of_material: 'Cap',
      sap_code: 'SAP',
      supplier_name: 'S',
      manufacturer_name: 'M',
      supplier_batch_lot_no: 'B',
      unit_packing: 'U',
      purchase_order_no: 'PO',
      invoice_bill_no: 'INV',
      vehicle_no: 'V',
      material_type_id: 1,
    };
    await inspectionApi.create(3, data);
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/arrival-slips/3/inspection/', data);
  });

  // ─── update ───────────────────────────────────────────────────

  it('update calls apiClient.post with slipId endpoint and data', async () => {
    const data = {
      inspection_date: '2024-01-01',
      description_of_material: 'Cap',
      sap_code: 'SAP',
      supplier_name: 'S',
      manufacturer_name: 'M',
      supplier_batch_lot_no: 'B',
      unit_packing: 'U',
      purchase_order_no: 'PO',
      invoice_bill_no: 'INV',
      vehicle_no: 'V',
      material_type_id: 1,
    };
    await inspectionApi.update(3, data);
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/arrival-slips/3/inspection/', data);
  });

  // ─── updateParameters ─────────────────────────────────────────

  it('updateParameters calls apiClient.post with results wrapped in object', async () => {
    const results = [{ parameter_master_id: 1, result_value: '7.2' }];
    await inspectionApi.updateParameters(5, results);
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/inspections/5/parameters/', { results });
  });

  // ─── submit ───────────────────────────────────────────────────

  it('submit calls apiClient.post with submit endpoint', async () => {
    await inspectionApi.submit(5);
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/inspections/5/submit/');
  });

  // ─── approveAsChemist ─────────────────────────────────────────

  it('approveAsChemist calls apiClient.post with chemist endpoint and data', async () => {
    const data = { remarks: 'OK', final_status: 'ACCEPTED' as const };
    await inspectionApi.approveAsChemist(5, data);
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/inspections/5/approve-chemist/', data);
  });

  // ─── approveAsQAM ────────────────────────────────────────────

  it('approveAsQAM calls apiClient.post with QAM endpoint', async () => {
    const data = { remarks: 'Approved' };
    await inspectionApi.approveAsQAM(5, data);
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/inspections/5/approve-qam/', data);
  });

  // ─── reject ───────────────────────────────────────────────────

  it('reject calls apiClient.post with reject endpoint', async () => {
    const data = { remarks: 'Failed' };
    await inspectionApi.reject(5, data);
    expect(mockPost).toHaveBeenCalledWith('/api/v2/qc/inspections/5/reject/', data);
  });
});
