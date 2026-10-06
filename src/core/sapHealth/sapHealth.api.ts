import { apiClient } from '@/core/api';

/** One of SAP's two halves, as the backend last found it (sap_client/health.py). */
export interface SapComponentHealth {
  status: 'up' | 'down' | 'unknown';
  /** When it went into this status (ISO), or null if never probed. */
  since: string | null;
  checked_at: string | null;
  error: string;
}

/** How old the copy of SAP is that the current company's screens fall back on. */
export interface SapCopyFreshness {
  company_code: string;
  /** Bills and open POs, refreshed every 15 minutes (ISO), the older of the two. */
  frequent_as_of: string | null;
  /** Items, BOMs, warehouses and vendors, refreshed nightly (ISO). */
  nightly_as_of: string | null;
}

export interface SapHealth {
  ok: boolean;
  components: {
    /** Postings: every GRPO, return, transfer, invoice written to SAP. */
    service_layer: SapComponentHealth;
    /** Reads: open POs, stock, bills, anything shown from SAP. */
    hana: SapComponentHealth;
  };
  /** Postings that wait for SAP and post by themselves (the SAP posting queue). */
  waits_for_sap?: string[];
  /** With HANA down: the copy the app is working from, or null if there is none. */
  copy?: SapCopyFreshness | null;
}

// Kept beside its only caller rather than in API_ENDPOINTS: the app shell owns
// this, no module does.
const SAP_HEALTH_ENDPOINT = '/sap-health/';

export async function fetchSapHealth(): Promise<SapHealth> {
  const response = await apiClient.get<SapHealth>(SAP_HEALTH_ENDPOINT, {
    // A poll, not something the user asked for: never a toast of its own.
    suppressErrorToast: true,
    // The backend may probe SAP inline, which takes its own timeout when SAP
    // is hung; the poll can wait that long without holding anything up.
    timeout: 15_000,
  });
  return response.data;
}
