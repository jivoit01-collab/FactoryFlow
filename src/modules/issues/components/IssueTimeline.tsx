/**
 * The issue's conversation: comments as cards, events as one-line entries down
 * a connecting rail.
 *
 * The event lines read as sentences ("Priya labelled this bug 2 hours ago")
 * because that is what makes a timeline scannable — a table of event codes
 * would not be. Every line's wording comes from the event's frozen `detail`, so
 * a label renamed today does not rewrite what happened last week.
 */
import {
  CheckCircle2,
  CircleDot,
  CircleSlash,
  Copy,
  Lock,
  MoreHorizontal,
  Pencil,
  Pin,
  Tag,
  Trash2,
  Unlock,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useDeleteComment, useUpdateComment } from '../api';
import type { IssueComment, IssueEvent, IssueTimelineEntry, UserBrief } from '../types';
import { exactTime, timeAgo } from '../utils';
import { LabelChip, UserAvatar } from './IssueBits';
import { Markdown } from './Markdown';
import { MarkdownEditor } from './MarkdownEditor';

interface IssueTimelineProps {
  issueNumber: number;
  entries: IssueTimelineEntry[];
  /** The signed-in user, to decide which comments offer Edit / Delete. */
  me: UserBrief | null;
  canTriage: boolean;
}

export function IssueTimeline({ issueNumber, entries, me, canTriage }: IssueTimelineProps) {
  return (
    <ol className="space-y-3">
      {entries.map((entry, index) =>
        entry.kind === 'comment' && entry.comment ? (
          <CommentCard
            key={`c${entry.comment.id}`}
            issueNumber={issueNumber}
            comment={entry.comment}
            canEdit={canTriage || (!!me && entry.comment.author?.id === me.id)}
          />
        ) : entry.event ? (
          <EventLine key={`e${entry.event.id}`} event={entry.event} />
        ) : (
          <li key={`x${index}`} />
        ),
      )}
    </ol>
  );
}

