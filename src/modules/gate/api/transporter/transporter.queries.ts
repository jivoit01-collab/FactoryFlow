import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/core/auth';

import {
  type CreateTransporterRequest,
  type ResolveTransporterRequest,
  transporterApi,
  type UpdateTransporterRequest,
} from './transporter.api';

/**
 * Fetch lightweight transporter names for dropdown
 */
export function useTransporterNames(enabled: boolean = true) {
  return useQuery({
    queryKey: ['transporterNames'],
    queryFn: () => transporterApi.getNames(),
    staleTime: 10 * 60 * 1000, // 10 minutes - transporters don't change often
    enabled,
  });
}

/**
 * Fetch full transporter details by ID
 */
export function useTransporterById(id: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['transporter', id],
    queryFn: () => transporterApi.getById(id!),
    staleTime: 10 * 60 * 1000,
    enabled: enabled && id !== null,
  });
}

/**
 * Legacy: Fetch full list of transporters
 */
export function useTransporters(enabled: boolean = true) {
  return useQuery({
    queryKey: ['transporters'],
    queryFn: () => transporterApi.getList(),
    staleTime: 10 * 60 * 1000, // 10 minutes - transporters don't change often
    enabled,
  });
}

/**
 * The current company's SAP vendors to pick a transporter from. Keyed on the
 * company: each company's SAP has its own vendor codes.
 */
export function useSapTransporterVendors(enabled: boolean = true) {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['transporterSapVendors', currentCompany?.company_code],
    queryFn: () => transporterApi.getSapVendors(),
    staleTime: 10 * 60 * 1000,
    enabled,
  });
}

/** Turn a picked SAP vendor or a typed name into the app transporter. */
export function useResolveTransporter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ResolveTransporterRequest) => transporterApi.resolve(data),
    onSuccess: (transporter) => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
      queryClient.invalidateQueries({ queryKey: ['transporterNames'] });
      queryClient.setQueryData(['transporter', transporter.id], transporter);
    },
  });
}

export function useCreateTransporter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransporterRequest) => transporterApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
      queryClient.invalidateQueries({ queryKey: ['transporterNames'] });
    },
  });
}

export function useUpdateTransporter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTransporterRequest) => transporterApi.update(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
      queryClient.invalidateQueries({ queryKey: ['transporterNames'] });
      queryClient.invalidateQueries({ queryKey: ['transporter', variables.id] });
    },
  });
}
