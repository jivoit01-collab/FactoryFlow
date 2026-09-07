import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Plus,
  Save,
  Settings2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth';
import { confirmDialog } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  useCreateRecordTemplate,
  useDeleteRecordTemplate,
  useRecordTemplate,
  useRecordTemplates,
  useUpdateRecordTemplate,
} from '../../api/qcRecord';
import type {
  RecordTemplate,
  RecordTemplateWrite,
  ValueType,
} from '../../types/qcRecord.types';

/**
 * QC → Documents → Customize.
 *
 * The printed form held as data: header, sections, and the rows down the left
 * of the sheet. QA changes the format here when the controlled document is
 * revised, instead of waiting on a developer or Django admin.
 *
 * The one rule the backend enforces is that a form which already carries
 * readings cannot have its rows rewritten — that would silently re-label
 * values captured against the old layout. Such a form can still have its
 * header corrected, or be reissued as a new revision, and both are offered
 * here rather than left as a dead end.
 */

let nextKey = 1;
const uid = () => `row-${nextKey++}`;

interface DraftParameter {
  key: string;
  sr_no: string;
  name: string;
  frequency: string;
  specification: string;
  unit: string;
  value_type: ValueType;
  min_value: string;
  max_value: string;
  /**
   * Kept as raw text, not a parsed array: splitting on every keystroke makes
   * the trailing comma the user is halfway through typing disappear.
   */
  allowed_text: string;
  conforming_text: string;
}

interface DraftSection {
  key: string;
  title: string;
  parameters: DraftParameter[];
}

/** The whole on-screen format, held as one value so it seeds in one go. */
interface Draft {
  header: DraftHeader;
  sections: DraftSection[];
}

interface DraftHeader {
  document_code: string;
  title: string;
  organisation: string;
  revision_number: string;
  revision_date: string;
  classification: string;
  description: string;
}

const BLANK_HEADER: DraftHeader = {
  document_code: '',
  title: '',
  organisation: '',
  revision_number: '',
  revision_date: '',
  classification: '',
  description: '',
};

function blankParameter(): DraftParameter {
  return {
    key: uid(),
    sr_no: '',
    name: '',
    frequency: '',
    specification: '',
    unit: '',
    value_type: 'NUMBER',
    min_value: '',
    max_value: '',
    allowed_text: '',
    conforming_text: '',
  };
}

function blankSection(): DraftSection {
  return { key: uid(), title: '', parameters: [blankParameter()] };
}

function fromTemplate(template: RecordTemplate): Draft {
  return {
    header: {
      document_code: template.document_code,
      title: template.title,
      organisation: template.organisation,
      revision_number: template.revision_number,
      revision_date: template.revision_date ?? '',
      classification: template.classification,
      description: template.description,
    },
    sections: template.sections.map((section) => ({
      key: uid(),
      title: section.title,
      parameters: section.parameters.map((parameter) => ({
        key: uid(),
        sr_no: parameter.sr_no,
        name: parameter.name,
        frequency: parameter.frequency,
        specification: parameter.specification,
        unit: parameter.unit,
        value_type: parameter.value_type,
        min_value: parameter.min_value ?? '',
        max_value: parameter.max_value ?? '',
        allowed_text: parameter.allowed_values.join(', '),
        conforming_text: parameter.conforming_values.join(', '),
      })),
    })),
  };
}

