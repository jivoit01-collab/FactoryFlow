import { API_ENDPOINTS } from '@/config/constants/api.constants';
import { apiClient } from '@/core/api';

import { type Family, FAMILY_PATH, type RegistrationStatus } from '../constants';

// ---------------------------------------------------------------------------
// Shapes, as factory_app/partner_onboarding/serializers.py sends them.
// ---------------------------------------------------------------------------

export interface PublicCompany {
  code: string;
  name: string;
}

export interface SapOption {
  code: string | number;
  name: string;
}

export interface Address {
  id?: number;
  address_type: 'BILL_TO' | 'SHIP_TO';
  address_type_label?: string;
  position?: number;
  address_name: string;
  street: string;
  block: string;
  city: string;
  zip_code: string;
  state: string;
  country: string;
  gstin: string;
}

export interface BankAccount {
  id: number;
  position: number;
  bank_name: string;
  branch: string;
  account_number: string;
  ifsc: string;
  account_type: string;
  swift_code: string;
  is_primary: boolean;
  sap_bank_code: string;
}

export interface RegistrationDocument {
  id: number;
  kind: string;
  kind_label: string;
  original_name: string;
  content_type: string;
  size: number;
  uploaded_at: string;
  sent_to_sap_at: string | null;
}

export interface RegistrationEvent {
  id: number;
  kind: string;
  kind_label: string;
  actor_name: string;
  at: string;
  note: string;
  data: Record<string, unknown>;
}

export interface RegistrationRow {
  id: number;
  reference: string;
  family: Family;
  status: RegistrationStatus;
  status_label: string;
  company_code: string;
  card_name: string;
  partner_type: string;
  partner_type_label: string;
  industry: string;
  contact_name: string;
  mobile: string;
  email: string;
  gstin: string;
  pan: string;
  city: string;
  state: string;
  submitted_at: string;
  card_code: string;
  sap_card_code: string;
  sap_posting: boolean;
  sap_error: string;
  attachment_count: number | null;
  legacy_portal_id: number | null;
}

export interface RegistrationList {
  count: number;
  counts: Record<RegistrationStatus, number>;
  results: RegistrationRow[];
}

/** The SAP master data the approver sets (approvals.html's SAP tab). */
export interface ManagerFields {
  card_code_prefix: string;
  bp_group_code: number | null;
  bp_group_name: string;
  payment_terms_code: number | null;
  payment_terms_name: string;
  sales_employee_code: number | null;
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

export interface RegistrationActions {
  can_edit: boolean;
  can_verify: boolean;
  can_reject: boolean;
  can_approve: boolean;
}

export interface RegistrationDetail extends ManagerFields {
  id: number;
  reference: string;
  family: Family;
  status: RegistrationStatus;
  status_label: string;
  company_code: string;
  company_name: string;
  partner_type: string;
  partner_type_label: string;
  card_name: string;
  foreign_name: string;
  type_of_business: string;
  industry: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_title: string;
  contact_name: string;
  mobile: string;
  email: string;
  currency: string;
  gstin: string;
  pan: string;
  has_msme: boolean;
  msme_number: string;
  msme_type: string;
  msme_business_type: string;
  remarks: string;
  ship_same_as_bill: boolean;
  card_code: string;
  sap_card_code: string;
  sap_attachment_entry: number | null;
  sap_error: string;
  sap_warning: string;
  sap_posting: boolean;
  sap_posting_since: string | null;
  rejection_reason: string;
  legacy_portal_id: number | null;
  submitted_at: string;
  verified_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  verified_by_name: string;
  approved_by_name: string;
  rejected_by_name: string;
  default_card_code_prefix: string;
  default_control_account: string;
  addresses: Address[];
  attachments: RegistrationDocument[];
  events: RegistrationEvent[];
  actions: RegistrationActions;
  // customer only
  customer_type?: string;
  website?: string;
  contact_mobile?: string;
  contact_email?: string;
  // vendor only
  vendor_type?: string;
  products?: string;
  payment_terms_requested?: string;
  alt_contact?: string;
  tan?: string;
  has_tds?: boolean;
  tds_category?: string;
  tds_rate?: string;
  tds_ldc_number?: string;
  fssai_number?: string;
  bank_accounts?: BankAccount[];
  // on an approve answer
  warnings?: string[];
  message?: string;
}

export interface ListFilters {
  /** One status, several comma-separated (the server takes either), or '' for all. */
  status?: RegistrationStatus | '' | string;
  search?: string;
  limit?: number;
  offset?: number;
}

export type EditPayload = Partial<ManagerFields> &
  Partial<
    Pick<
      RegistrationDetail,
      | 'card_name'
      | 'foreign_name'
      | 'type_of_business'
      | 'industry'
      | 'contact_first_name'
      | 'contact_last_name'
      | 'contact_title'
      | 'mobile'
      | 'email'
      | 'currency'
      | 'gstin'
      | 'pan'
      | 'has_msme'
      | 'msme_number'
      | 'msme_type'
      | 'msme_business_type'
      | 'remarks'
      | 'customer_type'
      | 'vendor_type'
      | 'fssai_number'
      | 'tan'
    >
  > & {
    addresses?: Omit<Address, 'id' | 'address_type_label' | 'position'>[];
    bank_accounts?: Omit<BankAccount, 'id' | 'position' | 'is_primary'>[];
  };

export interface ApprovePayload extends Partial<ManagerFields> {
  bank_accounts?: { id: number; sap_bank_code: string }[];
  confirm_duplicate?: boolean;
}

export interface DuplicateMatch {
  card_code: string;
  card_name: string;
  matched_on: string[];
}

export interface SubmitAnswer {
  reference: string;
  message: string;
}

/** Room for the documents to reach SAP and the partner to be created. */
export const APPROVE_TIMEOUT_MS = 5 * 60 * 1000;
/** Room for several scans on a slow connection. */
export const SUBMIT_TIMEOUT_MS = 3 * 60 * 1000;

/** Drop blank filters so the URL says only what was asked. */
function params(filters: ListFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null),
  );
}

