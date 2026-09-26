/**
 * The approver's SAP fields as the form holds them (codes as text) and as the
 * API takes them (codes as numbers or null).
 */
import type { ManagerFields } from '../api/partner-onboarding.api';

/** The form's copy of the fields: numbers as text until sent. */
export interface ManagerDraft {
  card_code_prefix: string;
  bp_group_code: string;
  bp_group_name: string;
  payment_terms_code: string;
  payment_terms_name: string;
  sales_employee_code: string;
  sales_employee_name: string;
  control_account: string;
  control_account_name: string;
  credit_limit: string;
  main_group: string;
  chain: string;
  sap_currency: string;
  territory: string;
  manager_notes: string;
}

const code = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : String(value);

export function managerDraftFrom(fields: ManagerFields): ManagerDraft {
  return {
    card_code_prefix: fields.card_code_prefix ?? '',
    bp_group_code: code(fields.bp_group_code),
    bp_group_name: fields.bp_group_name ?? '',
    payment_terms_code: code(fields.payment_terms_code),
    payment_terms_name: fields.payment_terms_name ?? '',
    sales_employee_code: code(fields.sales_employee_code),
    sales_employee_name: fields.sales_employee_name ?? '',
    control_account: fields.control_account ?? '',
    control_account_name: fields.control_account_name ?? '',
    credit_limit: fields.credit_limit ?? '0',
    main_group: fields.main_group ?? '',
    chain: fields.chain ?? '',
    sap_currency: fields.sap_currency ?? '',
    territory: fields.territory ?? '',
    manager_notes: fields.manager_notes ?? '',
  };
}

const number = (value: string) => (value.trim() === '' ? null : Number(value));

/** The fields as the API takes them. */
export function managerPayload(draft: ManagerDraft): Partial<ManagerFields> {
  return {
    card_code_prefix: draft.card_code_prefix.trim().toUpperCase(),
    bp_group_code: number(draft.bp_group_code),
    bp_group_name: draft.bp_group_name,
    payment_terms_code: number(draft.payment_terms_code),
    payment_terms_name: draft.payment_terms_name,
    sales_employee_code: number(draft.sales_employee_code),
    sales_employee_name: draft.sales_employee_name,
    control_account: draft.control_account.trim(),
    control_account_name: draft.control_account_name,
    credit_limit: draft.credit_limit.trim() === '' ? '0' : draft.credit_limit.trim(),
    main_group: draft.main_group,
    chain: draft.chain,
    sap_currency: draft.sap_currency,
    territory: draft.territory.trim(),
    manager_notes: draft.manager_notes,
  };
}
