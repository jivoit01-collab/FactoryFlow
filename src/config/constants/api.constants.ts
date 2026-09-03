export const API_CONFIG = {
  // The fallback differs by build, and both halves matter.
  //
  // A PRODUCTION build with no VITE_API_BASE_URL used to fall back to localhost,
  // which fails silently: the bundle looks perfectly fine and simply cannot
  // reach the API. That is easy to ship by accident, because the variable lives
  // only in GitHub secrets — anyone building the bundle by hand (as we had to
  // while the CI deploy was blocked) gets a broken app with no warning.
  //
  // A DEV server keeps localhost, and must: defaulting `npm run dev` to
  // production would let a developer write to live SAP and production data from
  // their laptop without realising it. The .env here sets VITE_API_URL, not
  // VITE_API_BASE_URL, so local runs really do land on this fallback.
  baseUrl:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? 'http://localhost:8000/api/v1' : 'https://factory.jivo.in/api/v1'),
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/accounts/login/',
    LOGOUT: '/accounts/logout/',
    REFRESH: '/accounts/token/refresh/',
    ME: '/accounts/me/',
    CHANGE_PASSWORD: '/accounts/change-password/',
  },
  // Vehicle Management
  VEHICLE: {
    TRANSPORTERS: '/vehicle-management/transporters/',
    TRANSPORTER_NAMES: '/vehicle-management/transporters/names/',
    TRANSPORTER_BY_ID: (id: number) => `/vehicle-management/transporters/${id}/`,
    VEHICLE_TYPES: '/vehicle-management/vehicle-types/',
    VEHICLES: '/vehicle-management/vehicles/',
    VEHICLE_NAMES: '/vehicle-management/vehicles/names/',
    VEHICLE_HISTORY: (vehicleNumber: string) =>
      `/vehicle-management/vehicles/by-number/${encodeURIComponent(vehicleNumber)}/history/`,
    VEHICLE_BY_ID: (id: number) => `/vehicle-management/vehicles/${id}/`,
    VEHICLE_ENTRIES: '/vehicle-management/vehicle-entries/',
    VEHICLE_ENTRY_BY_ID: (id: number) => `/vehicle-management/vehicle-entries/${id}/`,
    VEHICLE_ENTRIES_COUNT: '/vehicle-management/vehicle-entries/count/',
    VEHICLE_ENTRIES_BY_STATUS: '/vehicle-management/vehicle-entries/list-by-status/',
  },
  // Driver Management
  DRIVER: {
    DRIVERS: '/driver-management/drivers/',
    DRIVER_NAMES: '/driver-management/drivers/names/',
    DRIVER_BY_ID: (id: number) => `/driver-management/drivers/${id}/`,
  },
  // Security Checks
  SECURITY: {
    GATE_ENTRY_SECURITY: (entryId: number) => `/security-checks/gate-entries/${entryId}/security/`,
    GATE_ENTRY_SECURITY_VIEW: (entryId: number) =>
      `/security-checks/gate-entries/${entryId}/security/view`,
    SUBMIT: (securityId: number) => `/security-checks/security/${securityId}/submit/`,
  },
  // Purchase Orders
  PO: {
    OPEN_POS: (supplierCode?: string) =>
      supplierCode ? `/po/open-pos/?supplier_code=${supplierCode}` : '/po/open-pos/',
    FG_OPEN_POS: (supplierCode?: string) =>
      supplierCode ? `/po/fg-open-pos/?supplier_code=${supplierCode}` : '/po/fg-open-pos/',
    OPEN_PO_BY_NUMBER: (poNumber: string) => `/po/open-pos/${encodeURIComponent(poNumber)}/items/`,
    WAREHOUSES: '/po/warehouses/',
    VENDORS: '/po/vendors/',
  },
  // Raw Material Gate In
  RAW_MATERIAL_GATEIN: {
    PO_RECEIPTS: (entryId: number) => `/raw-material-gatein/gate-entries/${entryId}/po-receipts/`,
    PO_RECEIPT_DETAIL: (entryId: number, poReceiptId: number) =>
      `/raw-material-gatein/gate-entries/${entryId}/po-receipts/${poReceiptId}/`,
    PO_RECEIPT_REPLACE: (entryId: number, poReceiptId: number) =>
      `/raw-material-gatein/gate-entries/${entryId}/po-receipts/${poReceiptId}/replace/`,
    GATE_ENTRY_DELETE: (entryId: number) => `/raw-material-gatein/gate-entries/${entryId}/`,
    PO_RECEIPTS_VIEW: (entryId: number) =>
      `/raw-material-gatein/gate-entries/${entryId}/po-receipts/view`,
  },
  // Finished Goods Gate In (traded / purchased FG — no QC)
  FINISHED_GOODS_GATEIN: {
    PO_RECEIPTS: (entryId: number) => `/finished-goods-gatein/gate-entries/${entryId}/po-receipts/`,
    PO_RECEIPT_DETAIL: (entryId: number, poReceiptId: number) =>
      `/finished-goods-gatein/gate-entries/${entryId}/po-receipts/${poReceiptId}/`,
    GATE_ENTRY_DELETE: (entryId: number) => `/finished-goods-gatein/gate-entries/${entryId}/`,
    PO_RECEIPTS_VIEW: (entryId: number) =>
      `/finished-goods-gatein/gate-entries/${entryId}/po-receipts/view/`,
    COMPLETE: (entryId: number) => `/finished-goods-gatein/gate-entries/${entryId}/complete/`,
  },
  // Weighment
  WEIGHMENT: {
    CREATE: (entryId: number) => `/weighment/gate-entries/${entryId}/weighment/`,
    GET: (entryId: number) => `/weighment/gate-entries/${entryId}/weighment/view`,
  },
  // Quality Control
  QUALITY_CONTROL: {
    CREATE: (poItemId: number) => `/quality-control/po-items/${poItemId}/qc/`,
    GET: (poItemId: number) => `/quality-control/po-items/${poItemId}/qc/view`,
  },
  // Gate Attachments
  GATE_ATTACHMENTS: {
    BY_ENTRY: (entryId: number) => `/gate-core/gate-attachments/${entryId}/`,
    HISTORY: (entryId: number) => `/gate-core/gate-attachments/${entryId}/?history=1`,
    DETAIL: (entryId: number, attachmentId: number) =>
      `/gate-core/gate-attachments/${entryId}/${attachmentId}/`,
  },
  // Gate Core - Full View
  GATE_CORE: {
    FULL_VIEW: (entryId: number) => `/gate-core/raw-material-gate-entry/${entryId}/`,
    COMPLETE: (entryId: number) => `/raw-material-gatein/gate-entries/${entryId}/complete/`,
    REJECTED_QC_RETURNS: '/gate-core/rejected-qc-returns/',
    REJECTED_QC_RETURN_BY_ID: (id: number) => `/gate-core/rejected-qc-returns/${id}/`,
    EMPTY_VEHICLE_IN_REASONS: '/gate-core/empty-vehicle-ins/reasons/',
    EMPTY_VEHICLE_IN_ELIGIBLE: '/gate-core/empty-vehicle-ins/eligible/',
    EMPTY_VEHICLE_INS: '/gate-core/empty-vehicle-ins/',
    EMPTY_VEHICLE_IN_BY_ID: (id: number) => `/gate-core/empty-vehicle-ins/${id}/`,
    EMPTY_VEHICLE_IN_COMPLETE_BY_ID: (id: number) => `/gate-core/empty-vehicle-ins/${id}/complete/`,
    EMPTY_VEHICLE_ELIGIBLE_ENTRIES: '/gate-core/empty-vehicle-outs/eligible-entries/',
    EMPTY_VEHICLE_OUTS: '/gate-core/empty-vehicle-outs/',
    EMPTY_VEHICLE_OUT_BY_ID: (id: number) => `/gate-core/empty-vehicle-outs/${id}/`,
    EMPTY_VEHICLE_OUT_CANCEL_BY_ID: (id: number) => `/gate-core/empty-vehicle-outs/${id}/cancel/`,
    INSIDE_DISPATCH_VEHICLES: '/gate-core/inside-dispatch-vehicles/',
    INSIDE_VEHICLE_ADD_BILL: '/gate-core/inside-dispatch-vehicles/add-bill/',
    INSIDE_VEHICLE_ADD_BILL_TO_TRUCK: '/gate-core/inside-dispatch-vehicles/add-bill-to-truck/',
    INSIDE_VEHICLE_REMOVE_BILL: '/gate-core/inside-dispatch-vehicles/remove-bill/',
    INSIDE_VEHICLE_MOVE_BILL: '/gate-core/inside-dispatch-vehicles/move-bill/',
    INSIDE_VEHICLE_UNLINK_ALL: '/gate-core/inside-dispatch-vehicles/unlink-all/',
    ARRIVALS_EXPECTED: '/gate-core/arrivals/expected/',
    ARRIVALS: '/gate-core/arrivals/',
    ARRIVAL_DEPART_BY_ID: (id: number) => `/gate-core/arrivals/${id}/depart/`,
    ARRIVAL_EMPTY_OUT_BY_ID: (id: number) => `/gate-core/arrivals/${id}/empty-out/`,
    ARRIVAL_TRUCK_PHOTO_BY_ID: (id: number) => `/gate-core/arrivals/${id}/truck-photo/`,
    ARRIVAL_DISPATCH_BY_ID: (id: number) => `/gate-core/arrivals/${id}/dispatch/`,
    DISPATCH_TRACKING: '/gate-core/dispatch-tracking/',
    DISPATCH_TRACKING_SUMMARY: '/gate-core/dispatch-tracking/summary/',
    DISPATCH_TRACKING_UPDATES: (arrivalId: number) =>
      `/gate-core/dispatch-tracking/${arrivalId}/updates/`,
    DISPATCH_TRACKING_BILLS: (arrivalId: number) =>
      `/gate-core/dispatch-tracking/${arrivalId}/bills/`,
    DISPATCH_TRACKING_RETURN_NOTE: (arrivalId: number, updateId: number) =>
      `/gate-core/dispatch-tracking/${arrivalId}/updates/${updateId}/return-note/`,
    ARRIVAL_GATEPASS_READINESS_BY_ID: (id: number) =>
      `/gate-core/arrivals/${id}/gatepass/readiness/`,
    ARRIVAL_GATEPASS_PRINT_BY_ID: (id: number) => `/gate-core/arrivals/${id}/gatepass/print/`,
    ARRIVAL_GATEPASS_COMMIT_BY_ID: (id: number) => `/gate-core/arrivals/${id}/gatepass/commit/`,
    ARRIVAL_GATEPASS_REPRINT_BY_ID: (id: number) => `/gate-core/arrivals/${id}/gatepass/reprint/`,
    BST_OUT_SAP_TRANSFERS: '/gate-core/bst-outs/sap-transfers/',
    BST_OUT_SAP_TRANSFER_BY_DOC_ENTRY: (docEntry: number) =>
      `/gate-core/bst-outs/sap-transfers/${docEntry}/`,
    BST_OUTS: '/gate-core/bst-outs/',
    BST_OUT_BY_ID: (id: number) => `/gate-core/bst-outs/${id}/`,
    BST_OUT_CANCEL_BY_ID: (id: number) => `/gate-core/bst-outs/${id}/cancel/`,
    BST_OUT_BY_VEHICLE_ENTRY: (vehicleEntryId: number) =>
      `/gate-core/bst-outs/by-vehicle-entry/${vehicleEntryId}/`,
    BST_OUT_COMPLETE_BY_VEHICLE_ENTRY: (vehicleEntryId: number) =>
      `/gate-core/bst-outs/by-vehicle-entry/${vehicleEntryId}/complete/`,
    SALES_DISPATCH_DOCUMENTS: '/gate-core/sales-dispatch/documents/',
    SALES_DISPATCH_DOCUMENT_BY_DOC_ENTRY: (documentType: string, docEntry: number) =>
      `/gate-core/sales-dispatch/documents/${documentType}/${docEntry}/`,
    SALES_DISPATCH_LOCK: '/gate-core/sales-dispatch/lock/',
    SALES_DISPATCH_REPORTS: '/gate-core/sales-dispatch/reports/',
    SALES_DISPATCH_PENDING_BOOKINGS: '/gate-core/sales-dispatch/pending-bookings/',
    SALES_DISPATCHES: '/gate-core/sales-dispatch/',
    SALES_DISPATCH_BY_ID: (id: number) => `/gate-core/sales-dispatch/${id}/`,
    SALES_DISPATCH_BY_VEHICLE_ENTRY: (vehicleEntryId: number) =>
      `/gate-core/sales-dispatch/by-vehicle-entry/${vehicleEntryId}/`,
    SALES_DISPATCH_ATTACHMENTS: (id: number) => `/gate-core/sales-dispatch/${id}/attachments/`,
    SALES_DISPATCH_ATTACHMENT_DETAIL: (id: number, attachmentId: number) =>
      `/gate-core/sales-dispatch/${id}/attachments/${attachmentId}/`,
    SALES_DISPATCH_BOX_SCANS: (id: number) => `/gate-core/sales-dispatch/${id}/box-scans/`,
    SALES_DISPATCH_BOX_SCAN: (id: number, scanId: number) =>
      `/gate-core/sales-dispatch/${id}/box-scans/${scanId}/`,
    SALES_DISPATCH_BOX_SCANS_BULK_DELETE: (id: number) =>
      `/gate-core/sales-dispatch/${id}/box-scans/bulk-delete/`,
    SALES_DISPATCH_PALLET_SCAN: (id: number) => `/gate-core/sales-dispatch/${id}/pallet-scan/`,
    SALES_DISPATCH_EXPECTED_VEHICLES: '/gate-core/sales-dispatch/expected-vehicles/',
    SALES_DISPATCH_BARCODE_SCANS: (id: number) => `/gate-core/sales-dispatch/${id}/barcode-scans/`,
    SALES_DISPATCH_BARCODE_SCANS_IMPORT: (id: number) =>
      `/gate-core/sales-dispatch/${id}/barcode-scans/import/`,
    SALES_DISPATCH_GATEPASS_PREVIEW: (id: number) =>
      `/gate-core/sales-dispatch/${id}/gatepass/preview/`,
    SALES_DISPATCH_GATEPASS_PRINT: (id: number) =>
      `/gate-core/sales-dispatch/${id}/gatepass/print/`,
    SALES_DISPATCH_GATEPASS_REPRINT: (id: number) =>
      `/gate-core/sales-dispatch/${id}/gatepass/reprint/`,
    SALES_DISPATCH_GATEPASS_PRINTS: (id: number) =>
      `/gate-core/sales-dispatch/${id}/gatepass/prints/`,
    SALES_DISPATCH_CHALLAN_WEIGHT: (id: number) =>
      `/gate-core/sales-dispatch/${id}/challan-weight/`,
    SALES_DISPATCH_ADDITIONAL_WEIGHTS: (id: number) =>
      `/gate-core/sales-dispatch/${id}/additional-weights/`,
    SALES_DISPATCH_COMMIT_PRINT: (id: number) => `/gate-core/sales-dispatch/${id}/commit-print/`,
    SALES_DISPATCH_MARK_DISPATCHED: (id: number) => `/gate-core/sales-dispatch/${id}/dispatch/`,
    SALES_DISPATCH_REJECT: (id: number) => `/gate-core/sales-dispatch/${id}/reject/`,
    SALES_DISPATCH_CANCEL: (id: number) => `/gate-core/sales-dispatch/${id}/cancel/`,
    SALES_DISPATCH_ADD_DOCUMENT: (id: number) => `/gate-core/sales-dispatch/${id}/documents/add/`,
    SALES_DISPATCH_REMOVE_DOCUMENT: (id: number, documentId: number) =>
      `/gate-core/sales-dispatch/${id}/documents/${documentId}/remove/`,
    SALES_DISPATCH_PARTIAL_APPROVAL: (id: number) =>
      `/gate-core/sales-dispatch/${id}/partial-approval/`,
    SALES_DISPATCH_PARTIAL_APPROVAL_DECIDE: (approvalId: number) =>
      `/gate-core/sales-dispatch/partial-approval/${approvalId}/decide/`,
    BST_IN_ELIGIBLE_OUTS: '/gate-core/bst-ins/eligible-outs/',
    BST_INS: '/gate-core/bst-ins/',
    BST_IN_BY_ID: (id: number) => `/gate-core/bst-ins/${id}/`,
    BST_IN_BY_VEHICLE_ENTRY: (vehicleEntryId: number) =>
      `/gate-core/bst-ins/by-vehicle-entry/${vehicleEntryId}/`,
    BST_IN_COMPLETE_BY_VEHICLE_ENTRY: (vehicleEntryId: number) =>
      `/gate-core/bst-ins/by-vehicle-entry/${vehicleEntryId}/complete/`,
    BST_RETURN_ELIGIBLE_OUTS: '/gate-core/bst-returns/eligible-outs/',
    BST_RETURNS: '/gate-core/bst-returns/',
    BST_RETURN_BY_ID: (id: number) => `/gate-core/bst-returns/${id}/`,
    BST_RETURN_BY_VEHICLE_ENTRY: (vehicleEntryId: number) =>
      `/gate-core/bst-returns/by-vehicle-entry/${vehicleEntryId}/`,
    BST_RETURN_COMPLETE_BY_VEHICLE_ENTRY: (vehicleEntryId: number) =>
      `/gate-core/bst-returns/by-vehicle-entry/${vehicleEntryId}/complete/`,
    JOB_WORK_SAP_GRPOS: '/gate-core/job-work/sap-grpos/',
    JOB_WORK_SAP_GRPO_BY_DOC_ENTRY: (docEntry: number) =>
      `/gate-core/job-work/sap-grpos/${docEntry}/`,
    JOB_WORK_SAP_PRODUCTION_ORDERS: '/gate-core/job-work/sap-production-orders/',
    JOB_WORK_SAP_PRODUCTION_ORDER_BY_DOC_ENTRY: (docEntry: number) =>
      `/gate-core/job-work/sap-production-orders/${docEntry}/`,
    JOB_WORKS: '/gate-core/job-work/',
    JOB_WORK_BY_ID: (id: number) => `/gate-core/job-work/${id}/`,
    JOB_WORK_BY_VEHICLE_ENTRY: (vehicleEntryId: number) =>
      `/gate-core/job-work/by-vehicle-entry/${vehicleEntryId}/`,
    JOB_WORK_COMPLETE_BY_VEHICLE_ENTRY: (vehicleEntryId: number) =>
      `/gate-core/job-work/by-vehicle-entry/${vehicleEntryId}/complete/`,
  },
  // Daily Needs Gate In
  DAILY_NEEDS_GATEIN: {
    CATEGORIES: '/daily-needs-gatein/gate-entries/daily-need/categories/',
    GET: (entryId: number) => `/daily-needs-gatein/gate-entries/${entryId}/daily-need/`,
    CREATE: (entryId: number) => `/daily-needs-gatein/gate-entries/${entryId}/daily-need/`,
    FULL_VIEW: (entryId: number) => `/gate-core/daily-need-gate-entry/${entryId}/`,
    COMPLETE: (entryId: number) => `/daily-needs-gatein/gate-entries/${entryId}/complete/`,
  },
  // Accounts
  ACCOUNTS: {
    DEPARTMENTS: '/accounts/departments/',
    USERS: '/accounts/users/',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications/',
    DETAIL: (id: number) => `/notifications/${id}/`,
    UNREAD_COUNT: '/notifications/unread-count/',
    MARK_READ: '/notifications/mark-read/',
    PREFERENCES: '/notifications/preferences/',
    TEST: '/notifications/test/',
    SEND: '/notifications/send/',
    DEVICES: {
      REGISTER: '/notifications/devices/register/',
      UNREGISTER: '/notifications/devices/unregister/',
    },
  },
  // Admin - Docking (scan skip + partial-dispatch approvals)
  DOCKING_ADMIN: {
    SCAN_SKIP_REQUESTS: '/docking-admin/scan-skip-requests/',
    SCAN_SKIP_REQUEST_BY_DISPATCH: (entryId: number) =>
      `/docking-admin/scan-skip-requests/by-sales-dispatch/${entryId}/`,
    SCAN_SKIP_REQUEST_APPROVE: (id: number) => `/docking-admin/scan-skip-requests/${id}/approve/`,
    SCAN_SKIP_REQUEST_REJECT: (id: number) => `/docking-admin/scan-skip-requests/${id}/reject/`,
    PARTIAL_SCAN_REQUESTS: '/docking-admin/partial-scan-requests/',
    PARTIAL_SCAN_REQUEST_BY_DISPATCH: (entryId: number) =>
      `/docking-admin/partial-scan-requests/by-sales-dispatch/${entryId}/`,
    PARTIAL_SCAN_REQUEST_APPROVE: (id: number) =>
      `/docking-admin/partial-scan-requests/${id}/approve/`,
    PARTIAL_SCAN_REQUEST_REJECT: (id: number) =>
      `/docking-admin/partial-scan-requests/${id}/reject/`,
  },
  // Quality Control V2 (New QC Module)
  QUALITY_CONTROL_V2: {
    // Arrival Slips
    ARRIVAL_SLIP_LIST: '/quality-control/arrival-slips/',
    ARRIVAL_SLIP_CREATE: (poItemReceiptId: number) =>
      `/quality-control/po-items/${poItemReceiptId}/arrival-slip/`,
    ARRIVAL_SLIP_GET: (poItemReceiptId: number) =>
      `/quality-control/po-items/${poItemReceiptId}/arrival-slip/`,
    ARRIVAL_SLIP_BY_ID: (slipId: number) => `/quality-control/arrival-slips/${slipId}/`,
    ARRIVAL_SLIP_SUBMIT: (slipId: number) => `/quality-control/arrival-slips/${slipId}/submit/`,
    ARRIVAL_SLIP_SEND_BACK: (slipId: number) =>
      `/quality-control/arrival-slips/${slipId}/send-back/`,

    // Material Types
    MATERIAL_TYPES: '/quality-control/material-types/',
    MATERIAL_TYPE_BY_ID: (id: number) => `/quality-control/material-types/${id}/`,
    MATERIAL_TYPE_BY_SAP_ITEM: (itemCode: string) =>
      `/quality-control/material-types/by-sap-item/${encodeURIComponent(itemCode)}/`,
    MATERIAL_TYPE_LINK_SAP_ITEM: '/quality-control/material-types/link-sap-item/',
    MATERIAL_TYPE_PARAMETERS: (materialTypeId: number) =>
      `/quality-control/material-types/${materialTypeId}/parameters/`,
    SAP_ITEMS: '/quality-control/sap-items/',

    // QC Parameter Sets (one per vendor, plus a default for everyone else)
    MATERIAL_TYPE_PARAMETER_SETS: (materialTypeId: number) =>
      `/quality-control/material-types/${materialTypeId}/parameter-sets/`,
    PARAMETER_SET_BY_ID: (parameterSetId: number) =>
      `/quality-control/parameter-sets/${parameterSetId}/`,
    PARAMETER_SET_PARAMETERS: (parameterSetId: number) =>
      `/quality-control/parameter-sets/${parameterSetId}/parameters/`,
    PARAMETER_SET_COPY_PARAMETERS: (parameterSetId: number) =>
      `/quality-control/parameter-sets/${parameterSetId}/copy-parameters/`,

    // QC Print Documents
    PRINT_DOCUMENTS: '/quality-control/print-documents/',
    PRINT_DOCUMENT_BY_ID: (id: number) => `/quality-control/print-documents/${id}/`,

    // QC PDF Document Library
    QC_DOCUMENT_FILES: '/quality-control/document-files/',
    QC_DOCUMENT_FILE_BY_ID: (id: number) => `/quality-control/document-files/${id}/`,
    QC_DOCUMENT_FILE_DOWNLOAD: (id: number) => `/quality-control/document-files/${id}/download/`,

    // QC Record Forms (Documents) — blank forms and filled sheets
    RECORD_TEMPLATES: '/quality-control/record-templates/',
    RECORD_TEMPLATE_BY_ID: (id: number) => `/quality-control/record-templates/${id}/`,
    QC_RECORDS: '/quality-control/qc-records/',
    QC_RECORD_BY_ID: (id: number) => `/quality-control/qc-records/${id}/`,
    QC_RECORD_VALUES: (id: number) => `/quality-control/qc-records/${id}/values/`,
    QC_RECORD_SUBMIT: (id: number) => `/quality-control/qc-records/${id}/submit/`,
    QC_RECORD_APPROVE: (id: number) => `/quality-control/qc-records/${id}/approve/`,

    // Testing Procedures (QC Procedures)
    TESTING_PROCEDURES: '/quality-control/testing-procedures/',
    TESTING_PROCEDURE_COUNTS: '/quality-control/testing-procedures/counts/',
    TESTING_PROCEDURE_BY_ID: (id: number) => `/quality-control/testing-procedures/${id}/`,

    // QC Parameters
    QC_PARAMETER_BY_ID: (id: number) => `/quality-control/parameters/${id}/`,

    // Inspections
    INSPECTIONS_LIST: '/quality-control/inspections/',
    PENDING_INSPECTIONS: '/quality-control/inspections/pending/',
    DRAFT_INSPECTIONS: '/quality-control/inspections/draft/',
    ACTIONABLE_INSPECTIONS: '/quality-control/inspections/actionable/',
    AWAITING_CHEMIST: '/quality-control/inspections/awaiting-chemist/',
    AWAITING_QAM: '/quality-control/inspections/awaiting-qam/',
    COMPLETED_INSPECTIONS: '/quality-control/inspections/completed/',
    REJECTED_INSPECTIONS: '/quality-control/inspections/rejected/',
    RETURN_TO_VENDOR_INSPECTIONS: '/quality-control/inspections/return-to-vendor/',
    DECISION_CHANGED_INSPECTIONS: '/quality-control/inspections/decision-changed/',
    INSPECTION_COUNTS: '/quality-control/inspections/counts/',
    INSPECTION_BY_ID: (id: number) => `/quality-control/inspections/${id}/`,
    INSPECTION_FOR_SLIP: (slipId: number) => `/quality-control/arrival-slips/${slipId}/inspection/`,
    INSPECTION_PARAMETERS: (inspectionId: number) =>
      `/quality-control/inspections/${inspectionId}/parameters/`,
    INSPECTION_SUBMIT: (id: number) => `/quality-control/inspections/${id}/submit/`,

    // Approvals
    APPROVE_CHEMIST: (id: number) => `/quality-control/inspections/${id}/approve/chemist/`,
    APPROVE_QAM: (id: number) => `/quality-control/inspections/${id}/approve/qam/`,
    CHEMIST_DECISION: (id: number) => `/quality-control/inspections/${id}/chemist-decision/`,
    MANAGER_DECISION: (id: number) => `/quality-control/inspections/${id}/manager-decision/`,
    REJECT_INSPECTION: (id: number) => `/quality-control/inspections/${id}/reject/`,

    // Production QC
    PRODUCTION_QC_LIST: '/quality-control/production-qc/',
    PRODUCTION_QC_PENDING: '/quality-control/production-qc/pending/',
    PRODUCTION_QC_RUNNING_RUNS: '/quality-control/production-qc/running-runs/',
    PRODUCTION_QC_COUNTS: '/quality-control/production-qc/counts/',
    PRODUCTION_QC_RUN_SESSIONS: (runId: number) =>
      `/quality-control/production-qc/runs/${runId}/sessions/`,
    PRODUCTION_QC_FINAL_REQUEST: (runId: number) =>
      `/quality-control/production-qc/runs/${runId}/request-final/`,
    PRODUCTION_QC_SESSION_DETAIL: (sessionId: number) =>
      `/quality-control/production-qc/sessions/${sessionId}/`,
    PRODUCTION_QC_SESSION_RESULTS: (sessionId: number) =>
      `/quality-control/production-qc/sessions/${sessionId}/results/`,
    PRODUCTION_QC_SESSION_SUBMIT: (sessionId: number) =>
      `/quality-control/production-qc/sessions/${sessionId}/submit/`,
    PRODUCTION_QC_SESSION_APPROVE: (sessionId: number) =>
      `/quality-control/production-qc/sessions/${sessionId}/approve/`,
    PRODUCTION_QC_SESSION_REJECT: (sessionId: number) =>
      `/quality-control/production-qc/sessions/${sessionId}/reject/`,

    // Online Quality Monitoring
    ONLINE_MONITORING_LIST: '/quality-control/online-monitoring/',
    ONLINE_MONITORING_LINES: '/quality-control/online-monitoring/lines/',
    ONLINE_MONITORING_RUNS: '/quality-control/online-monitoring/runs/',
    ONLINE_MONITORING_SPECS: '/quality-control/online-monitoring/specs/',
    ONLINE_MONITORING_SPEC_DETAIL: (specId: number) =>
      `/quality-control/online-monitoring/specs/${specId}/`,
    ONLINE_MONITORING_DETAIL: (recordId: number) =>
      `/quality-control/online-monitoring/${recordId}/`,
    ONLINE_MONITORING_READINGS: (recordId: number) =>
      `/quality-control/online-monitoring/${recordId}/readings/`,
    ONLINE_MONITORING_READING_DETAIL: (recordId: number, readingId: number) =>
      `/quality-control/online-monitoring/${recordId}/readings/${readingId}/`,
    ONLINE_MONITORING_READING_ATTACHMENTS: (recordId: number, readingId: number) =>
      `/quality-control/online-monitoring/${recordId}/readings/${readingId}/attachments/`,
    ONLINE_MONITORING_READING_ATTACHMENT_DETAIL: (
      recordId: number,
      readingId: number,
      attachmentId: number,
    ) =>
      `/quality-control/online-monitoring/${recordId}/readings/${readingId}/attachments/${attachmentId}/`,
    ONLINE_MONITORING_SUBMIT: (recordId: number) =>
      `/quality-control/online-monitoring/${recordId}/submit/`,
    ONLINE_MONITORING_APPROVE: (recordId: number) =>
      `/quality-control/online-monitoring/${recordId}/approve/`,
    ONLINE_MONITORING_REJECT: (recordId: number) =>
      `/quality-control/online-monitoring/${recordId}/reject/`,
    ONLINE_MONITORING_REOPEN: (recordId: number) =>
      `/quality-control/online-monitoring/${recordId}/reopen/`,
  },
  // GRPO (Goods Receipt Purchase Order)
  GRPO: {
    SUMMARY: '/grpo/summary/',
    ALL_ENTRIES: '/grpo/all-entries/',
    PENDING: '/grpo/pending/',
    PREVIEW: (vehicleEntryId: number) => `/grpo/preview/${vehicleEntryId}/`,
    // SAP additional-expense master, for charges that are GRPO-only. Freight
    // agreed on the PO arrives pre-filled on the preview payload.
    EXPENSE_CODES: '/grpo/expense-codes/',
    INSPECTION_REPORT: (arrivalSlipId: number) => `/grpo/inspection-report/${arrivalSlipId}/`,
    POST: '/grpo/post/',
    DRAFT_CREATE: '/grpo/draft/',
    DRAFT_DETAIL: (postingId: number) => `/grpo/draft/${postingId}/`,
    DRAFT_POST: (postingId: number) => `/grpo/draft/${postingId}/post/`,
    HISTORY: '/grpo/history/',
    DETAIL: (postingId: number) => `/grpo/${postingId}/`,
    SERVICE_PENDING: '/grpo/service/pending/',
    SERVICE_OPTIONS: '/grpo/service/options/',
    SERVICE_PREVIEW: (dispatchPlanId: number) => `/grpo/service/preview/${dispatchPlanId}/`,
    SERVICE_POST: '/grpo/service/post/',
    SERVICE_HISTORY: '/grpo/service/history/',
    SERVICE_DETAIL: (postingId: number) => `/grpo/service/${postingId}/`,
    ATTACHMENTS: (postingId: number) => `/grpo/${postingId}/attachments/`,
    ATTACHMENT_DELETE: (postingId: number, attachmentId: number) =>
      `/grpo/${postingId}/attachments/${attachmentId}/`,
    ATTACHMENT_RETRY: (postingId: number, attachmentId: number) =>
      `/grpo/${postingId}/attachments/${attachmentId}/retry/`,
    // Finished-goods (traded FG) material GRPO — same machinery, FG-scoped, no QC
    FG_SUMMARY: '/grpo/fg/summary/',
    FG_ALL_ENTRIES: '/grpo/fg/all-entries/',
    FG_PENDING: '/grpo/fg/pending/',
    FG_PREVIEW: (vehicleEntryId: number) => `/grpo/fg/preview/${vehicleEntryId}/`,
    FG_POST: '/grpo/fg/post/',
    FG_HISTORY: '/grpo/fg/history/',
  },
  // Production Planning
  PRODUCTION_PLANNING: {
    LIST: '/production-planning/',
    CREATE: '/production-planning/',
    SUMMARY: '/production-planning/summary/',
    DETAIL: (planId: number) => `/production-planning/${planId}/`,
    POST_TO_SAP: (planId: number) => `/production-planning/${planId}/post-to-sap/`,
    CLOSE: (planId: number) => `/production-planning/${planId}/close/`,
    MATERIALS: (planId: number) => `/production-planning/${planId}/materials/`,
    MATERIAL_DELETE: (planId: number, materialId: number) =>
      `/production-planning/${planId}/materials/${materialId}/`,
    WEEKLY_PLANS: (planId: number) => `/production-planning/${planId}/weekly-plans/`,
    WEEKLY_PLAN_DETAIL: (planId: number, weekId: number) =>
      `/production-planning/${planId}/weekly-plans/${weekId}/`,
    DAILY_ENTRIES: (weekId: number) => `/production-planning/weekly-plans/${weekId}/daily-entries/`,
    DAILY_ENTRY_DETAIL: (weekId: number, entryId: number) =>
      `/production-planning/weekly-plans/${weekId}/daily-entries/${entryId}/`,
    DAILY_ENTRIES_ALL: '/production-planning/daily-entries/',
    DROPDOWN_ITEMS: '/production-planning/dropdown/items/',
    DROPDOWN_UOM: '/production-planning/dropdown/uom/',
    DROPDOWN_WAREHOUSES: '/production-planning/dropdown/warehouses/',
    DROPDOWN_BOM: '/production-planning/dropdown/bom/',
  },
  /**
   * Planning & Purchase.
   *
   * The plan is READ from SAP (`OFCT`/`FCT1`, which this factory uses as its
   * monthly production plan) — there is no create/update endpoint for it, on
   * purpose. Purchase orders are ours, and posting one to SAP is a separate
   * permission from raising or approving it.
   *
   * Note the prefix: `planning-purchase`, NOT `production-planning`. The latter
   * belongs to the deleted predecessor whose constants are still in
   * `PRODUCTION_PLANNING` above and whose backend no longer exists — keeping the
   * two apart means those dead calls cannot start hitting these live endpoints.
   */
  PLANNING_PURCHASE: {
    PLANS: '/planning-purchase/plans/',
    PLAN_DETAIL: (absId: number) => `/planning-purchase/plans/${absId}/`,
    PLAN_REQUIREMENT: (absId: number) => `/planning-purchase/plans/${absId}/requirement/`,
    PLAN_PRODUCIBLE: (absId: number) => `/planning-purchase/plans/${absId}/producible/`,
    PLAN_REQUIREMENT_EXPORT: (absId: number) =>
      `/planning-purchase/plans/${absId}/requirement/export/`,
    COMMITMENTS: '/planning-purchase/commitments/',
    VENDORS: '/planning-purchase/vendors/',
    WAREHOUSES: '/planning-purchase/warehouses/',
    PURCHASE_ORDERS: '/planning-purchase/purchase-orders/',
    PURCHASE_ORDER_DETAIL: (id: number) => `/planning-purchase/purchase-orders/${id}/`,
    PURCHASE_ORDER_APPROVE: (id: number) => `/planning-purchase/purchase-orders/${id}/approve/`,
    PURCHASE_ORDER_POST: (id: number) => `/planning-purchase/purchase-orders/${id}/post-to-sap/`,
  },
  // Stock Dashboard
  STOCK_DASHBOARD: {
    LIST: '/dashboards/stock/',
    AS_OF: '/dashboards/stock/as-of/',
    EXPORT: '/dashboards/stock/export/',
    ITEM_DETAIL: (itemCode: string) => `/dashboards/stock/${itemCode}/warehouses/`,
  },
  // Budget Approvals Dashboard — Factory budget draft approvals read from
  // SAP's DRAFT_APPROVAL_Budget procedure (Oil + Beverages in one feed).
  BUDGET_APPROVALS: {
    REPORT: '/dashboards/budget-approvals/report/',
    COLUMN_VALUES: '/dashboards/budget-approvals/column-values/',
  },
  // Non-Moving RM Dashboard
  NON_MOVING_RM: {
    REPORT: '/non-moving-rm/report/',
    ITEM_GROUPS: '/non-moving-rm/item-groups/',
  },
  // Factory Expense wall board — labour, salary, electricity and maintenance,
  // all from FactoryFlow's own registers rather than SAP.
  FACTORY_EXPENSE: {
    BOARD: '/dashboards/factory-expense/board/',
    SETTINGS: '/dashboards/factory-expense/settings/',
    // Read-back only. Rates are owned by cost_master and edited in
    // Admin > Cost Master; the board never writes one.
    RATES: '/dashboards/factory-expense/rates/',
    BUDGETS: '/dashboards/factory-expense/budgets/',
    BUDGET_DETAIL: (id: number) => `/dashboards/factory-expense/budgets/${id}/`,
  },
  // Sales Planning vs Requirement Dashboard
  SALES_PLANNING_REQUIREMENT: {
    REPORT: '/dashboards/sales-planning-requirement/report/',
    STATUS: '/dashboards/sales-planning-requirement/status/',
    ANALYSIS: '/dashboards/sales-planning-requirement/analysis/',
    REFRESH: '/dashboards/sales-planning-requirement/refresh/',
  },
  // Goods Return (customer returns)
  SAP_REPORTS: {
    LIST: '/sap-reports/reports/',
    BY_SLUG: (slug: string) => `/sap-reports/reports/${slug}/`,
    SQL: (slug: string) => `/sap-reports/reports/${slug}/sql/`,
    RUN: (slug: string) => `/sap-reports/reports/${slug}/run/`,
    EXPORT: (slug: string) => `/sap-reports/reports/${slug}/export/`,
    PARAMETER_OPTIONS: (slug: string, position: number) =>
      `/sap-reports/reports/${slug}/parameters/${position}/options/`,
    REPORT_RUNS: (slug: string) => `/sap-reports/reports/${slug}/runs/`,
    RUNS: '/sap-reports/runs/',
    CATEGORIES: '/sap-reports/categories/',
    SYNC: '/sap-reports/sync/',
    ACCESS: '/sap-reports/access/',
    ACCESS_DETAIL: (id: number) => `/sap-reports/access/${id}/`,
  },
  GOODS_RETURN: {
    LIST: '/goods-return/',
    CREATE: '/goods-return/',
    BY_ID: (id: number) => `/goods-return/${id}/`,
    INVOICE_REFS: (id: number) => `/goods-return/${id}/invoice-refs/`,
    INVOICE_REF_BY_ID: (id: number, refId: number) => `/goods-return/${id}/invoice-refs/${refId}/`,
    ITEMS: (id: number) => `/goods-return/${id}/items/`,
    RETURNABLE_ITEMS: (id: number) => `/goods-return/${id}/returnable-items/`,
    VEHICLE: (id: number) => `/goods-return/${id}/vehicle/`,
    ATTACHMENTS: (id: number) => `/goods-return/${id}/attachments/`,
    ATTACHMENT_BY_ID: (id: number, attachmentId: number) =>
      `/goods-return/${id}/attachments/${attachmentId}/`,
    SUBMIT: (id: number) => `/goods-return/${id}/submit/`,
    RECEIVE: (id: number) => `/goods-return/${id}/receive/`,
    APPROVE: (id: number) => `/goods-return/${id}/approve/`,
    REJECT: (id: number) => `/goods-return/${id}/reject/`,
    WAREHOUSES: '/goods-return/warehouses/',
    GATE_EXPECTED: '/goods-return/gate/expected/',
    GATE_MARK_IN: (id: number) => `/goods-return/gate/${id}/mark-in/`,
  },
  // Dispatch Plans Dashboard
  DISPATCH_PLANS: {
    BILLS: '/dispatch-plans/bills/',
    BILL_SELECTION: '/dispatch-plans/bills/selection/',
    BILL_BY_NUMBER: (invoiceNumber: string) =>
      `/dispatch-plans/bills/by-number/${encodeURIComponent(invoiceNumber)}/`,
    PLAN: (docEntry: number) => `/dispatch-plans/bills/${docEntry}/plan/`,
    PLAN_REMOVE: (docEntry: number) => `/dispatch-plans/bills/${docEntry}/plan/remove/`,
    BULK_DISPATCH_DATE: '/dispatch-plans/bills/plan/bulk-dispatch-date/',
  },
  // Dispatch Pipeline Dashboard (vehicle stage board)
  DISPATCH_PIPELINE: {
    BOARD: '/dispatch-plans/pipeline/',
  },
  // Dispatch Fulfilment Dashboard (billed vs planned vs dispatched)
  DISPATCH_FULFILMENT: {
    SUMMARY: '/dispatch-plans/dashboard/summary/',
    BILLS: '/dispatch-plans/dashboard/bills/',
  },
  // Dispatch
  DISPATCH: {
    // Bill summary — the picking sheet the warehouse floor works from.
    BILL_SUMMARY_LOOKUP: '/dispatch/bill-summaries/lookup/',
    BILL_SUMMARIES: '/dispatch/bill-summaries/',
    BILL_SUMMARY_DETAIL: (id: number) => `/dispatch/bill-summaries/${id}/`,
    BILL_SUMMARY_PICK: (id: number) => `/dispatch/bill-summaries/${id}/pick/`,
    BILL_SUMMARY_STAMP_SAP: (id: number) => `/dispatch/bill-summaries/${id}/stamp-sap/`,
    BILL_SUMMARY_CANCEL: (id: number) => `/dispatch/bill-summaries/${id}/cancel/`,

    OPEN_BILTIES: '/dispatch/open-bilties/',
    BILTY_GRPO_PENDING: '/dispatch/bilty-grpo/pending/',
    BILTY_GRPO_OPTIONS: '/dispatch/bilty-grpo/options/',
    BILTY_GRPO_PREVIEW: (dispatchPlanId: number) =>
      `/dispatch/bilty-grpo/preview/${dispatchPlanId}/`,
    BILTY_GRPO_POST: '/dispatch/bilty-grpo/post/',
    BILTY_GRPO_ATTACHMENT: (dispatchPlanId: number) =>
      `/dispatch/bilty-grpo/attachment/${dispatchPlanId}/`,
    BILTY_GRPO_SUMMARY: '/dispatch/bilty-grpo/summary/',
    BILTY_GRPO_HISTORY: '/dispatch/bilty-grpo/history/',
    BILTY_GRPO_DETAIL: (postingId: number) => `/dispatch/bilty-grpo/${postingId}/`,
    TRANSPORTER_INVOICE_PREVIEW: '/dispatch/transporter-invoices/preview/',
    TRANSPORTER_INVOICE_SUBMIT: '/dispatch/transporter-invoices/submit/',
    TRANSPORTER_INVOICE_POST_AP_INVOICE: '/dispatch/transporter-invoices/post-ap-invoice/',
    TRANSPORTER_INVOICE_POST_SUBMITTED: (postingId: number) =>
      `/dispatch/transporter-invoices/${postingId}/post-ap-invoice/`,
    TRANSPORTER_INVOICE_HISTORY: '/dispatch/transporter-invoices/history/',
    TRANSPORTER_INVOICE_DETAIL: (postingId: number) =>
      `/dispatch/transporter-invoices/${postingId}/`,
  },
  // Invoice Approval (SAP approval requests on A/R invoice drafts, read/decided directly in SAP)
  INVOICE_APPROVAL: {
    INVOICES: '/invoice-approvals/invoices/',
    INVOICE_STATUS: (id: number) => `/invoice-approvals/invoices/${id}/status/`,
    INVOICE_HISTORY: (id: number) => `/invoice-approvals/invoices/${id}/history/`,
    INVOICE_PENDING_COUNT: '/invoice-approvals/invoices/pending-count/',
    INVOICE_AUDIT: (id: number) => `/invoice-approvals/invoices/${id}/audit/`,
  },
  // Daily Tasks — each user's job sheet for one day, derived from every other module
  DAILY_TASKS: {
    MY_TODAY: '/activity-center/me/today/',
    TEAM_TODAY: '/activity-center/users/today/',
  },
  // AI Assistant
  AI: {
    ASSISTANT_CHAT: '/ai/assistant/chat/',
  },
  // Maintenance
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
    WORK_ORDER_APPROVE: (workOrderId: number) => `/maintenance/work-orders/${workOrderId}/approve/`,
    WORK_ORDER_CLOSE: (workOrderId: number) => `/maintenance/work-orders/${workOrderId}/close/`,
    WORK_ORDER_SEND_BACK: (workOrderId: number) =>
      `/maintenance/work-orders/${workOrderId}/send-back/`,
    WORK_ORDER_LOGS: (workOrderId: number) => `/maintenance/work-orders/${workOrderId}/logs/`,
    WORK_ORDER_SET_STATUS: (workOrderId: number) =>
      `/maintenance/work-orders/${workOrderId}/set-status/`,
    WORK_ORDER_REQUEST_SPARE: (workOrderId: number) =>
      `/maintenance/work-orders/${workOrderId}/request-spare/`,
    WORK_ORDER_PHOTOS: '/maintenance/work-order-photos/',
    WORK_ORDER_ATTACHMENTS: '/maintenance/work-order-attachments/',
    WORK_ORDER_ATTACHMENT_DETAIL: (attachmentId: number) =>
      `/maintenance/work-order-attachments/${attachmentId}/`,
    PM_PLANS: '/maintenance/pm-plans/',
    PM_PLAN_DETAIL: (planId: number) => `/maintenance/pm-plans/${planId}/`,
    PM_PLAN_GENERATE: (planId: number) => `/maintenance/pm-plans/${planId}/generate/`,
    PM_PLANS_GENERATE_DUE: '/maintenance/pm-plans/generate-due/',
    PM_CHECKLIST_ITEMS: '/maintenance/pm-checklist-items/',
    PM_CHECKLIST_ITEM_DETAIL: (itemId: number) => `/maintenance/pm-checklist-items/${itemId}/`,
    PM_EXECUTIONS: '/maintenance/pm-executions/',
    PM_EXECUTION_DETAIL: (executionId: number) => `/maintenance/pm-executions/${executionId}/`,
    PM_EXECUTION_START: (executionId: number) => `/maintenance/pm-executions/${executionId}/start/`,
    PM_EXECUTION_COMPLETE: (executionId: number) =>
      `/maintenance/pm-executions/${executionId}/complete/`,
    PM_EXECUTION_SKIP: (executionId: number) => `/maintenance/pm-executions/${executionId}/skip/`,
    SPARE_CATEGORIES: '/maintenance/spare-categories/',
    SPARE_CATEGORY_DETAIL: (categoryId: number) => `/maintenance/spare-categories/${categoryId}/`,
    SPARES: '/maintenance/spares/',
    SPARE_DETAIL: (spareId: number) => `/maintenance/spares/${spareId}/`,
    SPARES_LOW_STOCK: '/maintenance/spares/low-stock/',
    SPARE_ADJUST_STOCK: (spareId: number) => `/maintenance/spares/${spareId}/adjust-stock/`,
    SPARE_REQUESTS: '/maintenance/spare-requests/',
    SPARE_REQUEST_DETAIL: (requestId: number) => `/maintenance/spare-requests/${requestId}/`,
    SPARE_REQUEST_ISSUE: (requestId: number) => `/maintenance/spare-requests/${requestId}/issue/`,
    SPARE_REQUEST_CONSUME: (requestId: number) =>
      `/maintenance/spare-requests/${requestId}/consume/`,
    SPARE_REQUEST_RETURN_UNUSED: (requestId: number) =>
      `/maintenance/spare-requests/${requestId}/return-unused/`,
    SPARE_REQUEST_CANCEL: (requestId: number) => `/maintenance/spare-requests/${requestId}/cancel/`,
    SPARE_MOVEMENTS: '/maintenance/spare-movements/',
    // Fire department store — mirrors the spare store contract with its own data.
    FIRE_CATEGORIES: '/maintenance/fire-categories/',
    FIRE_CATEGORY_DETAIL: (categoryId: number) => `/maintenance/fire-categories/${categoryId}/`,
    FIRE_ITEMS: '/maintenance/fire/',
    FIRE_ITEM_DETAIL: (itemId: number) => `/maintenance/fire/${itemId}/`,
    FIRE_ITEMS_LOW_STOCK: '/maintenance/fire/low-stock/',
    FIRE_ITEM_ADJUST_STOCK: (itemId: number) => `/maintenance/fire/${itemId}/adjust-stock/`,
    FIRE_REQUESTS: '/maintenance/fire-requests/',
    FIRE_REQUEST_DETAIL: (requestId: number) => `/maintenance/fire-requests/${requestId}/`,
    FIRE_REQUEST_ISSUE: (requestId: number) => `/maintenance/fire-requests/${requestId}/issue/`,
    FIRE_REQUEST_CONSUME: (requestId: number) => `/maintenance/fire-requests/${requestId}/consume/`,
    FIRE_REQUEST_RETURN_UNUSED: (requestId: number) =>
      `/maintenance/fire-requests/${requestId}/return-unused/`,
    FIRE_REQUEST_CANCEL: (requestId: number) => `/maintenance/fire-requests/${requestId}/cancel/`,
    FIRE_MOVEMENTS: '/maintenance/fire-movements/',
    // Fire shift reports — daily/shift equipment inspection with photos.
    FIRE_REPORTS: '/maintenance/fire-reports/',
    FIRE_REPORT_DETAIL: (reportId: number) => `/maintenance/fire-reports/${reportId}/`,
    FIRE_REPORT_REVIEW: (reportId: number) => `/maintenance/fire-reports/${reportId}/review/`,
    FIRE_REPORT_ITEMS: '/maintenance/fire-report-items/',
    FIRE_REPORT_ITEM_DETAIL: (itemId: number) => `/maintenance/fire-report-items/${itemId}/`,
    FIRE_REPORT_PHOTOS: '/maintenance/fire-report-photos/',
    FIRE_REPORT_PHOTO_DETAIL: (photoId: number) => `/maintenance/fire-report-photos/${photoId}/`,
    FIRE_REPORT_ATTACHMENTS: '/maintenance/fire-report-attachments/',
    FIRE_REPORT_ATTACHMENT_DETAIL: (attachmentId: number) =>
      `/maintenance/fire-report-attachments/${attachmentId}/`,
    // Fire equipment issue / return register.
    FIRE_ISSUES: '/maintenance/fire-issues/',
    FIRE_ISSUE_DETAIL: (issueId: number) => `/maintenance/fire-issues/${issueId}/`,
    FIRE_ISSUE_RETURN: (issueId: number) => `/maintenance/fire-issues/${issueId}/return/`,
    // Material indent — requisition that becomes a gate pass on approval.
    MATERIAL_INDENTS: '/maintenance/material-indents/',
    MATERIAL_INDENT_DETAIL: (indentId: number) => `/maintenance/material-indents/${indentId}/`,
    MATERIAL_INDENT_SUBMIT: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/submit/`,
    MATERIAL_INDENT_REVIEW: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/review/`,
    MATERIAL_INDENT_APPROVE: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/approve/`,
    MATERIAL_INDENT_PURCHASE: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/purchase/`,
    MATERIAL_INDENT_GATE_IN: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/gate-in/`,
    MATERIAL_INDENT_RECEIVE: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/receive/`,
    MATERIAL_INDENT_REJECT: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/reject/`,
    MATERIAL_INDENT_CANCEL: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/cancel/`,
    MATERIAL_INDENT_ATTACHMENTS: '/maintenance/material-indent-attachments/',
    MATERIAL_INDENT_ATTACHMENT_DETAIL: (attachmentId: number) =>
      `/maintenance/material-indent-attachments/${attachmentId}/`,
    // Quotation round — purchaser collects company prices, approver picks one.
    MATERIAL_INDENT_QUOTATIONS: '/maintenance/material-indent-quotations/',
    MATERIAL_INDENT_QUOTATION_DETAIL: (quotationId: number) =>
      `/maintenance/material-indent-quotations/${quotationId}/`,
    MATERIAL_INDENT_SUBMIT_QUOTATIONS: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/submit-quotations/`,
    MATERIAL_INDENT_SELECT_QUOTATION: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/select-quotation/`,
    MATERIAL_INDENT_RETURN_QUOTATIONS: (indentId: number) =>
      `/maintenance/material-indents/${indentId}/return-quotations/`,
    // Safety fines — PPE violations recorded by the Fire Department Head.
    SAFETY_VIOLATION_TYPES: '/maintenance/safety-violation-types/',
    SAFETY_VIOLATION_TYPE_DETAIL: (typeId: number) =>
      `/maintenance/safety-violation-types/${typeId}/`,
    SAFETY_FINES: '/maintenance/safety-fines/',
    SAFETY_FINE_DETAIL: (fineId: number) => `/maintenance/safety-fines/${fineId}/`,
    SAFETY_FINE_SETTLE: (fineId: number) => `/maintenance/safety-fines/${fineId}/settle/`,
    SAFETY_FINE_PHOTOS: '/maintenance/safety-fine-photos/',
    SAFETY_FINE_PHOTO_DETAIL: (photoId: number) => `/maintenance/safety-fine-photos/${photoId}/`,
    // Work permit (permit-to-work) — hazardous job clearance workflow.
    WORK_PERMITS: '/maintenance/work-permits/',
    WORK_PERMIT_DETAIL: (permitId: number) => `/maintenance/work-permits/${permitId}/`,
    WORK_PERMIT_SUBMIT: (permitId: number) => `/maintenance/work-permits/${permitId}/submit/`,
    WORK_PERMIT_APPROVE: (permitId: number) => `/maintenance/work-permits/${permitId}/approve/`,
    WORK_PERMIT_START: (permitId: number) => `/maintenance/work-permits/${permitId}/start/`,
    WORK_PERMIT_RENEW: (permitId: number) => `/maintenance/work-permits/${permitId}/renew/`,
    WORK_PERMIT_COMPLETE: (permitId: number) => `/maintenance/work-permits/${permitId}/complete/`,
    WORK_PERMIT_CLOSE: (permitId: number) => `/maintenance/work-permits/${permitId}/close/`,
    WORK_PERMIT_CANCEL: (permitId: number) => `/maintenance/work-permits/${permitId}/cancel/`,
    WORK_PERMIT_WORKERS: '/maintenance/work-permit-workers/',
    WORK_PERMIT_WORKER_DETAIL: (workerId: number) =>
      `/maintenance/work-permit-workers/${workerId}/`,
    WORK_PERMIT_ATTACHMENTS: '/maintenance/work-permit-attachments/',
    WORK_PERMIT_ATTACHMENT_DETAIL: (attachmentId: number) =>
      `/maintenance/work-permit-attachments/${attachmentId}/`,
    VENDOR_VISITS: '/maintenance/vendor-visits/',
    VENDOR_VISIT_DETAIL: (visitId: number) => `/maintenance/vendor-visits/${visitId}/`,
    VENDOR_VISIT_START: (visitId: number) => `/maintenance/vendor-visits/${visitId}/start/`,
    VENDOR_VISIT_COMPLETE: (visitId: number) => `/maintenance/vendor-visits/${visitId}/complete/`,
    VENDOR_VISIT_CANCEL: (visitId: number) => `/maintenance/vendor-visits/${visitId}/cancel/`,
    // Daily registers — factory-wide electricity readings and wastage logs.
    ELECTRICITY_METERS: '/maintenance/electricity-meters/',
    ELECTRICITY_METER_DETAIL: (meterId: number) => `/maintenance/electricity-meters/${meterId}/`,
    DAILY_ELECTRICITY_READINGS: '/maintenance/daily-electricity-readings/',
    DAILY_ELECTRICITY_READING_DETAIL: (readingId: number) =>
      `/maintenance/daily-electricity-readings/${readingId}/`,
    DAILY_WASTAGE_LOGS: '/maintenance/daily-wastage-logs/',
    DAILY_WASTAGE_LOG_DETAIL: (logId: number) => `/maintenance/daily-wastage-logs/${logId}/`,
  },
  // Returnable Items — material that leaves the gate temporarily and must come back.
  // Raised by a department, approved by a higher authority, gated out and gated
  // back in by the gate, then closed by the department.
  RETURNABLE: {
    GATEPASSES: '/returnable-items/returnable-gatepasses/',
    GATEPASS_DETAIL: (passId: number) => `/returnable-items/returnable-gatepasses/${passId}/`,
    // Stage 1 — department sends the pass to the higher authority.
    SUBMIT: (passId: number) => `/returnable-items/returnable-gatepasses/${passId}/submit/`,
    // Stage 2 — higher authority signs off, or sends it back to the department.
    // The gate never sees an unapproved pass.
    APPROVE: (passId: number) => `/returnable-items/returnable-gatepasses/${passId}/approve/`,
    REJECT: (passId: number) => `/returnable-items/returnable-gatepasses/${passId}/reject/`,
    // Stage 3 — gate fills vehicle details and lets the material out, or bounces it back.
    GATE_OUT: (passId: number) => `/returnable-items/returnable-gatepasses/${passId}/gate-out/`,
    REJECT_AT_GATE: (passId: number) =>
      `/returnable-items/returnable-gatepasses/${passId}/reject-at-gate/`,
    // Stage 4 — gate records a return trip (partial returns allowed, several per pass).
    RECORD_RETURN: (passId: number) =>
      `/returnable-items/returnable-gatepasses/${passId}/record-return/`,
    // Stage 5 — department collects from the gate, then closes.
    ACKNOWLEDGE: (passId: number) =>
      `/returnable-items/returnable-gatepasses/${passId}/acknowledge/`,
    CLOSE: (passId: number) => `/returnable-items/returnable-gatepasses/${passId}/close/`,
    SHORT_CLOSE: (passId: number) =>
      `/returnable-items/returnable-gatepasses/${passId}/short-close/`,
    CANCEL: (passId: number) => `/returnable-items/returnable-gatepasses/${passId}/cancel/`,
    TIMELINE: (passId: number) => `/returnable-items/returnable-gatepasses/${passId}/timeline/`,
    // Queues.
    PENDING_APPROVAL: '/returnable-items/returnable-gatepasses/pending-approval/',
    PENDING_GATE_OUT: '/returnable-items/returnable-gatepasses/pending-gate-out/',
    PENDING_GATE_IN: '/returnable-items/returnable-gatepasses/pending-gate-in/',
    ITEMS: '/returnable-items/returnable-gatepass-items/',
    ITEM_DETAIL: (itemId: number) => `/returnable-items/returnable-gatepass-items/${itemId}/`,
    RETURN_EVENTS: '/returnable-items/returnable-return-events/',
    ATTACHMENTS: '/returnable-items/returnable-attachments/',
    ATTACHMENT_DETAIL: (attachmentId: number) =>
      `/returnable-items/returnable-attachments/${attachmentId}/`,
    DASHBOARD: '/returnable-items/dashboard/',
    REPORTS: '/returnable-items/reports/',
    OPTIONS: '/returnable-items/options/',
    /** Omni-search over the SAP item master (OITM), live from HANA. */
    SAP_ITEMS: '/returnable-items/sap-items/',
  },
  // Blowing (preform -> bottle)
  PRODUCTION_BLOWING: {
    // Master data
    MACHINES: '/blowing/machines/',
    MACHINE_DETAIL: (machineId: number) => `/blowing/machines/${machineId}/`,
    PREFORM_SPECS: '/blowing/preform-specs/',
    PREFORM_SPEC_DETAIL: (specId: number) => `/blowing/preform-specs/${specId}/`,
    RATE_CONFIGS: '/blowing/rate-configs/',
    RATE_CONFIG_DETAIL: (configId: number) => `/blowing/rate-configs/${configId}/`,
    // Cost rates moved to the central Cost Master (COST_MASTER block below).
    BUY_PRICES: '/blowing/buy-prices/',
    BUY_PRICE_DETAIL: (buyId: number) => `/blowing/buy-prices/${buyId}/`,
    // Runs
    RUNS: '/blowing/runs/',
    RUN_DETAIL: (runId: number) => `/blowing/runs/${runId}/`,
    RUN_COMPLETE: (runId: number) => `/blowing/runs/${runId}/complete/`,
    RUN_COST: (runId: number) => `/blowing/runs/${runId}/cost/`,
    // Run lifecycle
    START_PRODUCTION: (runId: number) => `/blowing/runs/${runId}/start-production/`,
    STOP_PRODUCTION: (runId: number) => `/blowing/runs/${runId}/stop-production/`,
    ADD_BREAKDOWN: (runId: number) => `/blowing/runs/${runId}/add-breakdown/`,
    ADD_MANUAL_SEGMENT: (runId: number) => `/blowing/runs/${runId}/segments/manual/`,
    ADD_MANUAL_BREAKDOWN: (runId: number) => `/blowing/runs/${runId}/breakdowns/manual/`,
    RESOLVE_BREAKDOWN: (runId: number, breakdownId: number) =>
      `/blowing/runs/${runId}/breakdowns/${breakdownId}/resolve/`,
    SEGMENT_UPDATE: (runId: number, segmentId: number) =>
      `/blowing/runs/${runId}/segments/${segmentId}/`,
    BREAKDOWN_CATEGORIES: '/blowing/breakdown-categories/',
    BREAKDOWN_CATEGORY_DETAIL: (categoryId: number) =>
      `/blowing/breakdown-categories/${categoryId}/`,
    // Preform request — raised into the Warehouse BOM-request queue
    SUBMIT_PREFORM_REQUEST: (runId: number) => `/blowing/runs/${runId}/preform-request/`,
    // Reports
    REPORT_DAILY: '/blowing/reports/daily/',
    REPORT_MONTHLY: '/blowing/reports/monthly/',
    REPORT_MAKE_VS_BUY: '/blowing/reports/make-vs-buy/',
    REPORT_VARIANCES: '/blowing/reports/variances/',
    AUDIT: '/blowing/audit/',
    // SAP item pickers (read-only)
    SAP_ITEMS: '/blowing/sap/items/',
  },
  // Production Execution
  PRODUCTION_EXECUTION: {
    // Production Lines
    LINES: '/production-execution/lines/',
    LINE_DETAIL: (lineId: number) => `/production-execution/lines/${lineId}/`,
    // Machines
    MACHINES: '/production-execution/machines/',
    MACHINE_DETAIL: (machineId: number) => `/production-execution/machines/${machineId}/`,
    // Checklist Templates
    CHECKLIST_TEMPLATES: '/production-execution/checklist-templates/',
    CHECKLIST_TEMPLATE_DETAIL: (templateId: number) =>
      `/production-execution/checklist-templates/${templateId}/`,
    // Production Runs
    RUNS: '/production-execution/runs/',
    RUN_DETAIL: (runId: number) => `/production-execution/runs/${runId}/`,
    RUN_COMPLETE: (runId: number) => `/production-execution/runs/${runId}/complete/`,
    // Breakdown Categories
    BREAKDOWN_CATEGORIES: '/production-execution/breakdown-categories/',
    BREAKDOWN_CATEGORY_DETAIL: (categoryId: number) =>
      `/production-execution/breakdown-categories/${categoryId}/`,
    // Breakdowns
    RUN_BREAKDOWNS: (runId: number) => `/production-execution/runs/${runId}/breakdowns/`,
    RUN_BREAKDOWN_DETAIL: (runId: number, breakdownId: number) =>
      `/production-execution/runs/${runId}/breakdowns/${breakdownId}/`,
    // Materials
    RUN_MATERIALS: (runId: number) => `/production-execution/runs/${runId}/materials/`,
    RUN_MATERIAL_DETAIL: (runId: number, materialId: number) =>
      `/production-execution/runs/${runId}/materials/${materialId}/`,
    // Machine Runtime
    RUN_MACHINE_RUNTIME: (runId: number) => `/production-execution/runs/${runId}/machine-runtime/`,
    RUN_MACHINE_RUNTIME_DETAIL: (runId: number, runtimeId: number) =>
      `/production-execution/runs/${runId}/machine-runtime/${runtimeId}/`,
    // Manpower
    RUN_MANPOWER: (runId: number) => `/production-execution/runs/${runId}/manpower/`,
    RUN_MANPOWER_DETAIL: (runId: number, manpowerId: number) =>
      `/production-execution/runs/${runId}/manpower/${manpowerId}/`,
    // Line Clearance
    LINE_CLEARANCE: '/production-execution/line-clearance/',
    LINE_CLEARANCE_DETAIL: (clearanceId: number) =>
      `/production-execution/line-clearance/${clearanceId}/`,
    LINE_CLEARANCE_SUBMIT: (clearanceId: number) =>
      `/production-execution/line-clearance/${clearanceId}/submit/`,
    LINE_CLEARANCE_APPROVE: (clearanceId: number) =>
      `/production-execution/line-clearance/${clearanceId}/approve/`,
    LINE_CLEARANCE_HOLD: (clearanceId: number) =>
      `/production-execution/line-clearance/${clearanceId}/hold/`,
    LINE_CLEARANCE_REOPEN: (clearanceId: number) =>
      `/production-execution/line-clearance/${clearanceId}/reopen/`,
    LINE_CLEARANCE_MANAGER_DECISION: (clearanceId: number) =>
      `/production-execution/line-clearance/${clearanceId}/manager-decision/`,
    LINE_CLEARANCE_ATTACHMENTS: (clearanceId: number) =>
      `/production-execution/line-clearance/${clearanceId}/attachments/`,
    LINE_CLEARANCE_ATTACHMENT_DETAIL: (clearanceId: number, attachmentId: number) =>
      `/production-execution/line-clearance/${clearanceId}/attachments/${attachmentId}/`,
    // Machine Checklists
    MACHINE_CHECKLISTS: '/production-execution/machine-checklists/',
    MACHINE_CHECKLIST_DETAIL: (entryId: number) =>
      `/production-execution/machine-checklists/${entryId}/`,
    MACHINE_CHECKLISTS_BULK: '/production-execution/machine-checklists/bulk/',
    // Waste Management
    WASTE: '/production-execution/waste/',
    WASTE_DETAIL: (wasteId: number) => `/production-execution/waste/${wasteId}/`,
    WASTE_APPROVE: (wasteId: number) => `/production-execution/waste/${wasteId}/approve/`,
    WASTE_APPROVE_ENGINEER: (wasteId: number) =>
      `/production-execution/waste/${wasteId}/approve/engineer/`,
    WASTE_APPROVE_AM: (wasteId: number) => `/production-execution/waste/${wasteId}/approve/am/`,
    WASTE_APPROVE_STORE: (wasteId: number) =>
      `/production-execution/waste/${wasteId}/approve/store/`,
    WASTE_APPROVE_HOD: (wasteId: number) => `/production-execution/waste/${wasteId}/approve/hod/`,
    // Resources
    RUN_ELECTRICITY: (runId: number) =>
      `/production-execution/runs/${runId}/resources/electricity/`,
    RUN_ELECTRICITY_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/electricity/${entryId}/`,
    RUN_WATER: (runId: number) => `/production-execution/runs/${runId}/resources/water/`,
    RUN_WATER_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/water/${entryId}/`,
    RUN_GAS: (runId: number) => `/production-execution/runs/${runId}/resources/gas/`,
    RUN_GAS_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/gas/${entryId}/`,
    RUN_COMPRESSED_AIR: (runId: number) =>
      `/production-execution/runs/${runId}/resources/compressed-air/`,
    RUN_COMPRESSED_AIR_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/compressed-air/${entryId}/`,
    RUN_LABOUR: (runId: number) => `/production-execution/runs/${runId}/resources/labour/`,
    RUN_LABOUR_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/labour/${entryId}/`,
    RUN_MACHINE_COSTS: (runId: number) =>
      `/production-execution/runs/${runId}/resources/machine-costs/`,
    RUN_MACHINE_COSTS_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/machine-costs/${entryId}/`,
    RUN_OVERHEAD: (runId: number) => `/production-execution/runs/${runId}/resources/overhead/`,
    RUN_OVERHEAD_DETAIL: (runId: number, entryId: number) =>
      `/production-execution/runs/${runId}/resources/overhead/${entryId}/`,
    // Cost
    RUN_COST: (runId: number) => `/production-execution/runs/${runId}/cost/`,
    COST_ANALYTICS: '/production-execution/costs/analytics/',
    // QC
    RUN_QC_INPROCESS: (runId: number) => `/production-execution/runs/${runId}/qc/inprocess/`,
    RUN_QC_INPROCESS_DETAIL: (runId: number, checkId: number) =>
      `/production-execution/runs/${runId}/qc/inprocess/${checkId}/`,
    RUN_QC_FINAL: (runId: number) => `/production-execution/runs/${runId}/qc/final/`,
    // SAP Orders & BOM
    SAP_ORDERS: '/production-execution/sap/orders/',
    SAP_ORDER_DETAIL: (docEntry: number) => `/production-execution/sap/orders/${docEntry}/`,
    SAP_ITEMS: '/production-execution/sap/items/',
    SAP_BOM: '/production-execution/sap/bom/',
    // Reports
    REPORTS_DAILY: '/production-execution/reports/daily-production/',
    REPORTS_YIELD: (runId: number) => `/production-execution/reports/yield/${runId}/`,
    REPORTS_LINE_CLEARANCE: '/production-execution/reports/line-clearance/',
    REPORTS_ANALYTICS: '/production-execution/reports/analytics/',
    REPORTS_OEE: '/production-execution/reports/analytics/oee/',
    REPORTS_DOWNTIME: '/production-execution/reports/analytics/downtime/',
    REPORTS_WASTE_ANALYTICS: '/production-execution/reports/analytics/waste/',
    REPORTS_RESOURCE_CONSUMPTION: '/production-execution/reports/analytics/resource-consumption/',
    REPORTS_MONTHLY_SUMMARY: '/production-execution/reports/analytics/monthly-summary/',
    REPORTS_PLAN_VS_PRODUCTION: '/production-execution/reports/analytics/plan-vs-production/',
    REPORTS_PROCUREMENT_VS_PLANNED:
      '/production-execution/reports/analytics/procurement-vs-planned/',
    REPORTS_OEE_TREND: '/production-execution/reports/analytics/oee-trend/',
    REPORTS_DOWNTIME_PARETO: '/production-execution/reports/analytics/downtime-pareto/',
    REPORTS_COST_ANALYSIS: '/production-execution/reports/analytics/cost-analysis/',
    REPORTS_WASTE_TREND: '/production-execution/reports/analytics/waste-trend/',
    REPORTS_PRODUCTION_MOVEMENT: '/production-execution/reports/production-movement/',
    REPORTS_PRODUCTION_MOVEMENT_FILTER_OPTIONS:
      '/production-execution/reports/production-movement/filter-options/',
    // Timeline Actions
    START_PRODUCTION: (runId: number) => `/production-execution/runs/${runId}/start-production/`,
    STOP_PRODUCTION: (runId: number) => `/production-execution/runs/${runId}/stop-production/`,
    ADD_BREAKDOWN: (runId: number) => `/production-execution/runs/${runId}/add-breakdown/`,
    ADD_MANUAL_SEGMENT: (runId: number) => `/production-execution/runs/${runId}/segments/manual/`,
    ADD_MANUAL_BREAKDOWN: (runId: number) =>
      `/production-execution/runs/${runId}/breakdowns/manual/`,
    RESOLVE_BREAKDOWN: (runId: number, breakdownId: number) =>
      `/production-execution/runs/${runId}/breakdowns/${breakdownId}/resolve/`,
    SEGMENT_UPDATE: (runId: number, segmentId: number) =>
      `/production-execution/runs/${runId}/segments/${segmentId}/`,
    BREAKDOWN_UPDATE: (runId: number, breakdownId: number) =>
      `/production-execution/runs/${runId}/breakdowns/${breakdownId}/update/`,
    // Delete run
    RUN_DELETE: (runId: number) => `/production-execution/runs/${runId}/`,
    // Line SKU Config
    LINE_CONFIGS: '/production-execution/line-configs/',
    LINE_CONFIG_DETAIL: (id: number) => `/production-execution/line-configs/${id}/`,
    LINE_CONFIG_AUTO_FILL: '/production-execution/line-configs/auto-fill/',
    // Cost rates moved to the central Cost Master (COST_MASTER block below).
  },
  // Warehouse
  WAREHOUSE: {
    // BOM Requests
    BOM_REQUESTS: '/warehouse/bom-requests/',
    BOM_REQUEST_CREATE: '/warehouse/bom-requests/create/',
    BOM_REQUEST_DETAIL: (requestId: number) => `/warehouse/bom-requests/${requestId}/`,
    BOM_REQUEST_APPROVE: (requestId: number) => `/warehouse/bom-requests/${requestId}/approve/`,
    BOM_REQUEST_REJECT: (requestId: number) => `/warehouse/bom-requests/${requestId}/reject/`,
    BOM_REQUEST_RE_REQUEST: (requestId: number) =>
      `/warehouse/bom-requests/${requestId}/re-request/`,
    BOM_REQUEST_ISSUE: (requestId: number) => `/warehouse/bom-requests/${requestId}/issue/`,
    // Stock
    STOCK_CHECK: '/warehouse/stock/check/',
    // WMS dropdowns (shared: barcode pallet pages + stock-level dashboard)
    WMS_WAREHOUSE_LIST: '/warehouse/wms/warehouses/',
    WMS_ITEM_GROUPS: '/warehouse/wms/item-groups/',
    // Finished Goods Receipts
    FG_RECEIPTS: '/warehouse/fg-receipts/',
    FG_RECEIPT_CREATE: '/warehouse/fg-receipts/create/',
    FG_RECEIPT_DETAIL: (receiptId: number) => `/warehouse/fg-receipts/${receiptId}/`,
    FG_RECEIPT_RECEIVE: (receiptId: number) => `/warehouse/fg-receipts/${receiptId}/receive/`,
    FG_RECEIPT_POST_SAP: (receiptId: number) => `/warehouse/fg-receipts/${receiptId}/post-to-sap/`,
    // Branch Stock Transfer (BST)
    BST_SAP_TRANSFERS: '/warehouse/bst/sap-transfers/',
    BST_SAP_TRANSFER_DETAIL: (docEntry: number) => `/warehouse/bst/sap-transfers/${docEntry}/`,
    BST_LIST: '/warehouse/bst/',
    BST_DETAIL: (transferId: number) => `/warehouse/bst/${transferId}/`,
    BST_BOX_SCANS: (transferId: number) => `/warehouse/bst/${transferId}/box-scans/`,
    BST_BOX_SCANS_BATCH: (transferId: number) => `/warehouse/bst/${transferId}/box-scans/batch/`,
    BST_BOX_SCANS_BULK_DELETE: (transferId: number) =>
      `/warehouse/bst/${transferId}/box-scans/bulk-delete/`,
    BST_BOX_SCAN_DETAIL: (transferId: number, scanId: number) =>
      `/warehouse/bst/${transferId}/box-scans/${scanId}/`,
    // Hand-typed quantity for a scan-exempt (PM) line, which has no box scans
    BST_MANUAL_ENTRIES: (transferId: number) => `/warehouse/bst/${transferId}/manual-entries/`,
    BST_APPROVE: (transferId: number) => `/warehouse/bst/${transferId}/approve/`,
    BST_CANCEL: (transferId: number) => `/warehouse/bst/${transferId}/cancel/`,
    // Partial-transfer approval (seal a short scan with admin sign-off)
    BST_PARTIAL_TRANSFER_REQUEST: (transferId: number) =>
      `/warehouse/bst/${transferId}/partial-transfer/request/`,
    BST_PARTIAL_TRANSFERS: '/warehouse/bst/partial-transfers/',
    BST_PARTIAL_TRANSFER_APPROVE: (requestId: number) =>
      `/warehouse/bst/partial-transfers/${requestId}/approve/`,
    BST_PARTIAL_TRANSFER_REJECT: (requestId: number) =>
      `/warehouse/bst/partial-transfers/${requestId}/reject/`,
    BST_INCOMING: '/warehouse/bst/incoming/',
    BST_INCOMING_DETAIL: (transferId: number) => `/warehouse/bst/incoming/${transferId}/`,
    BST_RECEIVE_SCAN: (transferId: number) => `/warehouse/bst/${transferId}/receive-scans/`,
    BST_RECEIVE_COMPLETE: (transferId: number) => `/warehouse/bst/${transferId}/receive/complete/`,
    BST_GATE_OUTWARDS: '/warehouse/bst/gate/expected-outwards/',
    BST_GATE_INWARDS: '/warehouse/bst/gate/expected-inwards/',
    BST_GATE_MARK_OUT: (transferId: number) => `/warehouse/bst/${transferId}/gate/mark-out/`,
    BST_GATE_MARK_IN: (transferId: number) => `/warehouse/bst/${transferId}/gate/mark-in/`,

    // Warehouse Transfer Requests — raise → approve → post to SAP → BST.
    // `POST_SECOND_LEG` is only ever needed for a cross-branch move, where SAP
    // forces the stock through an in-transit warehouse and the receipt is what
    // writes the second document.
    // Warehouse managers (per-user warehouse scoping). MY_WAREHOUSES is not
    // admin-gated -- any screen may ask which warehouses the current user runs.
    MY_WAREHOUSES: '/warehouse/my-warehouses/',
    USER_WAREHOUSES: '/warehouse/user-warehouses/',
    USER_WAREHOUSE_GAPS: '/warehouse/user-warehouses/gaps/',
    USER_WAREHOUSE_DETAIL: (id: number) => `/warehouse/user-warehouses/${id}/`,

    // Letterhead/address/GST data for the Branch Stock Transfer print — used
    // by both the transfer-request and BST detail pages.
    PRINT_INFO: '/warehouse/print-info/',

    TRANSFER_REQUESTS: '/warehouse/transfer-requests/',
    TRANSFER_REQUESTS_PENDING: '/warehouse/transfer-requests/pending/',
    TRANSFER_REQUESTS_IN_TRANSIT: '/warehouse/transfer-requests/in-transit/',
    TRANSFER_REQUESTS_RECONCILE: '/warehouse/transfer-requests/reconcile/',
    TRANSFER_REQUESTS_STOCK: '/warehouse/transfer-requests/stock/',
    TRANSFER_REQUEST_DETAIL: (requestId: number) => `/warehouse/transfer-requests/${requestId}/`,
    TRANSFER_REQUEST_APPROVE: (requestId: number) =>
      `/warehouse/transfer-requests/${requestId}/approve/`,
    TRANSFER_REQUEST_REJECT: (requestId: number) =>
      `/warehouse/transfer-requests/${requestId}/reject/`,
    TRANSFER_REQUEST_POST: (requestId: number) => `/warehouse/transfer-requests/${requestId}/post/`,
    TRANSFER_REQUEST_ALLOCATION_PREVIEW: (requestId: number) =>
      `/warehouse/transfer-requests/${requestId}/allocation-preview/`,
    TRANSFER_REQUEST_CREATE_BST: (requestId: number) =>
      `/warehouse/transfer-requests/${requestId}/create-bst/`,
    TRANSFER_REQUEST_SECOND_LEG: (requestId: number) =>
      `/warehouse/transfer-requests/${requestId}/post-second-leg/`,
    TRANSFER_REQUEST_VERIFY_BATCHES: (requestId: number) =>
      `/warehouse/transfer-requests/${requestId}/verify-batches/`,
  },

  BARCODE: {
    // Boxes
    BOXES_GENERATE: '/barcode/boxes/generate/',
    BOXES: '/barcode/boxes/',
    BOX_DETAIL: (boxId: number) => `/barcode/boxes/${boxId}/`,
    BOX_VOID: (boxId: number) => `/barcode/boxes/${boxId}/void/`,
    BOX_HISTORY: (boxId: number) => `/barcode/boxes/${boxId}/history/`,
    // Dashboard
    ACTIVITY_RECENT: '/barcode/activity/recent/',
    ACTIVITY_LIST: '/barcode/activity/',
    // Pallets
    PALLET_CREATE: '/barcode/pallets/create/',
    PALLETS: '/barcode/pallets/',
    PALLET_DETAIL: (palletId: number) => `/barcode/pallets/${palletId}/`,
    PALLET_VOID: (palletId: number) => `/barcode/pallets/${palletId}/void/`,
    VOIDED_PALLETS: '/barcode/voids/pallets/',
    VOIDED_BOXES: '/barcode/voids/boxes/',
    PALLET_MOVE: (palletId: number) => `/barcode/pallets/${palletId}/move/`,
    PALLET_CLEAR: (palletId: number) => `/barcode/pallets/${palletId}/clear/`,
    PALLET_SPLIT: (palletId: number) => `/barcode/pallets/${palletId}/split/`,
    PALLET_ADD_BOXES: (palletId: number) => `/barcode/pallets/${palletId}/add-boxes/`,
    PALLET_REMOVE_BOXES: (palletId: number) => `/barcode/pallets/${palletId}/remove-boxes/`,
    PALLET_RECONCILE: (palletId: number) => `/barcode/pallets/${palletId}/reconcile/`,
    PALLET_HISTORY: (palletId: number) => `/barcode/pallets/${palletId}/history/`,
    // Pallet Verify Requests (ticket workflow)
    VERIFY_REQUESTS: '/barcode/verify-requests/',
    VERIFY_REQUEST_DETAIL: (requestId: number) => `/barcode/verify-requests/${requestId}/`,
    VERIFY_REQUEST_START: (requestId: number) => `/barcode/verify-requests/${requestId}/start/`,
    VERIFY_REQUEST_RESOLVE: (requestId: number) => `/barcode/verify-requests/${requestId}/resolve/`,
    VERIFY_REQUEST_CANCEL: (requestId: number) => `/barcode/verify-requests/${requestId}/cancel/`,
    TRANSFER_BOX: '/barcode/transfers/box/',
    // Print
    PRINT_BOX: (boxId: number) => `/barcode/print/box/${boxId}/`,
    PRINT_PALLET: (palletId: number) => `/barcode/print/pallet/${palletId}/`,
    PRINT_BULK: '/barcode/print/bulk/',
    PRINT_HISTORY: '/barcode/print/history/',
    // Dismantle & Repack
    DISMANTLE_PALLET: (palletId: number) => `/barcode/pallets/${palletId}/dismantle/`,
    DISMANTLE_BOX: (boxId: number) => `/barcode/boxes/${boxId}/dismantle/`,
    REPACK: '/barcode/repack/',
    // Loose Stock
    LOOSE: '/barcode/loose/',
    LOOSE_SUMMARY: '/barcode/loose/summary/',
    LOOSE_DETAIL: (looseId: number) => `/barcode/loose/${looseId}/`,
    // Scan
    SCAN: '/barcode/scan/',
    SCAN_HISTORY: '/barcode/scan/history/',
    LOOKUP: (barcode: string) => `/barcode/lookup/${encodeURIComponent(barcode)}/`,
    // Intercompany barcode transfer
    INTERCOMPANY_DASHBOARD: '/barcode/intercompany/dashboard/',
    INTERCOMPANY_TRANSFERS: '/barcode/intercompany/transfers/',
    INTERCOMPANY_TRANSFER_DETAIL: (transferId: number) =>
      `/barcode/intercompany/transfers/${transferId}/`,
    INTERCOMPANY_TRANSFER_REVERSE: (transferId: number) =>
      `/barcode/intercompany/transfers/${transferId}/reverse/`,
    INTERCOMPANY_SCAN: '/barcode/intercompany/scan/',
    INTERCOMPANY_WAREHOUSES: '/barcode/intercompany/warehouses/',
    INTERCOMPANY_TRACE: '/barcode/intercompany/trace/',
    // Dispatch scanning
    DISPATCH_BILL_LOOKUP: '/barcode/dispatch/bills/lookup/',
    DISPATCH_SETTINGS: '/barcode/dispatch/settings/',
    DISPATCH_SESSIONS: '/barcode/dispatch/sessions/',
    DISPATCH_SESSIONS_FROM_BILL: '/barcode/dispatch/sessions/from-bill/',
    DISPATCH_SESSIONS_ACTIVE: '/barcode/dispatch/sessions/active/',
    DISPATCH_SESSIONS_COMPLETED: '/barcode/dispatch/sessions/completed/',
    DISPATCH_SESSIONS_CLOSED: '/barcode/dispatch/sessions/closed/',
    DISPATCH_SESSION_DETAIL: (sessionId: number) => `/barcode/dispatch/sessions/${sessionId}/`,
    DISPATCH_SESSION_SCANS: (sessionId: number) => `/barcode/dispatch/sessions/${sessionId}/scans/`,
    DISPATCH_SESSION_SCAN: (sessionId: number) => `/barcode/dispatch/sessions/${sessionId}/scan/`,
    DISPATCH_SCANNED_BOX: (sessionId: number, unitId: number) =>
      `/barcode/dispatch/sessions/${sessionId}/scanned-boxes/${unitId}/`,
    DISPATCH_SCANNED_BOX_REMOVE: (sessionId: number, unitId: number) =>
      `/barcode/dispatch/sessions/${sessionId}/scanned-boxes/${unitId}/remove/`,
    DISPATCH_SESSION_DISPATCH: (sessionId: number) =>
      `/barcode/dispatch/sessions/${sessionId}/dispatch/`,
    DISPATCH_SESSION_COMPLETE: (sessionId: number) =>
      `/barcode/dispatch/sessions/${sessionId}/complete/`,
    DISPATCH_SESSION_CLOSE: (sessionId: number) => `/barcode/dispatch/sessions/${sessionId}/close/`,
    DISPATCH_SESSION_CANCEL: (sessionId: number) =>
      `/barcode/dispatch/sessions/${sessionId}/cancel/`,
    DISPATCH_SESSION_RETRY_SAP_SYNC: (sessionId: number) =>
      `/barcode/dispatch/sessions/${sessionId}/retry-sap-sync/`,
    DISPATCH_SESSION_SCAN_LOGS: (sessionId: number) =>
      `/barcode/dispatch/sessions/${sessionId}/scan-logs/`,
    DISPATCH_SESSION_SAP_SYNC_LOGS: (sessionId: number) =>
      `/barcode/dispatch/sessions/${sessionId}/sap-sync-logs/`,
    DISPATCH_REPORTS: '/barcode/dispatch/reports/',
    DISPATCH_REPORT_DETAIL: (sessionId: number) => `/barcode/dispatch/reports/${sessionId}/`,
    DISPATCH_REPORT_PALLETS: '/barcode/dispatch/reports/pallets/',
    DISPATCH_REPORT_BOXES: '/barcode/dispatch/reports/boxes/',
    DISPATCH_REPORT_REJECTED_SCANS: '/barcode/dispatch/reports/rejected-scans/',
    // Production Integration
    OITM_ITEMS: '/barcode/items/oitm/',
    OITM_ITEM_DETAIL: '/barcode/items/oitm/detail/',
    PRODUCTION_RELEASE_OIL: '/barcode/production-release-oil/',
    PRODUCTION_LABELS: (runId: number) => `/barcode/production/${runId}/generate-labels/`,
    PRODUCTION_PALLET: (runId: number) => `/barcode/production/${runId}/create-pallet/`,
  },
  // Marketplace (Flipkart/Amazon) dispatch, returns, masters & reconciliation
  MARKETPLACE: {
    SETTINGS: '/marketplace/settings/',
    DELIVERY_NOTE_SHEETS: '/marketplace/delivery-notes/sheets/',
    DELIVERY_NOTE_SUMMARY: '/marketplace/delivery-notes/summary/',
    DELIVERY_NOTE_CUT: '/marketplace/delivery-notes/cut/',
    DELIVERY_NOTE_RECONCILE: '/marketplace/delivery-notes/reconcile/',
    DELIVERY_NOTE_POSTED: '/marketplace/delivery-notes/posted/',
    DELIVERY_NOTE_EXPORT: (docEntry: number) =>
      `/marketplace/delivery-notes/${docEntry}/export.csv`,
    WAREHOUSES: '/marketplace/warehouses/',
    WAREHOUSE_BY_ID: (id: number) => `/marketplace/warehouses/${id}/`,
    SKU_MAPPINGS: '/marketplace/sku-mappings/',
    SKU_MAPPINGS_IMPORT: '/marketplace/sku-mappings/import/',
    SKU_MAPPING_BY_ID: (id: number) => `/marketplace/sku-mappings/${id}/`,
    COMBOS: '/marketplace/combos/',
    COMBO_BY_ID: (id: number) => `/marketplace/combos/${id}/`,
    ORDERS: '/marketplace/orders/',
    ORDER_RESOLVE: '/marketplace/orders/resolve/',
    DISPATCHES: '/marketplace/dispatches/',
    DISPATCH_SCAN_TRACKING: '/marketplace/dispatches/scan/',
    DISPATCH_SCAN_BULK: '/marketplace/dispatches/scan/bulk/',
    DISPATCH_SHEETS: '/marketplace/dispatches/sheets/',
    DISPATCH_ORDERS_RANGE: '/marketplace/dispatches/orders-in-range/',
    REPORT_EXPORT: (type: string) => `/marketplace/reports/${type}/export.csv`,
    REPORT_TRACKING: (batchId: number) => `/marketplace/reports/tracking/${batchId}/`,
    REPORT_PREVIEW: (type: string) => `/marketplace/reports/${type}/preview/`,
    DN_PRINT: (docEntry: number) => `/marketplace/delivery-notes/${docEntry}/print/`,
    GATE_QUEUE: '/marketplace/gate/queue/',
    GATE_DETAIL: (batchId: number) => `/marketplace/gate/${batchId}/`,
    GATE_APPROVE: (batchId: number) => `/marketplace/gate/${batchId}/approve/`,
    GATE_HOLD: (batchId: number) => `/marketplace/gate/${batchId}/hold/`,
    // Gate pass — the outward trip (vehicle, weighment, gatepass, out).
    GATE_PASSES: '/marketplace/gate-passes/',
    GATE_PASS_MANUAL: '/marketplace/gate-passes/manual/',
    GATE_PASS_DETAIL: (id: number) => `/marketplace/gate-passes/${id}/`,
    GATE_PASS_WEIGHMENT: (id: number) => `/marketplace/gate-passes/${id}/weighment/`,
    GATE_PASS_PRINT: (id: number) => `/marketplace/gate-passes/${id}/print/`,
    GATE_PASS_DISPATCH: (id: number) => `/marketplace/gate-passes/${id}/dispatch/`,
    GATE_PASS_CANCEL: (id: number) => `/marketplace/gate-passes/${id}/cancel/`,
    DISPATCH_BOARD: (batchId: number) => `/marketplace/dispatches/board/${batchId}/`,
    ORDER_CHOOSE_VARIANT: '/marketplace/orders/choose-variant/',
    BATCH_VARIANTS: (id: number) => `/marketplace/batches/${id}/variants/`,
    DISPATCH_BY_ID: (id: number) => `/marketplace/dispatches/${id}/`,
    DISPATCH_SCANS: (id: number) => `/marketplace/dispatches/${id}/scans/`,
    DISPATCH_SCAN_BY_ID: (id: number, scanId: number) =>
      `/marketplace/dispatches/${id}/scans/${scanId}/`,
    DISPATCH_CONFIRM: (id: number) => `/marketplace/dispatches/${id}/confirm/`,
    DISPATCH_RETRY_DN: (id: number) => `/marketplace/dispatches/${id}/retry-delivery-note/`,
    DISPATCH_CANCEL: (id: number) => `/marketplace/dispatches/${id}/cancel/`,
    RETURNS: '/marketplace/returns/',
    RETURN_SCAN_TRACKING: '/marketplace/returns/scan/',
    RETURN_BY_ID: (id: number) => `/marketplace/returns/${id}/`,
    RETURN_SCANS: (id: number) => `/marketplace/returns/${id}/scans/`,
    RETURN_SCAN_CONDITION: (id: number, scanId: number) =>
      `/marketplace/returns/${id}/scans/${scanId}/condition/`,
    RETURN_SUBMIT: (id: number) => `/marketplace/returns/${id}/submit/`,
    RECONCILIATION: '/marketplace/reconciliation/',
    // Sheet-driven flow
    ORDER_IMPORT_PREVIEW: '/marketplace/orders/import/preview/',
    ORDER_IMPORT: '/marketplace/orders/import/',
    BATCHES: '/marketplace/batches/',
    BATCH_BY_ID: (id: number) => `/marketplace/batches/${id}/`,
    BATCH_STOCK_LIST: (id: number) => `/marketplace/batches/${id}/stock-list/`,
    BATCH_SKIP_UNMAPPED: (id: number) => `/marketplace/batches/${id}/skip-unmapped/`,
    BATCH_EXPORT: (id: number) => `/marketplace/batches/${id}/issuance.csv`,
    ISSUE_REQUESTS: '/marketplace/issue-requests/',
    ISSUE_REQUEST_BY_ID: (id: number) => `/marketplace/issue-requests/${id}/`,
    ISSUE_REVIEW: (id: number) => `/marketplace/issue-requests/${id}/review/`,
    ISSUE_REJECT: (id: number) => `/marketplace/issue-requests/${id}/reject/`,
    ISSUE_ISSUE: (id: number) => `/marketplace/issue-requests/${id}/issue/`,
    ISSUE_RECEIVE: (id: number) => `/marketplace/issue-requests/${id}/receive/`,
    WAREHOUSE_INSIGHTS: '/marketplace/warehouse-insights/',
    SAP_ITEMS: '/marketplace/sap-items/',
    PACKING_QUEUE: '/marketplace/packing/queue/',
    PACKING_SUMMARY: '/marketplace/packing/summary/',
    PACKING_SUMMARY_COMPLETE: '/marketplace/packing/summary/complete/',
    PACKING_SCAN: '/marketplace/packing/scan/',
    PACKING_OPEN: '/marketplace/packing/open/',
    PACKING_BY_ID: (id: number) => `/marketplace/packing/${id}/`,
    PACKING_GENERATE: (id: number) => `/marketplace/packing/${id}/generate/`,
    PACKING_COMPLETE: (id: number) => `/marketplace/packing/${id}/complete/`,
    PACK_BARCODE_PRINT: (id: number) => `/marketplace/packing/barcodes/${id}/print/`,
  },
  // ETP / STP — the treatment plants' QA registers. Masters first (the Settings
  // screen), then one endpoint set per register; every register list accepts
  // ?plant=&date=&date_from=&date_to=&company=.
  ETP: {
    DASHBOARD: '/etp/dashboard/',
    SUMMARY: '/etp/summary/',

    PLANTS: '/etp/plants/',
    PLANT_DETAIL: (plantId: number) => `/etp/plants/${plantId}/`,
    STAFF: '/etp/staff/',
    STAFF_DETAIL: (staffId: number) => `/etp/staff/${staffId}/`,
    OPTIONS: '/etp/options/',
    OPTION_DETAIL: (optionId: number) => `/etp/options/${optionId}/`,
    OPTION_CATEGORIES: '/etp/options/categories/',
    CHEMICALS: '/etp/chemicals/',
    CHEMICAL_DETAIL: (chemicalId: number) => `/etp/chemicals/${chemicalId}/`,
    BACKWASH_EQUIPMENT: '/etp/backwash-equipment/',
    BACKWASH_EQUIPMENT_DETAIL: (equipmentId: number) => `/etp/backwash-equipment/${equipmentId}/`,
    MONITORING_PARAMETERS: '/etp/monitoring-parameters/',
    MONITORING_PARAMETER_DETAIL: (parameterId: number) =>
      `/etp/monitoring-parameters/${parameterId}/`,
    INSTRUMENTS: '/etp/instruments/',
    INSTRUMENT_DETAIL: (instrumentId: number) => `/etp/instruments/${instrumentId}/`,
    // Document numbers the registers print — held in the DB, edited in Settings.
    PRINT_DOCUMENTS: '/etp/print-documents/',
    PRINT_DOCUMENT_DETAIL: (documentId: number) => `/etp/print-documents/${documentId}/`,
    PRINT_DOCUMENT_KEYS: '/etp/print-documents/keys/',

    DAILY_LOGS: '/etp/daily-logs/',
    DAILY_LOG_DETAIL: (logId: number) => `/etp/daily-logs/${logId}/`,
    // Yesterday's closing figures, to prefill today's openings.
    DAILY_LOG_LAST_READINGS: '/etp/daily-logs/last-readings/',

    MONITORING_RECORDS: '/etp/monitoring-records/',
    MONITORING_RECORD_DETAIL: (recordId: number) => `/etp/monitoring-records/${recordId}/`,
    // The blank sheet for a plant: its parameter columns + its time slots.
    MONITORING_SHEET_TEMPLATE: '/etp/monitoring-records/sheet-template/',
    MONITORING_VERIFY: (recordId: number) => `/etp/monitoring-records/${recordId}/verify/`,

    CHEMICAL_LOGS: '/etp/chemical-logs/',
    CHEMICAL_LOG_DETAIL: (logId: number) => `/etp/chemical-logs/${logId}/`,
    CHEMICAL_LOG_TOTALS: '/etp/chemical-logs/totals/',

    SLUDGE_ENTRIES: '/etp/sludge-entries/',
    SLUDGE_ENTRY_DETAIL: (entryId: number) => `/etp/sludge-entries/${entryId}/`,

    BACKWASH_ENTRIES: '/etp/backwash-entries/',
    BACKWASH_ENTRY_DETAIL: (entryId: number) => `/etp/backwash-entries/${entryId}/`,

    CALIBRATION_RECORDS: '/etp/calibration-records/',
    CALIBRATION_RECORD_DETAIL: (recordId: number) => `/etp/calibration-records/${recordId}/`,

    // The registers' edit trail: who changed which entry, when, and from what
    // to what. Read-only; ?register=&plant=&object_id=&date_from=&date_to=.
    CHANGE_LOG: '/etp/change-log/',
  },

  // Cost Master — the central registry of cost types + scoped, effective-dated rates
  COST_MASTER: {
    COST_TYPES: '/cost-master/cost-types/',
    COST_TYPE_DETAIL: (costTypeId: number) => `/cost-master/cost-types/${costTypeId}/`,
    RATES: '/cost-master/rates/',
    RATE_DETAIL: (rateId: number) => `/cost-master/rates/${rateId}/`,
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