/** 'Clear, Slightly hazy' → ['Clear', 'Slightly hazy']. */
function splitList(text: string): string[] {
  return text
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** 'QA-FRM-14' → 'QA-FRM-14-R2'; 'QA-FRM-14-R2' → 'QA-FRM-14-R3'. */
function nextRevisionCode(code: string): string {
  const match = /^(.*)-R(\d+)$/.exec(code);
  if (match) return `${match[1]}-R${Number(match[2]) + 1}`;
  return code ? `${code}-R2` : '';
}

/** '01' → '02'. Left alone when the revision is not a plain number. */
function nextRevisionNumber(revision: string): string {
  const trimmed = revision.trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  return String(Number(trimmed) + 1).padStart(trimmed.length, '0');
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The message the server actually gave, field errors included. */
function readApiMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiError;
  const first = apiError?.errors && Object.values(apiError.errors).flat()[0];
  return String(first || apiError?.detail || apiError?.message || fallback);
}

/**
 * Loads the form being customized and hands it to the editor below.
 *
 * The editor is keyed on the form's id, so landing on a different form
 * remounts it with that form's rows rather than reconciling one draft into
 * another. A refetch of the same form leaves the draft on screen alone.
 */
export default function RecordFormatPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canManage = hasAnyPermission([QC_PERMISSIONS.QC_RECORD.APPROVE]);

  const id = templateId ? Number(templateId) : null;
  const isNew = id === null;

  const { data: template, isLoading } = useRecordTemplate(id);
  // The list carries `record_count`; the detail endpoint does not. It is
  // already cached by the Documents screen the user came from.
  const { data: templates = [] } = useRecordTemplates();
  const filledCount = templates.find((item) => item.id === id)?.record_count ?? 0;

  if (!canManage) {
    return (
      <p className="py-20 text-center text-muted-foreground">
        You do not have permission to change record formats.
      </p>
    );
  }

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isNew && !template) {
    return (
      <div className="space-y-4 py-20 text-center">
        <p className="text-muted-foreground">Form not found.</p>
        <Button variant="outline" onClick={() => navigate('/qc/documents')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Documents
        </Button>
      </div>
    );
  }

  return (
    <FormatEditor
      key={template?.id ?? 'new'}
      templateId={id}
      template={template ?? null}
      filledCount={filledCount}
    />
  );
}

interface FormatEditorProps {
  templateId: number | null;
  template: RecordTemplate | null;
  /** How many sheets exist against this form; more than none locks its rows. */
  filledCount: number;
}

