import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AttachmentKind,
  type EntryListParams,
  fleetApi,
  type VehicleListParams,
  type WritePayload,
} from './fleet.api';

/**
 * Query keys are all children of `['fleet']`, so every mutation can invalidate
 * the whole module in one line. Approving a fuel bill changes the entry, the
 * vehicle's mileage, the month's cost and the pending count at once — a
 * mutation that tried to name each of them would sooner or later miss one.
 */
export const FLEET_QUERY_KEYS = {
  all: ['fleet'] as const,
  options: () => [...FLEET_QUERY_KEYS.all, 'options'] as const,
  summary: () => [...FLEET_QUERY_KEYS.all, 'summary'] as const,
  costReport: (range: { from?: string; to?: string }) =>
    [...FLEET_QUERY_KEYS.all, 'cost-report', range.from ?? '', range.to ?? ''] as const,
  vehicles: (query: VehicleListParams) =>
    [
      ...FLEET_QUERY_KEYS.all,
      'vehicles',
      query.search ?? '',
      query.category ?? '',
      query.status ?? '',
      query.fuel_type ?? '',
      query.include_inactive ? 'all' : 'active',
    ] as const,
  vehicle: (id: number) => [...FLEET_QUERY_KEYS.all, 'vehicle', id] as const,
  vehicleSummary: (id: number, range: { from?: string; to?: string }) =>
    [...FLEET_QUERY_KEYS.all, 'vehicle-summary', id, range.from ?? '', range.to ?? ''] as const,
  fuelEntries: (query: EntryListParams) =>
    [...FLEET_QUERY_KEYS.all, 'fuel', JSON.stringify(query)] as const,
  serviceEntries: (query: EntryListParams) =>
    [...FLEET_QUERY_KEYS.all, 'service', JSON.stringify(query)] as const,
  dailyReadings: (query: { vehicle?: number; from?: string; to?: string }) =>
    [...FLEET_QUERY_KEYS.all, 'daily-readings', JSON.stringify(query)] as const,
  pendingApprovals: () => [...FLEET_QUERY_KEYS.all, 'pending-approvals'] as const,
  documents: (query: { vehicle?: number; doc_type?: string }) =>
    [...FLEET_QUERY_KEYS.all, 'documents', JSON.stringify(query)] as const,
  expiringDocuments: (days?: number) =>
    [...FLEET_QUERY_KEYS.all, 'documents-expiring', days ?? 0] as const,
};

/**
 * The choice lists and this user's rights. Long-lived: none of it changes
 * inside a session, and every form on the module reads it.
 */
export function useFleetOptions() {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.options(),
    queryFn: () => fleetApi.options(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFleetSummary() {
  return useQuery({ queryKey: FLEET_QUERY_KEYS.summary(), queryFn: () => fleetApi.summary() });
}

export function useFleetCostReport(range: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.costReport(range),
    queryFn: () => fleetApi.costReport(range),
  });
}

export function useFleetVehicles(query: VehicleListParams = {}) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.vehicles(query),
    queryFn: () => fleetApi.vehicles(query),
  });
}

export function useFleetVehicle(id: number | null) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.vehicle(id ?? 0),
    queryFn: () => fleetApi.vehicle(id as number),
    enabled: id != null,
  });
}

export function useVehicleSummary(id: number | null, range: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.vehicleSummary(id ?? 0, range),
    queryFn: () => fleetApi.vehicleSummary(id as number, range),
    enabled: id != null,
  });
}

export function useDailyReadings(query: { vehicle?: number; from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.dailyReadings(query),
    queryFn: () => fleetApi.dailyReadings(query),
  });
}

export function useSaveDailyReading() {
  return useFleetMutation((payload: WritePayload) => fleetApi.saveDailyReading(payload));
}

export function useDeleteDailyReading() {
  return useFleetMutation((id: number) => fleetApi.deleteDailyReading(id));
}

export function useFuelEntries(query: EntryListParams = {}, enabled = true) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.fuelEntries(query),
    queryFn: () => fleetApi.fuelEntries(query),
    enabled,
  });
}

export function useServiceEntries(query: EntryListParams = {}, enabled = true) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.serviceEntries(query),
    queryFn: () => fleetApi.serviceEntries(query),
    enabled,
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.pendingApprovals(),
    queryFn: () => fleetApi.pendingApprovals(),
  });
}

export function useVehicleDocuments(query: { vehicle?: number; doc_type?: string } = {}) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.documents(query),
    queryFn: () => fleetApi.documents(query),
  });
}

export function useExpiringDocuments(days?: number) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.expiringDocuments(days),
    queryFn: () => fleetApi.expiringDocuments(days),
  });
}

/** Every write refreshes the whole module. See the note on the keys above. */
function useFleetMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FLEET_QUERY_KEYS.all });
    },
  });
}

export function useCreateVehicle() {
  return useFleetMutation((payload: WritePayload) => fleetApi.createVehicle(payload));
}

export function useUpdateVehicle() {
  return useFleetMutation(({ id, payload }: { id: number; payload: WritePayload }) =>
    fleetApi.updateVehicle(id, payload),
  );
}

export function useRetireVehicle() {
  return useFleetMutation((id: number) => fleetApi.retireVehicle(id));
}

export function useCreateFuelEntry() {
  return useFleetMutation((payload: WritePayload) => fleetApi.createFuelEntry(payload));
}

export function useUpdateFuelEntry() {
  return useFleetMutation(({ id, payload }: { id: number; payload: WritePayload }) =>
    fleetApi.updateFuelEntry(id, payload),
  );
}

export function useDeleteFuelEntry() {
  return useFleetMutation((id: number) => fleetApi.deleteFuelEntry(id));
}

export function useCreateServiceEntry() {
  return useFleetMutation((payload: WritePayload) => fleetApi.createServiceEntry(payload));
}

export function useUpdateServiceEntry() {
  return useFleetMutation(({ id, payload }: { id: number; payload: WritePayload }) =>
    fleetApi.updateServiceEntry(id, payload),
  );
}

export function useDeleteServiceEntry() {
  return useFleetMutation((id: number) => fleetApi.deleteServiceEntry(id));
}

export function useDecideServiceEntry() {
  return useFleetMutation(
    ({
      id,
      ...decision
    }: {
      id: number;
      approval_status: 'APPROVED' | 'REJECTED';
      rejection_reason?: string;
    }) => fleetApi.decideServiceEntry(id, decision),
  );
}

export function useCreateDocument() {
  return useFleetMutation((payload: WritePayload) => fleetApi.createDocument(payload));
}

export function useUpdateDocument() {
  return useFleetMutation(({ id, payload }: { id: number; payload: WritePayload }) =>
    fleetApi.updateDocument(id, payload),
  );
}

export function useDeleteDocument() {
  return useFleetMutation((id: number) => fleetApi.deleteDocument(id));
}

/**
 * Open a stored bill or scan in a new tab.
 *
 * The file comes back as a blob because the endpoint needs the auth header,
 * so there is nothing to put in an `href`. The object URL is revoked a minute
 * later, by which time the tab that was handed it has read it.
 */
export function useOpenAttachment() {
  return useMutation({
    mutationFn: ({ kind, id }: { kind: AttachmentKind; id: number }) =>
      fleetApi.attachment(kind, id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}
