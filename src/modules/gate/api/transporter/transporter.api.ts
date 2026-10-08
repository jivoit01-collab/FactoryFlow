import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

// Lightweight type for dropdown list (names endpoint)
export interface TransporterName {
  id: number;
  name: string;
}

// Full transporter details
export interface Transporter {
  id: number;
  name: string;
  contact_person: string;
  mobile_no: string;
  gstin: string;
  /** Which SAP vendor it is, per company; empty for one typed by hand. */
  sap_links?: { company_code: string; card_code: string; card_name: string }[];
  created_at: string;
}

/** A vendor in the current company's SAP, offered as a vehicle's transporter. */
export interface SapTransporterVendor {
  card_code: string;
  card_name: string;
  /** SAP vendor group, e.g. TRANSPORTER, PURCHASE, SERVICE. Blank from the copy. */
  group: string;
  /** In SAP's TRANSPORTER group (or, from the copy, already linked to one). */
  is_transporter: boolean;
  gstin: string;
  frozen: boolean;
}

export interface SapTransporterVendorList {
  results: SapTransporterVendor[];
  /** Set when HANA was down and the nightly copy answered. */
  sap_copy_as_of: string | null;
}

/** A transporter picked from SAP, or typed by hand when SAP does not have it. */
export type ResolveTransporterRequest = { card_code: string } | { name: string };

export interface CreateTransporterRequest {
  name: string;
  contact_person: string;
  mobile_no: string;
  gstin: string;
}

export interface UpdateTransporterRequest extends CreateTransporterRequest {
  id: number;
}

export const transporterApi = {
  /**
   * Get list of transporter names for dropdown (lightweight)
   */
  async getNames(): Promise<TransporterName[]> {
    const response = await apiClient.get<TransporterName[]>(
      API_ENDPOINTS.VEHICLE.TRANSPORTER_NAMES,
    );
    return response.data;
  },

  /**
   * Get full transporter details by ID
   */
  async getById(id: number): Promise<Transporter> {
    const response = await apiClient.get<Transporter>(API_ENDPOINTS.VEHICLE.TRANSPORTER_BY_ID(id));
    return response.data;
  },

  /**
   * Get full list of transporters (legacy - use getNames for dropdowns)
   */
  async getList(): Promise<Transporter[]> {
    const response = await apiClient.get<Transporter[]>(API_ENDPOINTS.VEHICLE.TRANSPORTERS);
    return response.data;
  },
  
  /** The current company's active SAP vendors, transporters first. */
  async getSapVendors(): Promise<SapTransporterVendorList> {
    const response = await apiClient.get<SapTransporterVendorList>(
      API_ENDPOINTS.VEHICLE.TRANSPORTER_SAP_VENDORS,
    );
    return response.data;
  },

  /** The app transporter for a picked SAP vendor or a typed name, made if new. */
  async resolve(data: ResolveTransporterRequest): Promise<Transporter> {
    const response = await apiClient.post<Transporter>(
      API_ENDPOINTS.VEHICLE.TRANSPORTER_RESOLVE,
      data,
    );
    return response.data;
  },

  async update(data: UpdateTransporterRequest): Promise<Transporter> {
    const formData = new URLSearchParams();
    formData.append('name', data.name);
    formData.append('contact_person', data.contact_person);
    formData.append('mobile_no', data.mobile_no);
    formData.append('gstin', data.gstin);

    const response = await apiClient.put<Transporter>(
      API_ENDPOINTS.VEHICLE.TRANSPORTER_BY_ID(data.id),
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    return response.data;
  },

  async create(data: CreateTransporterRequest): Promise<Transporter> {
    // API expects form-urlencoded format
    const formData = new URLSearchParams();
    formData.append('name', data.name);
    formData.append('contact_person', data.contact_person);
    formData.append('mobile_no', data.mobile_no);
    formData.append('gstin', data.gstin);

    const response = await apiClient.post<Transporter>(
      API_ENDPOINTS.VEHICLE.TRANSPORTERS,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    return response.data;
  },
};
