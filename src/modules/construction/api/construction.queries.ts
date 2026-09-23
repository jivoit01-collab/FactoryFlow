/**
 * React-query hooks for construction projects.
 *
 * Keys are hierarchical — `['construction', 'project', <id>, …]` — so one
 * invalidation covers everything a change to that project could have altered.
 * Certifying spend moves the summary, the day, the expense list and the spend
 * chart at once; with flat keys every mutation would have to list five
 * invalidations and would eventually forget one.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AttachmentKind,
  BatchDecisionPayload,
  CompletePayload,
  DailyLogPayload,
  DecisionPayload,
  EstimateLinePayload,
  ExpenseListFilters,
  ExpensePayload,
  ProjectFilters,
  ProjectPayload,
  RevisionPayload,
} from '../types';
import { constructionApi } from './construction.api';

type QueryClient = ReturnType<typeof useQueryClient>;

export const CONSTRUCTION_KEYS = {
  all: ['construction'] as const,
  projects: (filters?: ProjectFilters) => ['construction', 'projects', filters ?? {}] as const,
  project: (id: number) => ['construction', 'project', id] as const,
  summary: (id: number) => ['construction', 'project', id, 'summary'] as const,
  logs: (id: number) => ['construction', 'project', id, 'logs'] as const,
  expenses: (id: number) => ['construction', 'project', id, 'expenses'] as const,
  day: (id: number, date: string) => ['construction', 'project', id, 'day', date] as const,
  spend: (id: number) => ['construction', 'project', id, 'spend-summary'] as const,
  revisions: (id: number) => ['construction', 'project', id, 'revisions'] as const,
  attachments: (id: number) => ['construction', 'project', id, 'attachments'] as const,
  estimate: (id: number) => ['construction', 'project', id, 'estimate'] as const,
  batches: (id: number) => ['construction', 'project', id, 'batches'] as const,
  approvals: () => ['construction', 'approvals'] as const,
};

/**
 * Refresh everything one project's change could have altered.
 *
 * Deliberately blunt: the whole project subtree plus the lists it appears in.
 * It is one extra round trip and it removes the entire class of bug where the
 * header still shows yesterday's spend after an expense was recorded.
 */
function invalidateProject(queryClient: QueryClient, projectId: number) {
  queryClient.invalidateQueries({ queryKey: CONSTRUCTION_KEYS.project(projectId) });
  queryClient.invalidateQueries({ queryKey: ['construction', 'projects'] });
  queryClient.invalidateQueries({ queryKey: CONSTRUCTION_KEYS.approvals() });
}

/** The people pickers. Barely moves within a session. */
export function usePeople(enabled = true) {
  return useQuery({
    queryKey: ['construction', 'people'],
    queryFn: () => constructionApi.listPeople(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: CONSTRUCTION_KEYS.projects(filters),
    queryFn: () => constructionApi.listProjects(filters),
    placeholderData: (previous) => previous,
  });
}

export function useProject(id: number, enabled = true) {
  return useQuery({
    queryKey: CONSTRUCTION_KEYS.project(id),
    queryFn: () => constructionApi.getProject(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useProjectSummary(id: number, enabled = true) {
  return useQuery({
    queryKey: CONSTRUCTION_KEYS.summary(id),
    queryFn: () => constructionApi.getSummary(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectPayload) => constructionApi.createProject(payload),
    onSuccess: (project) => invalidateProject(queryClient, project.id),
  });
}

export function useUpdateProject(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ProjectPayload>) =>
      constructionApi.updateProject(id, payload),
    onSuccess: () => invalidateProject(queryClient, id),
  });
}

/** Every status move shares one hook: they differ only in which call they make. */
export function useProjectAction(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { action: ProjectAction; payload?: CompletePayload }) => {
      const { action, payload = {} } = args;
      switch (action) {
        case 'submit':
          return constructionApi.submitProject(id);
        case 'approve':
          return constructionApi.approveProject(id, payload);
        case 'reject':
          return constructionApi.rejectProject(id, payload);
        case 'hold':
          return constructionApi.holdProject(id, payload);
        case 'resume':
          return constructionApi.resumeProject(id);
        case 'complete':
          return constructionApi.completeProject(id, payload);
        case 'cancel':
          return constructionApi.cancelProject(id, payload);
      }
    },
    onSuccess: () => invalidateProject(queryClient, id),
  });
}

export type ProjectAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'hold'
  | 'resume'
  | 'complete'
  | 'cancel';

// ---------------------------------------------------------------------------
// The estimate's breakdown
// ---------------------------------------------------------------------------

export function useEstimate(projectId: number, enabled = true) {
  return useQuery({
    queryKey: CONSTRUCTION_KEYS.estimate(projectId),
    queryFn: () => constructionApi.getEstimate(projectId),
    enabled: enabled && Number.isFinite(projectId) && projectId > 0,
  });
}

