/**
 * Report a new issue.
 *
 * Two things here are not on GitHub's form and are worth the space, because
 * this tracker sits *inside* the software it tracks:
 *
 * - **Where it happened.** The form arrives pre-filled with the page the
 *   reporter came from (`?from=/dispatch/bills-linking`), so a report says which
 *   screen to open without anyone having to ask. Anyone can correct it.
 * - **Which company unit.** Half the bugs in this app are one company's data
 *   looking wrong in another's, so the active company is captured with the
 *   report rather than reconstructed later.
 *
 * Labels and assignees are only offered to someone who can triage — a reporter
 * choosing their own labels produces a backlog nobody trusts.
 */
import { ArrowLeft, Info } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ISSUE_PERMISSIONS } from '@/config/permissions';
import { useHasPermission, usePermission } from '@/core/auth/hooks/usePermission';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  MultiSelect,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useCreateIssue, useIssueMeta } from '../api';
import { MarkdownEditor } from '../components/MarkdownEditor';
import type { IssuePriority } from '../types';
import { sortLabels } from '../utils';

/** The prompt a bug report needs to be actionable, pre-loaded into the body. */
const BODY_TEMPLATE = `### What happened

### What I expected

### Steps to reproduce
1.
2.

### Anything else
`;

export default function IssueNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canTriage = useHasPermission(ISSUE_PERMISSIONS.TRIAGE);
  const { currentCompany } = usePermission();

  const meta = useIssueMeta();
  const createIssue = useCreateIssue();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState(BODY_TEMPLATE);
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [areaId, setAreaId] = useState('');
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<number[]>([]);
  // Where the reporter was when they hit the problem.
  const [pageUrl, setPageUrl] = useState(searchParams.get('from') ?? '');

  const company = meta.data?.companies.find((row) => row.code === currentCompany?.company_code);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error('Give the issue a title.');
      return;
    }
    createIssue.mutate(
      {
        title: title.trim(),
        body,
        priority,
        area: areaId ? Number(areaId) : null,
        company: company?.id ?? null,
        label_ids: canTriage ? labelIds : [],
        assignee_ids: canTriage ? assigneeIds : [],
        page_url: pageUrl,
        attachment_ids: attachmentIds,
      },
      {
        onSuccess: (issue) => {
          toast.success(`Issue #${issue.number} filed.`);
          navigate(`/issues/${issue.number}`);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'The issue was not filed.')),
      },
    );
  }

  /**
   * The area's owners are suggested as assignees the moment an area is picked,
   * so a triager does not have to remember who looks after Dispatch.
   */
  function pickArea(nextAreaId: string) {
    setAreaId(nextAreaId);
    if (!canTriage || !nextAreaId) return;
    const area = meta.data?.areas.find((row) => row.id === Number(nextAreaId));
    if (area?.owners.length) {
      setAssigneeIds(area.owners.map((owner) => owner.id));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link to="/issues">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Issues
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">New issue</h1>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="issue-title">Title</Label>
              <Input
                id="issue-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="One line: what is broken, and where"
                maxLength={250}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <MarkdownEditor
                value={body}
                onChange={setBody}
                onAttachmentsChange={setAttachmentIds}
                rows={14}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issue-page">Where it happened</Label>
              <Input
                id="issue-page"
                value={pageUrl}
                onChange={(event) => setPageUrl(event.target.value)}
                placeholder="/dispatch/bills-linking"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The page you were on. Filled in for you when you open this from the sidebar.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/issues')}>
                Cancel
              </Button>
              <Button type="submit" disabled={createIssue.isPending || !title.trim()}>
                {createIssue.isPending ? 'Filing…' : 'Submit new issue'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label htmlFor="issue-area">Area</Label>
                <NativeSelect
                  id="issue-area"
                  value={areaId}
                  onChange={(event) => pickArea(event.target.value)}
                >
                  <SelectOption value="">Not sure</SelectOption>
                  {(meta.data?.areas ?? []).map((area) => (
                    <SelectOption key={area.id} value={String(area.id)}>
                      {area.name}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="issue-priority">Priority</Label>
                <NativeSelect
                  id="issue-priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as IssuePriority)}
                >
                  {(meta.data?.priorities ?? []).map((row) => (
                    <SelectOption key={row.value} value={row.value}>
                      {row.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>

              {canTriage && (
                <>
                  <div className="space-y-1.5">
                    <Label>Labels</Label>
                    <MultiSelect
                      options={sortLabels(meta.data?.labels ?? []).map((label) => ({
                        value: String(label.id),
                        label: label.name,
                      }))}
                      selected={labelIds.map(String)}
                      onChange={(values) => setLabelIds(values.map(Number))}
                      placeholder="No labels"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Assignees</Label>
                    <MultiSelect
                      options={(meta.data?.users ?? []).map((user) => ({
                        value: String(user.id),
                        label: user.name,
                      }))}
                      selected={assigneeIds.map(String)}
                      onChange={(values) => setAssigneeIds(values.map(Number))}
                      placeholder="Nobody yet"
                    />
                  </div>
                </>
              )}

              {company && (
                <p className="text-xs text-muted-foreground">
                  Filed under <strong>{company.name}</strong>.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              A screenshot settles most reports. Paste one straight into the description with
              Ctrl-V, or drop the file on it.
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
