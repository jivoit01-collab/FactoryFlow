import { apiClient } from '@/core/api';

import type {
  ContractDetail,
  ContractRegister,
  ContractTerms,
  ContractTermsPayload,
} from '../types';

export const CONTRACT_ENDPOINTS = {
  CONTRACTS: '/exim/contracts/',
  CONTRACT: (po: string) => `/exim/contracts/${encodeURIComponent(po)}/`,
  TERMS: (po: string) => `/exim/contracts/${encodeURIComponent(po)}/terms/`,
} as const;

/**
 * SAP not answering is the pages' own message (a 503 with its reason), and the
 * terms dialog shows the server's reason beside its fields: none of these calls
 * wants the app's global error toast as well.
 */
const QUIET = { suppressErrorToast: true };

/** Which contracts the register lists: a financial year, or every one still open. */
export type ContractScope = { year: number } | { open: true };

export const contractApi = {
  async register(scope: ContractScope): Promise<ContractRegister> {
    const params = 'open' in scope ? { open: 1 } : { year: scope.year };
    return (
      await apiClient.get<ContractRegister>(CONTRACT_ENDPOINTS.CONTRACTS, { params, ...QUIET })
    ).data;
  },
  async contract(po: string): Promise<ContractDetail> {
    return (await apiClient.get<ContractDetail>(CONTRACT_ENDPOINTS.CONTRACT(po), QUIET)).data;
  },
  async setTerms(po: string, payload: ContractTermsPayload): Promise<ContractTerms> {
    return (await apiClient.put<ContractTerms>(CONTRACT_ENDPOINTS.TERMS(po), payload, QUIET)).data;
  },
};
