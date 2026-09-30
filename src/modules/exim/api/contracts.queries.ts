/**
 * React-query hooks for the oil contracts. Both reads go to SAP live, so they
 * are kept a few minutes rather than refetched on every visit; setting a PO's
 * terms refreshes every contract read (its landed cost moves).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ContractTermsPayload } from '../types';
import { contractApi, type ContractScope } from './contracts.api';

export const CONTRACT_KEYS = {
  all: ['exim', 'contracts'] as const,
  register: (scope: ContractScope) => ['exim', 'contracts', 'register', scope] as const,
  contract: (po: string) => ['exim', 'contracts', 'po', po] as const,
};

const FIVE_MINUTES = 5 * 60 * 1000;

export function useContracts(scope: ContractScope) {
  return useQuery({
    queryKey: CONTRACT_KEYS.register(scope),
    queryFn: () => contractApi.register(scope),
    staleTime: FIVE_MINUTES,
    placeholderData: (previous) => previous,
  });
}

export function useContract(po: string | undefined) {
  return useQuery({
    queryKey: CONTRACT_KEYS.contract(po ?? ''),
    queryFn: () => contractApi.contract(po as string),
    enabled: !!po,
    staleTime: FIVE_MINUTES,
  });
}

export function useSetContractTerms(po: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ContractTermsPayload) => contractApi.setTerms(po, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.all }),
  });
}
