/**
 * React-query hooks for the ETP / STP registers.
 *
 * Query keys are namespaced `['etp', <resource>, filters]`, and every mutation
 * invalidates its own resource plus the dashboard — the hub page counts today's
 * filled registers, so filing one has to refresh it.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  BackwashEntry,
  BackwashEquipment,
  CalibrationInstrument,
  CalibrationRecord,
  ChangeLogFilters,
  ChemicalConsumptionLog,
  DailyPlantLog,
  EtpPrintDocument,
  MasterFilters,
  MonitoringParameter,
  MonitoringRecord,
  PlantChemical,
  PlantOption,
  PlantStaff,
  RegisterFilters,
  TreatmentPlant,
} from '../types';
import { etpApi } from './etp.api';

type QueryClient = ReturnType<typeof useQueryClient>;

export const ETP_KEYS = {
  all: ['etp'] as const,
  dashboard: (params?: object) => ['etp', 'dashboard', params ?? {}] as const,
  summary: (params?: object) => ['etp', 'summary', params ?? {}] as const,
  plants: (filters?: MasterFilters) => ['etp', 'plants', filters ?? {}] as const,
  staff: (filters?: MasterFilters) => ['etp', 'staff', filters ?? {}] as const,
  options: (filters?: MasterFilters) => ['etp', 'options', filters ?? {}] as const,
  chemicals: (filters?: MasterFilters) => ['etp', 'chemicals', filters ?? {}] as const,
  backwashEquipment: (filters?: MasterFilters) =>
    ['etp', 'backwash-equipment', filters ?? {}] as const,
  parameters: (filters?: MasterFilters) => ['etp', 'parameters', filters ?? {}] as const,
  instruments: (filters?: MasterFilters) => ['etp', 'instruments', filters ?? {}] as const,
  printDocuments: (filters?: object) => ['etp', 'print-documents', filters ?? {}] as const,
  dailyLogs: (filters?: RegisterFilters) => ['etp', 'daily-logs', filters ?? {}] as const,
  monitoring: (filters?: RegisterFilters) => ['etp', 'monitoring', filters ?? {}] as const,
  sheetTemplate: (params?: object) => ['etp', 'sheet-template', params ?? {}] as const,
  chemicalLogs: (filters?: RegisterFilters) => ['etp', 'chemical-logs', filters ?? {}] as const,
  chemicalTotals: (filters?: RegisterFilters) => ['etp', 'chemical-totals', filters ?? {}] as const,
  sludge: (filters?: RegisterFilters) => ['etp', 'sludge', filters ?? {}] as const,
  backwash: (filters?: object) => ['etp', 'backwash', filters ?? {}] as const,
  calibration: (filters?: object) => ['etp', 'calibration', filters ?? {}] as const,
  changeLog: (filters?: ChangeLogFilters) => ['etp', 'change-log', filters ?? {}] as const,
};

/** Invalidate one resource plus the hub counts and the edit trail. */
function invalidate(queryClient: QueryClient, resource: string) {
  queryClient.invalidateQueries({ queryKey: ['etp', resource] });
  queryClient.invalidateQueries({ queryKey: ['etp', 'dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['etp', 'summary'] });
  // Every register write appends to the trail, so the panel showing it refreshes.
  queryClient.invalidateQueries({ queryKey: ['etp', 'change-log'] });
}

// ---- Overviews ------------------------------------------------------------

export function useEtpDashboard(params?: { date?: string; company?: string }) {
  return useQuery({
    queryKey: ETP_KEYS.dashboard(params),
    queryFn: () => etpApi.getDashboard(params),
  });
}

export function useEtpSummary(
  params: { plant: number; date_from?: string; date_to?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ETP_KEYS.summary(params),
    queryFn: () => etpApi.getSummary(params),
    enabled: enabled && Boolean(params.plant),
  });
}

// ---- Plants ---------------------------------------------------------------

export function useEtpPlants(filters?: MasterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.plants(filters),
    queryFn: () => etpApi.getPlants(filters),
  });
}

export function useCreateEtpPlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<TreatmentPlant>) => etpApi.createPlant(payload),
    onSuccess: () => invalidate(queryClient, 'plants'),
  });
}

