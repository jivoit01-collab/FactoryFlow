import {
  AlertTriangle,
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Lock,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { type DragEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth';
import { confirmDialog } from '@/shared/components';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  useCreateRecordTemplate,
  useDeleteRecordTemplate,
  useImportRecordSheet,
  useRecordTemplate,
  useUpdateRecordTemplate,
} from '../../api/qcRecord';
import SheetViewport from '../../components/sheet/SheetViewport';
import type {
  CellField,
  CellFields,
  CellFieldType,
  RecordTemplate,
  RecordTemplateWrite,
  SheetImportResult,
  SheetLayout,
} from '../../types/qcRecord.types';
import {
  BOUND_FIELD_TYPES,
  buildSheetGrid,
  describeRefs,
  FIELD_TYPE_LABEL,
  FIELD_TYPE_TINT,
  refsInRect,
  VALUE_FIELD_TYPES,
} from '../../utils/sheetLayout';

interface DraftHeader {
  document_code: string;
  title: string;
  organisation: string;
  revision_number: string;
  revision_date: string;
  classification: string;
  description: string;
}

interface DraftSheet {
  layout: SheetLayout;
  /** Present only for a freshly uploaded layout, which still has to be saved. */
  layoutToken: string | null;
  sourceFileName: string;
  sheets: string[];
  sheet: string;
}

const ALL_TYPES: CellFieldType[] = [...VALUE_FIELD_TYPES, ...BOUND_FIELD_TYPES];

/** The message the server actually gave, field errors included. */
function readApiMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiError;
  const first = apiError?.errors && Object.values(apiError.errors).flat()[0];
  return String(apiError?.detail || first || apiError?.message || fallback);
}

