import { Boxes, Check, Loader2, PackageCheck, Save } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EXECUTION_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useWarehouses } from '@/modules/warehouse/grpo/api';
import type { Warehouse } from '@/modules/warehouse/grpo/types';
import { SearchableSelect } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useProductionSettings, useUpdateProductionSettings } from '../api';
import type { ProductionSettings } from '../types';

type WarehouseField = 'rm_warehouse' | 'pm_warehouse' | 'fg_warehouse';
type Draft = Record<WarehouseField, string>;

interface FieldSpec {
  key: WarehouseField;
  label: string;
  help: string;
}

interface SectionSpec {
  title: string;
  description: string;
  icon: ReactNode;
  fields: FieldSpec[];
}

const SECTIONS: SectionSpec[] = [
  {
    title: 'Bill of materials',
    description:
      'Where a run draws its components from. A plan counts what stands here as already at the line.',
    icon: <Boxes className="h-4 w-4" />,
    fields: [
      {
        key: 'rm_warehouse',
        label: 'RM warehouse',
        help: 'Raw material — oil and the other ingredients.',
      },
      {
        key: 'pm_warehouse',
        label: 'PM warehouse',
        help: 'Packing material — bottles, caps, labels and cartons.',
      },
    ],
  },
  {
    title: 'Finished goods',
    description: 'Where a run’s output is received.',
    icon: <PackageCheck className="h-4 w-4" />,
    fields: [
      {
        key: 'fg_warehouse',
        label: 'FG warehouse',
        help: 'A new FG receipt opens on this warehouse.',
      },
    ],
  },
];

const FIELD_KEYS: WarehouseField[] = ['rm_warehouse', 'pm_warehouse', 'fg_warehouse'];

function fromServer(settings?: ProductionSettings): Draft {
  return {
    rm_warehouse: settings?.rm_warehouse ?? '',
    pm_warehouse: settings?.pm_warehouse ?? '',
    fg_warehouse: settings?.fg_warehouse ?? '',
  };
}

const inputId = (key: WarehouseField) => `production-settings-${key}`;

/** Code first, so a narrow screen that truncates still shows the code. */
const warehouseLabel = (w: Warehouse) => `${w.warehouse_code} - ${w.warehouse_name}`;

/** One setting: what it is on the left, the control on the right. */
function SettingRow({
  id,
  title,
  help,
  changed,
  children,
}: {
  id: string;
  title: string;
  help: string;
  changed: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 py-4 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:items-center md:gap-8">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-sm font-medium">
            {title}
          </Label>
          {changed && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 text-[11px] font-normal text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
            >
              Changed
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{help}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

/**
 * The production module's settings for the company you are signed into.
 *
 * For now, the three warehouses: where the BOM draws raw and packing material
 * from, and where finished goods go. Everyone who sees production can read
 * them; only a Production HOD (or a superuser) can change them.
 */
export default function ProductionSettingsPage() {
  const { hasPermission } = usePermission();
  const canEdit = hasPermission(EXECUTION_PERMISSIONS.MANAGE_SETTINGS);

  const settings = useProductionSettings();
  const save = useUpdateProductionSettings();
  // Read-only viewers get the list too, so a code is shown with its name.
  const {
    data: warehouses = [],
    isLoading: warehousesLoading,
    isError: warehousesError,
  } = useWarehouses(true);

  // Only what has been picked, or null while nothing has — the fields fall
  // through to the saved values until somebody changes one.
  const [draft, setDraft] = useState<Draft | null>(null);
  const saved = fromServer(settings.data);
  const values = draft ?? saved;
  const changed = (key: WarehouseField) => draft !== null && draft[key] !== saved[key];
  const dirty = FIELD_KEYS.some(changed);
  const missing = FIELD_KEYS.some((key) => !values[key]);
  const canSave = canEdit && dirty && !missing && !save.isPending;

  const nameOf = (code: string) =>
    warehouses.find((w) => w.warehouse_code === code)?.warehouse_name;

  // Opening a filled field puts its whole label in the search box. That is not a
  // search, and filtering on it would list nothing, so it lists everything.
  const labels = useMemo(
    () => new Set(warehouses.map((w) => warehouseLabel(w).toLowerCase())),
    [warehouses],
  );
  const matches = (w: Warehouse, search: string) => {
    const term = search.trim().toLowerCase();
    if (!term || labels.has(term)) return true;
    return (
      w.warehouse_code.toLowerCase().includes(term) || w.warehouse_name.toLowerCase().includes(term)
    );
  };

  const pick = (key: WarehouseField, code: string) => {
    setDraft({ ...values, [key]: code });
  };

  const handleSave = async () => {
    try {
      await save.mutateAsync(values);
      setDraft(null);
      toast.success('Production settings saved');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the production settings'));
    }
  };

  const renderControl = (field: FieldSpec) => {
    const code = values[field.key];
    if (!canEdit) {
      return (
        <p className="text-sm md:text-right">
          {nameOf(code) && <span className="font-medium">{nameOf(code)} </span>}
          <span className="font-mono text-muted-foreground">{code || '—'}</span>
        </p>
      );
    }
    return (
      <SearchableSelect<Warehouse>
        inputId={inputId(field.key)}
        value={code}
        defaultDisplayText={code}
        items={warehouses}
        isLoading={warehousesLoading}
        isError={warehousesError}
        error={code ? undefined : 'Pick a warehouse.'}
        placeholder="Select warehouse"
        disabled={save.isPending}
        getItemKey={(w) => w.warehouse_code}
        getItemLabel={warehouseLabel}
        filterFn={matches}
        renderItem={(w) => (
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
              {w.warehouse_code}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{w.warehouse_name}</span>
            {w.warehouse_code === code && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </div>
        )}
        loadingText="Loading warehouses..."
        emptyText="No warehouses available"
        notFoundText="No warehouses found"
        errorText="Could not load the warehouses from SAP"
        onItemSelect={(w) => {
          pick(field.key, w.warehouse_code);
        }}
        onClear={() => {
          pick(field.key, '');
        }}
      />
    );
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Production Settings"
        description="Where production draws raw and packing material from, and where finished goods go."
      >
        {canEdit ? (
          <>
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(null);
                }}
                disabled={save.isPending}
              >
                Discard
              </Button>
            )}
            <Button onClick={() => void handleSave()} disabled={!canSave}>
              {save.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save changes
            </Button>
          </>
        ) : (
          <Badge variant="secondary">Read-only</Badge>
        )}
      </DashboardHeader>

      {settings.isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading the current settings…
          </CardContent>
        </Card>
      ) : settings.error ? (
        <Card>
          <CardContent className="py-10 text-sm text-destructive">
            {getErrorMessage(settings.error, 'Could not read the production settings.')}
          </CardContent>
        </Card>
      ) : (
        <>
          {SECTIONS.map((section) => (
            <Card key={section.title}>
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {section.icon}
                  </span>
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="divide-y pt-2">
                {section.fields.map((field) => (
                  <SettingRow
                    key={field.key}
                    id={inputId(field.key)}
                    title={field.label}
                    help={field.help}
                    changed={changed(field.key)}
                  >
                    {renderControl(field)}
                  </SettingRow>
                ))}
              </CardContent>
            </Card>
          ))}

          <p className="text-xs text-muted-foreground">
            {settings.data?.is_saved && settings.data.updated_at
              ? `Last changed ${new Date(settings.data.updated_at).toLocaleString('en-IN')}${
                  settings.data.updated_by_name ? ` by ${settings.data.updated_by_name}` : ''
                }.`
              : 'These are the defaults — nobody has changed them yet.'}
          </p>
        </>
      )}
    </div>
  );
}
