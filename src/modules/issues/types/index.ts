/**
 * Types for the issue tracker.
 *
 * Mirrors the shapes `issues/serializers.py` returns. Two shapes per issue, as
 * on the server: `IssueListItem` is what a list row needs, `IssueDetail` adds
 * the body and its files.
 */

export type IssueState = 'OPEN' | 'CLOSED';
export type IssueStateFilter = IssueState | 'ALL';
export type IssuePriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IssueCloseReason = 'COMPLETED' | 'NOT_PLANNED' | 'DUPLICATE';

export type IssueTimelineEventKind =
  | 'OPENED'
  | 'CLOSED'
  | 'REOPENED'
  | 'LABELED'
  | 'UNLABELED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'RENAMED'
  | 'EDITED'
  | 'PRIORITY_CHANGED'
  | 'AREA_CHANGED'
  | 'MARKED_DUPLICATE'
  | 'PINNED'
  | 'UNPINNED'
  | 'LOCKED'
  | 'UNLOCKED';

export interface UserBrief {
  id: number;
  name: string;
  email: string;
  employee_code: string;
  /** Two letters for the avatar, computed server-side so it matches everywhere. */
  initials: string;
}

export interface IssueLabel {
  id: number;
  name: string;
  color: string;
  description: string;
  sequence: number;
  /** Only present on the label master responses. */
  open_issues?: number;
}

export interface IssueArea {
  id: number;
  name: string;
  code: string;
  description: string;
  sequence: number;
  owners: UserBrief[];
}

export interface IssueAttachment {
  id: number;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
  url: string | null;
  is_image: boolean;
}

export interface IssuePermissionFlags {
  can_view: boolean;
  can_create: boolean;
  can_triage: boolean;
  can_manage_settings: boolean;
  /** Detail responses only: may THIS user edit THIS issue (author or triager). */
  can_edit?: boolean;
}

export interface IssueListItem {
  id: number;
  number: number;
  title: string;
  state: IssueState;
  state_reason: string;
  state_reason_display: string;
  priority: IssuePriority;
  priority_display: string;
  author: UserBrief | null;
  assignees: UserBrief[];
  labels: IssueLabel[];
  area: number | null;
  area_name: string;
  area_code: string;
  company: number | null;
  company_code: string;
  pinned: boolean;
  locked: boolean;
  comment_count: number;
  created_at: string;
  last_activity_at: string;
  closed_at: string | null;
}

export interface IssueDetail extends IssueListItem {
  body: string;
  page_url: string;
  closed_by: UserBrief | null;
  attachments: IssueAttachment[];
  duplicate_of: number | null;
  duplicate_of_number: number | null;
  duplicate_of_title: string;
  updated_at: string;
  permissions?: IssuePermissionFlags;
}

export interface IssueComment {
  id: number;
  body: string;
  author: UserBrief | null;
  created_at: string;
  edited_at: string | null;
  attachments: IssueAttachment[];
}

export interface IssueEvent {
  id: number;
  event: IssueTimelineEventKind;
  event_display: string;
  actor: UserBrief | null;
  /** Whatever the event is about, frozen when it happened. */
  detail: Record<string, string | number | null>;
  created_at: string;
}

export interface IssueTimelineEntry {
  kind: 'comment' | 'event';
  at: string;
  comment: IssueComment | null;
  event: IssueEvent | null;
}

export interface IssueListResponse {
  results: IssueListItem[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
  state_counts: { open: number; closed: number };
  permissions: IssuePermissionFlags;
  /** Qualifiers the server did not understand, e.g. a mistyped `labels:bug`. */
  unknown_qualifiers: string[];
}

export interface IssueMeta {
  labels: IssueLabel[];
  areas: IssueArea[];
  users: UserBrief[];
  companies: { id: number; code: string; name: string }[];
  priorities: { value: IssuePriority; label: string }[];
  close_reasons: { value: IssueCloseReason; label: string }[];
  sorts: string[];
  permissions: IssuePermissionFlags;
  me: UserBrief | null;
}

export interface IssueListFilters {
  q?: string;
  state?: IssueStateFilter;
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface IssueCreatePayload {
  title: string;
  body?: string;
  priority?: IssuePriority;
  area?: number | null;
  company?: number | null;
  label_ids?: number[];
  assignee_ids?: number[];
  page_url?: string;
  attachment_ids?: number[];
}

export interface IssueUpdatePayload {
  title?: string;
  body?: string;
  priority?: IssuePriority;
  area?: number | null;
  company?: number | null;
  label_ids?: number[];
  assignee_ids?: number[];
  page_url?: string;
  pinned?: boolean;
  locked?: boolean;
}

export interface IssueStatePayload {
  state: IssueState;
  reason?: IssueCloseReason;
  duplicate_of?: number | null;
}

export interface IssueUploadResponse {
  results: IssueAttachment[];
  errors: { filename: string; detail: string }[];
}
