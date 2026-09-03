import { AlertTriangle, ChevronDown, ChevronRight, Paperclip, Pencil, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import { Badge, Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { getErrorMessage, resolveFileUrl } from '@/shared/utils';

import {
  useAddOnlineReading,
  useDeleteOnlineReading,
  useDeleteReadingAttachment,
  useUpdateOnlineReading,
  useUploadReadingAttachment,
} from '../../api/onlineMonitoring';
import type { OnlineQualityReading, OnlineQualityTorque, OnlineReadingWrite } from '../../types';
import { evaluateSpec, specLabel, type SpecMap } from './specValidation';

const WATER_FIELDS: { key: keyof OnlineQualityReading; label: string }[] = [
  { key: 'ph', label: 'pH' },
  { key: 'tds', label: 'TDS' },
  { key: 'turbidity', label: 'Turbidity' },
  { key: 'alkalinity', label: 'Alkalinity' },
  { key: 'total_hardness', label: 'Total Hardness' },
  { key: 'calcium', label: 'Calcium' },
  { key: 'magnesium', label: 'Magnesium' },
  { key: 'chloride', label: 'Chloride' },
];
const HEADS = [1, 2, 3, 4, 5, 6, 7, 8];

type Draft = Partial<OnlineQualityReading> & { torque_heads: OnlineQualityTorque[] };

function emptyDraft(): Draft {
  return {
    reading_time: '',
    filler_speed: '',
    taste: '',
    aroma: '',
    appearance: '',
    ph: '',
    tds: '',
    turbidity: '',
    alkalinity: '',
    total_hardness: '',
    calcium: '',
    magnesium: '',
    chloride: '',
    package_attribute: '',
    date_code: '',
    rub_test: '',
    closure_jump_test: '',
    remarks: '',
    torque_heads: HEADS.map((head_no) => ({ head_no, torque_value: '' })),
  };
}

function toDraft(reading: OnlineQualityReading): Draft {
  const byHead = new Map(reading.torque_heads.map((t) => [t.head_no, t.torque_value]));
  return {
    ...reading,
    torque_heads: HEADS.map((head_no) => ({ head_no, torque_value: byHead.get(head_no) ?? '' })),
  };
}

interface Props {
  recordId: number;
  reading: OnlineQualityReading | null; // null = new-reading form
  specMap: SpecMap;
  editable: boolean;
  onClose?: () => void; // for the new-reading form
}

export function ReadingCard({ recordId, reading, specMap, editable, onClose }: Props) {
  const isNew = reading === null;
  const [expanded, setExpanded] = useState(isNew);
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState<Draft>(isNew ? emptyDraft() : toDraft(reading));

  const add = useAddOnlineReading();
  const update = useUpdateOnlineReading();
  const remove = useDeleteOnlineReading();
  const saving = add.isPending || update.isPending;

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setHead = (head_no: number, value: string) =>
    setDraft((d) => ({
      ...d,
      torque_heads: d.torque_heads.map((t) => (t.head_no === head_no ? { ...t, torque_value: value } : t)),
    }));

  function save() {
    if (!draft.reading_time) {
      toast.error('Enter the reading time.');
      return;
    }
    // Only send filled torque heads.
    const torque_heads = draft.torque_heads.filter(
      (t) => t.torque_value !== '' && t.torque_value !== null,
    );
    const { id: _id, ...rest } = draft;
    void _id;
    const payload: OnlineReadingWrite = { ...rest, reading_time: draft.reading_time!, torque_heads };
    const onSuccess = () => {
      toast.success(isNew ? 'Reading added' : 'Reading updated');
      if (isNew) onClose?.();
      else setEditing(false);
    };
    const onError = (e: unknown) => toast.error(getErrorMessage(e, 'Could not save reading'));
    if (isNew) add.mutate({ recordId, args: payload }, { onSuccess, onError });
    else update.mutate({ recordId, args: { readingId: reading!.id, payload } }, { onSuccess, onError });
  }

  async function del() {
    if (!reading) return;
    const confirmed = await confirmDialog({
      title: 'Delete this reading?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    remove.mutate(
      { recordId, args: { readingId: reading.id } },
      { onError: (e) => toast.error(getErrorMessage(e, 'Could not delete')) },
    );
  }

  // ---- View mode -----------------------------------------------------------
  if (!editing && reading) {
    const outOfSpec = WATER_FIELDS.filter(
      (f) => evaluateSpec(specMap.get(f.key as string), reading[f.key] as string | null) === false,
    ).length;
    const torqueOut = reading.torque_heads.filter(
      (t) => evaluateSpec(specMap.get('torque'), t.torque_value) === false,
    ).length;
    const totalOut = outOfSpec + torqueOut;
    return (
      <div className="rounded-md border">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-between gap-3 p-3 text-left"
        >
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-semibold">{reading.reading_time?.slice(0, 5)}</span>
            <span className="text-sm text-muted-foreground">
              Filler {reading.filler_speed ?? '-'} BPH
            </span>
          </div>
          {totalOut > 0 ? (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="mr-1 h-3 w-3" /> {totalOut} out of spec
            </Badge>
          ) : (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              In spec
            </Badge>
          )}
        </button>
        {expanded && (
          <div className="space-y-3 border-t p-3 text-sm">
            <ViewSection title="Finished Product">
              <ViewItem label="Taste" value={reading.taste} />
              <ViewItem label="Aroma" value={reading.aroma} />
              <ViewItem label="Appearance" value={reading.appearance} />
              {WATER_FIELDS.map((f) => {
                const spec = specMap.get(f.key as string);
                const val = reading[f.key] as string | null;
                const ok = evaluateSpec(spec, val);
                return (
                  <div key={f.key as string}>
                    <div className="text-xs text-muted-foreground">{f.label}</div>
                    <div className={ok === false ? 'font-semibold text-red-600' : ''}>
                      {val ?? '-'}
                      {ok === false && <span className="ml-1 text-xs">⚠ Out of Spec</span>}
                    </div>
                    {spec && specLabel(spec) && (
                      <div className="text-[10px] text-muted-foreground">{specLabel(spec)}</div>
                    )}
                  </div>
                );
              })}
            </ViewSection>
            <ViewSection title="Package">
              <ViewItem label="Package Attribute" value={reading.package_attribute} />
              <ViewItem label="Date Code" value={reading.date_code} />
              <ViewItem label="Rub Test" value={reading.rub_test} />
              <ViewItem label="Closure Jump Test" value={reading.closure_jump_test} />
            </ViewSection>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                Torque {specMap.get('torque') ? `(${specLabel(specMap.get('torque'))})` : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {reading.torque_heads.map((t) => {
                  const ok = evaluateSpec(specMap.get('torque'), t.torque_value);
                  return (
                    <span
                      key={t.head_no}
                      className={`rounded border px-2 py-0.5 text-xs ${ok === false ? 'border-red-400 text-red-600' : ''}`}
                    >
                      H{t.head_no}: {t.torque_value ?? '-'}
                    </span>
                  );
                })}
              </div>
            </div>
            {reading.remarks && <div className="text-muted-foreground">Remarks: {reading.remarks}</div>}
            <ReadingAttachments recordId={recordId} reading={reading} editable={editable} />
            {editable && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={del}>
                  <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" /> Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- Edit / new mode -----------------------------------------------------
  const numField = (key: keyof OnlineQualityReading, label: string, withSpec = false) => {
    const spec = withSpec ? specMap.get(key as string) : undefined;
    const ok = evaluateSpec(spec, draft[key] as string);
    return (
      <div key={key as string}>
        <label className="text-xs text-muted-foreground">
          {label}
          {spec && specLabel(spec) ? ` · ${specLabel(spec)}` : ''}
        </label>
        <Input
          inputMode="decimal"
          value={(draft[key] as string) ?? ''}
          onChange={(e) => set({ [key]: e.target.value } as Partial<Draft>)}
          className={ok === false ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {ok === false && <div className="text-[10px] font-semibold text-red-600">⚠ Out of Specification</div>}
      </div>
    );
  };

  const choice = (key: keyof OnlineQualityReading, label: string, opts: [string, string][]) => (
    <div key={key as string}>
      <label className="text-xs text-muted-foreground">{label}</label>
      <NativeSelect
        value={(draft[key] as string) ?? ''}
        onChange={(e) => set({ [key]: e.target.value } as Partial<Draft>)}
      >
        <SelectOption value="">—</SelectOption>
        {opts.map(([v, l]) => (
          <SelectOption key={v} value={v}>
            {l}
          </SelectOption>
        ))}
      </NativeSelect>
    </div>
  );

  const ORG: [string, string][] = [['ACCEPTABLE', 'Acceptable'], ['NOT_ACCEPTABLE', 'Not Acceptable']];
  const OKNOK: [string, string][] = [['OK', 'OK'], ['NOT_OK', 'Not OK']];
  const PF: [string, string][] = [['PASS', 'Pass'], ['FAIL', 'Fail']];

  return (
    <div className="space-y-4 rounded-md border border-primary/40 bg-primary/5 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground">Time *</label>
          <Input type="time" value={draft.reading_time ?? ''} onChange={(e) => set({ reading_time: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Filler Speed (BPH)</label>
          <Input inputMode="decimal" value={draft.filler_speed ?? ''} onChange={(e) => set({ filler_speed: e.target.value })} />
        </div>
      </div>

      <Fieldset title="Finished Product — Organoleptic">
        {choice('taste', 'Taste', ORG)}
        {choice('aroma', 'Aroma', ORG)}
        {choice('appearance', 'Appearance', ORG)}
      </Fieldset>

      <Fieldset title="Water Quality">
        {WATER_FIELDS.map((f) => numField(f.key, f.label, true))}
      </Fieldset>

      <Fieldset title="Package Parameters">
        {choice('package_attribute', 'Package Attribute', OKNOK)}
        {choice('date_code', 'Date Code', OKNOK)}
        {choice('rub_test', 'Rub Test', PF)}
        {choice('closure_jump_test', 'Closure Jump Test', PF)}
      </Fieldset>

      <Fieldset title={`Torque ${specMap.get('torque') ? `· ${specLabel(specMap.get('torque'))}` : ''}`}>
        {draft.torque_heads.map((t) => {
          const ok = evaluateSpec(specMap.get('torque'), t.torque_value);
          return (
            <div key={t.head_no}>
              <label className="text-xs text-muted-foreground">Head {t.head_no}</label>
              <Input
                inputMode="decimal"
                value={t.torque_value ?? ''}
                onChange={(e) => setHead(t.head_no, e.target.value)}
                className={ok === false ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {ok === false && <div className="text-[10px] font-semibold text-red-600">⚠</div>}
            </div>
          );
        })}
      </Fieldset>

      <div>
        <label className="text-xs text-muted-foreground">Reading Remarks</label>
        <textarea
          className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={draft.remarks ?? ''}
          onChange={(e) => set({ remarks: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (isNew) onClose?.();
            else {
              setDraft(toDraft(reading!));
              setEditing(false);
            }
          }}
        >
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {isNew ? 'Add Reading' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </div>
  );
}

function ViewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </div>
  );
}

function ViewItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{value || '-'}</div>
    </div>
  );
}

function ReadingAttachments({
  recordId,
  reading,
  editable,
}: {
  recordId: number;
  reading: OnlineQualityReading;
  editable: boolean;
}) {
  const upload = useUploadReadingAttachment();
  const remove = useDeleteReadingAttachment();
  const inputRef = useRef<HTMLInputElement>(null);
  const attachments = reading.attachments ?? [];

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      upload.mutate(
        { recordId, args: { readingId: reading.id, file } },
        {
          onSuccess: () => toast.success('Attachment uploaded'),
          onError: (err) => toast.error(getErrorMessage(err, 'Upload failed')),
        },
      );
    }
    e.target.value = ''; // allow re-selecting the same file
  };

  if (!editable && attachments.length === 0) return null;

  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Attachments</div>
      <div className="flex flex-wrap items-center gap-2">
        {attachments.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs">
            <a
              href={resolveFileUrl(a.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
              title={a.original_name}
            >
              <Paperclip className="h-3 w-3" /> {a.original_name || 'file'}
            </a>
            {editable && (
              <button
                type="button"
                className="text-destructive"
                title="Remove attachment"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(
                    { recordId, args: { readingId: reading.id, attachmentId: a.id } },
                    { onError: (err) => toast.error(getErrorMessage(err, 'Delete failed')) },
                  )
                }
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {editable && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={onPick}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-1 h-3.5 w-3.5" /> {upload.isPending ? 'Uploading…' : 'Upload'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
