import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@/config/constants', () => ({
  API_ENDPOINTS: {
    MAINTENANCE: {
      DASHBOARD: '/maintenance/dashboard/',
      REPORTS: '/maintenance/reports/',
      SCAN_LOOKUP: '/maintenance/scan/lookup/',
      SCAN_WORK_ORDER: '/maintenance/scan/work-order/',
      SPARE_STOCK: '/maintenance/spares/stock/',
      ALERTS: '/maintenance/alerts/',
      OPTIONS: '/maintenance/options/',
      ASSETS: '/maintenance/assets/',
      ASSET_DETAIL: (assetId: number) => `/maintenance/assets/${assetId}/`,
      ASSET_DEACTIVATE: (assetId: number) => `/maintenance/assets/${assetId}/deactivate/`,
      ASSET_QR: (assetId: number) => `/maintenance/assets/${assetId}/qr/`,
      ASSET_CATEGORIES: '/maintenance/asset-categories/',
      ASSET_CATEGORY_DETAIL: (categoryId: number) => `/maintenance/asset-categories/${categoryId}/`,
      ASSET_LOCATIONS: '/maintenance/asset-locations/',
      ASSET_LOCATION_DETAIL: (locationId: number) => `/maintenance/asset-locations/${locationId}/`,
      ASSET_DEPARTMENTS: '/maintenance/asset-departments/',
      ASSET_DEPARTMENT_DETAIL: (departmentId: number) =>
        `/maintenance/asset-departments/${departmentId}/`,
      ASSET_PHOTOS: '/maintenance/asset-photos/',
      ASSET_DOCUMENTS: '/maintenance/asset-documents/',
      WORK_ORDERS: '/maintenance/work-orders/',
      WORK_ORDER_DETAIL: (workOrderId: number) => `/maintenance/work-orders/${workOrderId}/`,
      WORK_ORDER_ASSIGN: (workOrderId: number) => `/maintenance/work-orders/${workOrderId}/assign/`,
      WORK_ORDER_START: (workOrderId: number) => `/maintenance/work-orders/${workOrderId}/start/`,
      WORK_ORDER_COMPLETE: (workOrderId: number) =>
        `/maintenance/work-orders/${workOrderId}/complete/`,
      WORK_ORDER_APPROVE: (workOrderId: number) =>
        `/maintenance/work-orders/${workOrderId}/approve/`,
      WORK_ORDER_CLOSE: (workOrderId: number) => `/maintenance/work-orders/${workOrderId}/close/`,
      WORK_ORDER_SEND_BACK: (workOrderId: number) =>
        `/maintenance/work-orders/${workOrderId}/send-back/`,
      WORK_ORDER_LOGS: (workOrderId: number) => `/maintenance/work-orders/${workOrderId}/logs/`,
      WORK_ORDER_SET_STATUS: (workOrderId: number) =>
        `/maintenance/work-orders/${workOrderId}/set-status/`,
      WORK_ORDER_PHOTOS: '/maintenance/work-order-photos/',
      WORK_ORDER_ATTACHMENTS: '/maintenance/work-order-attachments/',
      WORK_ORDER_ATTACHMENT_DETAIL: (attachmentId: number) =>
        `/maintenance/work-order-attachments/${attachmentId}/`,
      SPARE_ADJUST_STOCK: (spareId: number) => `/maintenance/spares/${spareId}/adjust-stock/`,
    },
  },
}));

import { apiClient } from '@/core/api';

import { maintenanceApi } from '../api/maintenance.api';

const mockedApiClient = vi.mocked(apiClient);