export function useUpdateEtpPlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TreatmentPlant> }) =>
      etpApi.updatePlant(id, payload),
    onSuccess: () => invalidate(queryClient, 'plants'),
  });
}

export function useDeleteEtpPlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deletePlant(id),
    onSuccess: () => invalidate(queryClient, 'plants'),
  });
}

// ---- Staff ----------------------------------------------------------------

export function useEtpStaff(filters?: MasterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.staff(filters),
    queryFn: () => etpApi.getStaff(filters),
  });
}

export function useCreateEtpStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PlantStaff>) => etpApi.createStaff(payload),
    onSuccess: () => invalidate(queryClient, 'staff'),
  });
}

export function useUpdateEtpStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<PlantStaff> }) =>
      etpApi.updateStaff(id, payload),
    onSuccess: () => invalidate(queryClient, 'staff'),
  });
}

export function useDeleteEtpStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteStaff(id),
    onSuccess: () => invalidate(queryClient, 'staff'),
  });
}

// ---- Dropdown options -----------------------------------------------------

export function useEtpOptions(filters?: MasterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.options(filters),
    queryFn: () => etpApi.getOptions(filters),
  });
}

export function useCreateEtpOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PlantOption>) => etpApi.createOption(payload),
    onSuccess: () => invalidate(queryClient, 'options'),
  });
}

export function useUpdateEtpOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<PlantOption> }) =>
      etpApi.updateOption(id, payload),
    onSuccess: () => invalidate(queryClient, 'options'),
  });
}

export function useDeleteEtpOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteOption(id),
    onSuccess: () => invalidate(queryClient, 'options'),
  });
}

// ---- Chemicals ------------------------------------------------------------

export function useEtpChemicals(filters?: MasterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.chemicals(filters),
    queryFn: () => etpApi.getChemicals(filters),
  });
}

export function useCreateEtpChemical() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PlantChemical>) => etpApi.createChemical(payload),
    onSuccess: () => invalidate(queryClient, 'chemicals'),
  });
}

export function useUpdateEtpChemical() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<PlantChemical> }) =>
      etpApi.updateChemical(id, payload),
    onSuccess: () => invalidate(queryClient, 'chemicals'),
  });
}

export function useDeleteEtpChemical() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteChemical(id),
    onSuccess: () => invalidate(queryClient, 'chemicals'),
  });
}

// ---- Back-wash equipment --------------------------------------------------

export function useEtpBackwashEquipment(filters?: MasterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.backwashEquipment(filters),
    queryFn: () => etpApi.getBackwashEquipment(filters),
  });
}

export function useCreateEtpBackwashEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BackwashEquipment>) => etpApi.createBackwashEquipment(payload),
    onSuccess: () => invalidate(queryClient, 'backwash-equipment'),
  });
}

export function useUpdateEtpBackwashEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<BackwashEquipment> }) =>
      etpApi.updateBackwashEquipment(id, payload),
    onSuccess: () => invalidate(queryClient, 'backwash-equipment'),
  });
}

export function useDeleteEtpBackwashEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteBackwashEquipment(id),
    onSuccess: () => invalidate(queryClient, 'backwash-equipment'),
  });
}

// ---- Monitoring parameters ------------------------------------------------

export function useEtpMonitoringParameters(filters?: MasterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.parameters(filters),
    queryFn: () => etpApi.getMonitoringParameters(filters),
  });
}

export function useCreateEtpMonitoringParameter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<MonitoringParameter>) =>
      etpApi.createMonitoringParameter(payload),
    onSuccess: () => invalidate(queryClient, 'parameters'),
  });
}

export function useUpdateEtpMonitoringParameter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<MonitoringParameter> }) =>
      etpApi.updateMonitoringParameter(id, payload),
    onSuccess: () => invalidate(queryClient, 'parameters'),
  });
}

export function useDeleteEtpMonitoringParameter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteMonitoringParameter(id),
    onSuccess: () => invalidate(queryClient, 'parameters'),
  });
}

// ---- Instruments ----------------------------------------------------------

export function useEtpInstruments(filters?: MasterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.instruments(filters),
    queryFn: () => etpApi.getInstruments(filters),
  });
}

