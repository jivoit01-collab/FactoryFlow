import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  IssueArea,
  IssueComment,
  IssueCreatePayload,
  IssueDetail,
  IssueLabel,
  IssueListFilters,
  IssueListResponse,
  IssueMeta,
  IssueStatePayload,
  IssueTimelineEntry,
  IssueUpdatePayload,
  IssueUploadResponse,
} from '../types';

const EP = API_ENDPOINTS.ISSUES;

/** Drop empty filters so the query string stays short and cache keys stay stable. */
function clean(filters?: object) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '' && value !== null,
    ),
  );
}

export const issuesApi = {
  async getMeta(): Promise<IssueMeta> {
    return (await apiClient.get<IssueMeta>(EP.META)).data;
  },

  async list(filters?: IssueListFilters): Promise<IssueListResponse> {
    return (await apiClient.get<IssueListResponse>(EP.LIST, { params: clean(filters) })).data;
  },

  async get(number: number): Promise<IssueDetail> {
    return (await apiClient.get<IssueDetail>(EP.DETAIL(number))).data;
  },

  async create(payload: IssueCreatePayload): Promise<IssueDetail> {
    return (await apiClient.post<IssueDetail>(EP.LIST, payload)).data;
  },

  async update(number: number, payload: IssueUpdatePayload): Promise<IssueDetail> {
    return (await apiClient.patch<IssueDetail>(EP.DETAIL(number), payload)).data;
  },

  async remove(number: number): Promise<void> {
    await apiClient.delete(EP.DETAIL(number));
  },

  async setState(number: number, payload: IssueStatePayload): Promise<IssueDetail> {
    return (await apiClient.post<IssueDetail>(EP.STATE(number), payload)).data;
  },

  async bulkState(payload: {
    numbers: number[];
    state: 'OPEN' | 'CLOSED';
    reason?: string;
  }): Promise<{ changed: number }> {
    return (await apiClient.post<{ changed: number }>(EP.BULK_STATE, payload)).data;
  },

  async timeline(number: number): Promise<IssueTimelineEntry[]> {
    return (await apiClient.get<IssueTimelineEntry[]>(EP.TIMELINE(number))).data;
  },

  async addComment(
    number: number,
    payload: { body: string; attachment_ids?: number[] },
  ): Promise<IssueComment> {
    return (await apiClient.post<IssueComment>(EP.COMMENTS(number), payload)).data;
  },

  async updateComment(commentId: number, body: string): Promise<IssueComment> {
    return (await apiClient.patch<IssueComment>(EP.COMMENT_DETAIL(commentId), { body })).data;
  },

  async deleteComment(commentId: number): Promise<void> {
    await apiClient.delete(EP.COMMENT_DETAIL(commentId));
  },

  /**
   * Upload one or more files and get their rows back.
   *
   * The upload happens while the reporter is still typing, so the files come
   * back unclaimed; their ids ride along as `attachment_ids` when the issue or
   * comment is submitted. That is also what lets a paste-in screenshot be
   * embedded in the markdown before the issue exists.
   */
  async upload(files: File[]): Promise<IssueUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return (
      await apiClient.post<IssueUploadResponse>(EP.UPLOADS, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  },

  // ---- Masters (settings screen) ----

  async getLabels(): Promise<IssueLabel[]> {
    return (await apiClient.get<IssueLabel[]>(EP.LABELS)).data;
  },

  async createLabel(payload: Partial<IssueLabel>): Promise<IssueLabel> {
    return (await apiClient.post<IssueLabel>(EP.LABELS, payload)).data;
  },

  async updateLabel(labelId: number, payload: Partial<IssueLabel>): Promise<IssueLabel> {
    return (await apiClient.patch<IssueLabel>(EP.LABEL_DETAIL(labelId), payload)).data;
  },

  async deleteLabel(labelId: number): Promise<void> {
    await apiClient.delete(EP.LABEL_DETAIL(labelId));
  },

  async getAreas(): Promise<IssueArea[]> {
    return (await apiClient.get<IssueArea[]>(EP.AREAS)).data;
  },

  async createArea(payload: Partial<IssueArea> & { owner_ids?: number[] }): Promise<IssueArea> {
    return (await apiClient.post<IssueArea>(EP.AREAS, payload)).data;
  },

  async updateArea(
    areaId: number,
    payload: Partial<IssueArea> & { owner_ids?: number[] },
  ): Promise<IssueArea> {
    return (await apiClient.patch<IssueArea>(EP.AREA_DETAIL(areaId), payload)).data;
  },

  async deleteArea(areaId: number): Promise<void> {
    await apiClient.delete(EP.AREA_DETAIL(areaId));
  },
};
