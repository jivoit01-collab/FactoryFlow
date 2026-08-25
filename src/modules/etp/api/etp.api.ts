import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  BackwashEntry,
  BackwashEquipment,
  CalibrationInstrument,
  CalibrationRecord,
  ChangeLogFilters,
  ChemicalConsumptionLog,
  ChemicalTotal,
  DailyPlantLog,
  EtpDashboard,
  EtpPrintDocument,
  EtpSummary,
  MasterFilters,
  MonitoringParameter,
  MonitoringRecord,
  MonitoringSheetTemplate,
  PlantChemical,
  PlantOption,
  PlantStaff,
  RegisterChangeLogRow,
  RegisterFilters,
  SludgeEntry,
  TreatmentPlant,
} from '../types';

const EP = API_ENDPOINTS.ETP;

/** Drop empty / "ALL" filters so the query string stays readable. */
function clean(filters?: object) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '' && value !== 'ALL' && value !== null,
    ),
  );
}

async function list<T>(url: string, filters?: object): Promise<T[]> {
  const response = await apiClient.get<T[]>(url, { params: clean(filters) });
  return response.data;
}

/** The sludge register carries an optional photo, so it posts multipart. */
function sludgeFormData(payload: Record<string, unknown>, photoFile?: File | null): FormData {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    formData.append(key, String(value));
  });
  if (photoFile) formData.append('photo', photoFile);
  return formData;
}

