/**
 * Raise a project, or edit one that is still a draft.
 *
 * A dialog rather than a page. It was a page once, but a project is raised
 * from the register and edited from the project, and in both cases what you
 * were looking at is the context for what you are typing — a full-page form
 * threw that away and handed back a breadcrumb trail instead.
 *
 * Six things: what it is, where, how big, when it starts, when it should
 * finish, what it should cost, and who runs it. Approval sanctions the cost
 * and the date together, so both are asked for here and neither moves
 * afterwards except through a revision. That rule is not written on the form —
 * it is the approver's business, and a create form is not the place to explain
 * what happens two steps later.
 */
import { useQueryClient } from '@tanstack/react-query';
import { Save, Send, Table2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { CONSTRUCTION_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { SearchableSelect } from '@/shared/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  constructionApi,
  type ConstructionPerson,
  useCreateProject,
  usePeople,
  useProject,
  useUpdateProject,
} from '../api';
import type { DimensionUnit, EstimateLinePayload, ProjectPayload } from '../types';
import { todayISO } from '../utils';
import { AttachmentsPanel, type StagedAttachment } from './AttachmentsPanel';
import { EstimateSheetDialog } from './EstimateSheetDialog';

/** A function, not a constant: `todayISO()` frozen at module load is yesterday
 *  for anyone whose tab was open over midnight. */
function emptyForm(): ProjectPayload {
  return {
    name: '',
    description: '',
    location: '',
    start_date: todayISO(),
    expected_end_date: '',
    estimated_cost: '',
    manager: 0,
    site_incharge: null,
    length: '',
    breadth: '',
    height: '',
    dimension_unit: 'FT',
  };
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  projectId,
  onSavedDraft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The project to edit. Left out, the dialog raises a new one. */
  projectId?: number | null;
  /**
   * Called after a *new* project is parked as a draft. The register uses it to
   * move to a tab that shows drafts: it opens on Live, which by definition
   * excludes them, so saving one and watching nothing appear reads as a failed
   * save.
   */
  onSavedDraft?: () => void;
}) {
  const id = projectId ?? 0;
  const isEdit = id > 0;
  const navigate = useNavigate();

  // Guarded on `open`: a closed dialog sits on the register and on every
  // project page, and neither should be fetching a staff list on load.
  const { data: people } = usePeople(open);
  const { data: existing } = useProject(id, isEdit && open);
  const create = useCreateProject();
  const update = useUpdateProject(id);
  const queryClient = useQueryClient();
  // Submitting is gated on *editing*, not creating: somebody may be allowed to
  // raise a project and not to send it on. They get the draft button alone,
  // rather than a button that 403s once the project already exists.
  const canSubmit = useHasPermission(CONSTRUCTION_PERMISSIONS.EDIT_PROJECT);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState<ProjectPayload>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // A project's papers usually exist before the project record does, so on a
  // new project they are held here and uploaded once it has an id.
  const [stagedFiles, setStagedFiles] = useState<StagedAttachment[]>([]);
  // Same arrangement for the breakdown: usually written before Create is
  // pressed, so it is held here and PUT once the project has an id.
  const [stagedLines, setStagedLines] = useState<EstimateLinePayload[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  //: Which project's values are currently in the fields. Declared before the
  //  open/close handling below, which clears it.
  const [loadedId, setLoadedId] = useState<number | null>(null);

  // A dialog is not unmounted between openings the way a page was, so a second
  // "New project" would otherwise open on the first one's typing. Reset on the
  // transition into open, during render rather than in an effect, so the
  // fields are never briefly the old project's.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setErrors({});
    if (open && !isEdit) {
      setForm(emptyForm());
      setStagedFiles([]);
      setStagedLines([]);
    }
    if (!open) setSheetOpen(false);
    if (open && isEdit) {
      // Forget which project is loaded, so reopening a draft reloads it from
      // the server. Without this, edits that were typed and then cancelled
      // are still in the fields the next time the draft is opened.
      setLoadedId(null);
    }
  }

  // Load the fetched project into the form once it arrives, and again if a
  // different project is fetched, or the same one is reopened.
  if (open && existing && existing.id !== loadedId) {
    setLoadedId(existing.id);
    setForm({
      name: existing.name,
      description: existing.description,
      location: existing.location,
      start_date: existing.start_date,
      expected_end_date: existing.expected_end_date,
      estimated_cost: existing.estimated_cost,
      manager: existing.manager,
      site_incharge: existing.site_incharge,
      length: existing.length ?? '',
      breadth: existing.breadth ?? '',
      height: existing.height ?? '',
      dimension_unit: existing.dimension_unit,
    });
  }

  function set<K extends keyof ProjectPayload>(key: K, value: ProjectPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key as string]: '' }));
  }

  /** Is there anything on this form at all? An untouched form saves nothing. */
  function isBlank(): boolean {
    const blank = emptyForm();
    const touched =
      form.name.trim() ||
      form.description?.trim() ||
      form.location?.trim() ||
      form.estimated_cost ||
      form.manager ||
      form.site_incharge ||
      form.length ||
      form.breadth ||
      form.height ||
      form.expected_end_date ||
      form.start_date !== blank.start_date ||
      form.dimension_unit !== blank.dimension_unit;
    return !touched && stagedFiles.length === 0 && stagedLines.length === 0;
  }

  /** Only asked before sending. A draft is allowed to be half a thought. */
  function validate(): boolean {
    const found: Record<string, string> = {};
    if (!form.name.trim()) found.name = 'What is being built?';
    if (!form.start_date) found.start_date = 'When does it start?';
    if (!form.expected_end_date) found.expected_end_date = 'When is it expected to finish?';
    if (form.expected_end_date && form.start_date && form.expected_end_date < form.start_date) {
      found.expected_end_date = 'The end cannot be before the start.';
    }
    if (!form.estimated_cost || Number(form.estimated_cost) <= 0) {
      found.estimated_cost = 'What should it cost?';
    }
    if (!form.manager) found.manager = 'Who runs it?';
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  /**
   * Save the project, and optionally send it on in the same breath.
   *
   * Saving and submitting are two calls, and the second can fail on its own.
   * When it does, the project still exists as a draft — so the message says
   * that, rather than "could not save", which would send somebody off to type
   * the whole thing again over a project that is already there.
   */
  async function save(send: boolean) {
    // Nothing typed and nothing attached: there is no draft to make. Closing
    // without a request is the honest answer -- a project whose every column
    // is empty is a row nobody can identify, least of all the person who
    // would come back to it.
    if (!send && !isEdit && isBlank()) {
      onOpenChange(false);
      return;
    }
    // A draft is allowed to be incomplete; a submission is not. The server
    // agrees -- the columns are nullable and `submit_project` is what refuses
    // an unfinished project, by name.
    if (send && !validate()) return;
    const payload: ProjectPayload = {
      ...form,
      // An untouched field is "" here and null to the API. DRF's DateField
      // and DecimalField reject "" even where they allow null, so a draft
      // with an empty date would 400 on the way out if these were passed
      // through as typed.
      start_date: form.start_date || null,
      expected_end_date: form.expected_end_date || null,
      estimated_cost: form.estimated_cost || null,
      manager: form.manager || null,
      site_incharge: form.site_incharge || null,
      // Blank means "not recorded", which is null rather than zero — a wall
      // with no breadth has no breadth, it is not nought feet wide.
      length: form.length || null,
      breadth: form.breadth || null,
      height: form.height || null,
    };

    let savedId = id;
    let code = existing?.code ?? '';
    try {
      if (isEdit) {
        await update.mutateAsync(payload);
      } else {
        const project = await create.mutateAsync(payload);
        savedId = project.id;
        code = project.code;
        if (stagedLines.length > 0) {
          // The breakdown becomes the estimate server-side, so a failure here
          // leaves the typed figure standing rather than a wrong one.
          try {
            await constructionApi.saveEstimate(savedId, stagedLines);
          } catch {
            toast.warning(
              `${code} was saved, but its breakdown did not. Open Explain on the project to add it.`,
            );
          }
        }
        if (stagedFiles.length > 0) {
          // The project exists now, so the staged papers have somewhere to go.
          // A failed upload must not read as a failed project — it was created.
          try {
            await Promise.all(
              stagedFiles.map((item) =>
                constructionApi.addAttachment(savedId, item.file, item.title, item.kind),
              ),
            );
          } catch {
            toast.warning(
              `${code} was saved, but the files did not upload. Attach them from the project.`,
            );
          }
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the project.'));
      return;
    }

    if (!send) {
      toast.success(isEdit ? 'Saved' : `${code} saved as a draft`);
      onOpenChange(false);
      if (!isEdit) onSavedDraft?.();
      return;
    }

    setSending(true);
    try {
      await constructionApi.submitProject(savedId);
      queryClient.invalidateQueries({ queryKey: ['construction'] });
      toast.success(`${code || 'The project'} was sent for approval`);
      onOpenChange(false);
      navigate(`/construction/projects/${savedId}`);
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['construction'] });
      toast.error(
        getErrorMessage(
          error,
          `${code || 'The project'} is saved as a draft, but could not be sent for approval.`,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  const saving = create.isPending || update.isPending || sending;
  // The caller only offers Edit on an editable project, but the check is cheap
  // and the alternative is a form that collects a budget the server refuses.
  const locked = isEdit && existing && !existing.is_editable;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? `Edit ${existing?.code ?? 'project'}` : 'New project'}
            </DialogTitle>
            <DialogDescription>
              {locked
                ? `It has been ${existing.status_display.toLowerCase()}. Its budget and dates now change through a revision.`
                : 'What is being built, what it should cost, and when it should finish.'}
            </DialogDescription>
          </DialogHeader>

          {locked ? (
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">What is being built</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) => set('name', event.target.value)}
                    placeholder="New packing shed, Block C"
                  />
                  {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">Where</Label>
                  <Input
                    id="location"
                    value={form.location ?? ''}
                    onChange={(event) => set('location', event.target.value)}
                    placeholder="Block C, north side"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>How big</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={form.length ?? ''}
                      onChange={(event) => set('length', event.target.value)}
                      placeholder="Length"
                      className="w-24"
                      aria-label="Length"
                    />
                    <span className="text-muted-foreground">×</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={form.breadth ?? ''}
                      onChange={(event) => set('breadth', event.target.value)}
                      placeholder="Breadth"
                      className="w-24"
                      aria-label="Breadth"
                    />
                    <span className="text-muted-foreground">×</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={form.height ?? ''}
                      onChange={(event) => set('height', event.target.value)}
                      placeholder="Height"
                      className="w-24"
                      aria-label="Height"
                    />
                    <NativeSelect
                      value={form.dimension_unit ?? 'FT'}
                      onChange={(event) =>
                        set('dimension_unit', event.target.value as DimensionUnit)
                      }
                      className="w-24"
                      aria-label="Unit"
                    >
                      <SelectOption value="FT">feet</SelectOption>
                      <SelectOption value="M">metres</SelectOption>
                    </NativeSelect>
                  </div>
                  {/* Only the worked-out area, and only once there is one. */}
                  {Number(form.length) > 0 && Number(form.breadth) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {(Number(form.length) * Number(form.breadth)).toLocaleString('en-IN')}{' '}
                      {form.dimension_unit === 'M' ? 'sq m' : 'sq ft'}
                      {Number(form.height) > 0 && (
                        <>
                          {' · '}
                          {(
                            Number(form.length) *
                            Number(form.breadth) *
                            Number(form.height)
                          ).toLocaleString('en-IN')}{' '}
                          {form.dimension_unit === 'M' ? 'cu m' : 'cu ft'}
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date">Starts</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={form.start_date ?? ''}
                      onChange={(event) => set('start_date', event.target.value)}
                    />
                    {errors.start_date && (
                      <p className="text-xs text-rose-600">{errors.start_date}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expected_end_date">Expected to finish</Label>
                    <Input
                      id="expected_end_date"
                      type="date"
                      min={form.start_date || undefined}
                      value={form.expected_end_date ?? ''}
                      onChange={(event) => set('expected_end_date', event.target.value)}
                    />
                    {errors.expected_end_date && (
                      <p className="text-xs text-rose-600">{errors.expected_end_date}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="estimated_cost">Budget asked for (₹)</Label>
                    {/* The figure and the reasoning for it belong together, so
                      the way into the breakdown sits on the field it explains. */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSheetOpen(true)}
                    >
                      <Table2 className="mr-1.5 h-4 w-4" />
                      Explain
                    </Button>
                  </div>
                  <Input
                    id="estimated_cost"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form.estimated_cost ?? ''}
                    onChange={(event) => set('estimated_cost', event.target.value)}
                    placeholder="800000.00"
                  />
                  {errors.estimated_cost && (
                    <p className="text-xs text-rose-600">{errors.estimated_cost}</p>
                  )}
                </div>

                {/*
                  Searchable rather than a plain list: the staff list is the
                  whole company, and a hundred names in a dropdown is not a
                  choice, it is a haystack. Nothing is listed until two letters
                  are typed, so what appears is always short enough to read.
                */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <SearchableSelect<ConstructionPerson>
                    inputId="manager"
                    label="Project manager"
                    items={people ?? []}
                    isLoading={false}
                    value={form.manager ? String(form.manager) : ''}
                    defaultDisplayText={existing?.manager_name ?? undefined}
                    getItemKey={(person) => person.id}
                    getItemLabel={(person) => person.full_name || person.email}
                    minSearchLength={2}
                    minSearchText="Type two letters of their name"
                    placeholder="Search by name…"
                    loadingText="Looking…"
                    emptyText="Type two letters of their name"
                    notFoundText="Nobody by that name"
                    error={errors.manager}
                    onItemSelect={(person) => set('manager', person.id)}
                    onClear={() => set('manager', null)}
                  />
                  <SearchableSelect<ConstructionPerson>
                    inputId="site_incharge"
                    label="Site in-charge"
                    items={people ?? []}
                    isLoading={false}
                    value={form.site_incharge ? String(form.site_incharge) : ''}
                    defaultDisplayText={existing?.site_incharge_name ?? undefined}
                    getItemKey={(person) => person.id}
                    getItemLabel={(person) => person.full_name || person.email}
                    minSearchLength={2}
                    minSearchText="Type two letters of their name"
                    placeholder="Nobody yet"
                    loadingText="Looking…"
                    emptyText="Type two letters of their name"
                    notFoundText="Nobody by that name"
                    onItemSelect={(person) => set('site_incharge', person.id)}
                    onClear={() => set('site_incharge', null)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Notes</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={form.description ?? ''}
                    onChange={(event) => set('description', event.target.value)}
                    placeholder="Scope, why it is needed, anything the approver should know."
                  />
                </div>

                <div className="space-y-1.5 border-t pt-4">
                  <Label>Attachments</Label>
                  {isEdit ? (
                    <AttachmentsPanel projectId={id} />
                  ) : (
                    <AttachmentsPanel
                      projectId={null}
                      staged={stagedFiles}
                      onStagedChange={setStagedFiles}
                    />
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                {/* A draft is the project parked, not filed: it saves and leaves
                  you where you were, and the register opens it straight back
                  into this form. */}
                <Button variant="secondary" onClick={() => save(false)} disabled={saving}>
                  <Save className="mr-1.5 h-4 w-4" />
                  {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save as draft'}
                </Button>
                {canSubmit && (
                  <Button onClick={() => save(true)} disabled={saving}>
                    <Send className="mr-1.5 h-4 w-4" />
                    {isEdit ? 'Save & send for approval' : 'Create & send for approval'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Staged while the project has no id: the sheet hands its lines back
          instead of saving them, and they go up with the project. */}
      <EstimateSheetDialog
        projectId={isEdit ? id : null}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canEdit
        staged={isEdit ? undefined : stagedLines}
        onStagedChange={(lines) => {
          setStagedLines(lines);
          // The breakdown IS the estimate once it exists -- the server
          // recomputes `estimated_cost` from the lines — so the field follows
          // the total rather than disagreeing with it.
          const total = lines.reduce(
            (sum, line) => sum + Number(line.quantity ?? 0) * Number(line.rate ?? 0),
            0,
          );
          if (lines.length > 0) set('estimated_cost', total.toFixed(2));
        }}
      />
    </>
  );
}
