// Fire equipment issue / return register — gear loaned to a person, optionally
// drawn from the Fire store (stock moves on issue and serviceable return).
import type { MaintenanceDecimal } from './maintenance.types';

export type FireIssueStatus = 'ISSUED' | 'PARTIALLY_RETURNED' | 'RETURNED';
export type FireReturnCondition = 'OK' | 'DAMAGED' | 'LOST';

export interface FireEquipmentIssueItem {
  id: number;
  company: number;
  issue: number;
  fire_item: number | null;
  fire_item_name: string;
  fire_item_part_number: string;
  equipment_name: string;
  quantity_issued: MaintenanceDecimal;
  quantity_returned: MaintenanceDecimal;
  pending_return_qty: MaintenanceDecimal;
  return_condition: FireReturnCondition;
  return_condition_display: string;
  remarks: string;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface FireEquipmentIssue {
  id: number;
  company: number;
  issued_to_name: string;
  employee_code: string;
  department: string;
  contact: string;
  issued_at: string;
  expected_return: string | null;
  returned_at: string | null;
  purpose: string;
  status: FireIssueStatus;
  status_display: string;
  issued_by: number | null;
  issued_by_name: string;
  remarks: string;
  items: FireEquipmentIssueItem[];
  is_overdue: boolean;
  total_items: number;
  pending_items: number;
  is_active: boolean;
  created_by: number | null;
  created_by_name: string;
  updated_by: number | null;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface FireEquipmentIssueItemInput {
  fire_item?: number | null;
  equipment_name: string;
  quantity_issued: MaintenanceDecimal;
  remarks?: string;
}

export interface FireEquipmentIssuePayload {
  issued_to_name: string;
  employee_code?: string;
  department?: string;
  contact?: string;
  issued_at?: string;
  expected_return?: string | null;
  purpose?: string;
  remarks?: string;
  items_input?: FireEquipmentIssueItemInput[];
}

export interface FireEquipmentReturnLine {
  item: number;
  quantity: MaintenanceDecimal;
  return_condition?: FireReturnCondition;
  remarks?: string;
}

export interface FireEquipmentReturnPayload {
  returns: FireEquipmentReturnLine[];
}

export interface FireEquipmentIssueFilters {
  search?: string;
  status?: FireIssueStatus | 'ALL';
  overdue?: boolean;
  date_from?: string;
  date_to?: string;
  is_active?: boolean;
}
