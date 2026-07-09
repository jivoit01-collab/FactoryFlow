// Safety fine types — PPE / safety violations recorded against a worker by the
// Fire Department Head, with a monetary fine settled as PAID or WAIVED.

export type SafetyFineStatus = 'PENDING' | 'PAID' | 'WAIVED';

export interface SafetyViolationType {
  id: number;
  company: number;
  name: string;
  description: string;
  default_fine_amount: string;
  fines_count: number;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface SafetyFinePhoto {
  id: number;
  fine: number;
  photo: string;
  caption: string;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyFine {
  id: number;
  company: number;
  fine_no: string;
  violation_type: number;
  violation_type_name: string;

  // Offender (free text — there is no employee master)
  offender_name: string;
  employee_code: string;
  contractor_company: string;
  contact: string;
  department: number | null;
  department_name: string;

  // Violation detail
  occurred_at: string;
  location: string;
  ppe_missing: string[];
  description: string;

  fine_amount: string;
  status: SafetyFineStatus;
  status_display: string;

  issued_by: number | null;
  issued_by_name: string;
  issued_at: string;

  settled_by: number | null;
  settled_by_name: string;
  settled_at: string | null;
  settlement_remarks: string;

  photos: SafetyFinePhoto[];

  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface SafetyViolationTypePayload {
  name: string;
  description?: string;
  default_fine_amount?: string;
  is_active?: boolean;
}

export interface SafetyFinePayload {
  violation_type: number;
  offender_name: string;
  employee_code?: string;
  contractor_company?: string;
  contact?: string;
  department?: number | null;
  occurred_at?: string;
  location?: string;
  ppe_missing?: string[];
  description?: string;
  // Omit to use the violation type's default amount.
  fine_amount?: string;
}

export type SafetyFineUpdatePayload = Partial<SafetyFinePayload>;

export interface SafetyFineSettlePayload {
  status: 'PAID' | 'WAIVED';
  // Required when waiving.
  settlement_remarks?: string;
}

export interface SafetyFinePhotoUploadPayload {
  fine: number;
  file: File;
  caption?: string;
}

export interface SafetyFineFilters {
  search?: string;
  status?: SafetyFineStatus | 'ALL';
  violation_type?: number | 'ALL';
  department?: number | 'ALL';
  date_from?: string;
  date_to?: string;
  is_active?: boolean;
}

export interface SafetyViolationTypeFilters {
  search?: string;
  is_active?: boolean;
}
