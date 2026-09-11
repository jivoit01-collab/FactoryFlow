/**
 * The issue tracker's settings: the support number and the label master.
 *
 * The support number is here rather than in the Django admin because the
 * people who answer the phone are not the people with a database login, and
 * the number is printed on the login screen of every user.
 *
 * Both are editable in place, and both are deactivated rather than deleted —
 * a label's name and colour are frozen into every "labelled bug" line on every
 * timeline, so the row has to survive for the history to keep reading correctly.
 * Removing a label just takes it off the pickers and off the issues carrying it.
 *
 * Each label row shows how many open issues carry it, which is the number that
 * tells you whether a label is doing any work.
 */
import { Headset, Palette, Plus, Trash2 } from 'lucide-react';
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
} from '@/shared/components/ui';
import { useSupportContactSetting } from '@/shared/hooks';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import {
  useDeleteLabel,
  useIssueLabels,
  useSaveLabel,
  useSaveSupportContact,
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
  const saveLabel = useSaveLabel();
  const deleteLabel = useDeleteLabel();

  const supportSetting = useSupportContactSetting();
  const saveSupport = useSaveSupportContact();

  const [newLabel, setNewLabel] = useState({ name: '', color: '#6b7280', description: '' });
  // `null` means "whatever the server says"; typing takes over from there, and
  // saving hands control back. No effect syncing a field to a fetch.
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);

  const savedPhone = supportSetting.data?.phone ?? '';
  const phone = phoneDraft ?? savedPhone;
  const phoneChanged = phone.trim() !== savedPhone;

  function saveSupportNumber() {
    saveSupport.mutate(phone.trim(), {
      onSuccess: (payload) => {
        setPhoneDraft(null);
        toast.success(
          payload.phone ? 'Support number updated.' : 'Support number removed from the app.',
        );
      },
      onError: (error) =>
        toast.error(getErrorMessage(error, 'The support number was not saved.')),
    });
  }

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Issue settings</h1>
          <p className="text-sm text-muted-foreground">
            The support number every user sees, what issues can be tagged with, and which part
            of the software they belong to.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/issues">Back to issues</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Headset className="h-4 w-4" />
            Support number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Shown on the login screen and behind the support button in the header, to every
            user. Leave it blank to take the support line off those screens.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1 space-y-1">
              <Label htmlFor="support-phone">Phone</Label>
              <Input
                id="support-phone"
                value={phone}
                onChange={(event) => setPhoneDraft(event.target.value)}
                placeholder="+91 9218179324"
                maxLength={32}
                inputMode="tel"
                disabled={supportSetting.isLoading}
              />
            </div>
            <Button
              onClick={saveSupportNumber}
              disabled={!phoneChanged || saveSupport.isPending || supportSetting.isLoading}
            >
              {saveSupport.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Users tap it to dial, so type it the way it should be dialled — spaces and
            brackets are fine.
            {supportSetting.data?.updated_at && (
              <>
                {' '}Last changed {formatDateTimeShort(supportSetting.data.updated_at)}
                {supportSetting.data.updated_by_name
                  ? ` by ${supportSetting.data.updated_by_name}`
                  : ''}
                .
              </>
            )}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
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

      </div>
    </div>
  );
}
