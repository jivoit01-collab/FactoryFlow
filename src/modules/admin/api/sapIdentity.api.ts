import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

const EP = API_ENDPOINTS.SAP_IDENTITY;

/** One app user ↔ one SAP B1 account, inside one company. */
export interface SapApproverIdentity {
  id: number;
  user: number;
  user_name: string;
  user_email: string;
  user_code: string;
  company_code: string;
  /** OUSR.USER_CODE, e.g. 'USER37'. */
  sap_user_code: string;
  sap_user_name: string;
  /** Whether the app can authenticate as this SAP account. Never the password. */
  password_configured: boolean;
  is_active: boolean;
  created_at: string;
}

/** A SAP account to map to, straight from OUSR. */
export interface SapUserOption {
  user_code: string;
  user_name: string;
  locked: boolean;
  /**
   * Active approval templates naming this user as an authorizer, across A/R
   * invoices and transfers. Zero means mapping them buys nothing today.
   */
  authorizing_templates: number;
  password_configured: boolean;
  mapped_to: {
    identity_id: number;
    user_id: number;
    user_name: string;
    is_active: boolean;
  } | null;
}

export interface SapIdentityCreatePayload {
  user: number;
  sap_user_code: string;
  sap_user_name?: string;
}

export interface SapIdentityUpdatePayload {
  sap_user_code?: string;
  sap_user_name?: string;
  is_active?: boolean;
}

/** The caller's own mapping — what the app will sign as on their behalf. */
export interface MySapIdentity {
  sap_user_code: string | null;
  sap_user_name?: string;
  password_configured: boolean;
}

export const sapIdentityApi = {
  async list(): Promise<SapApproverIdentity[]> {
    const res = await apiClient.get<SapApproverIdentity[]>(EP.IDENTITIES);
    return res.data;
  },

  async sapUsers(includeLocked = false): Promise<SapUserOption[]> {
    const res = await apiClient.get<SapUserOption[]>(EP.SAP_USERS, {
      params: includeLocked ? { include_locked: '1' } : undefined,
    });
    return res.data;
  },

  async me(): Promise<MySapIdentity> {
    const res = await apiClient.get<MySapIdentity>(EP.ME);
    return res.data;
  },

  async create(payload: SapIdentityCreatePayload): Promise<SapApproverIdentity> {
    const res = await apiClient.post<SapApproverIdentity>(EP.IDENTITIES, payload);
    return res.data;
  },

  async update(id: number, payload: SapIdentityUpdatePayload): Promise<SapApproverIdentity> {
    const res = await apiClient.patch<SapApproverIdentity>(EP.IDENTITY_DETAIL(id), payload);
    return res.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(EP.IDENTITY_DETAIL(id));
  },
};
