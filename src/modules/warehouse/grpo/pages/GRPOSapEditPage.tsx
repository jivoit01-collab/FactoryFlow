/**
 * Change a GRPO that is already in SAP — any GRPO of the company, including the
 * ones posted by hand in SAP.
 *
 * One page, two places: material GRPOs are edited with the warehouse's GRPO
 * pages, service GRPOs with dispatch's Service GRPO pages, because the people
 * who book transporters' bilties do not have the warehouse menu. Each place
 * finds only its own type and points to the other for the rest.
 *
 * What may change is what SAP lets change after posting: the header's vendor
 * ref, document and delivery dates, contact person, remarks and user-defined
 * fields, and attachments; on a service GRPO also each open line's amount and
 * effective month. The rest is fixed in SAP and shown read-only. The save goes
 * through the SAP posting queue as the app's own login (B1i), so SAP's rules
 * for B1i apply — most visibly its back-date window, which the page warns about.
 */

import {
  AlertCircle,
  ExternalLink,
  FilePen,
  History,
  Paperclip,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { GRPO_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth';
import { confirmSapPost } from '@/shared/components';
import type { StatusTone } from '@/shared/components/page';
import { EmptyPanel, PageHeader, PageSection, StatusPill } from '@/shared/components/page';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useFindSapGRPO, useSapGRPO, useSaveSapGRPOEdit } from '../api';
import type { SapGRPODocument, SapGRPOEditStatus, SapGRPOHeaderField, SapGRPOType } from '../types';
import { buildEdit, type FormState, initialState } from '../utils/sapEdit';

export type SapEditScope = 'material' | 'service';

interface ScopeConfig {
  type: SapGRPOType;
  base: string;
  title: string;
  description: string;
  accent: 'indigo' | 'teal';
  editable: string;
  permission: string;
  /** Where a person finds this screen, for the other screen to point at. */
  where: string;
}

const SCOPES: Record<SapEditScope, ScopeConfig> = {
  material: {
    type: 'I',
    base: '/warehouse/grpo/sap-edit',
    title: 'Edit a GRPO in SAP',
    description:
      'Open a material GRPO by its SAP number — posted from the app or in SAP — and change what SAP still lets change after posting.',
    accent: 'indigo',
    editable:
      'Vendor ref, document date, delivery date, contact person, remarks, vehicle, bilty, transporter and the other header fields, and attachments. Items, quantities, prices, warehouses, tax codes, accounts and the posting date stay as posted.',
    permission: GRPO_PERMISSIONS.EDIT_IN_SAP,
    where: 'Warehouse → GRPO → Edit GRPO in SAP',
  },
  service: {
    type: 'S',
    base: '/dispatch/bilty-grpo/sap-edit',
    title: 'Edit a service GRPO in SAP',
    description:
      'Open a transporter’s service GRPO by its SAP number — posted from the app or in SAP — and change what SAP still lets change after posting.',
    accent: 'teal',
    editable:
      'Each line’s amount and effective month, until an A/P invoice closes the line; vendor ref, document date, delivery date, contact person, remarks, bilty, transporter and the other header fields; and attachments. The service description, G/L account, tax code, variety and posting date stay as posted.',
    permission: GRPO_PERMISSIONS.EDIT_SERVICE_IN_SAP,
    where: 'Dispatch → Edit Service GRPO in SAP',
  },
};

function scopeOf(type: SapGRPOType): ScopeConfig {
  return type === 'S' ? SCOPES.service : SCOPES.material;
}

const EDIT_TONE: Record<SapGRPOEditStatus, StatusTone> = {
  POSTED: 'done',
  WAITING: 'progress',
  REFUSED: 'blocked',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(value: string | null) {
  if (value === null || value === '') return '—';
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GRPOSapEditPage({ scope = 'material' }: { scope?: SapEditScope }) {
  const { docEntry } = useParams<{ docEntry: string }>();
  const id = docEntry ? Number(docEntry) : null;
  const config = SCOPES[scope];
  if (!id) return <FindGRPO config={config} />;
  return <LoadGRPO config={config} docEntry={id} />;
}

/** "GRPO 123 is a material GRPO": where it is edited, and a way there if allowed. */
function OtherTypeNotice({
  docNum,
  docEntry,
  type,
}: {
  docNum: string | number;
  docEntry: number;
  type: SapGRPOType;
}) {
  const other = scopeOf(type);
  const allowed = useHasPermission(other.permission);
  const kind = type === 'S' ? 'service' : 'material';
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      <p>
        GRPO {docNum} is a {kind} GRPO. {kind === 'service' ? 'Service' : 'Material'} GRPOs are
        edited under {other.where}.
      </p>
      {allowed && (
        <Button variant="outline" size="sm" asChild>
          <Link to={`${other.base}/${docEntry}`}>Open it there</Link>
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// finding it
// ---------------------------------------------------------------------------

function FindGRPO({ config }: { config: ScopeConfig }) {
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [applied, setApplied] = useState('');
  const { data: found, isFetching, error } = useFindSapGRPO(applied, config.type);
  const matches = found?.results;
  const otherType = found?.other_type ?? [];

  useEffect(() => {
    if (matches?.length === 1) navigate(`${config.base}/${matches[0].doc_entry}`);
  }, [matches, navigate, config.base]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        description={config.description}
        icon={FilePen}
        accent={config.accent}
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setApplied(typed);
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="grpo-number">GRPO number in SAP</Label>
              <Input
                id="grpo-number"
                inputMode="numeric"
                placeholder="e.g. 2026096921"
                value={typed}
                onChange={(e) => setTyped(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <Button type="submit" disabled={!typed || isFetching}>
              <Search className="mr-2 h-4 w-4" />
              {isFetching ? 'Looking…' : 'Open'}
            </Button>
          </form>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {getErrorMessage(error, 'Could not look the GRPO up in SAP.')}
            </p>
          )}
          {matches && matches.length === 0 && otherType.length > 0 && (
            <OtherTypeNotice
              docNum={applied}
              docEntry={otherType[0].doc_entry}
              type={otherType[0].doc_type}
            />
          )}
          {matches && matches.length === 0 && otherType.length === 0 && (
            <p className="text-sm text-muted-foreground">
              There is no GRPO {applied} in SAP for this company.
            </p>
          )}
          {matches && matches.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">More than one GRPO has this number:</p>
              {matches.map((m) => (
                <Button
                  key={m.doc_entry}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`${config.base}/${m.doc_entry}`)}
                >
                  GRPO {m.doc_num} · {m.card_name} · {formatDate(m.doc_date)}
                  {m.cancelled && ' · cancelled'}
                </Button>
              ))}
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">What SAP lets change after posting</p>
            <p>{config.editable}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadGRPO({ config, docEntry }: { config: ScopeConfig; docEntry: number }) {
  const { data: doc, isLoading, error, dataUpdatedAt } = useSapGRPO(docEntry);
  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Reading the GRPO from SAP…</p>;
  if (error || !doc) {
    return (
      <div className="space-y-4">
        <PageHeader title={config.title} backTo={config.base} backLabel="Find a GRPO" />
        <EmptyPanel
          icon={AlertCircle}
          message="Could not open this GRPO"
          hint={getErrorMessage(error, 'SAP did not return it.')}
        />
      </div>
    );
  }
  if (doc.doc_type !== config.type) {
    return (
      <div className="space-y-4">
        <PageHeader title={config.title} backTo={config.base} backLabel="Find a GRPO" />
        <OtherTypeNotice docNum={doc.doc_num} docEntry={doc.doc_entry} type={doc.doc_type} />
      </div>
    );
  }
  // Keyed on when SAP was last read, so the form starts from SAP's values and a
  // save (which re-reads SAP) starts it afresh.
  return <EditForm key={dataUpdatedAt} config={config} doc={doc} />;
}

// ---------------------------------------------------------------------------
// the form
// ---------------------------------------------------------------------------

function Banner({ tone, children }: { tone: 'amber' | 'red' | 'sky'; children: ReactNode }) {
  const classes = {
    amber:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    red: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400',
    sky: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
  }[tone];
  return <div className={`rounded-lg border p-3 text-sm ${classes}`}>{children}</div>;
}

function HeaderInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: SapGRPOHeaderField;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.key}`;
  if (field.key === 'remarks') {
    return (
      <Textarea
        id={id}
        value={value}
        rows={3}
        maxLength={field.max_length ?? undefined}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === 'choice') {
    return (
      <NativeSelect id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <SelectOption value="">— None —</SelectOption>
        {(field.options ?? []).map((o) => (
          <SelectOption key={o.value} value={String(o.value)}>
            {o.label}
          </SelectOption>
        ))}
      </NativeSelect>
    );
  }
  return (
    <Input
      id={id}
      type={field.type === 'date' ? 'date' : field.type === 'text' ? 'text' : 'number'}
      value={value}
      maxLength={field.max_length ?? undefined}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function EditForm({ config, doc }: { config: ScopeConfig; doc: SapGRPODocument }) {
  const save = useSaveSapGRPOEdit(doc.doc_entry);
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<FormState>(() => initialState(doc));
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');

  const built = useMemo(
    () => buildEdit(doc, state, files.map((f) => f.name)),
    [doc, state, files],
  );
  const waiting = doc.edits.find((e) => e.status === 'WAITING');
  const readOnly = !doc.can_edit || !!doc.blocked_reason || !!waiting;
  const isService = doc.doc_type === 'S';
  const changed = built.changes.length > 0 || files.length > 0;
  const canSave = !readOnly && changed && built.problems.length === 0 && !save.isPending;

  const setHeader = (key: string, value: string) =>
    setState((s) => ({ ...s, header: { ...s.header, [key]: value } }));
  const toggleRemoved = (filename: string) =>
    setState((s) => ({
      ...s,
      removed: s.removed.includes(filename)
        ? s.removed.filter((name) => name !== filename)
        : [...s.removed, filename],
    }));
  const canRemove = !readOnly && !doc.attachments_shared_message;

  function reset() {
    setState(initialState(doc));
    setFiles([]);
    setError('');
  }

  async function submit() {
    setError('');
    const confirmed = await confirmSapPost({
      title: `Change GRPO ${doc.doc_num} in SAP?`,
      description:
        'SAP is read again first: if someone changed these fields there since you opened the page, nothing is sent.',
      details: [
        ...built.changes.slice(0, 8).map((c) => ({ label: c.label, value: `${c.before} → ${c.after}` })),
        built.changes.length > 8 && { label: 'And', value: `${built.changes.length - 8} more` },
        files.length > 0 && { label: 'Add attachments', value: files.map((f) => f.name).join(', ') },
      ],
      confirmLabel: 'Save to SAP',
    });
    if (!confirmed) return;
    try {
      const result = await save.mutateAsync({ data: built.request, attachments: files });
      if (result.outcome === 'POSTED') toast.success(result.message);
      else toast.info(result.detail || result.message);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the change. Try again in a moment.'));
    }
  }

  const appLink = doc.material_posting_id
    ? `/warehouse/grpo/material/history/${doc.material_posting_id}`
    : doc.service_posting_id
      ? `/dispatch/bilty-grpo/history/${doc.service_posting_id}`
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`GRPO ${doc.doc_num}`}
        description={`${doc.card_name} · ${doc.branch_name} · posted ${formatDate(doc.doc_date)}${
          doc.created_by ? ` by ${doc.created_by}` : ''
        }`}
        icon={FilePen}
        accent={config.accent}
        backTo={config.base}
        backLabel="Find another GRPO"
        meta={
          <>
            <StatusPill tone="info">{doc.doc_type_label}</StatusPill>
            <StatusPill tone={doc.cancelled ? 'blocked' : doc.doc_status === 'O' ? 'progress' : 'neutral'}>
              {doc.cancelled ? 'Cancelled' : doc.doc_status === 'O' ? 'Open' : 'Closed'}
            </StatusPill>
          </>
        }
      >
        {appLink && (
          <Button variant="outline" size="sm" asChild>
            <Link to={appLink}>
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Posting in the app
            </Link>
          </Button>
        )}
      </PageHeader>

      {doc.permission_message && <Banner tone="amber">{doc.permission_message}</Banner>}
      {doc.blocked_reason && <Banner tone="red">{doc.blocked_reason}</Banner>}
      {doc.back_date && <Banner tone="amber">{doc.back_date.message}</Banner>}
      {waiting && (
        <Banner tone="sky">
          An earlier change ({waiting.summary || 'attachments'}) is waiting for SAP and goes through by
          itself once SAP answers. This GRPO can be changed again after that.
        </Banner>
      )}

      <PageSection title="Header" description="What SAP holds now. Change a value and save; the rest stays as it is.">
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            {doc.header_fields.map((field) => {
              const typed = state.header[field.key] ?? '';
              const isChanged = built.request.header[field.key] !== undefined;
              return (
                <div key={field.key} className={field.key === 'remarks' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
                  <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
                  <HeaderInput
                    field={field}
                    value={typed}
                    disabled={readOnly}
                    onChange={(v) => setHeader(field.key, v)}
                  />
                  {isChanged && (
                    <p className="text-xs text-muted-foreground">
                      In SAP now: {field.value === null || field.value === '' ? '(empty)' : String(
                        field.options?.find((o) => String(o.value) === String(field.value))?.label ?? field.value,
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title="Lines"
        description={
          isService
            ? 'Amounts are before tax; SAP works out the tax and the total again. A line closed by an A/P invoice cannot change.'
            : 'A material GRPO’s lines are fixed in SAP once it is posted.'
        }
      >
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">{isService ? 'Description' : 'Item'}</th>
                  {!isService && <th className="py-2 pr-3 text-right font-medium">Qty</th>}
                  <th className="py-2 pr-3 text-right font-medium">Amount</th>
                  <th className="py-2 pr-3 font-medium">Tax</th>
                  {isService && <th className="py-2 pr-3 font-medium">Effective month</th>}
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((line) => {
                  const editable = line.editable && !readOnly;
                  const discount = Number(line.discount_percent);
                  const amountTyped = state.amounts[line.line_num] ?? '';
                  return (
                    <tr key={line.line_num} className="border-t align-top">
                      <td className="py-2 pr-3 tabular-nums">{line.line_num + 1}</td>
                      <td className="py-2 pr-3">
                        {!isService && <div className="font-medium">{line.item_code}</div>}
                        <div className={isService ? '' : 'text-xs text-muted-foreground'}>{line.description}</div>
                      </td>
                      {!isService && <td className="py-2 pr-3 text-right tabular-nums">{line.quantity}</td>}
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {editable ? (
                          <div className="ml-auto w-36 space-y-1">
                            <Input
                              aria-label={`Amount, line ${line.line_num + 1}`}
                              inputMode="decimal"
                              className="text-right"
                              value={amountTyped}
                              onChange={(e) =>
                                setState((s) => ({
                                  ...s,
                                  amounts: { ...s.amounts, [line.line_num]: e.target.value },
                                }))
                              }
                            />
                            {discount !== 0 && amountTyped !== (line.amount ?? '') && (
                              <p className="text-left text-[11px] text-muted-foreground">
                                SAP’s {discount}% discount on this line is cleared: the amount is what you type.
                              </p>
                            )}
                          </div>
                        ) : (
                          formatMoney(line.amount)
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {line.tax_code}
                        <div className="text-muted-foreground">{formatMoney(line.tax_amount)}</div>
                      </td>
                      {isService && (
                        <td className="py-2 pr-3">
                          {editable ? (
                            <NativeSelect
                              aria-label={`Effective month, line ${line.line_num + 1}`}
                              className="w-32"
                              value={state.months[line.line_num] ?? ''}
                              onChange={(e) =>
                                setState((s) => ({
                                  ...s,
                                  months: { ...s.months, [line.line_num]: e.target.value },
                                }))
                              }
                            >
                              {!doc.month_options.some((m) => m.code === line.month) && line.month && (
                                <SelectOption value={line.month}>{line.month}</SelectOption>
                              )}
                              {doc.month_options.map((m) => (
                                <SelectOption key={m.code} value={m.code}>
                                  {m.name}
                                </SelectOption>
                              ))}
                            </NativeSelect>
                          ) : (
                            line.month || '—'
                          )}
                        </td>
                      )}
                      <td className="py-2 text-xs">
                        {line.closed_reason ? (
                          <span className="text-muted-foreground">{line.closed_reason}</span>
                        ) : (
                          <span>Open</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t text-xs text-muted-foreground">
                  <td colSpan={isService ? 2 : 3} className="py-2 pr-3">
                    Document total in SAP
                  </td>
                  <td className="py-2 pr-3 text-right font-medium tabular-nums text-foreground">
                    {formatMoney(doc.doc_total)}
                  </td>
                  <td colSpan={isService ? 3 : 2} />
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="Attachments" icon={Paperclip}>
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm">
            {doc.attachments.length === 0 ? (
              <p className="text-muted-foreground">No attachments in SAP yet.</p>
            ) : (
              <ul className="space-y-1">
                {doc.attachments.map((a) => {
                  const removing = state.removed.includes(a.filename);
                  return (
                    <li key={a.line} className="flex items-center justify-between gap-2">
                      <span className={`truncate ${removing ? 'text-muted-foreground line-through' : ''}`}>
                        {a.filename}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {removing ? 'To remove' : formatDate(a.date)}
                        </span>
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`${removing ? 'Keep' : 'Remove'} ${a.filename}`}
                            onClick={() => toggleRemoved(a.filename)}
                          >
                            {removing ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {doc.attachments_shared_message && !readOnly && (
              <p className="text-xs text-muted-foreground">{doc.attachments_shared_message}</p>
            )}
            {canRemove && doc.attachments.length > 0 && (
              <p className="text-xs text-muted-foreground">
                To replace a file, remove it and add the new one: both are saved together. A GRPO
                always keeps at least one attachment.
              </p>
            )}
            {files.length > 0 && (
              <ul className="space-y-1 border-t pt-3">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">To add: {f.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => setFiles((list) => list.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {!readOnly && (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const chosen = Array.from(e.target.files ?? []);
                    setFiles((list) => [...list, ...chosen]);
                    e.target.value = '';
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                  <Paperclip className="mr-1.5 h-4 w-4" />
                  Add files
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {built.problems.length > 0 && (
        <Banner tone="amber">
          {built.problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Banner>
      )}
      {error && <Banner tone="red">{error}</Banner>}

      {!readOnly && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <span className="text-xs text-muted-foreground sm:mr-auto">
            {changed
              ? `${built.changes.length + (files.length ? 1 : 0)} change${
                  built.changes.length + (files.length ? 1 : 0) === 1 ? '' : 's'
                } to save`
              : 'Nothing changed yet'}
          </span>
          <Button variant="outline" onClick={reset} disabled={!changed || save.isPending}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Undo changes
          </Button>
          <Button onClick={submit} disabled={!canSave}>
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? 'Saving to SAP…' : 'Save to SAP'}
          </Button>
        </div>
      )}

      {doc.edits.length > 0 && (
        <PageSection title="Changes made from the app" icon={History}>
          <Card>
            <CardContent className="divide-y pt-2 text-sm">
              {doc.edits.map((e) => (
                <div key={e.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={EDIT_TONE[e.status]}>{e.status_label}</StatusPill>
                    <span className="font-medium">{e.summary || 'Attachments'}</span>
                    <span className="text-xs text-muted-foreground">
                      {e.requested_by} · {e.created_at ? new Date(e.created_at).toLocaleString('en-IN') : ''}
                    </span>
                  </div>
                  {e.message && <p className="text-xs text-muted-foreground">{e.message}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </PageSection>
      )}
    </div>
  );
}