describe('maintenanceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads dashboard and options endpoints', async () => {
    await maintenanceApi.getDashboard();
    await maintenanceApi.getOptions();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/dashboard/');
    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/options/');
  });

  it('cleans dashboard filters before requesting the summary', async () => {
    await maintenanceApi.getDashboard({
      department: 3,
      line: 'Line 1',
      priority: 'ALL',
      date_from: '2026-06-01',
      date_to: '',
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/dashboard/', {
      params: {
        department: 3,
        line: 'Line 1',
        date_from: '2026-06-01',
      },
    });
  });

  it('loads report data and exports reports with cleaned filters', async () => {
    await maintenanceApi.getReport({
      report_type: 'breakdown',
      department: 'ALL',
      line: 'Line 1',
      priority: 'CRITICAL',
      date_from: '2026-06-01',
      date_to: '',
    });
    await maintenanceApi.exportReport(
      {
        report_type: 'spare_consumption',
        asset: 12,
        priority: 'ALL',
        date_from: '2026-06-01',
      },
      'excel',
    );

    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/reports/', {
      params: {
        report_type: 'breakdown',
        line: 'Line 1',
        priority: 'CRITICAL',
        date_from: '2026-06-01',
      },
    });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/reports/', {
      params: {
        report_type: 'spare_consumption',
        asset: 12,
        date_from: '2026-06-01',
        export: 'excel',
      },
      responseType: 'blob',
    });
  });

  it('handles phase ten scan, stock, QR, and alert endpoints', async () => {
    await maintenanceApi.lookupScan('QR-FILLER-001');
    await maintenanceApi.createWorkOrderFromScan({
      code: 'QR-FILLER-001',
      title: 'Mobile complaint',
      problem_statement: 'Vibration found during mobile scan.',
      priority: 'HIGH',
      impact: 'DEGRADED',
      target_date: '2026-06-03',
    });
    await maintenanceApi.getSpareStock({ spare: 12, warehouse: 'MNT', code: '' });
    await maintenanceApi.getAlerts();
    await maintenanceApi.sendAlerts({ alert_types: ['LOW_CRITICAL_SPARE'], limit: 5 });
    await maintenanceApi.getAssetQr(9);
    await maintenanceApi.assignAssetQr(9, { qr_code: 'QR-MCH-009' });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/scan/lookup/', {
      params: { code: 'QR-FILLER-001' },
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/scan/work-order/', {
      code: 'QR-FILLER-001',
      title: 'Mobile complaint',
      problem_statement: 'Vibration found during mobile scan.',
      priority: 'HIGH',
      impact: 'DEGRADED',
      target_date: '2026-06-03',
    });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/spares/stock/', {
      params: { spare: 12, warehouse: 'MNT' },
    });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/alerts/');
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/alerts/', {
      alert_types: ['LOW_CRITICAL_SPARE'],
      limit: 5,
    });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/assets/9/qr/');
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/assets/9/qr/', {
      qr_code: 'QR-MCH-009',
    });
  });

  it('cleans asset filters before requesting asset list', async () => {
    await maintenanceApi.getAssets({
      search: '',
      status: 'RUNNING',
      category: 'ALL',
      department: 4,
      location: 'ALL',
      line: 'Line 1',
      is_active: true,
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/assets/', {
      params: {
        status: 'RUNNING',
        department: 4,
        line: 'Line 1',
        is_active: true,
      },
    });
  });

  it('creates, updates, and deactivates assets with the expected endpoints', async () => {
    const payload = {
      asset_code: 'MCH-001',
      name: 'Filler 1',
      category: 1,
      location: 2,
      department: 3,
      hierarchy_level: 'MACHINE' as const,
      status: 'RUNNING' as const,
    };

    await maintenanceApi.createAsset(payload);
    await maintenanceApi.updateAsset(9, payload);
    await maintenanceApi.deactivateAsset(9);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/assets/', payload);
    expect(mockedApiClient.put).toHaveBeenCalledWith('/maintenance/assets/9/', payload);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/assets/9/deactivate/');
  });

  it('lists asset photos and uploads a photo as multipart form data', async () => {
    const file = new File(['photo'], 'pump.jpg', { type: 'image/jpeg' });

    await maintenanceApi.getAssetPhotos(7);
    await maintenanceApi.uploadAssetPhoto({
      asset: 7,
      file,
      caption: 'Front view',
      taken_on: '2026-06-02',
      is_monthly_photo: true,
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/asset-photos/', {
      params: { asset: 7 },
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/maintenance/asset-photos/',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );

    const formData = mockedApiClient.post.mock.calls.at(-1)?.[1] as FormData;
    expect(formData.get('asset')).toBe('7');
    expect(formData.get('photo')).toBe(file);
    expect(formData.get('caption')).toBe('Front view');
  });

  it('lists asset documents and uploads a document as multipart form data', async () => {
    const file = new File(['manual'], 'manual.pdf', { type: 'application/pdf' });

    await maintenanceApi.getAssetDocuments(8);
    await maintenanceApi.uploadAssetDocument({
      asset: 8,
      file,
      document_type: 'MANUAL',
      title: 'Pump Manual',
      document_date: '2026-06-02',
      notes: 'OEM manual',
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/asset-documents/', {
      params: { asset: 8 },
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/maintenance/asset-documents/',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );

    const formData = mockedApiClient.post.mock.calls.at(-1)?.[1] as FormData;
    expect(formData.get('asset')).toBe('8');
    expect(formData.get('document')).toBe(file);
    expect(formData.get('document_type')).toBe('MANUAL');
    expect(formData.get('title')).toBe('Pump Manual');
  });

  it('uploads the files staged in the asset form one by one, titling untitled files', async () => {
    const manual = new File(['manual'], 'manual.pdf', { type: 'application/pdf' });
    const invoice = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' });

    await maintenanceApi.uploadAssetDocuments(9, [
      { file: manual, document_type: 'MANUAL', title: 'Pump Manual' },
      { file: invoice, document_type: 'OTHER', title: '   ' },
    ]);

    const uploads = mockedApiClient.post.mock.calls.filter(
      ([url]) => url === '/maintenance/asset-documents/',
    );
    expect(uploads).toHaveLength(2);

    const first = uploads[0][1] as FormData;
    expect(first.get('asset')).toBe('9');
    expect(first.get('document')).toBe(manual);
    expect(first.get('document_type')).toBe('MANUAL');
    expect(first.get('title')).toBe('Pump Manual');

    const second = uploads[1][1] as FormData;
    expect(second.get('document')).toBe(invoice);
    // A blank title falls back to the file name so the backend never rejects it.
    expect(second.get('title')).toBe('invoice.pdf');
  });

  it('handles work order list, create, update, and lifecycle endpoints', async () => {
    const payload = {
      work_type: 'BREAKDOWN' as const,
      priority: 'CRITICAL' as const,
      asset: 1,
      department: 2,
      title: 'Filler stopped',
      problem_statement: 'Machine stopped during shift',
      impact: 'STOPPAGE' as const,
    };

    await maintenanceApi.getWorkOrders({ status: 'OPEN', priority: 'CRITICAL' });
    await maintenanceApi.createWorkOrder(payload);
    await maintenanceApi.updateWorkOrder(11, payload);
    await maintenanceApi.assignWorkOrder(11, {
      assigned_to_text: 'Sanjay Sharma (Sanjay123)',
      target_date: '2026-06-04',
    });
    await maintenanceApi.startWorkOrder(11);
    await maintenanceApi.completeWorkOrder(11, { completion_remarks: 'Completed' });
    await maintenanceApi.approveWorkOrder(11, { closure_remarks: 'Verified' });
    await maintenanceApi.closeWorkOrder(11);
    await maintenanceApi.setWorkOrderStatus(11, { status: 'WAITING_SPARE', remarks: 'Need belt' });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/work-orders/', {
      params: { status: 'OPEN', priority: 'CRITICAL' },
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-orders/', payload);
    expect(mockedApiClient.put).toHaveBeenCalledWith('/maintenance/work-orders/11/', payload);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-orders/11/assign/', {
      assigned_to_text: 'Sanjay Sharma (Sanjay123)',
      target_date: '2026-06-04',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-orders/11/start/');
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-orders/11/complete/', {
      completion_remarks: 'Completed',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-orders/11/approve/', {
      closure_remarks: 'Verified',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-orders/11/close/');
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-orders/11/set-status/', {
      status: 'WAITING_SPARE',
      remarks: 'Need belt',
    });
  });

  it('sends a work order back for rework and reads its hand-off trail', async () => {
    await maintenanceApi.sendBackWorkOrder(11, { remarks: 'Still leaking after an hour.' });
    await maintenanceApi.getWorkOrderLogs(11);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/work-orders/11/send-back/', {
      remarks: 'Still leaking after an hour.',
    });
    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/work-orders/11/logs/');
  });

  it('lists work order photos and uploads a photo as multipart form data', async () => {
    const file = new File(['before'], 'before.jpg', { type: 'image/jpeg' });

    await maintenanceApi.getWorkOrderPhotos(12);
    await maintenanceApi.uploadWorkOrderPhoto({
      work_order: 12,
      file,
      photo_type: 'BEFORE',
      caption: 'Before repair',
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/work-order-photos/', {
      params: { work_order: 12 },
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/maintenance/work-order-photos/',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );

    const formData = mockedApiClient.post.mock.calls.at(-1)?.[1] as FormData;
    expect(formData.get('work_order')).toBe('12');
    expect(formData.get('photo')).toBe(file);
    expect(formData.get('photo_type')).toBe('BEFORE');
    expect(formData.get('caption')).toBe('Before repair');
  });

  it('lists work order attachments and uploads one as multipart form data', async () => {
    const file = new File(['quote'], 'vendor-quote.pdf', { type: 'application/pdf' });

    await maintenanceApi.getWorkOrderAttachments(12);
    await maintenanceApi.uploadWorkOrderAttachment({
      work_order: 12,
      file,
      doc_type: 'QUOTATION',
      title: 'Vendor quote',
    });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/maintenance/work-order-attachments/', {
      params: { work_order: 12 },
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/maintenance/work-order-attachments/',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );

    const formData = mockedApiClient.post.mock.calls.at(-1)?.[1] as FormData;
    expect(formData.get('work_order')).toBe('12');
    expect(formData.get('file')).toBe(file);
    expect(formData.get('doc_type')).toBe('QUOTATION');
    expect(formData.get('title')).toBe('Vendor quote');
  });

  it('pushes every staged attachment, falling back to the file name as title', async () => {
    const fault = new File(['fault'], 'fault.jpg', { type: 'image/jpeg' });
    const drawing = new File(['dwg'], 'layout.pdf', { type: 'application/pdf' });

    await maintenanceApi.uploadWorkOrderAttachments(21, [
      { file: fault, doc_type: 'COMPLAINT', title: 'Bearing noise' },
      // Blank title: the file name stands in so nothing lands untitled.
      { file: drawing, doc_type: 'DRAWING', title: '   ' },
    ]);

    const posts = mockedApiClient.post.mock.calls.filter(
      (call) => call[0] === '/maintenance/work-order-attachments/',
    );
    expect(posts).toHaveLength(2);

    const first = posts[0]?.[1] as FormData;
    expect(first.get('work_order')).toBe('21');
    expect(first.get('doc_type')).toBe('COMPLAINT');
    expect(first.get('title')).toBe('Bearing noise');

    const second = posts[1]?.[1] as FormData;
    expect(second.get('doc_type')).toBe('DRAWING');
    expect(second.get('title')).toBe('layout.pdf');
  });

  it('deletes a work order attachment by id', async () => {
    await maintenanceApi.deleteWorkOrderAttachment(77);

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/maintenance/work-order-attachments/77/');
  });

  it('adjusts spare stock through the adjust-stock endpoint', async () => {
    await maintenanceApi.adjustSpareStock(15, { new_stock: '8.000', reason: 'Cycle count' });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/spares/15/adjust-stock/', {
      new_stock: '8.000',
      reason: 'Cycle count',
    });
  });

  it('creates maintenance master records', async () => {
    await maintenanceApi.createCategory({ name: 'Machine' });
    await maintenanceApi.createLocation({ name: 'Plant 1', area: 'Packing', line: 'Line 1' });
    await maintenanceApi.createDepartment({ name: 'Production', department_code: 'PROD' });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/asset-categories/', {
      name: 'Machine',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/asset-locations/', {
      name: 'Plant 1',
      area: 'Packing',
      line: 'Line 1',
    });
    expect(mockedApiClient.post).toHaveBeenCalledWith('/maintenance/asset-departments/', {
      name: 'Production',
      department_code: 'PROD',
    });
  });
});
