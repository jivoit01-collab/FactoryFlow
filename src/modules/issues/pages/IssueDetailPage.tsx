/**
 * One issue: the header, the body, the timeline, the comment box, and a sidebar
 * that edits labels / assignees / priority.
 *
 * The sidebar saves each field the moment it changes rather than behind a Save
 * button. Triage is done in passing — someone skims twenty issues and drops a
 * label on six of them — and a form that has to be submitted turns that into
 * twenty round trips of clicking.
 *
 * What is editable is decided by the server, not guessed here: the detail
 * response carries `permissions.can_edit`, which is true for a triager and also
 * for the issue's own author. That is why a reporter can retitle and close their
 * own report while the labels stay locked.
 */
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Link2,
  Lock,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ISSUE_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { confirmDialog } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage, resolveFileUrl } from '@/shared/utils';

import {
  useAddComment,
  useDeleteIssue,
  useIssue,
  useIssueMeta,
  useIssueTimeline,
  useSetIssueState,
  useUpdateIssue,
} from '../api';
import {
  LabelChip,
  PriorityChip,
  StateBadge,
  UserAvatar,
} from '../components/IssueBits';
import { IssueTimeline } from '../components/IssueTimeline';
import { Markdown } from '../components/Markdown';
import { MarkdownEditor } from '../components/MarkdownEditor';
import type { IssuePriority } from '../types';
import { exactTime, formatBytes, sortLabels, timeAgo } from '../utils';