function FormatEditor({ templateId: id, template, filledCount }: FormatEditorProps) {
  const navigate = useNavigate();
  const isNew = id === null;

  const createTemplate = useCreateRecordTemplate();
  const updateTemplate = useUpdateRecordTemplate();
  const deleteTemplate = useDeleteRecordTemplate();

  const [draft, setDraft] = useState<Draft>(() => {
    if (!template) return { header: BLANK_HEADER, sections: [blankSection()] };
    const seeded = fromTemplate(template);
    // A form saved with no sections would otherwise open with nothing to type into.
    return seeded.sections.length > 0
      ? seeded
      : { ...seeded, sections: [blankSection()] };
  });
  const { header, sections } = draft;

  const setHeader = (next: DraftHeader) =>
    setDraft((current) => ({ ...current, header: next }));
  const setSections = (update: (current: DraftSection[]) => DraftSection[]) =>
    setDraft((current) => ({ ...current, sections: update(current.sections) }));

  const [problems, setProblems] = useState<string[]>([]);
  /** Set when the server refused a row rewrite, to offer the ways forward. */
  const [rowsRefused, setRowsRefused] = useState(false);

  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [revisionCode, setRevisionCode] = useState('');
  const [revisionNumber, setRevisionNumber] = useState('');
  const [revisionDate, setRevisionDate] = useState(todayIso());
  const [retireCurrent, setRetireCurrent] = useState(true);

  const isSaving =
    createTemplate.isPending || updateTemplate.isPending || deleteTemplate.isPending;

  // ---- draft edits ----

  const patchSection = (sectionKey: string, patch: Partial<DraftSection>) =>
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey ? { ...section, ...patch } : section,
      ),
    );

  const patchParameter = (
    sectionKey: string,
    parameterKey: string,
    patch: Partial<DraftParameter>,
  ) =>
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey
          ? {
              ...section,
              parameters: section.parameters.map((parameter) =>
                parameter.key === parameterKey ? { ...parameter, ...patch } : parameter,
              ),
            }
          : section,
      ),
    );

  const addParameter = (sectionKey: string) =>
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey
          ? { ...section, parameters: [...section.parameters, blankParameter()] }
          : section,
      ),
    );

  const removeParameter = (sectionKey: string, parameterKey: string) =>
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey
          ? {
              ...section,
              parameters: section.parameters.filter(
                (parameter) => parameter.key !== parameterKey,
              ),
            }
          : section,
      ),
    );

  const moveParameter = (sectionKey: string, index: number, delta: number) =>
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey
          ? { ...section, parameters: move(section.parameters, index, delta) }
          : section,
      ),
    );

  const removeSection = async (sectionKey: string) => {
    const section = sections.find((entry) => entry.key === sectionKey);
    const confirmed = await confirmDialog({
      title: 'Remove this section?',
      description: `"${section?.title || 'Untitled section'}" and its ${
        section?.parameters.length ?? 0
      } row(s) will be dropped from the format.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    setSections((current) => current.filter((entry) => entry.key !== sectionKey));
  };

  // ---- saving ----

  /** Validate the draft and shape it for the API, or report what is missing. */
  const buildPayload = (): RecordTemplateWrite | null => {
    const found: string[] = [];
    const code = header.document_code.trim().toUpperCase();

    if (!code) found.push('A document code is required.');
    if (!header.title.trim()) found.push('A title is required.');

    const liveSections = sections.filter(
      (section) => section.title.trim() || section.parameters.some((p) => p.name.trim()),
    );
    if (liveSections.length === 0) found.push('Add at least one section with one row.');

    liveSections.forEach((section, index) => {
      const label = section.title.trim() || `Section ${index + 1}`;
      if (!section.title.trim()) found.push(`Section ${index + 1} needs a title.`);
      const rows = section.parameters.filter((parameter) => parameter.name.trim());
      if (rows.length === 0) found.push(`"${label}" has no rows.`);
      rows.forEach((parameter) => {
        if (parameter.value_type !== 'NUMBER') return;
        const min = parameter.min_value.trim();
        const max = parameter.max_value.trim();
        if (min && Number.isNaN(Number(min))) {
          found.push(`"${parameter.name}": min must be a number.`);
        }
        if (max && Number.isNaN(Number(max))) {
          found.push(`"${parameter.name}": max must be a number.`);
        }
        if (min && max && !Number.isNaN(Number(min)) && !Number.isNaN(Number(max))) {
          if (Number(min) > Number(max)) {
            found.push(`"${parameter.name}": min is above max.`);
          }
        }
      });
    });

    if (found.length > 0) {
      setProblems(found);
      return null;
    }
    setProblems([]);

    return {
      document_code: code,
      title: header.title.trim(),
      organisation: header.organisation.trim(),
      revision_number: header.revision_number.trim(),
      revision_date: header.revision_date || null,
      classification: header.classification.trim(),
      description: header.description.trim(),
      sections: liveSections.map((section, sectionIndex) => ({
        sequence: sectionIndex,
        title: section.title.trim(),
        parameters: section.parameters
          .filter((parameter) => parameter.name.trim())
          .map((parameter, rowIndex) => {
            const isNumber = parameter.value_type === 'NUMBER';
            const isChoice = parameter.value_type === 'CHOICE';
            return {
              sequence: rowIndex,
              sr_no: parameter.sr_no.trim() || String(rowIndex + 1),
              name: parameter.name.trim(),
              frequency: parameter.frequency.trim(),
              specification: parameter.specification.trim(),
              unit: parameter.unit.trim(),
              value_type: parameter.value_type,
              // Bounds only mean anything on a numeric row, and the column is
              // a nullable decimal — '' would be rejected outright.
              min_value: isNumber ? parameter.min_value.trim() || null : null,
              max_value: isNumber ? parameter.max_value.trim() || null : null,
              allowed_values: isChoice ? splitList(parameter.allowed_text) : [],
              conforming_values: isChoice ? splitList(parameter.conforming_text) : [],
            };
          }),
      })),
    };
  };

  const headerOnly = (payload: RecordTemplateWrite): Partial<RecordTemplateWrite> => {
    const rest: Partial<RecordTemplateWrite> = { ...payload };
    delete rest.sections;
    return rest;
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;
    try {
      if (isNew) {
        const created = await createTemplate.mutateAsync(payload);
        toast.success('Format created.');
        navigate(`/qc/documents/forms/${created.id}`, { replace: true });
      } else {
        await updateTemplate.mutateAsync({ id, data: payload });
        setRowsRefused(false);
        toast.success('Format saved.');
      }
    } catch (error) {
      const message = readApiMessage(error, 'Could not save the format.');
      setProblems([message]);
      setRowsRefused(Boolean((error as ApiError)?.errors?.sections));
    }
  };

  /** Correct the printed header of a form whose rows are already in use. */
  const handleSaveHeaderOnly = async () => {
    const payload = buildPayload();
    if (!payload || isNew) return;
    try {
      await updateTemplate.mutateAsync({ id, data: headerOnly(payload) });
      setRowsRefused(false);
      toast.success('Header saved. The rows were left as they are.');
    } catch (error) {
      setProblems([readApiMessage(error, 'Could not save the header.')]);
    }
  };

  const openRevisionDialog = () => {
    if (!buildPayload()) return;
    setRevisionCode(nextRevisionCode(header.document_code.trim().toUpperCase()));
    setRevisionNumber(nextRevisionNumber(header.revision_number));
    setRevisionDate(todayIso());
    setRetireCurrent(true);
    setIsRevisionOpen(true);
  };

  const handleSaveRevision = async () => {
    const payload = buildPayload();
    if (!payload) return;
    const code = revisionCode.trim().toUpperCase();
    if (!code) {
      toast.error('The new revision needs its own document code.');
      return;
    }
    try {
      // Created first, retired second: if the create is rejected the form in
      // use is still there.
      const created = await createTemplate.mutateAsync({
        ...payload,
        document_code: code,
        revision_number: revisionNumber.trim(),
        revision_date: revisionDate || null,
      });
      if (retireCurrent && id) {
        await deleteTemplate.mutateAsync(id);
      }
      setIsRevisionOpen(false);
      setRowsRefused(false);
      toast.success(
        retireCurrent
          ? 'New revision created and the old form retired.'
          : 'New revision created.',
      );
      navigate(`/qc/documents/forms/${created.id}`, { replace: true });
    } catch (error) {
      toast.error(readApiMessage(error, 'Could not create the revision.'));
    }
  };

  const handleRetire = async () => {
    if (isNew) return;
    const confirmed = await confirmDialog({
      title: 'Retire this form?',
      description:
        'It stops being offered for new sheets. Sheets already filled against ' +
        'it are kept and stay readable.',
      confirmLabel: 'Retire',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success('Form retired.');
      navigate('/qc/documents');
    } catch (error) {
      toast.error(readApiMessage(error, 'Could not retire the form.'));
    }
  };

  // ---- render ----

  const rowCount = sections.reduce(
    (total, section) => total + section.parameters.filter((p) => p.name.trim()).length,
    0,
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/qc/documents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <Settings2 className="h-8 w-8" />
              {isNew ? 'New report format' : 'Customize format'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isNew
                ? 'Lay out a printed QC form: its header, its sections, and the rows down the left.'
                : `${header.title || 'Untitled'} · ${rowCount} row${rowCount === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isNew && (
            <>
              <Button variant="outline" onClick={openRevisionDialog} disabled={isSaving}>
                <Copy className="mr-2 h-4 w-4" />
                Save as new revision
              </Button>
              <Button variant="outline" onClick={handleRetire} disabled={isSaving}>
                <Trash2 className="mr-2 h-4 w-4" />
                Retire
              </Button>
            </>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isNew ? 'Create format' : 'Save format'}
          </Button>
        </div>
      </div>

      {/* A form in use cannot have its rows rewritten — say so before the work
          is done, not after the save is rejected. */}
      {!isNew && filledCount > 0 && (
        <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">
              {filledCount} sheet{filledCount === 1 ? ' has' : 's have'} been filled against
              this form.
            </p>
            <p>
              Once readings exist, the rows are locked — changing them would re-label
              values captured under the old layout. The header can still be corrected;
              to change the rows, use{' '}
              <span className="font-medium">Save as new revision</span>.
            </p>
          </div>
        </div>
      )}

      {problems.length > 0 && (
        <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          <ul className="list-inside list-disc space-y-1">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
          {rowsRefused && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={handleSaveHeaderOnly}>
                Save the header only
              </Button>
              <Button size="sm" variant="outline" onClick={openRevisionDialog}>
                Save as new revision
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ---- printed header ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document header</CardTitle>
          <p className="text-xs text-muted-foreground">
            Printed at the top of every sheet filled from this form.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="format-code">Document code *</Label>
            <Input
              id="format-code"
              value={header.document_code}
              maxLength={64}
              placeholder="QA-FRM-14-00-05-05"
              onChange={(event) =>
                setHeader({ ...header, document_code: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
            <Label htmlFor="format-title">Title *</Label>
            <Input
              id="format-title"
              value={header.title}
              maxLength={255}
              placeholder="NMW DAILY WATER MONITORING RECORD"
              onChange={(event) => setHeader({ ...header, title: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="format-org">Organisation</Label>
            <Input
              id="format-org"
              value={header.organisation}
              maxLength={255}
              onChange={(event) =>
                setHeader({ ...header, organisation: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="format-rev">Revision no.</Label>
            <Input
              id="format-rev"
              value={header.revision_number}
              maxLength={8}
              placeholder="01"
              onChange={(event) =>
                setHeader({ ...header, revision_number: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="format-rev-date">Revision date</Label>
            <Input
              id="format-rev-date"
              type="date"
              value={header.revision_date}
              onChange={(event) =>
                setHeader({ ...header, revision_date: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="format-classification">Classification</Label>
            <Input
              id="format-classification"
              value={header.classification}
              maxLength={120}
              placeholder="Controlled copy"
              onChange={(event) =>
                setHeader({ ...header, classification: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="format-description">Description</Label>
            <Textarea
              id="format-description"
              rows={2}
              value={header.description}
              onChange={(event) =>
                setHeader({ ...header, description: event.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ---- sections and rows ---- */}
      {sections.map((section, sectionIndex) => (
        <Card key={section.key}>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full space-y-1.5 sm:max-w-md">
                <Label htmlFor={`section-${section.key}`}>
                  Section {sectionIndex + 1} title
                </Label>
                <Input
                  id={`section-${section.key}`}
                  value={section.title}
                  maxLength={255}
                  placeholder="Borewell Water"
                  onChange={(event) =>
                    patchSection(section.key, { title: event.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Move section up"
                  disabled={sectionIndex === 0}
                  onClick={() => setSections((current) => move(current, sectionIndex, -1))}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Move section down"
                  disabled={sectionIndex === sections.length - 1}
                  onClick={() => setSections((current) => move(current, sectionIndex, 1))}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Remove section"
                  onClick={() => removeSection(section.key)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {section.parameters.map((parameter, rowIndex) => (
              <div key={parameter.key} className="space-y-3 rounded-lg border p-3">
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Sr.No.</Label>
                    <Input
                      value={parameter.sr_no}
                      maxLength={8}
                      placeholder={String(rowIndex + 1)}
                      onChange={(event) =>
                        patchParameter(section.key, parameter.key, {
                          sr_no: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-5">
                    <Label className="text-xs">Parameter *</Label>
                    <Input
                      value={parameter.name}
                      maxLength={120}
                      placeholder="pH"
                      onChange={(event) =>
                        patchParameter(section.key, parameter.key, {
                          name: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Unit</Label>
                    <Input
                      value={parameter.unit}
                      maxLength={20}
                      placeholder="NTU"
                      onChange={(event) =>
                        patchParameter(section.key, parameter.key, {
                          unit: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-end justify-end gap-1 sm:col-span-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Move row up"
                      disabled={rowIndex === 0}
                      onClick={() => moveParameter(section.key, rowIndex, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Move row down"
                      disabled={rowIndex === section.parameters.length - 1}
                      onClick={() => moveParameter(section.key, rowIndex, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Remove row"
                      onClick={() => removeParameter(section.key, parameter.key)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="space-y-1.5 sm:col-span-5">
                    <Label className="text-xs">Frequency (as printed)</Label>
                    <Input
                      value={parameter.frequency}
                      maxLength={160}
                      placeholder="Every startup / every 2 hours"
                      onChange={(event) =>
                        patchParameter(section.key, parameter.key, {
                          frequency: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label className="text-xs">Specification (as printed)</Label>
                    <Input
                      value={parameter.specification}
                      maxLength={160}
                      placeholder="6.5 - 8.5"
                      onChange={(event) =>
                        patchParameter(section.key, parameter.key, {
                          specification: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label className="text-xs">Entry type</Label>
                    <NativeSelect
                      value={parameter.value_type}
                      onChange={(event) =>
                        patchParameter(section.key, parameter.key, {
                          value_type: event.target.value as ValueType,
                        })
                      }
                    >
                      <SelectOption value="NUMBER">Number</SelectOption>
                      <SelectOption value="TEXT">Free text</SelectOption>
                      <SelectOption value="CHOICE">Choice</SelectOption>
                    </NativeSelect>
                  </div>
                </div>

                {/* Only the bounds/choices that the chosen entry type actually
                    uses — an unused field here reads as a spec that is not
                    being applied. */}
                {parameter.value_type === 'NUMBER' && (
                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="space-y-1.5 sm:col-span-3">
                      <Label className="text-xs">Min</Label>
                      <Input
                        value={parameter.min_value}
                        inputMode="decimal"
                        placeholder="6.5"
                        onChange={(event) =>
                          patchParameter(section.key, parameter.key, {
                            min_value: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-3">
                      <Label className="text-xs">Max</Label>
                      <Input
                        value={parameter.max_value}
                        inputMode="decimal"
                        placeholder="8.5"
                        onChange={(event) =>
                          patchParameter(section.key, parameter.key, {
                            max_value: event.target.value,
                          })
                        }
                      />
                    </div>
                    <p className="self-end pb-2 text-xs text-muted-foreground sm:col-span-6">
                      A reading outside these bounds is flagged out of spec. Leave both
                      blank to record the number without judging it.
                    </p>
                  </div>
                )}

                {parameter.value_type === 'CHOICE' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Options offered (comma separated)</Label>
                      <Input
                        value={parameter.allowed_text}
                        placeholder="No off Odour, Off Odour"
                        onChange={(event) =>
                          patchParameter(section.key, parameter.key, {
                            allowed_text: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Which of those pass</Label>
                      <Input
                        value={parameter.conforming_text}
                        placeholder="No off Odour"
                        onChange={(event) =>
                          patchParameter(section.key, parameter.key, {
                            conforming_text: event.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Anything else observed counts as out of spec. Leave blank to
                        record the observation without judging it.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={() => addParameter(section.key)}>
              <Plus className="mr-2 h-4 w-4" />
              Add row
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={() => setSections((current) => [...current, blankSection()])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add section
      </Button>

      {/* ---- reissue as a new revision ---- */}
      <Dialog open={isRevisionOpen} onOpenChange={setIsRevisionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as new revision</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The format on screen is saved as a separate form, leaving sheets already
              filled against the old one exactly as they were. A code can only belong to
              one live form, so the new revision needs its own.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="revision-code">New document code *</Label>
              <Input
                id="revision-code"
                value={revisionCode}
                maxLength={64}
                onChange={(event) => setRevisionCode(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="revision-number">Revision no.</Label>
                <Input
                  id="revision-number"
                  value={revisionNumber}
                  maxLength={8}
                  onChange={(event) => setRevisionNumber(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="revision-date">Revision date</Label>
                <Input
                  id="revision-date"
                  type="date"
                  value={revisionDate}
                  onChange={(event) => setRevisionDate(event.target.value)}
                />
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={retireCurrent} onCheckedChange={setRetireCurrent} />
              <span>
                Retire the current form, so new sheets can only be opened on this
                revision. Sheets already filled stay readable.
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevisionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRevision} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