/** Lookups read the registration's own company, whatever company the screen is in. */
function forCompany(companyCode: string) {
  return { headers: { 'Company-Code': companyCode } };
}

export const partnerOnboardingApi = {
  list: async (family: Family, filters: ListFilters): Promise<RegistrationList> => {
    const { data } = await apiClient.get<RegistrationList>(
      API_ENDPOINTS.PARTNER_ONBOARDING.LIST(FAMILY_PATH[family]),
      {
        params: params(filters),
      },
    );
    return data;
  },

  detail: async (family: Family, id: number): Promise<RegistrationDetail> => {
    const { data } = await apiClient.get<RegistrationDetail>(
      API_ENDPOINTS.PARTNER_ONBOARDING.DETAIL(FAMILY_PATH[family], id),
    );
    return data;
  },

  /** The caller shows the field errors itself, so no toast. */
  update: async (family: Family, id: number, payload: EditPayload): Promise<RegistrationDetail> => {
    const { data } = await apiClient.patch<RegistrationDetail>(
      API_ENDPOINTS.PARTNER_ONBOARDING.DETAIL(FAMILY_PATH[family], id),
      payload,
      { suppressErrorToast: true },
    );
    return data;
  },

  verify: async (family: Family, id: number, note = ''): Promise<RegistrationDetail> => {
    const { data } = await apiClient.post<RegistrationDetail>(
      API_ENDPOINTS.PARTNER_ONBOARDING.VERIFY(FAMILY_PATH[family], id),
      { note },
    );
    return data;
  },

  reject: async (family: Family, id: number, reason: string): Promise<RegistrationDetail> => {
    const { data } = await apiClient.post<RegistrationDetail>(
      API_ENDPOINTS.PARTNER_ONBOARDING.REJECT(FAMILY_PATH[family], id),
      { reason },
    );
    return data;
  },

  /** Creates the partner in SAP. A 409 `possible_duplicate` is the caller's to show, so no toast. */
  approve: async (
    family: Family,
    id: number,
    payload: ApprovePayload,
  ): Promise<RegistrationDetail> => {
    const { data } = await apiClient.post<RegistrationDetail>(
      API_ENDPOINTS.PARTNER_ONBOARDING.APPROVE(FAMILY_PATH[family], id),
      payload,
      { timeout: APPROVE_TIMEOUT_MS, suppressErrorToast: true },
    );
    return data;
  },

  /** One document as a blob — streamed through the permission check, never a /media/ link. */
  document: async (family: Family, id: number, attachmentId: number): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(
      API_ENDPOINTS.PARTNER_ONBOARDING.ATTACHMENT(FAMILY_PATH[family], id, attachmentId),
      { responseType: 'blob' },
    );
    return data;
  },
};