export default function IssueDetailPage() {
  const { number: numberParam } = useParams<{ number: string }>();
  const issueNumber = Number(numberParam);
  const navigate = useNavigate();
  const canTriagePermission = useHasPermission(ISSUE_PERMISSIONS.TRIAGE);

  const meta = useIssueMeta();
  const issue = useIssue(issueNumber);
  const timeline = useIssueTimeline(issueNumber);
  const updateIssue = useUpdateIssue(issueNumber);
  const setState = useSetIssueState(issueNumber);
  const addComment = useAddComment(issueNumber);
  const deleteIssue = useDeleteIssue();

  const [commentDraft, setCommentDraft] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<number[]>([]);
  // Both drafts are seeded from the fetched issue at the moment its Edit button
  // is clicked, never from an effect -- so they cannot go stale against a
  // refetch that happened while the form was closed.
  const [editingHeader, setEditingHeader] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingBody, setEditingBody] = useState(false);
  const [bodyDraft, setBodyDraft] = useState('');

  const data = issue.data;
  // The server is the authority on who may edit this one.
  const canEdit = data?.permissions?.can_edit ?? false;
  const canTriage = data?.permissions?.can_triage ?? canTriagePermission;

  if (issue.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (issue.isError || !data) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="font-medium">Issue #{numberParam} could not be opened.</p>
          <p className="text-sm text-muted-foreground">
            {getErrorMessage(issue.error, 'It may have been deleted.')}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/issues">Back to issues</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function patch(payload: Parameters<typeof updateIssue.mutate>[0], successMessage?: string) {
    updateIssue.mutate(payload, {
      onSuccess: () => {
        if (successMessage) toast.success(successMessage);
      },
      onError: (error) => toast.error(getErrorMessage(error, 'The change was not saved.')),
    });
  }

  function toggleLabel(labelId: number) {
    const current = data!.labels.map((label) => label.id);
    const next = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];
    patch({ label_ids: next });
  }

  function toggleAssignee(userId: number) {
    const current = data!.assignees.map((user) => user.id);
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    patch({ assignee_ids: next });
  }

  function submitComment(closeAfter?: 'COMPLETED' | 'NOT_PLANNED') {
    const body = commentDraft.trim();
    if (!body && !closeAfter) return;

    const finish = () => {
      setCommentDraft('');
      setCommentAttachments([]);
    };

    if (!body && closeAfter) {
      setState.mutate(
        { state: 'CLOSED', reason: closeAfter },
        {
          onSuccess: () => toast.success('Issue closed.'),
          onError: (error) => toast.error(getErrorMessage(error, 'The issue was not closed.')),
        },
      );
      return;
    }

    addComment.mutate(
      { body, attachment_ids: commentAttachments },
      {
        onSuccess: () => {
          finish();
          if (closeAfter) {
            setState.mutate(
              { state: 'CLOSED', reason: closeAfter },
              {
                onError: (error) =>
                  toast.error(getErrorMessage(error, 'Commented, but not closed.')),
              },
            );
          }
        },
        onError: (error) => toast.error(getErrorMessage(error, 'The comment was not posted.')),
      },
    );
  }

  async function removeIssue() {
    const confirmed = await confirmDialog({
      title: `Delete issue #${data!.number}?`,
      description:
        'The issue, its comments and its history go with it, and the number is never reused. Closing it is usually the better move.',
      confirmLabel: 'Delete permanently',
      destructive: true,
    });
    if (!confirmed) return;
    deleteIssue.mutate(data!.number, {
      onSuccess: () => {
        toast.success('Issue deleted.');
        navigate('/issues');
      },
      onError: (error) => toast.error(getErrorMessage(error, 'The issue was not deleted.')),
    });
  }

  const labelIds = data.labels.map((label) => label.id);
  const assigneeIds = data.assignees.map((user) => user.id);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/issues">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Issues
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-3 border-b pb-4">
        {editingHeader ? (
          <div className="flex flex-wrap gap-2">
            <Input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              maxLength={250}
              className="flex-1 text-lg"
            />
            <Button
              size="sm"
              onClick={() => {
                patch({ title: titleDraft }, 'Title updated.');
                setEditingHeader(false);
              }}
              disabled={!titleDraft.trim() || updateIssue.isPending}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTitleDraft(data.title);
                setEditingHeader(false);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-start gap-2">
            <h1 className="text-2xl font-semibold leading-tight">
              {data.title} <span className="font-normal text-muted-foreground">#{data.number}</span>
            </h1>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => {
                  setTitleDraft(data.title);
                  setEditingHeader(true);
                }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <StateBadge state={data.state} reason={data.state_reason} />
          <span>
            <strong className="font-medium text-foreground">
              {data.author?.name ?? 'Someone'}
            </strong>{' '}
            opened this <span title={exactTime(data.created_at)}>{timeAgo(data.created_at)}</span> ·{' '}
            {data.comment_count} comment{data.comment_count === 1 ? '' : 's'}
          </span>
          {data.locked && (
            <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
          {data.pinned && (
            <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
              <Pin className="h-3 w-3" />
              Pinned
            </span>
          )}

          {canTriage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-auto h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Issue actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => patch({ pinned: !data.pinned })}>
                  <Pin className="mr-2 h-4 w-4" />
                  {data.pinned ? 'Unpin' : 'Pin to top'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => patch({ locked: !data.locked })}>
                  {data.locked ? (
                    <Unlock className="mr-2 h-4 w-4" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  {data.locked ? 'Unlock conversation' : 'Lock conversation'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={removeIssue}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete issue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {data.duplicate_of_number && (
          <p className="text-sm text-muted-foreground">
            Closed as a duplicate of{' '}
            <Link
              to={`/issues/${data.duplicate_of_number}`}
              className="text-primary hover:underline"
            >
              #{data.duplicate_of_number} {data.duplicate_of_title}
            </Link>
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          {/* The report itself */}
          <Card>
            <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
              <UserAvatar user={data.author} />
              <span className="font-medium">{data.author?.name ?? 'Someone'}</span>
              <span className="text-muted-foreground" title={exactTime(data.created_at)}>
                reported {timeAgo(data.created_at)}
              </span>
              {canEdit && !editingBody && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7"
                  onClick={() => {
                    setBodyDraft(data.body);
                    setEditingBody(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <CardContent className="pt-4">
              {editingBody ? (
                <div className="space-y-2">
                  <MarkdownEditor value={bodyDraft} onChange={setBodyDraft} rows={12} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingBody(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        patch({ body: bodyDraft }, 'Description updated.');
                        setEditingBody(false);
                      }}
                      disabled={updateIssue.isPending}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <Markdown source={data.body} />
              )}

              {data.page_url && (
                <p className="mt-4 flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5" />
                  Reported from{' '}
                  {data.page_url.startsWith('/') ? (
                    <Link to={data.page_url} className="font-mono text-primary hover:underline">
                      {data.page_url}
                    </Link>
                  ) : (
                    <span className="font-mono">{data.page_url}</span>
                  )}
                </p>
              )}

              {data.attachments.length > 0 && (
                <div className="mt-3 space-y-1 border-t pt-3">
                  {data.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={resolveFileUrl(attachment.url)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {attachment.original_filename}
                      <span className="text-muted-foreground">
                        ({formatBytes(attachment.size_bytes)})
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          {timeline.isLoading ? (
            <div className="h-20 animate-pulse rounded bg-muted" />
          ) : (
            <IssueTimeline
              issueNumber={data.number}
              // The OPENED event repeats what the header already says.
              entries={(timeline.data ?? []).filter(
                (entry) => !(entry.kind === 'event' && entry.event?.event === 'OPENED'),
              )}
              me={meta.data?.me ?? null}
              canTriage={canTriage}
            />
          )}

          {/* Comment box */}
          {data.locked && !canTriage ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              This conversation is locked. Only maintainers can comment.
            </div>
          ) : (
            <div className="space-y-2">
              <MarkdownEditor
                value={commentDraft}
                onChange={setCommentDraft}
                onAttachmentsChange={setCommentAttachments}
                rows={5}
                placeholder="Add a comment. Paste a screenshot if it helps."
              />
              <div className="flex flex-wrap justify-end gap-2">
                {data.state === 'OPEN' && canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={setState.isPending}>
                        {commentDraft.trim() ? 'Close with comment' : 'Close issue'}
                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => submitComment('COMPLETED')}>
                        Close as completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => submitComment('NOT_PLANNED')}>
                        Close as not planned
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {data.state === 'CLOSED' && canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={setState.isPending}
                    onClick={() =>
                      setState.mutate(
                        { state: 'OPEN' },
                        {
                          onSuccess: () => toast.success('Issue reopened.'),
                          onError: (error) =>
                            toast.error(getErrorMessage(error, 'The issue was not reopened.')),
                        },
                      )
                    }
                  >
                    Reopen issue
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => submitComment()}
                  disabled={!commentDraft.trim() || addComment.isPending}
                >
                  {addComment.isPending ? 'Posting…' : 'Comment'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 text-sm">
          <SidebarSection
            title="Assignees"
            action={
              canTriage && (
                <PickerMenu
                  title="Assign people"
                  options={(meta.data?.users ?? []).map((user) => ({
                    id: user.id,
                    label: user.name,
                  }))}
                  selectedIds={assigneeIds}
                  onToggle={toggleAssignee}
                />
              )
            }
          >
            {data.assignees.length === 0 ? (
              <p className="text-muted-foreground">No one — this is unowned.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.assignees.map((user) => (
                  <li key={user.id} className="flex items-center gap-2">
                    <UserAvatar user={user} />
                    <span className="truncate">{user.name}</span>
                    {canTriage && (
                      <button
                        type="button"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => toggleAssignee(user.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SidebarSection>

          <SidebarSection
            title="Labels"
            action={
              canTriage && (
                <PickerMenu
                  title="Apply labels"
                  options={sortLabels(meta.data?.labels ?? []).map((label) => ({
                    id: label.id,
                    label: label.name,
                    swatch: label.color,
                  }))}
                  selectedIds={labelIds}
                  onToggle={toggleLabel}
                />
              )
            }
          >
            {data.labels.length === 0 ? (
              <p className="text-muted-foreground">None yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.labels.map((label) => (
                  <LabelChip key={label.id} label={label} />
                ))}
              </div>
            )}
          </SidebarSection>

          <SidebarSection title="Priority">
            {canTriage ? (
              <NativeSelect
                value={data.priority}
                onChange={(event) => patch({ priority: event.target.value as IssuePriority })}
              >
                {(meta.data?.priorities ?? []).map((row) => (
                  <SelectOption key={row.value} value={row.value}>
                    {row.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            ) : (
              <div>
                <PriorityChip priority={data.priority} label={data.priority_display} />
                {data.priority === 'MEDIUM' && <span>{data.priority_display}</span>}
              </div>
            )}
          </SidebarSection>

          {data.company_code && (
            <SidebarSection title="Company">
              <p>{data.company_code}</p>
            </SidebarSection>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-b pb-3 last:border-b-0">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/** A checklist menu that saves each toggle immediately. */
function PickerMenu({
  title,
  options,
  selectedIds,
  onToggle,
}: {
  title: string;
  options: { id: number; label: string; swatch?: string }[];
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs">
          Edit
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[320px] w-56 overflow-y-auto">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 && <DropdownMenuItem disabled>Nothing to pick</DropdownMenuItem>}
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={selectedIds.includes(option.id)}
            // Keep the menu open so several can be ticked in one pass.
            onSelect={(event) => {
              event.preventDefault();
              onToggle(option.id);
            }}
          >
            <span className="flex items-center gap-2">
              {option.swatch && (
                <span
                  className="h-3 w-3 shrink-0 rounded-full border"
                  style={{ backgroundColor: option.swatch }}
                />
              )}
              <span className="truncate">{option.label}</span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}