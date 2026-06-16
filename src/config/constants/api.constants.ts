export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
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
    OPEN_PO_BY_NUMBER: (poNumber: string) => `/po/open-pos/${encodeURIComponent(poNumber)}/items/`,
    WAREHOUSES: '/po/warehouses/',
    VENDORS: '/po/vendors/',
  },
  // Raw Material Gate In
  RAW_MATERIAL_GATEIN: {
    PO_RECEIPTS: (entryId: number) => `/raw-material-gatein/gate-entries/${entryId}/po-receipts/`,
    PO_RECEIPT_DETAIL: (entryId: number, poReceiptId: number) =>
      `/raw-material-gatein/gate-entries/${entryId}/po-receipts/${poReceiptId}/`,
    PO_RECEIPTS_VIEW: (entryId: number) =>
      `/raw-material-gatein/gate-entries/${entryId}/po-receipts/view`,
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
    SALES_DISPATCH_BOX_SCANS: (id: number) => `/gate-core/sales-dispatch/${id}/box-scans/`,
    SALES_DISPATCH_BOX_SCAN: (id: number, scanId: number) =>
      `/gate-core/sales-dispatch/${id}/box-scans/${scanId}/`,
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
    SALES_DISPATCH_COMMIT_PRINT: (id: number) => `/gate-core/sales-dispatch/${id}/commit-print/`,
    SALES_DISPATCH_MARK_DISPATCHED: (id: number) => `/gate-core/sales-dispatch/${id}/dispatch/`,
    SALES_DISPATCH_REJECT: (id: number) => `/gate-core/sales-dispatch/${id}/reject/`,
    SALES_DISPATCH_CANCEL: (id: number) => `/gate-core/sales-dispatch/${id}/cancel/`,
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
    DEPARTMENTS: '/accounts/departments',
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
  // Admin - Docking (scan skip approvals)
  DOCKING_ADMIN: {
    SCAN_SKIP_REQUESTS: '/docking-admin/scan-skip-requests/',
    SCAN_SKIP_REQUEST_BY_DISPATCH: (entryId: number) =>
      `/docking-admin/scan-skip-requests/by-sales-dispatch/${entryId}/`,
    SCAN_SKIP_REQUEST_APPROVE: (id: number) =>
      `/docking-admin/scan-skip-requests/${id}/approve/`,
    SCAN_SKIP_REQUEST_REJECT: (id: number) =>
      `/docking-admin/scan-skip-requests/${id}/reject/`,
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
    MATERIAL_TYPE_PARAMETERS: (materialTypeId: number) =>
      `/quality-control/material-types/${materialTypeId}/parameters/`,
    SAP_ITEMS: '/quality-control/sap-items/',

    // QC Print Documents
    PRINT_DOCUMENTS: '/quality-control/print-documents/',
    PRINT_DOCUMENT_BY_ID: (id: number) => `/quality-control/print-documents/${id}/`,

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
    INSPECTION_COUNTS: '/quality-control/inspections/counts/',
    INSPECTION_BY_ID: (id: number) => `/quality-control/inspections/${id}/`,
    INSPECTION_FOR_SLIP: (slipId: number) => `/quality-control/arrival-slips/${slipId}/inspection/`,
    INSPECTION_PARAMETERS: (inspectionId: number) =>
      `/quality-control/inspections/${inspectionId}/parameters/`,
    INSPECTION_SUBMIT: (id: number) => `/quality-control/inspections/${id}/submit/`,

    // Approvals
    APPROVE_CHEMIST: (id: number) => `/quality-control/inspections/${id}/approve/chemist/`,
    APPROVE_QAM: (id: number) => `/quality-control/inspections/${id}/approve/qam/`,
    REJECT_INSPECTION: (id: number) => `/quality-control/inspections/${id}/reject/`,
    FACTORY_HEAD_DECISION: (id: number) =>
      `/quality-control/inspections/${id}/factory-head-decision/`,

    // Production QC
    PRODUCTION_QC_LIST: '/quality-control/production-qc/',
    PRODUCTION_QC_PENDING: '/quality-control/production-qc/pending/',
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
  },
  // GRPO (Goods Receipt Purchase Order)
  GRPO: {
    SUMMARY: '/grpo/summary/',
    ALL_ENTRIES: '/grpo/all-entries/',
    PENDING: '/grpo/pending/',
    PREVIEW: (vehicleEntryId: number) => `/grpo/preview/${vehicleEntryId}/`,
    INSPECTION_REPORT: (arrivalSlipId: number) => `/grpo/inspection-report/${arrivalSlipId}/`,
    POST: '/grpo/post/',
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
  // SAP Plan Dashboard
  SAP_PLAN_DASHBOARD: {
    SUMMARY: '/sap/plan-dashboard/summary/',
    DETAILS: '/sap/plan-dashboard/details/',
    PROCUREMENT: '/sap/plan-dashboard/procurement/',
    SKU_DETAIL: (docEntry: number) => `/sap/plan-dashboard/sku/${docEntry}/`,
  },
  // Stock Dashboard
  STOCK_DASHBOARD: {
    LIST: '/dashboards/stock/',
    AS_OF: '/dashboards/stock/as-of/',
    ITEM_DETAIL: (itemCode: string) => `/dashboards/stock/${itemCode}/warehouses/`,
  },
  // Inventory Age & Value Dashboard
  INVENTORY_AGE_DASHBOARD: {
    FILTER_OPTIONS: '/dashboards/inventory-age/filter-options/',
    REPORT: '/dashboards/inventory-age/report/',
  },
  // Non-Moving RM Dashboard
  NON_MOVING_RM: {
    REPORT: '/non-moving-rm/report/',
    ITEM_GROUPS: '/non-moving-rm/item-groups/',
  },
  // Sales Planning vs Requirement Dashboard
  SALES_PLANNING_REQUIREMENT: {
    REPORT: '/dashboards/sales-planning-requirement/report/',
    STATUS: '/dashboards/sales-planning-requirement/status/',
    ANALYSIS: '/dashboards/sales-planning-requirement/analysis/',
    REFRESH: '/dashboards/sales-planning-requirement/refresh/',
  },
  // Dispatch Plans Dashboard
  DISPATCH_PLANS: {
    BILLS: '/dispatch-plans/bills/',
    BILL_BY_NUMBER: (invoiceNumber: string) =>
      `/dispatch-plans/bills/by-number/${encodeURIComponent(invoiceNumber)}/`,
    PLAN: (docEntry: number) => `/dispatch-plans/bills/${docEntry}/plan/`,
  },
  // Dispatch
  DISPATCH: {
    OPEN_BILTIES: '/dispatch/open-bilties/',
    BILTY_GRPO_PENDING: '/dispatch/bilty-grpo/pending/',
    BILTY_GRPO_OPTIONS: '/dispatch/bilty-grpo/options/',
    BILTY_GRPO_PREVIEW: (dispatchPlanId: number) =>
      `/dispatch/bilty-grpo/preview/${dispatchPlanId}/`,
    BILTY_GRPO_POST: '/dispatch/bilty-grpo/post/',
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
    WORK_ORDER_SET_STATUS: (workOrderId: number) =>
      `/maintenance/work-orders/${workOrderId}/set-status/`,
    WORK_ORDER_REQUEST_SPARE: (workOrderId: number) =>
      `/maintenance/work-orders/${workOrderId}/request-spare/`,
    WORK_ORDER_PHOTOS: '/maintenance/work-order-photos/',
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
    SPARE_REQUESTS: '/maintenance/spare-requests/',
    SPARE_REQUEST_DETAIL: (requestId: number) => `/maintenance/spare-requests/${requestId}/`,
    SPARE_REQUEST_ISSUE: (requestId: number) => `/maintenance/spare-requests/${requestId}/issue/`,
    SPARE_REQUEST_CONSUME: (requestId: number) =>
      `/maintenance/spare-requests/${requestId}/consume/`,
    SPARE_REQUEST_RETURN_UNUSED: (requestId: number) =>
      `/maintenance/spare-requests/${requestId}/return-unused/`,
    SPARE_REQUEST_CANCEL: (requestId: number) => `/maintenance/spare-requests/${requestId}/cancel/`,
    SPARE_MOVEMENTS: '/maintenance/spare-movements/',
    VENDOR_VISITS: '/maintenance/vendor-visits/',
    VENDOR_VISIT_DETAIL: (visitId: number) => `/maintenance/vendor-visits/${visitId}/`,
    VENDOR_VISIT_START: (visitId: number) => `/maintenance/vendor-visits/${visitId}/start/`,
    VENDOR_VISIT_COMPLETE: (visitId: number) => `/maintenance/vendor-visits/${visitId}/complete/`,
    VENDOR_VISIT_CANCEL: (visitId: number) => `/maintenance/vendor-visits/${visitId}/cancel/`,
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
  },
  // Warehouse
  WAREHOUSE: {
    // BOM Requests
    BOM_REQUESTS: '/warehouse/bom-requests/',
    BOM_REQUEST_CREATE: '/warehouse/bom-requests/create/',
    BOM_REQUEST_DETAIL: (requestId: number) => `/warehouse/bom-requests/${requestId}/`,
    BOM_REQUEST_APPROVE: (requestId: number) => `/warehouse/bom-requests/${requestId}/approve/`,
    BOM_REQUEST_REJECT: (requestId: number) => `/warehouse/bom-requests/${requestId}/reject/`,
    BOM_REQUEST_ISSUE: (requestId: number) => `/warehouse/bom-requests/${requestId}/issue/`,
    // Stock
    STOCK_CHECK: '/warehouse/stock/check/',
    // WMS
    WMS_DASHBOARD: '/warehouse/wms/dashboard/',
    WMS_STOCK_OVERVIEW: '/warehouse/wms/stock/overview/',
    WMS_ITEM_DETAIL: (itemCode: string) => `/warehouse/wms/stock/items/${itemCode}/`,
    WMS_STOCK_MOVEMENTS: '/warehouse/wms/stock/movements/',
    WMS_TRANSFER_OVERVIEW: '/warehouse/wms/transfers/overview/',
    WMS_BATCH_EXPIRY: '/warehouse/wms/batches/expiry/',
    WMS_SALES_ORDER_BACKLOG: '/warehouse/wms/sales-orders/backlog/',
    WMS_WAREHOUSE_SUMMARY: '/warehouse/wms/warehouses/summary/',
    WMS_WAREHOUSE_LIST: '/warehouse/wms/warehouses/',
    WMS_BILLING_OVERVIEW: '/warehouse/wms/billing/overview/',
    WMS_ITEM_GROUPS: '/warehouse/wms/item-groups/',
    // Finished Goods Receipts
    FG_RECEIPTS: '/warehouse/fg-receipts/',
    FG_RECEIPT_CREATE: '/warehouse/fg-receipts/create/',
    FG_RECEIPT_DETAIL: (receiptId: number) => `/warehouse/fg-receipts/${receiptId}/`,
    FG_RECEIPT_RECEIVE: (receiptId: number) => `/warehouse/fg-receipts/${receiptId}/receive/`,
    FG_RECEIPT_POST_SAP: (receiptId: number) => `/warehouse/fg-receipts/${receiptId}/post-to-sap/`,
  },

  BARCODE: {
    // Boxes
    BOXES_GENERATE: '/barcode/boxes/generate/',
    BOXES: '/barcode/boxes/',
    BOX_DETAIL: (boxId: number) => `/barcode/boxes/${boxId}/`,
    BOX_VOID: (boxId: number) => `/barcode/boxes/${boxId}/void/`,
    BOX_HISTORY: (boxId: number) => `/barcode/boxes/${boxId}/history/`,
    // Pallets
    PALLET_CREATE: '/barcode/pallets/create/',
    PALLETS: '/barcode/pallets/',
    PALLET_DETAIL: (palletId: number) => `/barcode/pallets/${palletId}/`,
    PALLET_VOID: (palletId: number) => `/barcode/pallets/${palletId}/void/`,
    PALLET_MOVE: (palletId: number) => `/barcode/pallets/${palletId}/move/`,
    PALLET_CLEAR: (palletId: number) => `/barcode/pallets/${palletId}/clear/`,
    PALLET_SPLIT: (palletId: number) => `/barcode/pallets/${palletId}/split/`,
    PALLET_ADD_BOXES: (palletId: number) => `/barcode/pallets/${palletId}/add-boxes/`,
    PALLET_REMOVE_BOXES: (palletId: number) => `/barcode/pallets/${palletId}/remove-boxes/`,
    PALLET_HISTORY: (palletId: number) => `/barcode/pallets/${palletId}/history/`,
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
    PRODUCTION_RELEASE_OIL: '/barcode/production-release-oil/',
    PRODUCTION_LABELS: (runId: number) => `/barcode/production/${runId}/generate-labels/`,
    PRODUCTION_PALLET: (runId: number) => `/barcode/production/${runId}/create-pallet/`,
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