/** The SAP pickers the approver needs, read from the registration's company. */
export const partnerLookupsApi = {
  bpGroups: async (companyCode: string, family: Family): Promise<SapOption[]> => {
    const { data } = await apiClient.get<SapOption[]>(API_ENDPOINTS.SAP_LOOKUPS.BP_GROUPS, {
      ...forCompany(companyCode),
      params: { type: family === 'customer' ? 'C' : 'S' },
    });
    return data;
  },
  paymentTerms: async (companyCode: string): Promise<SapOption[]> =>
    (
      await apiClient.get<SapOption[]>(
        API_ENDPOINTS.SAP_LOOKUPS.PAYMENT_TERMS,
        forCompany(companyCode),
      )
    ).data,
  salesEmployees: async (companyCode: string): Promise<SapOption[]> =>
    (
      await apiClient.get<SapOption[]>(
        API_ENDPOINTS.SAP_LOOKUPS.SALES_EMPLOYEES,
        forCompany(companyCode),
      )
    ).data,
  controlAccounts: async (companyCode: string, family: Family): Promise<SapOption[]> =>
    (
      await apiClient.get<SapOption[]>(
        family === 'customer'
          ? API_ENDPOINTS.SAP_LOOKUPS.AR_ACCOUNTS
          : API_ENDPOINTS.SAP_LOOKUPS.AP_ACCOUNTS,
        forCompany(companyCode),
      )
    ).data,
  mainGroups: async (companyCode: string): Promise<SapOption[]> =>
    (
      await apiClient.get<SapOption[]>(
        API_ENDPOINTS.SAP_LOOKUPS.MAIN_GROUP,
        forCompany(companyCode),
      )
    ).data,
  chains: async (companyCode: string): Promise<SapOption[]> =>
    (await apiClient.get<SapOption[]>(API_ENDPOINTS.SAP_LOOKUPS.CHAIN, forCompany(companyCode)))
      .data,
  banks: async (companyCode: string): Promise<SapOption[]> =>
    (await apiClient.get<SapOption[]>(API_ENDPOINTS.SAP_LOOKUPS.BANKS, forCompany(companyCode)))
      .data,
  states: async (companyCode: string): Promise<SapOption[]> =>
    (await apiClient.get<SapOption[]>(API_ENDPOINTS.SAP_LOOKUPS.STATES, forCompany(companyCode)))
      .data,
};

/**
 * The public forms' calls. No login: the server ignores any token, and the
 * client sends none for a visitor who never signed in. Errors are shown on
 * the form itself, so the global toast is suppressed.
 */
export const publicRegistrationApi = {
  companies: async (): Promise<PublicCompany[]> =>
    (
      await apiClient.get<PublicCompany[]>(API_ENDPOINTS.PARTNER_ONBOARDING.PUBLIC_COMPANIES, {
        suppressErrorToast: true,
      })
    ).data,

  states: async (company: string): Promise<SapOption[]> =>
    (
      await apiClient.get<SapOption[]>(API_ENDPOINTS.PARTNER_ONBOARDING.PUBLIC_STATES, {
        params: { company },
        suppressErrorToast: true,
      })
    ).data,

  submit: async (family: Family, form: FormData): Promise<SubmitAnswer> => {
    const url =
      family === 'customer'
        ? API_ENDPOINTS.PARTNER_ONBOARDING.PUBLIC_CUSTOMERS
        : API_ENDPOINTS.PARTNER_ONBOARDING.PUBLIC_VENDORS;
    const { data } = await apiClient.post<SubmitAnswer>(url, form, {
      timeout: SUBMIT_TIMEOUT_MS,
      suppressErrorToast: true,
    });
    return data;
  },
};
