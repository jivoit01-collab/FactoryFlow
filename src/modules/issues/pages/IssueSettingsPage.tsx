/**
 * The label and area masters.
 *
 * Both are editable in place, and both are deactivated rather than deleted —
 * a label's name and colour are frozen into every "labelled bug" line on every
 * timeline, so the row has to survive for the history to keep reading correctly.
 * Removing a label just takes it off the pickers and off the issues carrying it.
 *
 * Each label row shows how many open issues carry it, which is the number that
 * tells you whether a label is doing any work.
 */
import { Palette, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  MultiSelect,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useDeleteArea,
  useDeleteLabel,
  useIssueAreas,
  useIssueLabels,
  useIssueMeta,
  useSaveArea,
  useSaveLabel,
} from '../api';
import { LabelChip } from '../components/IssueBits';
import { sortLabels } from '../utils';

/** Offered as one-click choices; any hex still works in the text field. */
const SWATCHES = [
  '#d73a4a',
  '#b60205',
  '#e99695',
  '#fbca04',
  '#0e8a16',
  '#1d76db',
  '#a2eeef',
  '#c5def5',
  '#5319e7',
  '#d876e3',
  '#cfd3d7',
  '#6b7280',
];

export default function IssueSettingsPage() {
  const labels = useIssueLabels();
  const areas = useIssueAreas();
  const meta = useIssueMeta();
  const saveLabel = useSaveLabel();
  const deleteLabel = useDeleteLabel();
  const saveArea = useSaveArea();
  const deleteArea = useDeleteArea();

  const [newLabel, setNewLabel] = useState({ name: '', color: '#6b7280', description: '' });
  const [newArea, setNewArea] = useState({ name: '', code: '', description: '' });

  function addLabel() {
    if (!newLabel.name.trim()) return;
    saveLabel.mutate(
      { ...newLabel, name: newLabel.name.trim() },
      {
        onSuccess: () => {
          setNewLabel({ name: '', color: '#6b7280', description: '' });
          toast.success('Label added.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'The label was not added.')),
      },
    );
  }

  function addArea() {
    if (!newArea.name.trim() || !newArea.code.trim()) {
      toast.error('An area needs both a name and a short code.');
      return;
    }
    saveArea.mutate(
      { ...newArea, name: newArea.name.trim(), code: newArea.code.trim().toLowerCase() },
      {
        onSuccess: () => {
          setNewArea({ name: '', code: '', description: '' });
          toast.success('Area added.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'The area was not added.')),
      },
    );
  }

  async function removeLabel(id: number, name: string, openIssues: number) {
    const confirmed = await confirmDialog({
      title: `Remove the "${name}" label?`,
      description: openIssues
        ? `It comes off ${openIssues} open issue${openIssues === 1 ? '' : 's'} and off the pickers. Past timeline entries keep showing it.`
        : 'It comes off the pickers. Past timeline entries keep showing it.',
      confirmLabel: 'Remove label',
      destructive: true,
    });
    if (!confirmed) return;
    deleteLabel.mutate(id, {
      onSuccess: () => toast.success('Label removed.'),
      onError: (error) => toast.error(getErrorMessage(error, 'The label was not removed.')),
    });
  }

  async function removeArea(id: number, name: string) {
    const confirmed = await confirmDialog({
      title: `Remove the "${name}" area?`,
      description: 'Issues already filed against it keep it; it just stops being offered.',
      confirmLabel: 'Remove area',
      destructive: true,
    });
    if (!confirmed) return;
    deleteArea.mutate(id, {
      onSuccess: () => toast.success('Area removed.'),
      onError: (error) => toast.error(getErrorMessage(error, 'The area was not removed.')),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Labels &amp; areas</h1>
          <p className="text-sm text-muted-foreground">
            What issues can be tagged with, and which part of the software they belong to.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/issues">Back to issues</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" />
              Labels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-md border p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                <div className="space-y-1">
                  <Label htmlFor="new-label-name">Name</Label>
                  <Input
                    id="new-label-name"
                    value={newLabel.name}
                    onChange={(event) =>
                      setNewLabel((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="regression"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-label-color">Colour</Label>
                  <Input
                    id="new-label-color"
                    value={newLabel.color}
                    onChange={(event) =>
                      setNewLabel((current) => ({ ...current, color: event.target.value }))
                    }
                    className="font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-label-description">Description</Label>
                <Input
                  id="new-label-description"
                  value={newLabel.description}
                  onChange={(event) =>
                    setNewLabel((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Worked before, broken now"
                  maxLength={200}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setNewLabel((current) => ({ ...current, color: swatch }))}
                    className="h-5 w-5 rounded-full border hover:scale-110"
                    style={{ backgroundColor: swatch }}
                    aria-label={`Use ${swatch}`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                {newLabel.name.trim() ? (
                  <LabelChip
                    label={{
                      id: 0,
                      name: newLabel.name.trim(),
                      color: newLabel.color,
                      description: '',
                      sequence: 0,
                    }}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Preview appears here</span>
                )}
                <Button size="sm" onClick={addLabel} disabled={saveLabel.isPending}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add label
                </Button>
              </div>
            </div>

            {labels.isLoading ? (
              <div className="h-24 animate-pulse rounded bg-muted" />
            ) : (
              <ul className="divide-y">
                {sortLabels(labels.data ?? []).map((label) => (
                  <li key={label.id} className="flex items-center gap-2 py-2">
                    <LabelChip label={label} />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {label.description}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {label.open_issues ?? 0} open
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeLabel(label.id, label.name, label.open_issues ?? 0)}
                      aria-label={`Remove ${label.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Areas of the software</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-md border p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                <div className="space-y-1">
                  <Label htmlFor="new-area-name">Name</Label>
                  <Input
                    id="new-area-name"
                    value={newArea.name}
                    onChange={(event) =>
                      setNewArea((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Dispatch"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-area-code">Search code</Label>
                  <Input
                    id="new-area-code"
                    value={newArea.code}
                    onChange={(event) =>
                      setNewArea((current) => ({ ...current, code: event.target.value }))
                    }
                    placeholder="dispatch"
                    className="font-mono"
                    maxLength={40}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The code is what people type in the search box:{' '}
                <code className="font-mono">area:dispatch</code>.
              </p>
              <div className="flex justify-end">
                <Button size="sm" onClick={addArea} disabled={saveArea.isPending}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add area
                </Button>
              </div>
            </div>

            {areas.isLoading ? (
              <div className="h-24 animate-pulse rounded bg-muted" />
            ) : (
              <ul className="divide-y">
                {(areas.data ?? []).map((area) => (
                  <li key={area.id} className="space-y-1.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{area.name}</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{area.code}</code>
                      <button
                        type="button"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => removeArea(area.id, area.name)}
                        aria-label={`Remove ${area.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">
                        Suggested assignees for new issues here
                      </span>
                      <MultiSelect
                        options={(meta.data?.users ?? []).map((user) => ({
                          value: String(user.id),
                          label: user.name,
                        }))}
                        selected={area.owners.map((owner) => String(owner.id))}
                        onChange={(values) =>
                          saveArea.mutate(
                            { id: area.id, owner_ids: values.map(Number) },
                            {
                              onError: (error) =>
                                toast.error(getErrorMessage(error, 'The owners were not saved.')),
                            },
                          )
                        }
                        placeholder="Nobody"
                        searchable
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