function headerFromTemplate(template: RecordTemplate): DraftHeader {
  return {
    document_code: template.document_code,
    title: template.title,
    organisation: template.organisation,
    revision_number: template.revision_number,
    revision_date: template.revision_date ?? '',
    classification: template.classification,
    description: template.description,
  };
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

/**
 * QC → Documents → Upload Excel format.
 *
 * The QA manager uploads the Excel sheet they already keep; it is drawn here
 * exactly as it looks, with a first guess at which cells get filled in. They
 * correct that guess by selecting cells and setting what each holds, set the
 * document code and revision, and save. Every day's record is then filled on
 * the same drawing.
 */
export default function RecordSheetFormatPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canManage = hasAnyPermission([QC_PERMISSIONS.QC_RECORD.APPROVE]);
  const id = templateId ? Number(templateId) : null;
  const { data: template, isLoading } = useRecordTemplate(id);

  if (!canManage) {
    return (
      <p className="py-20 text-center text-muted-foreground">
        You do not have permission to change record formats.
      </p>
    );
  }

  if (id !== null && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (id !== null && (!template || template.kind !== 'SHEET' || !template.layout)) {
    return (
      <div className="space-y-4 py-20 text-center">
        <p className="text-muted-foreground">Sheet format not found.</p>
        <Button variant="outline" onClick={() => navigate('/qc/documents')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Documents
        </Button>
      </div>
    );
  }

  // Keyed so landing on another form remounts with that form's draft.
  return <SheetFormatEditor key={template?.id ?? 'new'} template={template ?? null} />;
}

function SheetFormatEditor({ template }: { template: RecordTemplate | null }) {
  const navigate = useNavigate();
  const isNew = template === null;
  const locked = !!template?.is_locked;

  const importSheet = useImportRecordSheet();
  const createTemplate = useCreateRecordTemplate();
  const updateTemplate = useUpdateRecordTemplate();
  const deleteTemplate = useDeleteRecordTemplate();
  const isSaving = createTemplate.isPending || updateTemplate.isPending || deleteTemplate.isPending;

  const [header, setHeader] = useState<DraftHeader>(() =>
    template ? headerFromTemplate(template) : BLANK_HEADER,
  );
  const [sheet, setSheet] = useState<DraftSheet | null>(() =>
    template?.layout
      ? {
          layout: template.layout,
          layoutToken: null,
          sourceFileName: template.source_file_name,
          sheets: [],
          sheet: template.layout.sheet,
        }
      : null,
  );
  const [fields, setFields] = useState<CellFields>(() => template?.cell_fields ?? {});
  const [file, setFile] = useState<File | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchor = useRef<string | null>(null);
  const dragging = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const grid = useMemo(
    () => (sheet ? buildSheetGrid(sheet.layout, fields) : null),
    [sheet, fields],
  );

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  // ---- uploading ----

  const applyImport = (result: SheetImportResult, keepHeader: boolean) => {
    setSheet({
      layout: result.layout,
      layoutToken: result.layout_token,
      sourceFileName: result.source_file_name,
      sheets: result.sheets,
      sheet: result.sheet,
    });
    setFields(result.cell_fields);
    setSelected(new Set());
    anchor.current = null;
    const guess = result.header;
    setHeader((current) => {
      // Only fill what is still empty: a manager who already typed the code
      // and then picked another sheet keeps what they typed.
      const pick = (mine: string, found: string | null) =>
        keepHeader && mine ? mine : (found ?? mine);
      return {
        ...current,
        document_code: pick(current.document_code, guess.document_code),
        title: pick(current.title, guess.title),
        organisation: pick(current.organisation, guess.organisation),
        revision_number: pick(current.revision_number, guess.revision_number),
        revision_date: pick(current.revision_date, guess.revision_date),
        classification: pick(current.classification, guess.classification),
      };
    });
  };

  const readFile = async (chosen: File, sheetName?: string) => {
    if (!/\.(xlsx|xlsm)$/i.test(chosen.name)) {
      toast.error('Upload the form as an Excel workbook (.xlsx).');
      return;
    }
    try {
      const result = await importSheet.mutateAsync({ file: chosen, sheet: sheetName });
      setFile(chosen);
      applyImport(result, !isNew || !!sheetName);
      setProblems([]);
    } catch (error) {
      toast.error(readApiMessage(error, 'Could not read that Excel file.'));
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) void readFile(dropped);
  };

  // ---- selecting cells ----

  const handleCellMouseDown = (ref: string, event: MouseEvent) => {
    if (!grid) return;
    event.preventDefault();
    if (event.shiftKey && anchor.current) {
      setSelected(new Set(refsInRect(grid, anchor.current, ref)));
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(ref)) next.delete(ref);
        else next.add(ref);
        return next;
      });
      anchor.current = ref;
      return;
    }
    anchor.current = ref;
    dragging.current = true;
    setSelected(new Set([ref]));
  };

  const handleCellMouseEnter = (ref: string) => {
    if (!grid || !dragging.current || !anchor.current) return;
    setSelected(new Set(refsInRect(grid, anchor.current, ref)));
  };

  // ---- editing fields ----

  const selectedRefs = useMemo(() => [...selected].sort(), [selected]);
  const printedRefs = selectedRefs.filter((ref) => sheet?.layout.cells[ref]?.v);
  const blankRefs = selectedRefs.filter((ref) => !sheet?.layout.cells[ref]?.v);

  const setType = (type: CellFieldType | '') => {
    setFields((current) => {
      const next = { ...current };
      if (type === 'REMARKS') {
        // One remarks box per sheet: the top-left of the selection gets it.
        Object.keys(next).forEach((ref) => {
          if (next[ref].type === 'REMARKS') delete next[ref];
        });
        const target = blankRefs[0];
        if (target) next[target] = { type, label: current[target]?.label };
        return next;
      }
      blankRefs.forEach((ref) => {
        if (!type) {
          delete next[ref];
          return;
        }
        const previous = current[ref];
        next[ref] =
          previous?.type === type
            ? previous
            : { type, ...(previous?.label ? { label: previous.label } : {}) };
      });
      return next;
    });
  };

  const patchSelected = (patch: Partial<CellField>) => {
    setFields((current) => {
      const next = { ...current };
      blankRefs.forEach((ref) => {
        if (next[ref]) next[ref] = { ...next[ref], ...patch };
      });
      return next;
    });
  };

  const counts = useMemo(() => {
    const tally = new Map<CellFieldType, number>();
    Object.values(fields).forEach((field) =>
      tally.set(field.type, (tally.get(field.type) ?? 0) + 1),
    );
    return tally;
  }, [fields]);
  const valueCount = VALUE_FIELD_TYPES.reduce((sum, type) => sum + (counts.get(type) ?? 0), 0);

  // ---- saving ----

  const handleSave = async () => {
    const found: string[] = [];
    const code = header.document_code.trim().toUpperCase();
    if (!sheet) found.push('Upload the Excel form first.');
    if (!code) found.push('A document code is required.');
    if (!header.title.trim()) found.push('A title is required.');
    if (sheet && valueCount === 0) found.push('Mark at least one cell to be filled in.');
    if (found.length > 0) {
      setProblems(found);
      return;
    }
    setProblems([]);

    const payload: RecordTemplateWrite = {
      document_code: code,
      title: header.title.trim(),
      organisation: header.organisation.trim(),
      revision_number: header.revision_number.trim(),
      revision_date: header.revision_date || null,
      classification: header.classification.trim(),
      description: header.description.trim(),
    };
    if (!locked) payload.cell_fields = fields;
    if (sheet?.layoutToken) {
      payload.layout = sheet.layout;
      payload.layout_token = sheet.layoutToken;
      payload.source_file_name = sheet.sourceFileName;
    }

    try {
      if (isNew) {
        const created = await createTemplate.mutateAsync(payload);
        toast.success('Format saved. It can now be picked for a new record.');
        navigate(`/qc/documents/sheets/${created.id}`, { replace: true });
      } else {
        await updateTemplate.mutateAsync({ id: template.id, data: payload });
        setSheet((current) => (current ? { ...current, layoutToken: null } : current));
        toast.success(locked ? 'Header saved.' : 'Format saved.');
      }
    } catch (error) {
      setProblems([readApiMessage(error, 'Could not save the format.')]);
    }
  };

  const handleRetire = async () => {
    if (!template) return;
    const confirmed = await confirmDialog({
      title: 'Retire this form?',
      description:
        'No new sheets can be opened on it. Sheets already filled are kept, and its document code becomes free for a new revision.',
      confirmLabel: 'Retire',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteTemplate.mutateAsync(template.id);
      toast.success('Form retired.');
      navigate('/qc/documents');
    } catch (error) {
      toast.error(readApiMessage(error, 'Could not retire the form.'));
    }
  };

  const setHeaderField = (key: keyof DraftHeader) => (value: string) =>
    setHeader((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-4 pb-6">
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          event.target.value = '';
          if (chosen) void readFile(chosen);
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/qc/documents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <FileSpreadsheet className="h-6 w-6" />
              {isNew ? 'Upload Excel format' : header.title || 'Sheet format'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sheet
                ? `${sheet.sourceFileName || 'Uploaded sheet'} · sheet "${sheet.sheet.trim()}"`
                : 'The form is drawn exactly as the Excel sheet looks.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sheet && !locked && (
            <Button
              variant="outline"
              onClick={() => fileInput.current?.click()}
              disabled={importSheet.isPending || isSaving}
            >
              {importSheet.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Replace Excel file
            </Button>
          )}
          {!isNew && (
            <Button variant="outline" onClick={handleRetire} disabled={isSaving}>
              <Trash2 className="mr-2 h-4 w-4" />
              Retire
            </Button>
          )}
          {sheet && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {locked ? 'Save header' : 'Save format'}
            </Button>
          )}
        </div>
      </div>

      {problems.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Not saved
          </div>
          <ul className="mt-1 list-disc pl-6">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      {locked && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Records have already been filled on this form, so its sheet and fillable cells are fixed
            — changing them would re-label readings already taken. The document details can still be
            corrected. For a revised sheet, retire this form and upload the new Excel.
          </p>
        </div>
      )}

      {!sheet ? (
        <Card
          className="border-dashed"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Upload the Excel form</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                The print area of the sheet becomes the form: every border, merge and font as in
                Excel. The document code, revision and title are read off the sheet where they can
                be found, and you can correct them before saving.
              </p>
            </div>
            <Button onClick={() => fileInput.current?.click()} disabled={importSheet.isPending}>
              {importSheet.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Choose .xlsx file
            </Button>
            <p className="text-xs text-muted-foreground">or drop it here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sheet</CardTitle>
              <p className="text-xs text-muted-foreground">
                {locked
                  ? 'Hover a cell to see what it holds.'
                  : 'Click a cell, drag across cells, or Shift-click to select a block; Ctrl-click adds single cells. Then set what the selected cells hold on the right.'}
              </p>
            </CardHeader>
            <CardContent>
              <SheetViewport
                layout={sheet.layout}
                fields={fields}
                mode="design"
                selected={locked ? undefined : selected}
                onCellMouseDown={locked ? undefined : handleCellMouseDown}
                onCellMouseEnter={locked ? undefined : handleCellMouseEnter}
              />
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {ALL_TYPES.filter((type) => counts.get(type)).map((type) => (
                  <span key={type} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded-sm border"
                      style={{ background: FIELD_TYPE_TINT[type] }}
                    />
                    {FIELD_TYPE_LABEL[type]} ({counts.get(type)})
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {sheet.sheets.length > 1 && file && (
              <Card>
                <CardContent className="space-y-1.5 pt-4">
                  <Label htmlFor="sheet-name">Sheet in the workbook</Label>
                  <NativeSelect
                    id="sheet-name"
                    value={sheet.sheet}
                    onChange={(event) => void readFile(file, event.target.value)}
                    disabled={importSheet.isPending}
                  >
                    {sheet.sheets.map((name) => (
                      <SelectOption key={name} value={name}>
                        {name}
                      </SelectOption>
                    ))}
                  </NativeSelect>
                </CardContent>
              </Card>
            )}

            {!locked && (
              <SelectionPanel
                // Remounted when the selection or its types change, so the
                // option / limit boxes always start from what the cells hold.
                key={`${selectedRefs.join(',')}|${blankRefs.map((ref) => fields[ref]?.type ?? '').join(',')}`}
                selectedRefs={selectedRefs}
                printedCount={printedRefs.length}
                fields={fields}
                blankRefs={blankRefs}
                onType={setType}
                onPatch={patchSelected}
              />
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <HeaderInput
                  id="sheet-code"
                  label="Document code"
                  value={header.document_code}
                  onChange={setHeaderField('document_code')}
                  placeholder="QA-FRM-14-01-05-02"
                  mono
                />
                <HeaderInput
                  id="sheet-title"
                  label="Title"
                  value={header.title}
                  onChange={setHeaderField('title')}
                />
                <HeaderInput
                  id="sheet-org"
                  label="Organisation"
                  value={header.organisation}
                  onChange={setHeaderField('organisation')}
                />
                <div className="grid grid-cols-2 gap-2">
                  <HeaderInput
                    id="sheet-rev"
                    label="Revision no."
                    value={header.revision_number}
                    onChange={setHeaderField('revision_number')}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="sheet-rev-date">Revision date</Label>
                    <Input
                      id="sheet-rev-date"
                      type="date"
                      value={header.revision_date}
                      onChange={(event) => setHeaderField('revision_date')(event.target.value)}
                    />
                  </div>
                </div>
                <HeaderInput
                  id="sheet-class"
                  label="Classification"
                  value={header.classification}
                  onChange={setHeaderField('classification')}
                  placeholder="Business Confidential"
                />
                <div className="space-y-1.5">
                  <Label htmlFor="sheet-desc">Description</Label>
                  <Textarea
                    id="sheet-desc"
                    rows={2}
                    value={header.description}
                    onChange={(event) => setHeaderField('description')(event.target.value)}
                    placeholder="Filled daily by the QA chemist on the oil lines"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        className={mono ? 'font-mono' : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** 'Absent, Present' -> ['Absent', 'Present']. */
function splitList(text: string): string[] {
  return text
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

interface SelectionPanelProps {
  selectedRefs: string[];
  printedCount: number;
  blankRefs: string[];
  fields: CellFields;
  onType: (type: CellFieldType | '') => void;
  onPatch: (patch: Partial<CellField>) => void;
}

/**
 * What the selected cells hold. Remounted per selection (keyed by it), so
 * the comma-separated option text is typed freely without the trailing comma
 * vanishing on each keystroke.
 */
function SelectionPanel({
  selectedRefs,
  printedCount,
  blankRefs,
  fields,
  onType,
  onPatch,
}: SelectionPanelProps) {
  const selectedFields = blankRefs.map((ref) => fields[ref]);
  const types = new Set(selectedFields.map((field) => field?.type ?? ''));
  const commonType = types.size === 1 ? [...types][0] : null;
  const first = selectedFields[0];
  const same = <K extends keyof CellField>(key: K): string => {
    const valuesOf = new Set(selectedFields.map((field) => JSON.stringify(field?.[key] ?? null)));
    if (valuesOf.size !== 1) return '';
    const value = first?.[key];
    return Array.isArray(value) ? value.join(', ') : ((value as string | null | undefined) ?? '');
  };

  const [minText, setMinText] = useState(same('min'));
  const [maxText, setMaxText] = useState(same('max'));
  const [optionsText, setOptionsText] = useState(same('options'));
  const [okText, setOkText] = useState(same('ok'));
  const [labelText, setLabelText] = useState(first?.label ?? '');

  if (selectedRefs.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 pt-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No cells selected</p>
          <p>
            Tinted cells are filled in on each record. The guess made from the sheet covers the
            usual cases — the blank boxes of the reading columns, and the cells beside labels such
            as Date:, Remarks:, Q.A Chemist and Q.A.M — so check it, and select any cell to change
            it.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          Selected cells
          <Badge variant="secondary" className="font-mono">
            {describeRefs(selectedRefs)}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {selectedRefs.length} cell{selectedRefs.length === 1 ? '' : 's'}
          {printedCount > 0 &&
            ` · ${printedCount} with printed text stay${printedCount === 1 ? 's' : ''} as label${printedCount === 1 ? '' : 's'}`}
        </p>
      </CardHeader>
      {blankRefs.length > 0 && (
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cell-type">Filled in as</Label>
            <NativeSelect
              id="cell-type"
              value={commonType ?? '__mixed'}
              onChange={(event) => onType(event.target.value as CellFieldType | '')}
            >
              {commonType === null && (
                <SelectOption value="__mixed" disabled>
                  (mixed)
                </SelectOption>
              )}
              <SelectOption value="">Not filled in</SelectOption>
              <optgroup label="Typed in each record">
                {VALUE_FIELD_TYPES.map((type) => (
                  <SelectOption key={type} value={type}>
                    {FIELD_TYPE_LABEL[type]}
                  </SelectOption>
                ))}
              </optgroup>
              <optgroup label="Taken from the record">
                {BOUND_FIELD_TYPES.map((type) => (
                  <SelectOption key={type} value={type}>
                    {FIELD_TYPE_LABEL[type]}
                  </SelectOption>
                ))}
              </optgroup>
            </NativeSelect>
          </div>

          {commonType === 'NUMBER' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="cell-min">Min</Label>
                <Input
                  id="cell-min"
                  inputMode="decimal"
                  value={minText}
                  onChange={(event) => {
                    setMinText(event.target.value);
                    onPatch({ min: event.target.value.trim() || null });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cell-max">Max</Label>
                <Input
                  id="cell-max"
                  inputMode="decimal"
                  value={maxText}
                  onChange={(event) => {
                    setMaxText(event.target.value);
                    onPatch({ max: event.target.value.trim() || null });
                  }}
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                A reading outside these is shown in red. Leave both empty to record without judging.
              </p>
            </div>
          )}

          {commonType === 'CHOICE' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cell-options">Options (comma separated)</Label>
                <Input
                  id="cell-options"
                  value={optionsText}
                  placeholder="Absent, Present"
                  onChange={(event) => {
                    setOptionsText(event.target.value);
                    onPatch({ options: splitList(event.target.value) });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cell-ok">Meets the specification</Label>
                <Input
                  id="cell-ok"
                  value={okText}
                  placeholder="Absent"
                  onChange={(event) => {
                    setOkText(event.target.value);
                    onPatch({ ok: splitList(event.target.value) });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Any other answer is shown in red. Leave empty when every answer is acceptable.
                </p>
              </div>
            </>
          )}

          {blankRefs.length === 1 && first && (
            <div className="space-y-1.5">
              <Label htmlFor="cell-label">What this cell is</Label>
              <Input
                id="cell-label"
                value={labelText}
                placeholder="Free Fatty Acids · Time 1"
                onChange={(event) => {
                  setLabelText(event.target.value);
                  onPatch({ label: event.target.value });
                }}
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
