/**
 * One editor for every ETP / STP master list.
 *
 * The Settings screen maintains seven lists (plants, people, chemicals,
 * monitoring parameters, back-wash steps, dropdown values, instruments) and they
 * are all the same shape: a table, an add button and a dialog of fields. Rather
 * than seven near-identical screens, each list describes its fields and this
 * renders and writes them.
 */

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';

import { confirmDialog } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

export type MasterFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'date'
  /** Comma-separated numbers, e.g. the calibration buffer points "4, 7, 10.01". */
  | 'numberList';

export interface MasterField {
  key: string;
  label: string;
  type: MasterFieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** Keep the field out of the table (dialog only). */
  hideInTable?: boolean;
  /** Column width class for the table. */
  align?: 'left' | 'right';
}

export type MasterFormValue = string | string[] | boolean;
export type MasterForm = Record<string, MasterFormValue>;

export interface MasterEditorProps<T extends { id: number }> {
  title: string;
  description?: string;
  rows: T[];
  loading?: boolean;
  fields: MasterField[];
  canManage: boolean;
  /** Turn a row into dialog values. Defaults to reading each field's key. */
  toForm?: (row: T) => MasterForm;
  /** Turn dialog values into the API payload. Defaults to sensible casts. */
  toPayload?: (form: MasterForm) => Record<string, unknown>;
  /** Extra read-only columns (e.g. "last calibrated"). */
  extraColumns?: { label: string; render: (row: T) => ReactNode }[];
  onCreate: (payload: Record<string, unknown>) => Promise<unknown>;
  onUpdate: (id: number, payload: Record<string, unknown>) => Promise<unknown>;
  onDelete?: (id: number) => Promise<unknown>;
  /** Label used in confirmation prompts. */
  rowLabel?: (row: T) => string;
  emptyMessage?: string;
}

function blankForm(fields: MasterField[]): MasterForm {
  const form: MasterForm = {};
  fields.forEach((field) => {
    if (field.type === 'multiselect') form[field.key] = [];
    else if (field.type === 'checkbox') form[field.key] = false;
    else form[field.key] = '';
  });
  return form;
}

function defaultToForm<T extends { id: number }>(row: T, fields: MasterField[]): MasterForm {
  const form: MasterForm = {};
  fields.forEach((field) => {
    const value = (row as unknown as Record<string, unknown>)[field.key];
    if (field.type === 'multiselect') {
      form[field.key] = Array.isArray(value) ? value.map(String) : [];
    } else if (field.type === 'checkbox') {
      form[field.key] = Boolean(value);
    } else {
      form[field.key] = value === null || value === undefined ? '' : String(value);
    }
  });
  return form;
}

function defaultToPayload(form: MasterForm, fields: MasterField[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  fields.forEach((field) => {
    const value = form[field.key];
    switch (field.type) {
      case 'multiselect':
        // `*_ids` fields carry primary keys; anything else (company codes) is a
        // list of strings and must not be cast.
        payload[field.key] = field.key.endsWith('_ids')
          ? ((value as string[]) ?? []).map(Number)
          : ((value as string[]) ?? []);
        break;
      case 'checkbox':
        payload[field.key] = Boolean(value);
        break;
      case 'number':
        // A blank number clears the field (null), except the ordering column,
        // which the API expects as a whole number.
        payload[field.key] = value === '' ? (field.key === 'sequence' ? 0 : null) : value;
        break;
      case 'numberList':
        payload[field.key] = String(value)
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);
        break;
      default:
        payload[field.key] = value;
    }
  });
  return payload;
}

