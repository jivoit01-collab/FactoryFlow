import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type { PlantBoardResponse, SpaceSetting, WorkforceSetting } from '../types';

export const plantBoardApi = {
  /**
   * The whole board in one read.
   *
   * Deliberately one request. Every tile re-runs on each refresh of a screen
   * that never sleeps, so twenty panel requests a minute is how a wall board
   * ends up switched off. Scope is always today and the current plan month,
   * computed server-side — there is nobody at a TV to pick a date.
   */
  async getBoard(): Promise<PlantBoardResponse> {
    const response = await apiClient.get<PlantBoardResponse>(API_ENDPOINTS.PLANT_BOARD.BOARD);
    return response.data;
  },

  /**
   * Every department, configured or not.
   *
   * The catalogue always comes back whole, with nulls where nothing has been
   * typed, so the settings page renders the same rows on the first visit as on
   * the hundredth and a department nobody has filled in is visibly empty rather
   * than absent.
   */
  async getWorkforce(): Promise<WorkforceSetting[]> {
    const response = await apiClient.get<{ data: WorkforceSetting[] }>(
      API_ENDPOINTS.PLANT_BOARD.WORKFORCE,
    );
    return response.data.data;
  },

  /**
   * Save the departments that changed.
   *
   * Only the changed ones are sent, because the server treats a null as a real
   * edit — "nobody has counted this any more" — rather than as "leave alone".
   * Sending the whole list would be harmless today and destructive the moment
   * one row fails to load.
   */
  async saveWorkforce(departments: WorkforceEdit[]): Promise<WorkforceSetting[]> {
    const response = await apiClient.put<{ data: WorkforceSetting[] }>(
      API_ENDPOINTS.PLANT_BOARD.WORKFORCE,
      { departments },
    );
    return response.data.data;
  },

  /**
   * Add a department this plant grew.
   *
   * Band and kind are sent because the server has nowhere else to read them
   * from: they decide which band's workforce strip the people appear on and
   * which half of it they count towards. Both are closed lists server-side, so
   * a typo is refused rather than filed somewhere nobody looks.
   */
  async addWorkforceDepartment(department: WorkforceDraft): Promise<WorkforceSetting[]> {
    const response = await apiClient.post<{ data: WorkforceSetting[] }>(
      API_ENDPOINTS.PLANT_BOARD.WORKFORCE,
      department,
    );
    return response.data.data;
  },

  /**
   * Remove a department that was added here.
   *
   * The server refuses a built-in, so this cannot delete part of the board's
   * own layout however it is called.
   */
  async removeWorkforceDepartment(key: string): Promise<WorkforceSetting[]> {
    const response = await apiClient.delete<{ data: WorkforceSetting[] }>(
      API_ENDPOINTS.PLANT_BOARD.WORKFORCE,
      { data: { key } },
    );
    return response.data.data;
  },
};

export interface WorkforceDraft {
  label: string;
  band: string;
  kind: 'employee' | 'labour';
  employees: number | null;
  salary_monthly: number | null;
}

export const plantBoardSpaceApi = {
  async get(): Promise<SpaceSetting> {
    const response = await apiClient.get<{ data: SpaceSetting }>(
      API_ENDPOINTS.PLANT_BOARD.SPACE,
    );
    return response.data.data;
  },

  /** Null clears it, which puts the tile back to reporting floor and stock apart. */
  async save(sqftPerPallet: number | null): Promise<SpaceSetting> {
    const response = await apiClient.put<{ data: SpaceSetting }>(
      API_ENDPOINTS.PLANT_BOARD.SPACE,
      { sqft_per_pallet: sqftPerPallet },
    );
    return response.data.data;
  },
};

export interface WorkforceEdit {
  key: string;
  employees: number | null;
  salary_monthly: number | null;
}