export const etpApi = {
  // ---- Overviews ----
  async getDashboard(params?: { date?: string; company?: string }): Promise<EtpDashboard> {
    const response = await apiClient.get<EtpDashboard>(EP.DASHBOARD, {
      params: clean(params),
    });
    return response.data;
  },

  async getSummary(params: {
    plant: number;
    date_from?: string;
    date_to?: string;
  }): Promise<EtpSummary> {
    const response = await apiClient.get<EtpSummary>(EP.SUMMARY, { params: clean(params) });
    return response.data;
  },

  // ---- Masters ----
  getPlants: (filters?: MasterFilters) => list<TreatmentPlant>(EP.PLANTS, filters),
  createPlant: async (payload: Partial<TreatmentPlant>) =>
    (await apiClient.post<TreatmentPlant>(EP.PLANTS, payload)).data,
  updatePlant: async (id: number, payload: Partial<TreatmentPlant>) =>
    (await apiClient.patch<TreatmentPlant>(EP.PLANT_DETAIL(id), payload)).data,
  deletePlant: async (id: number) => {
    await apiClient.delete(EP.PLANT_DETAIL(id));
  },

  getStaff: (filters?: MasterFilters) => list<PlantStaff>(EP.STAFF, filters),
  createStaff: async (payload: Partial<PlantStaff>) =>
    (await apiClient.post<PlantStaff>(EP.STAFF, payload)).data,
  updateStaff: async (id: number, payload: Partial<PlantStaff>) =>
    (await apiClient.patch<PlantStaff>(EP.STAFF_DETAIL(id), payload)).data,
  deleteStaff: async (id: number) => {
    await apiClient.delete(EP.STAFF_DETAIL(id));
  },

  getOptions: (filters?: MasterFilters) => list<PlantOption>(EP.OPTIONS, filters),
  createOption: async (payload: Partial<PlantOption>) =>
    (await apiClient.post<PlantOption>(EP.OPTIONS, payload)).data,
  updateOption: async (id: number, payload: Partial<PlantOption>) =>
    (await apiClient.patch<PlantOption>(EP.OPTION_DETAIL(id), payload)).data,
  deleteOption: async (id: number) => {
    await apiClient.delete(EP.OPTION_DETAIL(id));
  },

  getChemicals: (filters?: MasterFilters) => list<PlantChemical>(EP.CHEMICALS, filters),
  createChemical: async (payload: Partial<PlantChemical>) =>
    (await apiClient.post<PlantChemical>(EP.CHEMICALS, payload)).data,
  updateChemical: async (id: number, payload: Partial<PlantChemical>) =>
    (await apiClient.patch<PlantChemical>(EP.CHEMICAL_DETAIL(id), payload)).data,
  deleteChemical: async (id: number) => {
    await apiClient.delete(EP.CHEMICAL_DETAIL(id));
  },

  getBackwashEquipment: (filters?: MasterFilters) =>
    list<BackwashEquipment>(EP.BACKWASH_EQUIPMENT, filters),
  createBackwashEquipment: async (payload: Partial<BackwashEquipment>) =>
    (await apiClient.post<BackwashEquipment>(EP.BACKWASH_EQUIPMENT, payload)).data,
  updateBackwashEquipment: async (id: number, payload: Partial<BackwashEquipment>) =>
    (await apiClient.patch<BackwashEquipment>(EP.BACKWASH_EQUIPMENT_DETAIL(id), payload)).data,
  deleteBackwashEquipment: async (id: number) => {
    await apiClient.delete(EP.BACKWASH_EQUIPMENT_DETAIL(id));
  },

  getMonitoringParameters: (filters?: MasterFilters) =>
    list<MonitoringParameter>(EP.MONITORING_PARAMETERS, filters),
  createMonitoringParameter: async (payload: Partial<MonitoringParameter>) =>
    (await apiClient.post<MonitoringParameter>(EP.MONITORING_PARAMETERS, payload)).data,
  updateMonitoringParameter: async (id: number, payload: Partial<MonitoringParameter>) =>
    (await apiClient.patch<MonitoringParameter>(EP.MONITORING_PARAMETER_DETAIL(id), payload)).data,
  deleteMonitoringParameter: async (id: number) => {
    await apiClient.delete(EP.MONITORING_PARAMETER_DETAIL(id));
  },

  getInstruments: (filters?: MasterFilters) => list<CalibrationInstrument>(EP.INSTRUMENTS, filters),
  createInstrument: async (payload: Partial<CalibrationInstrument>) =>
    (await apiClient.post<CalibrationInstrument>(EP.INSTRUMENTS, payload)).data,
  updateInstrument: async (id: number, payload: Partial<CalibrationInstrument>) =>
    (await apiClient.patch<CalibrationInstrument>(EP.INSTRUMENT_DETAIL(id), payload)).data,
  deleteInstrument: async (id: number) => {
    await apiClient.delete(EP.INSTRUMENT_DETAIL(id));
  },

  // ---- Register 1: daily plant log ----
  getDailyLogs: (filters?: RegisterFilters) => list<DailyPlantLog>(EP.DAILY_LOGS, filters),
  createDailyLog: async (payload: Partial<DailyPlantLog>) =>
    (await apiClient.post<DailyPlantLog>(EP.DAILY_LOGS, payload)).data,
  updateDailyLog: async (id: number, payload: Partial<DailyPlantLog>) =>
    (await apiClient.patch<DailyPlantLog>(EP.DAILY_LOG_DETAIL(id), payload)).data,
  deleteDailyLog: async (id: number) => {
    await apiClient.delete(EP.DAILY_LOG_DETAIL(id));
  },
  async getLastReadings(plant: number, before?: string) {
    const response = await apiClient.get<{
      found: boolean;
      date?: string;
      inlet_final?: string | null;
      outlet_final?: string | null;
      energy_final?: string | null;
    }>(EP.DAILY_LOG_LAST_READINGS, { params: clean({ plant, before }) });
    return response.data;
  },

  // ---- Register 2: on-line monitoring ----
  getMonitoringRecords: (filters?: RegisterFilters) =>
    list<MonitoringRecord>(EP.MONITORING_RECORDS, filters),
  createMonitoringRecord: async (payload: Partial<MonitoringRecord>) =>
    (await apiClient.post<MonitoringRecord>(EP.MONITORING_RECORDS, payload)).data,
  updateMonitoringRecord: async (id: number, payload: Partial<MonitoringRecord>) =>
    (await apiClient.patch<MonitoringRecord>(EP.MONITORING_RECORD_DETAIL(id), payload)).data,
  deleteMonitoringRecord: async (id: number) => {
    await apiClient.delete(EP.MONITORING_RECORD_DETAIL(id));
  },
  async getSheetTemplate(params: {
    plant: number;
    interval_hours?: number;
    start_hour?: number;
  }): Promise<MonitoringSheetTemplate> {
    const response = await apiClient.get<MonitoringSheetTemplate>(EP.MONITORING_SHEET_TEMPLATE, {
      params: clean(params),
    });
    return response.data;
  },
  verifyMonitoringRecord: async (id: number, verifiedBy?: number | null) =>
    (
      await apiClient.post<MonitoringRecord>(EP.MONITORING_VERIFY(id), {
        verified_by: verifiedBy ?? undefined,
      })
    ).data,

  // ---- Register 3: chemical consumption ----
  getChemicalLogs: (filters?: RegisterFilters) =>
    list<ChemicalConsumptionLog>(EP.CHEMICAL_LOGS, filters),
  createChemicalLog: async (payload: Partial<ChemicalConsumptionLog>) =>
    (await apiClient.post<ChemicalConsumptionLog>(EP.CHEMICAL_LOGS, payload)).data,
  updateChemicalLog: async (id: number, payload: Partial<ChemicalConsumptionLog>) =>
    (await apiClient.patch<ChemicalConsumptionLog>(EP.CHEMICAL_LOG_DETAIL(id), payload)).data,
  deleteChemicalLog: async (id: number) => {
    await apiClient.delete(EP.CHEMICAL_LOG_DETAIL(id));
  },
  getChemicalTotals: (filters?: RegisterFilters) =>
    list<ChemicalTotal>(EP.CHEMICAL_LOG_TOTALS, filters),

  // ---- Register 4: sludge generation ----
  getSludgeEntries: (filters?: RegisterFilters) => list<SludgeEntry>(EP.SLUDGE_ENTRIES, filters),
  createSludgeEntry: async (payload: Record<string, unknown>, photoFile?: File | null) =>
    (
      await apiClient.post<SludgeEntry>(EP.SLUDGE_ENTRIES, sludgeFormData(payload, photoFile), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data,
  updateSludgeEntry: async (
    id: number,
    payload: Record<string, unknown>,
    photoFile?: File | null,
  ) =>
    (
      await apiClient.patch<SludgeEntry>(
        EP.SLUDGE_ENTRY_DETAIL(id),
        sludgeFormData(payload, photoFile),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
    ).data,
  deleteSludgeEntry: async (id: number) => {
    await apiClient.delete(EP.SLUDGE_ENTRY_DETAIL(id));
  },

  // ---- Register 5: daily back washing ----
  getBackwashEntries: (filters?: RegisterFilters & { equipment?: number }) =>
    list<BackwashEntry>(EP.BACKWASH_ENTRIES, filters),
  createBackwashEntry: async (payload: Partial<BackwashEntry>) =>
    (await apiClient.post<BackwashEntry>(EP.BACKWASH_ENTRIES, payload)).data,
  updateBackwashEntry: async (id: number, payload: Partial<BackwashEntry>) =>
    (await apiClient.patch<BackwashEntry>(EP.BACKWASH_ENTRY_DETAIL(id), payload)).data,
  deleteBackwashEntry: async (id: number) => {
    await apiClient.delete(EP.BACKWASH_ENTRY_DETAIL(id));
  },

  // ---- Register 6: calibration ----
  getCalibrationRecords: (filters?: RegisterFilters & { instrument?: number }) =>
    list<CalibrationRecord>(EP.CALIBRATION_RECORDS, filters),
  createCalibrationRecord: async (payload: Partial<CalibrationRecord>) =>
    (await apiClient.post<CalibrationRecord>(EP.CALIBRATION_RECORDS, payload)).data,
  updateCalibrationRecord: async (id: number, payload: Partial<CalibrationRecord>) =>
    (await apiClient.patch<CalibrationRecord>(EP.CALIBRATION_RECORD_DETAIL(id), payload)).data,
  deleteCalibrationRecord: async (id: number) => {
    await apiClient.delete(EP.CALIBRATION_RECORD_DETAIL(id));
  },

  // ---- Print documents (the numbers the registers print) ----
  getPrintDocuments: (filters?: { company?: string; is_active?: boolean }) =>
    list<EtpPrintDocument>(EP.PRINT_DOCUMENTS, filters),
  createPrintDocument: async (payload: Partial<EtpPrintDocument>) =>
    (await apiClient.post<EtpPrintDocument>(EP.PRINT_DOCUMENTS, payload)).data,
  updatePrintDocument: async (id: number, payload: Partial<EtpPrintDocument>) =>
    (await apiClient.patch<EtpPrintDocument>(EP.PRINT_DOCUMENT_DETAIL(id), payload)).data,
  deletePrintDocument: async (id: number) => {
    await apiClient.delete(EP.PRINT_DOCUMENT_DETAIL(id));
  },

  // ---- Edit trail ----
  getChangeLog: (filters?: ChangeLogFilters) => list<RegisterChangeLogRow>(EP.CHANGE_LOG, filters),
};