export function useCreateEtpInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CalibrationInstrument>) => etpApi.createInstrument(payload),
    onSuccess: () => invalidate(queryClient, 'instruments'),
  });
}

export function useUpdateEtpInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CalibrationInstrument> }) =>
      etpApi.updateInstrument(id, payload),
    onSuccess: () => invalidate(queryClient, 'instruments'),
  });
}

export function useDeleteEtpInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteInstrument(id),
    onSuccess: () => invalidate(queryClient, 'instruments'),
  });
}

// ---- Register 1: daily plant log -----------------------------------------

export function useEtpDailyLogs(filters?: RegisterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.dailyLogs(filters),
    queryFn: () => etpApi.getDailyLogs(filters),
  });
}

export function useCreateEtpDailyLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DailyPlantLog>) => etpApi.createDailyLog(payload),
    onSuccess: () => invalidate(queryClient, 'daily-logs'),
  });
}

export function useUpdateEtpDailyLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<DailyPlantLog> }) =>
      etpApi.updateDailyLog(id, payload),
    onSuccess: () => invalidate(queryClient, 'daily-logs'),
  });
}

export function useDeleteEtpDailyLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteDailyLog(id),
    onSuccess: () => invalidate(queryClient, 'daily-logs'),
  });
}

// ---- Register 2: on-line monitoring --------------------------------------

export function useEtpMonitoringRecords(filters?: RegisterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.monitoring(filters),
    queryFn: () => etpApi.getMonitoringRecords(filters),
  });
}

export function useEtpSheetTemplate(
  params: { plant?: number; interval_hours?: number; start_hour?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: ETP_KEYS.sheetTemplate(params),
    queryFn: () =>
      etpApi.getSheetTemplate({
        plant: params.plant as number,
        interval_hours: params.interval_hours,
        start_hour: params.start_hour,
      }),
    enabled: enabled && Boolean(params.plant),
  });
}

export function useCreateEtpMonitoringRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<MonitoringRecord>) => etpApi.createMonitoringRecord(payload),
    onSuccess: () => invalidate(queryClient, 'monitoring'),
  });
}

export function useUpdateEtpMonitoringRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<MonitoringRecord> }) =>
      etpApi.updateMonitoringRecord(id, payload),
    onSuccess: () => invalidate(queryClient, 'monitoring'),
  });
}

export function useDeleteEtpMonitoringRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteMonitoringRecord(id),
    onSuccess: () => invalidate(queryClient, 'monitoring'),
  });
}

export function useVerifyEtpMonitoringRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verifiedBy }: { id: number; verifiedBy?: number | null }) =>
      etpApi.verifyMonitoringRecord(id, verifiedBy),
    onSuccess: () => invalidate(queryClient, 'monitoring'),
  });
}

// ---- Register 3: chemical consumption ------------------------------------

export function useEtpChemicalLogs(filters?: RegisterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.chemicalLogs(filters),
    queryFn: () => etpApi.getChemicalLogs(filters),
  });
}

export function useEtpChemicalTotals(filters?: RegisterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.chemicalTotals(filters),
    queryFn: () => etpApi.getChemicalTotals(filters),
  });
}

export function useCreateEtpChemicalLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ChemicalConsumptionLog>) => etpApi.createChemicalLog(payload),
    onSuccess: () => {
      invalidate(queryClient, 'chemical-logs');
      queryClient.invalidateQueries({ queryKey: ['etp', 'chemical-totals'] });
    },
  });
}

export function useUpdateEtpChemicalLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ChemicalConsumptionLog> }) =>
      etpApi.updateChemicalLog(id, payload),
    onSuccess: () => {
      invalidate(queryClient, 'chemical-logs');
      queryClient.invalidateQueries({ queryKey: ['etp', 'chemical-totals'] });
    },
  });
}

export function useDeleteEtpChemicalLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteChemicalLog(id),
    onSuccess: () => {
      invalidate(queryClient, 'chemical-logs');
      queryClient.invalidateQueries({ queryKey: ['etp', 'chemical-totals'] });
    },
  });
}

// ---- Register 4: sludge generation ---------------------------------------

