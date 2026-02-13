import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  type CreateContractorRequest,
  type CreateEntryRequest,
  type CreateGateRequest,
  type CreateLabourRequest,
  type CreatePersonTypeRequest,
  type CreateVisitorRequest,
  type EntryFilters,
  type ExitEntryRequest,
  personGateInApi,
  type UpdateEntryRequest,
} from './personGateIn.api'

// ===== Person Types =====

export function usePersonTypes(enabled: boolean = true) {
  return useQuery({
    queryKey: ['personTypes'],
    queryFn: () => personGateInApi.getPersonTypes(),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useCreatePersonType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePersonTypeRequest) => personGateInApi.createPersonType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personTypes'] })
    },
  })
}

export function useUpdatePersonType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreatePersonTypeRequest }) =>
      personGateInApi.updatePersonType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personTypes'] })
    },
  })
}

export function useDeletePersonType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => personGateInApi.deletePersonType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personTypes'] })
    },
  })
}

// ===== Gates =====

export function useGates(enabled: boolean = true) {
  return useQuery({
    queryKey: ['personGates'],
    queryFn: () => personGateInApi.getGates(),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useCreateGate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGateRequest) => personGateInApi.createGate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personGates'] })
    },
  })
}

export function useUpdateGate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateGateRequest }) =>
      personGateInApi.updateGate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personGates'] })
    },
  })
}

export function useDeleteGate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => personGateInApi.deleteGate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personGates'] })
    },
  })
}

// ===== Contractors =====

export function useContractors(enabled: boolean = true) {
  return useQuery({
    queryKey: ['contractors'],
    queryFn: () => personGateInApi.getContractors(),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useCreateContractor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateContractorRequest) => personGateInApi.createContractor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
    },
  })
}

export function useUpdateContractor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateContractorRequest }) =>
      personGateInApi.updateContractor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
    },
  })
}

export function useDeleteContractor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => personGateInApi.deleteContractor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
    },
  })
}

// ===== Visitors =====

export function useVisitors(search?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['visitors', search],
    queryFn: () => personGateInApi.getVisitors(search),
    staleTime: 2 * 60 * 1000,
    enabled,
  })
}

export function useVisitor(id: number | null) {
  return useQuery({
    queryKey: ['visitor', id],
    queryFn: () => personGateInApi.getVisitor(id!),
    enabled: !!id,
  })
}

export function useCreateVisitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVisitorRequest) => personGateInApi.createVisitor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
    },
  })
}

export function useUpdateVisitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateVisitorRequest }) =>
      personGateInApi.updateVisitor(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
      queryClient.invalidateQueries({ queryKey: ['visitor', id] })
    },
  })
}

export function useDeleteVisitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => personGateInApi.deleteVisitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
    },
  })
}

// ===== Labours =====

export function useLabours(search?: string, contractorId?: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['labours', search, contractorId],
    queryFn: () => personGateInApi.getLabours(search, contractorId),
    staleTime: 2 * 60 * 1000,
    enabled,
  })
}

export function useLabour(id: number | null) {
  return useQuery({
    queryKey: ['labour', id],
    queryFn: () => personGateInApi.getLabour(id!),
    enabled: !!id,
  })
}

export function useCreateLabour() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLabourRequest) => personGateInApi.createLabour(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labours'] })
    },
  })
}

export function useUpdateLabour() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateLabourRequest }) =>
      personGateInApi.updateLabour(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['labours'] })
      queryClient.invalidateQueries({ queryKey: ['labour', id] })
    },
  })
}

export function useDeleteLabour() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => personGateInApi.deleteLabour(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labours'] })
    },
  })
}

// ===== Entry Logs =====

export function usePersonEntries(filters?: EntryFilters) {
  return useQuery({
    queryKey: ['personEntries', filters],
    queryFn: async () => {
      const response = await personGateInApi.getAllEntries(filters)
      return response.results // Extract results array from paginated response
    },
    staleTime: 30 * 1000, // 30 seconds for entry data
  })
}

export function usePersonEntryCounts(filters?: EntryFilters) {
  return useQuery({
    queryKey: ['personEntryCounts', filters],
    queryFn: () => personGateInApi.getEntryCounts(filters),
    staleTime: 30 * 1000,
  })
}

export function useInsideList() {
  return useQuery({
    queryKey: ['insideList'],
    queryFn: () => personGateInApi.getInsideList(),
    staleTime: 15 * 1000, // Refresh more frequently for inside list
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  })
}

export function usePersonEntry(id: number | null) {
  return useQuery({
    queryKey: ['personEntry', id],
    queryFn: () => personGateInApi.getEntry(id!),
    enabled: !!id,
  })
}

export function useCreatePersonEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEntryRequest) => personGateInApi.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personEntries'] })
      queryClient.invalidateQueries({ queryKey: ['personEntryCounts'] })
      queryClient.invalidateQueries({ queryKey: ['insideList'] })
    },
  })
}

export function useExitPersonEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExitEntryRequest }) =>
      personGateInApi.exitEntry(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['personEntries'] })
      queryClient.invalidateQueries({ queryKey: ['personEntryCounts'] })
      queryClient.invalidateQueries({ queryKey: ['insideList'] })
      queryClient.invalidateQueries({ queryKey: ['personEntry', id] })
    },
  })
}

export function useCancelPersonEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => personGateInApi.cancelEntry(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['personEntries'] })
      queryClient.invalidateQueries({ queryKey: ['personEntryCounts'] })
      queryClient.invalidateQueries({ queryKey: ['insideList'] })
      queryClient.invalidateQueries({ queryKey: ['personEntry', id] })
    },
  })
}

export function useUpdatePersonEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEntryRequest }) =>
      personGateInApi.updateEntry(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['personEntries'] })
      queryClient.invalidateQueries({ queryKey: ['personEntry', id] })
    },
  })
}

export function useSearchPersonEntries(filters?: EntryFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: ['personEntriesSearch', filters],
    queryFn: async () => {
      const response = await personGateInApi.searchEntries(filters)
      return response.results // Extract results array from paginated response
    },
    staleTime: 30 * 1000,
    enabled,
  })
}

// ===== Dashboard =====

export function usePersonGateInDashboard() {
  return useQuery({
    queryKey: ['personGateInDashboard'],
    queryFn: () => personGateInApi.getDashboard(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  })
}

// ===== History & Status =====

export function useVisitorHistory(visitorId: number | null) {
  return useQuery({
    queryKey: ['visitorHistory', visitorId],
    queryFn: () => personGateInApi.getVisitorHistory(visitorId!),
    enabled: !!visitorId,
  })
}

export function useLabourHistory(labourId: number | null) {
  return useQuery({
    queryKey: ['labourHistory', labourId],
    queryFn: () => personGateInApi.getLabourHistory(labourId!),
    enabled: !!labourId,
  })
}

export function useCheckPersonStatus(
  params: { visitor?: number; labour?: number },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['checkPersonStatus', params],
    queryFn: () => personGateInApi.checkPersonStatus(params),
    enabled: enabled && (!!params.visitor || !!params.labour),
  })
}