function cellText(row: Record<string, unknown>, field: MasterField): string {
  const value = row[field.key];
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  if (field.type === 'multiselect') {
    return Array.isArray(value) && value.length > 0 ? `${value.length} selected` : '—';
  }
  if (field.type === 'select') {
    const match = field.options?.find((option) => String(option.value) === String(value));
    return (
      match?.label ?? (value === null || value === undefined || value === '' ? '—' : String(value))
    );
  }
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function MasterEditor<T extends { id: number; is_active?: boolean }>({
  title,
  description,
  rows,
  loading,
  fields,
  canManage,
  toForm,
  toPayload,
  extraColumns = [],
  onCreate,
  onUpdate,
  onDelete,
  rowLabel,
  emptyMessage = 'Nothing configured yet.',
}: MasterEditorProps<T>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<MasterForm>(() => blankForm(fields));
  const [saving, setSaving] = useState(false);

  const tableFields = fields.filter((field) => !field.hideInTable);

  const openAdd = () => {
    setEditing(null);
    setForm(blankForm(fields));
    setDialogOpen(true);
  };

  const openEdit = (row: T) => {
    setEditing(row);
    setForm(toForm ? toForm(row) : defaultToForm(row, fields));
    setDialogOpen(true);
  };

  const setValue = (key: string, value: MasterFormValue) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleMulti = (key: string, option: string) =>
    setForm((current) => {
      const selected = (current[key] as string[]) ?? [];
      return {
        ...current,
        [key]: selected.includes(option)
          ? selected.filter((value) => value !== option)
          : [...selected, option],
      };
    });

  const submit = async () => {
    const missing = fields.find(
      (field) => field.required && (form[field.key] === '' || form[field.key] === undefined),
    );
    if (missing) {
      toast.error(`${missing.label} is needed`);
      return;
    }
    const payload = toPayload ? toPayload(form) : defaultToPayload(form, fields);
    setSaving(true);
    try {
      if (editing) {
        await onUpdate(editing.id, payload);
        toast.success(`${title} updated`);
      } else {
        await onCreate(payload);
        toast.success(`Added to ${title}`);
      }
      setDialogOpen(false);
    } catch {
      /* interceptor surfaces the backend's message (duplicate name, …) */
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: T) => {
    if (!onDelete) return;
    const label = rowLabel ? rowLabel(row) : `#${row.id}`;
    const confirmed = await confirmDialog({
      title: `Delete ${label}?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await onDelete(row.id);
      toast.success('Deleted');
    } catch {
      /* the API explains when a row is in use and should be deactivated instead */
    }
  };

  const toggleActive = async (row: T) => {
    try {
      await onUpdate(row.id, { is_active: !row.is_active });
      toast.success(row.is_active ? 'Deactivated' : 'Activated');
    } catch {
      toast.error('Could not change this row');
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 border-b p-4">
          <div>
            <div className="font-medium">{title}</div>
            {description && <div className="text-sm text-muted-foreground">{description}</div>}
          </div>
          {canManage && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  {tableFields.map((field) => (
                    <th
                      key={field.key}
                      className={`px-3 py-2 font-medium ${
                        field.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {field.label}
                    </th>
                  ))}
                  {extraColumns.map((column) => (
                    <th key={column.label} className="px-3 py-2 font-medium">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Active</th>
                  {canManage && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                    {tableFields.map((field) => (
                      <td
                        key={field.key}
                        className={`px-3 py-2 ${field.align === 'right' ? 'text-right' : ''}`}
                      >
                        {cellText(row as unknown as Record<string, unknown>, field)}
                      </td>
                    ))}
                    {extraColumns.map((column) => (
                      <td key={column.label} className="px-3 py-2">
                        {column.render(row)}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {canManage ? (
                        <Checkbox
                          checked={row.is_active !== false}
                          onCheckedChange={() => void toggleActive(row)}
                        />
                      ) : row.is_active === false ? (
                        'No'
                      ) : (
                        'Yes'
                      )}
                    </td>
                    {canManage && (
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {onDelete && (
                          <Button size="sm" variant="ghost" onClick={() => remove(row)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {/* Title and buttons stay put; only the fields scroll (DialogBody). */}
        <DialogContent className="max-h-[90vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit — ${title}` : `Add to ${title}`}</DialogTitle>
          </DialogHeader>

          <DialogBody className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const id = `master-${title.replace(/\s+/g, '-')}-${field.key}`;
              const value = form[field.key];
              return (
                <div
                  key={field.key}
                  className={field.type === 'multiselect' ? 'sm:col-span-2' : undefined}
                >
                  <Label htmlFor={id}>
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                  </Label>
                  {field.type === 'select' ? (
                    <NativeSelect
                      id={id}
                      value={String(value ?? '')}
                      onChange={(event) => setValue(field.key, event.target.value)}
                    >
                      <SelectOption value="">{field.placeholder ?? 'Select…'}</SelectOption>
                      {field.options?.map((option) => (
                        <SelectOption key={option.value} value={option.value}>
                          {option.label}
                        </SelectOption>
                      ))}
                    </NativeSelect>
                  ) : field.type === 'multiselect' ? (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {(field.options ?? []).map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={((value as string[]) ?? []).includes(option.value)}
                            onCheckedChange={() => toggleMulti(field.key, option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                      {(field.options ?? []).length === 0 && (
                        <span className="text-sm text-muted-foreground">Nothing to pick yet.</span>
                      )}
                    </div>
                  ) : field.type === 'checkbox' ? (
                    <div className="pt-2">
                      <Checkbox
                        id={id}
                        checked={Boolean(value)}
                        onCheckedChange={(checked) => setValue(field.key, checked === true)}
                      />
                    </div>
                  ) : (
                    <Input
                      id={id}
                      type={
                        field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
                      }
                      step={field.type === 'number' ? 'any' : undefined}
                      placeholder={field.placeholder}
                      value={String(value ?? '')}
                      onChange={(event) => setValue(field.key, event.target.value)}
                    />
                  )}
                  {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
                </div>
              );
            })}
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {editing ? 'Save changes' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
