import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  ApprovalQueue,
  AttachmentKind,
  BatchDecisionPayload,
  CompletePayload,
  DailyLog,
  DailyLogPayload,
  DailyLogPhoto,
  DailyLogSaveResponse,
  DayView,
  DecisionPayload,
  Estimate,
  EstimateLinePayload,
  ExpenseBatchDetail,
  ExpenseBatchList,
  ExpenseList,
  ExpenseListFilters,
  ExpensePayload,
  ExpenseSaveResponse,
  ProjectAttachment,
  ProjectDetail,
  ProjectFilters,
  ProjectListItem,
  ProjectPayload,
  ProjectRevision,
  ProjectSummary,
  RevisionPayload,
  SpendSummary,
} from '../types';

const EP = API_ENDPOINTS.CONSTRUCTION;

/** Somebody who can be a project manager or a site in-charge. */
export interface ConstructionPerson {
  id: number;
  email: string;
  full_name: string;
}

/** Drop empty filters so the query string stays short and cache keys stable. */
function clean(filters?: object) {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '' && value !== null,
    ),
  );
}

export const constructionApi = {
  /** The company's people, for the manager and site-in-charge pickers. Reads
   *  the shared accounts endpoint rather than borrowing another module's api. */
  async listPeople(): Promise<ConstructionPerson[]> {
    return (await apiClient.get<ConstructionPerson[]>(API_ENDPOINTS.ACCOUNTS.USERS)).data;
  },

  // --- projects ------------------------------------------------------------

  async listProjects(filters?: ProjectFilters): Promise<ProjectListItem[]> {
    return (await apiClient.get<ProjectListItem[]>(EP.PROJECTS, { params: clean(filters) }))
      .data;
  },

  async getProject(id: number): Promise<ProjectDetail> {
    return (await apiClient.get<ProjectDetail>(EP.PROJECT_DETAIL(id))).data;
  },

  async getSummary(id: number): Promise<ProjectSummary> {
    return (await apiClient.get<ProjectSummary>(EP.PROJECT_SUMMARY(id))).data;
  },

  async createProject(payload: ProjectPayload): Promise<ProjectDetail> {
    return (await apiClient.post<ProjectDetail>(EP.PROJECTS, payload)).data;
  },

  async updateProject(id: number, payload: Partial<ProjectPayload>): Promise<ProjectDetail> {
    return (await apiClient.patch<ProjectDetail>(EP.PROJECT_DETAIL(id), payload)).data;
  },

  async submitProject(id: number): Promise<ProjectDetail> {
    return (await apiClient.post<ProjectDetail>(EP.PROJECT_SUBMIT(id), {})).data;
  },

  async approveProject(id: number, payload: DecisionPayload = {}): Promise<ProjectDetail> {
    return (await apiClient.post<ProjectDetail>(EP.PROJECT_APPROVE(id), payload)).data;
  },

  async rejectProject(id: number, payload: DecisionPayload = {}): Promise<ProjectDetail> {
    return (await apiClient.post<ProjectDetail>(EP.PROJECT_REJECT(id), payload)).data;
  },

  async holdProject(id: number, payload: DecisionPayload = {}): Promise<ProjectDetail> {
    return (await apiClient.post<ProjectDetail>(EP.PROJECT_HOLD(id), payload)).data;
  },

  async resumeProject(id: number): Promise<ProjectDetail> {
    return (await apiClient.post<ProjectDetail>(EP.PROJECT_RESUME(id), {})).data;
  },

  async completeProject(id: number, payload: CompletePayload = {}): Promise<ProjectDetail> {
    return (await apiClient.post<ProjectDetail>(EP.PROJECT_COMPLETE(id), payload)).data;
  },

  async cancelProject(id: number, payload: DecisionPayload = {}): Promise<ProjectDetail> {
    return (await apiClient.post<ProjectDetail>(EP.PROJECT_CANCEL(id), payload)).data;
  },

  // --- the estimate's breakdown --------------------------------------------

  async getEstimate(projectId: number): Promise<Estimate> {
    return (await apiClient.get<Estimate>(EP.ESTIMATE(projectId))).data;
  },

  /** Replaces the whole sheet: it is a table, not a form. */
  async saveEstimate(projectId: number, lines: EstimateLinePayload[]): Promise<Estimate> {
    return (await apiClient.put<Estimate>(EP.ESTIMATE(projectId), { lines })).data;
  },

  // --- the project's papers ------------------------------------------------

  async listAttachments(projectId: number): Promise<ProjectAttachment[]> {
    return (await apiClient.get<ProjectAttachment[]>(EP.ATTACHMENTS(projectId))).data;
  },

  async addAttachment(
    projectId: number,
    file: File,
    title = '',
    kind: AttachmentKind = 'DOCUMENT',
  ): Promise<ProjectAttachment> {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    form.append('kind', kind);
    return (
      await apiClient.post<ProjectAttachment>(EP.ATTACHMENTS(projectId), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  },

  async removeAttachment(attachmentId: number): Promise<void> {
    await apiClient.delete(EP.ATTACHMENT_DETAIL(attachmentId));
  },

  // --- the daily loop ------------------------------------------------------

  async listDailyLogs(
    projectId: number,
    range?: { from?: string; to?: string },
  ): Promise<DailyLog[]> {
    return (await apiClient.get<DailyLog[]>(EP.DAILY_LOGS(projectId), { params: clean(range) }))
      .data;
  },

  /** The day's log and its expenses in one request, as one transaction. */
  async saveDailyLog(
    projectId: number,
    payload: DailyLogPayload,
  ): Promise<DailyLogSaveResponse> {
    return (await apiClient.post<DailyLogSaveResponse>(EP.DAILY_LOGS(projectId), payload)).data;
  },

  async updateDailyLog(
    logId: number,
    payload: DailyLogPayload,
  ): Promise<{ log: DailyLog; warning: DailyLogSaveResponse['warning'] }> {
    return (
      await apiClient.patch<{ log: DailyLog; warning: DailyLogSaveResponse['warning'] }>(
        EP.DAILY_LOG_DETAIL(logId),
        payload,
      )
    ).data;
  },

  /** Photos go up separately: multipart plus nested JSON in one request is a
   *  fight not worth having. */
  async addPhoto(logId: number, file: File, caption = ''): Promise<DailyLogPhoto> {
    const form = new FormData();
    form.append('photo', file);
    if (caption) form.append('caption', caption);
    return (
      await apiClient.post<DailyLogPhoto>(EP.DAILY_LOG_PHOTOS(logId), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  },

  async removePhoto(logId: number, photoId: number): Promise<void> {
    await apiClient.delete(EP.DAILY_LOG_PHOTO_DETAIL(logId, photoId));
  },

  async listExpenses(
    projectId: number,
    filters?: ExpenseListFilters,
  ): Promise<ExpenseList> {
    return (
      await apiClient.get<ExpenseList>(EP.EXPENSES(projectId), {
        params: clean(filters),
      })
    ).data;
  },

  async recordExpense(
    projectId: number,
    payload: ExpensePayload,
    bill?: File | null,
  ): Promise<ExpenseSaveResponse> {
    if (bill) {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          form.append(key, String(value));
        }
      });
      form.append('bill', bill);
      return (
        await apiClient.post<ExpenseSaveResponse>(EP.EXPENSES(projectId), form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    }
    return (await apiClient.post<ExpenseSaveResponse>(EP.EXPENSES(projectId), payload)).data;
  },

  async updateExpense(
    expenseId: number,
    payload: Partial<ExpensePayload>,
    bill?: File | null,
  ): Promise<ExpenseSaveResponse> {
    if (bill) {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          form.append(key, String(value));
        }
      });
      form.append('bill', bill);
      return (
        await apiClient.patch<ExpenseSaveResponse>(EP.EXPENSE_DETAIL(expenseId), form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    }
    return (await apiClient.patch<ExpenseSaveResponse>(EP.EXPENSE_DETAIL(expenseId), payload))
      .data;
  },

  async deleteExpense(expenseId: number): Promise<void> {
    await apiClient.delete(EP.EXPENSE_DETAIL(expenseId));
  },

  async listBatches(projectId: number): Promise<ExpenseBatchList> {
    return (await apiClient.get<ExpenseBatchList>(EP.EXPENSE_BATCHES(projectId))).data;
  },

  /** Send the open batch for approval, or just the payments named. */
  async submitBatch(
    projectId: number,
    expenseIds?: number[],
  ): Promise<ExpenseBatchDetail> {
    return (
      await apiClient.post<ExpenseBatchDetail>(
        EP.EXPENSE_BATCHES(projectId),
        expenseIds ? { expense_ids: expenseIds } : {},
      )
    ).data;
  },

  /** Approve the whole batch, or send it back. One decision, every line. */
  async decideBatch(
    batchId: number,
    payload: BatchDecisionPayload,
  ): Promise<{ batch: ExpenseBatchDetail; summary: ProjectSummary }> {
    return (
      await apiClient.post<{ batch: ExpenseBatchDetail; summary: ProjectSummary }>(
        EP.EXPENSE_BATCH_DECIDE(batchId),
        payload,
      )
    ).data;
  },

  async getDay(projectId: number, date: string): Promise<DayView> {
    return (await apiClient.get<DayView>(EP.DAY(projectId), { params: { date } })).data;
  },

  async getSpendSummary(projectId: number): Promise<SpendSummary> {
    return (await apiClient.get<SpendSummary>(EP.SPEND_SUMMARY(projectId))).data;
  },

  // --- revisions -----------------------------------------------------------

  async listRevisions(projectId: number): Promise<ProjectRevision[]> {
    return (await apiClient.get<ProjectRevision[]>(EP.REVISIONS(projectId))).data;
  },

  async requestRevision(projectId: number, payload: RevisionPayload): Promise<ProjectRevision> {
    return (await apiClient.post<ProjectRevision>(EP.REVISIONS(projectId), payload)).data;
  },

  async approveRevision(
    revisionId: number,
    payload: DecisionPayload = {},
  ): Promise<ProjectRevision> {
    return (await apiClient.post<ProjectRevision>(EP.REVISION_APPROVE(revisionId), payload))
      .data;
  },

  async rejectRevision(
    revisionId: number,
    payload: DecisionPayload = {},
  ): Promise<ProjectRevision> {
    return (await apiClient.post<ProjectRevision>(EP.REVISION_REJECT(revisionId), payload))
      .data;
  },

  async withdrawRevision(revisionId: number): Promise<ProjectRevision> {
    return (await apiClient.post<ProjectRevision>(EP.REVISION_WITHDRAW(revisionId), {})).data;
  },

  async getApprovalQueue(): Promise<ApprovalQueue> {
    return (await apiClient.get<ApprovalQueue>(EP.APPROVALS)).data;
  },
};
