import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  ListTestingProceduresParams,
  SaveTestingProcedureRequest,
  TestingProcedure,
  TestingProcedureCounts,
  TestingProcedureListItem,
} from '../../types/testingProcedure.types';

export const testingProcedureApi = {
  /** List procedures, optionally filtered by type, status or search text. */
  async list(params: ListTestingProceduresParams = {}): Promise<TestingProcedureListItem[]> {
    const response = await apiClient.get<TestingProcedureListItem[]>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.TESTING_PROCEDURES,
      { params },
    );
    return response.data;
  },

  /** One procedure with its sections and lines. */
  async getById(id: number): Promise<TestingProcedure> {
    const response = await apiClient.get<TestingProcedure>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.TESTING_PROCEDURE_BY_ID(id),
    );
    return response.data;
  },

  /** Store a newly analysed procedure. */
  async create(data: SaveTestingProcedureRequest): Promise<TestingProcedure> {
    const response = await apiClient.post<TestingProcedure>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.TESTING_PROCEDURES,
      data,
    );
    return response.data;
  },

  /**
   * Update a procedure. Omitting `sections` edits the header only and leaves
   * the stored body untouched; sending them replaces the body wholesale.
   */
  async update(
    id: number,
    data: Partial<SaveTestingProcedureRequest>,
  ): Promise<TestingProcedure> {
    const response = await apiClient.put<TestingProcedure>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.TESTING_PROCEDURE_BY_ID(id),
      data,
    );
    return response.data;
  },

  /** Retire a procedure (soft delete — the record is kept for traceability). */
  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUALITY_CONTROL_V2.TESTING_PROCEDURE_BY_ID(id));
  },

  /** Counts per type, for the tab badges. */
  async counts(): Promise<TestingProcedureCounts> {
    const response = await apiClient.get<TestingProcedureCounts>(
      API_ENDPOINTS.QUALITY_CONTROL_V2.TESTING_PROCEDURE_COUNTS,
    );
    return response.data;
  },
};
