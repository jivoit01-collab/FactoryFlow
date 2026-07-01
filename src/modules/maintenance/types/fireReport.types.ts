// Fire shift report types — daily/shift inspection of fire equipment with photos.

export type FireShiftType = 'DAY' | 'NIGHT';
export type FireReportStatus = 'SUBMITTED' | 'REVIEWED';
export type FireEquipmentStatus = 'OK' | 'NOT_OK' | 'NEEDS_ATTENTION';
export type FireEquipmentType =
  | 'PUMP'
  | 'HYDRANT'
  | 'EXTINGUISHER'
  | 'SPRINKLER'
  | 'ALARM_PANEL'
  | 'HOSE'
  | 'OTHER';

export interface FireShiftReportPhoto {
  id: number;
  item: number;
  photo: string;
  caption: string;
  taken_on: string;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface FireShiftReportItem {
  id: number;
  company: number;
  report: number;
  asset: number | null;
  asset_code: string;
  asset_name: string;
  equipment_name: string;
  equipment_type: FireEquipmentType;
  equipment_type_display: string;
  status: FireEquipmentStatus;
  status_display: string;
  reading: string;
  remarks: string;
  photos: FireShiftReportPhoto[];
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface FireShiftReportAttachment {
  id: number;
  report: number;
  file: string;
  title: string;
  uploaded_by_name: string;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface FireShiftReport {
  id: number;
  company: number;
  report_date: string;
  shift: FireShiftType;
  shift_display: string;
  area: string;
  status: FireReportStatus;
  status_display: string;
  summary_remarks: string;
  submitted_by: number | null;
  submitted_by_name: string;
  reviewed_by: number | null;
  reviewed_by_name: string;
  reviewed_at: string | null;
  review_remarks: string;
  items: FireShiftReportItem[];
  attachments: FireShiftReportAttachment[];
  total_items: number;
  attention_items: number;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface FireShiftReportItemInput {
  asset?: number | null;
  equipment_name: string;
  equipment_type?: FireEquipmentType;
  status?: FireEquipmentStatus;
  reading?: string;
  remarks?: string;
}

export interface FireShiftReportPayload {
  report_date: string;
  shift: FireShiftType;
  area?: string;
  summary_remarks?: string;
  items_input?: FireShiftReportItemInput[];
}

export interface FireShiftReportUpdatePayload {
  report_date?: string;
  shift?: FireShiftType;
  area?: string;
  summary_remarks?: string;
}

export interface FireReportReviewPayload {
  review_remarks?: string;
}

export interface FireShiftReportItemPayload extends FireShiftReportItemInput {
  report: number;
}

export interface FireShiftReportPhotoUploadPayload {
  item: number;
  file: File;
  caption?: string;
  taken_on?: string;
}

export interface FireShiftReportAttachmentUploadPayload {
  report: number;
  file: File;
  title?: string;
}

export interface FireShiftReportFilters {
  search?: string;
  shift?: FireShiftType | 'ALL';
  status?: FireReportStatus | 'ALL';
  report_date?: string;
  date_from?: string;
  date_to?: string;
  asset?: number | 'ALL';
  is_active?: boolean;
}
