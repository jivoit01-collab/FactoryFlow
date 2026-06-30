import { API_ENDPOINTS } from '@/config/constants';
import type { ArrivalSlipStatus, EntryStatus } from '@/config/constants';
import { apiClient } from '@/core/api';
import type {
  InspectionDecision,
  InspectionDecisionInfo,
  InspectionFinalStatus,
  InspectionWorkflowStatus,
  QCStage,
} from '@/modules/qc/types';

type RawMaterialQcStatusCode =
  | 'NO_SLIP'
  | 'SLIP_DRAFT'
  | 'AWAITING_INSPECTION'
  | 'INSPECTION_DRAFT'
  | 'AWAITING_CHEMIST'
  | 'AWAITING_QAM'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'HOLD'
  | 'PENDING';

export interface GateEntryFullView {
  gate_entry: {
    id: number;
    entry_no: string;
    entry_type?: string;
    status: EntryStatus | string;
    status_display?: string;
    is_locked: boolean;
    created_at: string;
    updated_at?: string;
    created_by?: string | null;
  };
  vehicle: {
    vehicle_number: string;
    vehicle_type: string;
    capacity_ton: number;
  };
  driver: {
    name: string;
    mobile_no: string;
    license_no: string;
  };
  security_check: {
    vehicle_condition_ok: boolean;
    tyre_condition_ok: boolean;
    fire_extinguisher_available: boolean;
    alcohol_test_done: boolean;
    alcohol_test_passed: boolean;
    is_submitted: boolean;
    remarks: string;
    inspected_by: string;
    created_at?: string;
    updated_at?: string;
  } | null;
  weighment: {
    gross_weight: number;
    tare_weight: number;
    net_weight: number;
    weighbridge_slip_no: string;
    created_at?: string;
    updated_at?: string;
  } | null;
  qc_summary: {
    total_items: number;
    no_slip: number;
    slip_draft: number;
    awaiting_inspection: number;
    inspection_draft: number;
    awaiting_chemist: number;
    awaiting_qam: number;
    accepted: number;
    rejected: number;
    hold: number;
    pending: number;
    can_complete: boolean;
  };
  po_receipts: Array<{
    id?: number;
    po_number: string;
    po_date?: string | null;
    supplier_code: string;
    supplier_name: string;
    created_by: string;
    created_at?: string;
    items: Array<{
      id?: number;
      item_code: string;
      item_name: string;
      ordered_qty: number;
      received_qty: number;
      short_qty: number;
      uom: string;
      qc_status: {
        code: RawMaterialQcStatusCode;
        display: string;
      } | null;
      arrival_slip?: {
        id: number;
        status: ArrivalSlipStatus | string;
        status_display?: string;
        is_submitted: boolean;
        particulars: string;
        party_name: string;
        billing_qty: number;
        billing_uom: string;
        arrival_datetime: string;
        truck_no_as_per_bill: string;
        commercial_invoice_no: string;
        eway_bill_no: string;
        bilty_no: string;
        has_certificate_of_analysis: boolean;
        has_certificate_of_quantity: boolean;
        weighing_required: boolean;
        in_time_to_qa: string | null;
        submitted_at: string | null;
        submitted_by: string | null;
        remarks: string;
        created_at: string;
      } | null;
      inspection?: {
        id: number;
        report_no: string;
        internal_lot_no: string;
        inspection_date: string;
        description_of_material: string;
        sap_code: string;
        material_type: string | null;
        material_type_id: number | null;
        supplier_name: string;
        manufacturer_name: string;
        supplier_batch_lot_no: string;
        unit_packing: string;
        purchase_order_no: string;
        invoice_bill_no: string;
        vehicle_no: string;
        workflow_status: InspectionWorkflowStatus;
        workflow_status_display?: string;
        final_status: InspectionFinalStatus;
        final_status_display?: string;
        chemist_decision?: InspectionDecisionInfo;
        manager_decision?: InspectionDecisionInfo;
        qc_stage?: QCStage;
        qc_decision?: InspectionDecision | null;
        is_locked: boolean;
        qa_chemist: string | null;
        qa_chemist_approved_at: string | null;
        qa_chemist_remarks: string;
        qam: string | null;
        qam_approved_at: string | null;
        qam_remarks: string;
        rejected_by: string | null;
        rejected_at: string | null;
        remarks: string;
        created_at: string;
      } | null;
    }>;
  }>;
}

export const gateEntryFullViewApi = {
  async get(entryId: number): Promise<GateEntryFullView> {
    const response = await apiClient.get<GateEntryFullView>(
      API_ENDPOINTS.GATE_CORE.FULL_VIEW(entryId),
    );
    return response.data;
  },

  async complete(entryId: number): Promise<void> {
    await apiClient.post(API_ENDPOINTS.GATE_CORE.COMPLETE(entryId));
  },
};