export function useSaveEstimate(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lines: EstimateLinePayload[]) =>
      constructionApi.saveEstimate(projectId, lines),
    // The breakdown IS the estimated cost, so the project header moves too.
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

// ---------------------------------------------------------------------------
// The project's papers
// ---------------------------------------------------------------------------

export function useAttachments(projectId: number, enabled = true) {
  return useQuery({
    queryKey: CONSTRUCTION_KEYS.attachments(projectId),
    queryFn: () => constructionApi.listAttachments(projectId),
    enabled: enabled && Number.isFinite(projectId) && projectId > 0,
  });
}

export function useAddAttachment(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { file: File; title?: string; kind?: AttachmentKind }) =>
      constructionApi.addAttachment(projectId, args.file, args.title, args.kind),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useRemoveAttachment(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) =>
      constructionApi.removeAttachment(attachmentId),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

// ---------------------------------------------------------------------------
// The daily loop
// ---------------------------------------------------------------------------

export function useDailyLogs(
  projectId: number,
  range?: { from?: string; to?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: [...CONSTRUCTION_KEYS.logs(projectId), range ?? {}],
    queryFn: () => constructionApi.listDailyLogs(projectId, range),
    enabled: enabled && Number.isFinite(projectId) && projectId > 0,
  });
}

export function useSaveDailyLog(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DailyLogPayload) =>
      constructionApi.saveDailyLog(projectId, payload),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useDay(projectId: number, date: string, enabled = true) {
  return useQuery({
    queryKey: CONSTRUCTION_KEYS.day(projectId, date),
    queryFn: () => constructionApi.getDay(projectId, date),
    enabled: enabled && Number.isFinite(projectId) && projectId > 0 && Boolean(date),
  });
}

export function useExpenses(projectId: number, filters?: ExpenseListFilters) {
  return useQuery({
    queryKey: [...CONSTRUCTION_KEYS.expenses(projectId), filters ?? {}],
    queryFn: () => constructionApi.listExpenses(projectId, filters),
    enabled: Number.isFinite(projectId) && projectId > 0,
    // Keep the current rows on screen while a filter change loads, so the table
    // does not blink to empty between keystrokes.
    placeholderData: (previous) => previous,
  });
}

export function useRecordExpense(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { payload: ExpensePayload; bill?: File | null }) =>
      constructionApi.recordExpense(projectId, args.payload, args.bill),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useExpenseBatches(projectId: number, enabled = true) {
  return useQuery({
    queryKey: CONSTRUCTION_KEYS.batches(projectId),
    queryFn: () => constructionApi.listBatches(projectId),
    enabled: enabled && Number.isFinite(projectId) && projectId > 0,
  });
}

export function useSubmitBatch(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseIds?: number[]) =>
      constructionApi.submitBatch(projectId, expenseIds),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useDecideBatch(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { batchId: number; payload: BatchDecisionPayload }) =>
      constructionApi.decideBatch(args.batchId, args.payload),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useUpdateExpense(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      expenseId: number;
      payload: Partial<ExpensePayload>;
      bill?: File | null;
    }) => constructionApi.updateExpense(args.expenseId, args.payload, args.bill),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useDeleteExpense(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: number) => constructionApi.deleteExpense(expenseId),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useAddPhoto(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { logId: number; file: File; caption?: string }) =>
      constructionApi.addPhoto(args.logId, args.file, args.caption),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useSpendSummary(projectId: number, enabled = true) {
  return useQuery({
    queryKey: CONSTRUCTION_KEYS.spend(projectId),
    queryFn: () => constructionApi.getSpendSummary(projectId),
    enabled: enabled && Number.isFinite(projectId) && projectId > 0,
  });
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

export function useRevisions(projectId: number, enabled = true) {
  return useQuery({
    queryKey: CONSTRUCTION_KEYS.revisions(projectId),
    queryFn: () => constructionApi.listRevisions(projectId),
    enabled: enabled && Number.isFinite(projectId) && projectId > 0,
  });
}

export function useRequestRevision(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RevisionPayload) =>
      constructionApi.requestRevision(projectId, payload),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useRevisionDecision(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      revisionId: number;
      decision: 'approve' | 'reject' | 'withdraw';
      payload?: DecisionPayload;
    }) => {
      const { revisionId, decision, payload = {} } = args;
      if (decision === 'approve') return constructionApi.approveRevision(revisionId, payload);
      if (decision === 'reject') return constructionApi.rejectRevision(revisionId, payload);
      return constructionApi.withdrawRevision(revisionId);
    },
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useApprovalQueue(enabled = true) {
  return useQuery({
    queryKey: CONSTRUCTION_KEYS.approvals(),
    queryFn: () => constructionApi.getApprovalQueue(),
    enabled,
  });
}
