// Work permit (permit-to-work) types — hazardous-job safety clearance workflow.
// Mirrors the paper form "Work Permit — Moon Beverages, Greater Noida" (SMS-FRM-02-11-01).

export type WorkPermitType =
  | 'GENERAL'
  | 'HEIGHT'
  | 'HOT_WORK'
  | 'COLD_WORK'
  | 'CONFINED_SPACE'
  | 'LINE_BREAKING'
  | 'HAZARDOUS_ENERGY_CONTROL'
  | 'EXCAVATION'
  | 'LOADING_UNLOADING_HAZMAT';

// Lifecycle: maintenance fills -> submits -> Fire Dept Head approves -> maintenance
// starts work -> completes -> closed. A lapsed validity moves it to EXPIRED; the
// permit can then be renewed (cloned) into a new draft.
export type WorkPermitStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'EXPIRED';

// Sign-off roles. Fire Department Head is the approver in this flow.
export type WorkPermitApprovalRole =
  | 'FIRE_DEPARTMENT_HEAD'
  | 'ISSUER'
  | 'AREA_INCHARGE'
  | 'SAFETY_COORDINATOR'
  | 'FACTORY_MANAGER';

export type WorkCompletionType = 'ABANDONED' | 'VERIFIED';

export interface WorkPermitWorker {
  id: number;
  permit: number;
  name: string;
  role: string;
  signed: boolean;
  signed_at: string | null;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkPermitAttachment {
  id: number;
  permit: number;
  file: string;
  title: string;
  uploaded_by_name: string;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

// One recorded sign-off in the authorization matrix.
export interface WorkPermitApproval {
  id: number;
  permit: number;
  role: WorkPermitApprovalRole;
  role_display: string;
  approved_by: number | null;
  approved_by_name: string;
  approved_at: string;
  remarks: string;
}

export interface WorkPermit {
  id: number;
  company: number;
  serial_no: string;
  permit_types: WorkPermitType[];
  status: WorkPermitStatus;
  status_display: string;

  // 1. Validity
  valid_date: string;
  time_start: string;
  time_end: string;

  // 2-4. Parties
  issuing_dept: string;
  issuer_name: string;
  issuer_phone: string;
  issued_to_name: string;
  issued_to_phone: string;
  cross_ref: string;

  // 5-6. Job
  job_location: string;
  job_description: string;

  // 7-8. Hazards + method statement
  hazards_identified: string[];
  control_measures: string;

  // 9. Isolations
  electrical_isolation_required: boolean;
  electrical_isolation_detail: string;
  service_isolation_required: boolean;
  service_isolation_detail: string;
  process_isolation_required: boolean;
  process_isolation_detail: string;

  // 10-11. Checklists
  ppe: string[];
  precautions: string[];

  // 12. Authorization matrix
  approvals: WorkPermitApproval[];
  modification_authorization_required: boolean;
  fire_watcher_name: string;

  // Submission / approval / start tracking (maintenance → fire-head flow)
  submitted_by: number | null;
  submitted_by_name: string;
  submitted_at: string | null;
  approved_by: number | null;
  approved_by_name: string;
  approved_at: string | null;
  started_by: number | null;
  started_by_name: string;
  started_at: string | null;
  expires_at: string | null;
  expired_at: string | null;
  renewed_from: number | null;
  renewed_from_serial: string;

  // 13. Acceptance (legacy fields, retained for compatibility)
  accepted_by: number | null;
  accepted_by_name: string;
  accepted_at: string | null;
  contractor_company: string;

  // 14. Energization
  service_energization: boolean;
  process_energization: boolean;
  electrical_energization: boolean;

  // 15/17. Completion + handover
  completion_type: WorkCompletionType | null;
  completed_by: number | null;
  completed_by_name: string;
  completed_at: string | null;
  closure_time: string | null;
  handover_by: string;
  handover_to: string;

  // Children
  workers: WorkPermitWorker[];
  attachments: WorkPermitAttachment[];

  // Derived counts
  total_workers: number;
  approvals_count: number;

  // Audit
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface WorkPermitWorkerInput {
  name: string;
  role?: string;
}

export interface WorkPermitPayload {
  permit_types: WorkPermitType[];
  valid_date: string;
  time_start: string;
  time_end: string;
  issuing_dept?: string;
  issuer_name?: string;
  issuer_phone?: string;
  issued_to_name?: string;
  issued_to_phone?: string;
  cross_ref?: string;
  job_location: string;
  job_description: string;
  hazards_identified?: string[];
  control_measures?: string;
  electrical_isolation_required?: boolean;
  electrical_isolation_detail?: string;
  service_isolation_required?: boolean;
  service_isolation_detail?: string;
  process_isolation_required?: boolean;
  process_isolation_detail?: string;
  ppe?: string[];
  precautions?: string[];
  modification_authorization_required?: boolean;
  fire_watcher_name?: string;
  workers_input?: WorkPermitWorkerInput[];
}

export type WorkPermitUpdatePayload = Partial<WorkPermitPayload>;

export interface WorkPermitApprovePayload {
  remarks?: string;
}

export interface WorkPermitCompletePayload {
  completion_type: WorkCompletionType;
  closure_time?: string;
  handover_by?: string;
  handover_to?: string;
}

export interface WorkPermitCancelPayload {
  reason?: string;
}

export interface WorkPermitWorkerPayload extends WorkPermitWorkerInput {
  permit: number;
}

export interface WorkPermitAttachmentUploadPayload {
  permit: number;
  file: File;
  title?: string;
}

export interface WorkPermitFilters {
  search?: string;
  status?: WorkPermitStatus | 'ALL';
  permit_type?: WorkPermitType | 'ALL';
  valid_date?: string;
  date_from?: string;
  date_to?: string;
  is_active?: boolean;
}