function CommentCard({
  issueNumber,
  comment,
  canEdit,
}: {
  issueNumber: number;
  comment: IssueComment;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const updateComment = useUpdateComment(issueNumber);
  const deleteComment = useDeleteComment(issueNumber);

  function save() {
    updateComment.mutate(
      { commentId: comment.id, body: draft },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('Comment updated.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'The comment was not saved.')),
      },
    );
  }

  return (
    <li className="rounded-md border">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
        <UserAvatar user={comment.author} />
        <span className="font-medium">{comment.author?.name ?? 'Someone'}</span>
        <span className="text-muted-foreground" title={exactTime(comment.created_at)}>
          commented {timeAgo(comment.created_at)}
        </span>
        {comment.edited_at && (
          <span className="text-xs text-muted-foreground" title={exactTime(comment.edited_at)}>
            · edited
          </span>
        )}
        {canEdit && !editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Comment actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setDraft(comment.body);
                  setEditing(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() =>
                  deleteComment.mutate(comment.id, {
                    onSuccess: () => toast.success('Comment deleted.'),
                    onError: (error) =>
                      toast.error(getErrorMessage(error, 'The comment was not deleted.')),
                  })
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="p-3">
        {editing ? (
          <div className="space-y-2">
            <MarkdownEditor value={draft} onChange={setDraft} rows={6} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={updateComment.isPending || !draft.trim()}>
                {updateComment.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <Markdown source={comment.body} />
        )}
      </div>
    </li>
  );
}

/** Icon and wording for one event kind. */
function describe(event: IssueEvent) {
  const actor = event.actor?.name ?? 'Someone';
  const detail = event.detail ?? {};

  switch (event.event) {
    case 'OPENED':
      return { icon: CircleDot, tone: 'text-green-600', text: <>{actor} opened this</> };
    case 'CLOSED':
      return {
        icon: detail.reason && detail.reason !== 'COMPLETED' ? CircleSlash : CheckCircle2,
        tone: detail.reason && detail.reason !== 'COMPLETED' ? 'text-slate-500' : 'text-purple-600',
        text: (
          <>
            {actor} closed this
            {detail.reason === 'NOT_PLANNED' && ' as not planned'}
            {detail.reason === 'DUPLICATE' && ' as a duplicate'}
          </>
        ),
      };
    case 'REOPENED':
      return { icon: CircleDot, tone: 'text-green-600', text: <>{actor} reopened this</> };
    case 'LABELED':
      return {
        icon: Tag,
        tone: 'text-muted-foreground',
        text: (
          <>
            {actor} added the{' '}
            <LabelChip
              label={{
                id: 0,
                name: String(detail.label ?? ''),
                color: String(detail.color ?? '#6b7280'),
                description: '',
                sequence: 0,
              }}
            />{' '}
            label
          </>
        ),
      };
    case 'UNLABELED':
      return {
        icon: Tag,
        tone: 'text-muted-foreground',
        text: (
          <>
            {actor} removed the{' '}
            <LabelChip
              label={{
                id: 0,
                name: String(detail.label ?? ''),
                color: String(detail.color ?? '#6b7280'),
                description: '',
                sequence: 0,
              }}
            />{' '}
            label
          </>
        ),
      };
    case 'ASSIGNED':
      return {
        icon: UserPlus,
        tone: 'text-muted-foreground',
        text: (
          <>
            {actor} assigned this to <strong className="font-medium">{String(detail.name ?? '')}</strong>
          </>
        ),
      };
    case 'UNASSIGNED':
      return {
        icon: UserPlus,
        tone: 'text-muted-foreground',
        text: (
          <>
            {actor} unassigned <strong className="font-medium">{String(detail.name ?? '')}</strong>
          </>
        ),
      };
    case 'RENAMED':
      return {
        icon: Pencil,
        tone: 'text-muted-foreground',
        text: (
          <>
            {actor} changed the title from{' '}
            <span className="line-through opacity-70">{String(detail.previous ?? '')}</span> to{' '}
            <strong className="font-medium">{String(detail.current ?? '')}</strong>
          </>
        ),
      };
    case 'EDITED':
      return {
        icon: Pencil,
        tone: 'text-muted-foreground',
        text: <>{actor} edited the description</>,
      };
    case 'PRIORITY_CHANGED':
      return {
        icon: MoreHorizontal,
        tone: 'text-muted-foreground',
        text: (
          <>
            {actor} set the priority to{' '}
            <strong className="font-medium">{String(detail.current ?? '').toLowerCase()}</strong>
          </>
        ),
      };
    case 'AREA_CHANGED':
      return {
        icon: MoreHorizontal,
        tone: 'text-muted-foreground',
        text: (
          <>
            {actor} moved this to{' '}
            <strong className="font-medium">{String(detail.current || 'no area')}</strong>
          </>
        ),
      };
    case 'MARKED_DUPLICATE':
      return {
        icon: Copy,
        tone: 'text-muted-foreground',
        text: (
          <>
            {actor} marked this as a duplicate of{' '}
            <Link to={`/issues/${detail.number}`} className="font-medium text-primary hover:underline">
              #{String(detail.number ?? '')}
            </Link>
          </>
        ),
      };
    case 'PINNED':
      return { icon: Pin, tone: 'text-muted-foreground', text: <>{actor} pinned this</> };
    case 'UNPINNED':
      return { icon: Pin, tone: 'text-muted-foreground', text: <>{actor} unpinned this</> };
    case 'LOCKED':
      return {
        icon: Lock,
        tone: 'text-muted-foreground',
        text: <>{actor} locked the conversation</>,
      };
    case 'UNLOCKED':
      return {
        icon: Unlock,
        tone: 'text-muted-foreground',
        text: <>{actor} unlocked the conversation</>,
      };
    default:
      // A new event kind added on the server must still render something
      // sensible in a client that has not shipped yet.
      return {
        icon: MoreHorizontal,
        tone: 'text-muted-foreground',
        text: (
          <>
            {actor} {event.event_display?.toLowerCase() ?? 'changed this'}
          </>
        ),
      };
  }
}

function EventLine({ event }: { event: IssueEvent }) {
  const { icon: Icon, tone, text } = describe(event);
  return (
    <li className="flex items-start gap-2 px-1 text-sm text-muted-foreground">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-background">
        <Icon className={cn('h-3 w-3', tone)} />
      </span>
      <span className="flex flex-wrap items-center gap-1">
        {text}
        <span className="text-xs" title={exactTime(event.created_at)}>
          {timeAgo(event.created_at)}
        </span>
      </span>
    </li>
  );
}