export function useEtpSludgeEntries(filters?: RegisterFilters) {
  return useQuery({
    queryKey: ETP_KEYS.sludge(filters),
    queryFn: () => etpApi.getSludgeEntries(filters),
  });
}

export function useCreateEtpSludgeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      photoFile,
    }: {
      payload: Record<string, unknown>;
      photoFile?: File | null;
    }) => etpApi.createSludgeEntry(payload, photoFile),
    onSuccess: () => invalidate(queryClient, 'sludge'),
  });
}

export function useUpdateEtpSludgeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      photoFile,
    }: {
      id: number;
      payload: Record<string, unknown>;
      photoFile?: File | null;
    }) => etpApi.updateSludgeEntry(id, payload, photoFile),
    onSuccess: () => invalidate(queryClient, 'sludge'),
  });
}

export function useDeleteEtpSludgeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteSludgeEntry(id),
    onSuccess: () => invalidate(queryClient, 'sludge'),
  });
}

// ---- Register 5: daily back washing --------------------------------------

export function useEtpBackwashEntries(filters?: RegisterFilters & { equipment?: number }) {
  return useQuery({
    queryKey: ETP_KEYS.backwash(filters),
    queryFn: () => etpApi.getBackwashEntries(filters),
  });
}

export function useCreateEtpBackwashEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BackwashEntry>) => etpApi.createBackwashEntry(payload),
    onSuccess: () => invalidate(queryClient, 'backwash'),
  });
}

export function useUpdateEtpBackwashEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<BackwashEntry> }) =>
      etpApi.updateBackwashEntry(id, payload),
    onSuccess: () => invalidate(queryClient, 'backwash'),
  });
}

export function useDeleteEtpBackwashEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteBackwashEntry(id),
    onSuccess: () => invalidate(queryClient, 'backwash'),
  });
}

// ---- Register 6: calibration ---------------------------------------------

export function useEtpCalibrationRecords(filters?: RegisterFilters & { instrument?: number }) {
  return useQuery({
    queryKey: ETP_KEYS.calibration(filters),
    queryFn: () => etpApi.getCalibrationRecords(filters),
  });
}

export function useCreateEtpCalibrationRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CalibrationRecord>) => etpApi.createCalibrationRecord(payload),
    onSuccess: () => {
      invalidate(queryClient, 'calibration');
      queryClient.invalidateQueries({ queryKey: ['etp', 'instruments'] });
    },
  });
}

export function useUpdateEtpCalibrationRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CalibrationRecord> }) =>
      etpApi.updateCalibrationRecord(id, payload),
    onSuccess: () => {
      invalidate(queryClient, 'calibration');
      queryClient.invalidateQueries({ queryKey: ['etp', 'instruments'] });
    },
  });
}

export function useDeleteEtpCalibrationRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deleteCalibrationRecord(id),
    onSuccess: () => {
      invalidate(queryClient, 'calibration');
      queryClient.invalidateQueries({ queryKey: ['etp', 'instruments'] });
    },
  });
}

// ---- Edit trail -----------------------------------------------------------

export function useEtpChangeLog(filters?: ChangeLogFilters, enabled = true) {
  return useQuery({
    queryKey: ETP_KEYS.changeLog(filters),
    queryFn: () => etpApi.getChangeLog(filters),
    enabled,
  });
}

// ---- Print documents ------------------------------------------------------

export function useEtpPrintDocuments(filters?: { company?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: ETP_KEYS.printDocuments(filters),
    // The prints read this on every page, and a code changes about once a year.
    staleTime: 5 * 60 * 1000,
    queryFn: () => etpApi.getPrintDocuments(filters),
  });
}

export function useCreateEtpPrintDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<EtpPrintDocument>) => etpApi.createPrintDocument(payload),
    onSuccess: () => invalidate(queryClient, 'print-documents'),
  });
}

export function useUpdateEtpPrintDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<EtpPrintDocument> }) =>
      etpApi.updatePrintDocument(id, payload),
    onSuccess: () => invalidate(queryClient, 'print-documents'),
  });
}

export function useDeleteEtpPrintDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etpApi.deletePrintDocument(id),
    onSuccess: () => invalidate(queryClient, 'print-documents'),
  });
}
