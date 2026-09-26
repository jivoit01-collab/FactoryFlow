import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { EXECUTION_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useWarehouses } from '@/modules/warehouse/grpo/api';
import type { Warehouse } from '@/modules/warehouse/grpo/types';
import { SearchableSelect } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useProductionSettings, useUpdateProductionSettings } from '../api';
import type { ProductionSettings } from '../types';

type WarehouseField = 'rm_warehouse' | 'pm_warehouse' | 'fg_warehouse';
type Draft = Record<WarehouseField, string>;

const FIELDS: { key: WarehouseField; label: string; help: string }[] = [
  {
    key: 'rm_warehouse',
    label: 'RM warehouse',
    help: 'Raw material the BOM draws from. A plan counts the raw material here as already at the line, whatever warehouse the bill names.',
  },
  {
    key: 'pm_warehouse',
    label: 'PM warehouse',
    help: 'Packing material the BOM draws from. A plan counts the packing material here as already at the line.',
  },
  {
    key: 'fg_warehouse',
    label: 'FG warehouse',
    help: 'Finished goods are received into this warehouse when a run’s FG receipt is created.',
  },
];

function fromServer(settings?: ProductionSettings): Draft {
  return {
    rm_warehouse: settings?.rm_warehouse ?? '',
    pm_warehouse: settings?.pm_warehouse ?? '',
    fg_warehouse: settings?.fg_warehouse ?? '',
  };
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
  const {
    data: warehouses = [],
    isLoading: warehousesLoading,
    isError: warehousesError,
  } = useWarehouses(canEdit);

  // Only what has been picked, or null while nothing has — the fields fall
  // through to the saved values until somebody changes one.
  const [draft, setDraft] = useState<Draft | null>(null);
  const values = draft ?? fromServer(settings.data);
  const dirty = draft !== null;
  const missing = FIELDS.filter((f) => !values[f.key]);
  const canSave = canEdit && dirty && missing.length === 0 && !save.isPending;

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

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Production Settings"
        description={
          canEdit
            ? 'Where production draws raw and packing material from, and where finished goods go.'
            : 'Where production draws raw and packing material from, and where finished goods go. Read-only.'
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Warehouses</CardTitle>
        </CardHeader>
        <CardContent>
          {settings.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading the current settings…
            </div>
          ) : settings.error ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(settings.error, 'Could not read the production settings.')}
            </p>
          ) : (
            <div className="space-y-5">
              {FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  {canEdit ? (
                    <SearchableSelect<Warehouse>
                      inputId={`production-settings-${field.key}`}
                      label={field.label}
                      required
                      value={values[field.key]}
                      defaultDisplayText={values[field.key]}
                      items={warehouses}
                      isLoading={warehousesLoading}
                      isError={warehousesError}
                      placeholder="Select warehouse"
                      disabled={save.isPending}
                      getItemKey={(w) => w.warehouse_code}
                      getItemLabel={(w) => `${w.warehouse_name} (${w.warehouse_code})`}
                      filterFn={(w, search) =>
                        w.warehouse_name.toLowerCase().includes(search.toLowerCase()) ||
                        w.warehouse_code.toLowerCase().includes(search.toLowerCase())
                      }
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
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="font-mono text-sm">{values[field.key] || '—'}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{field.help}</p>
                </div>
              ))}

              {canEdit && (
                <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                  <Button size="sm" onClick={() => void handleSave()} disabled={!canSave}>
                    {save.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                  {dirty && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDraft(null);
                      }}
                      disabled={save.isPending}
                    >
                      Discard changes
                    </Button>
                  )}
                  {dirty && missing.length > 0 && (
                    <span className="text-sm text-destructive">
                      Pick the {missing.map((f) => f.label).join(', ')}.
                    </span>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {settings.data?.is_saved && settings.data.updated_at
                  ? `Last changed ${new Date(settings.data.updated_at).toLocaleString('en-IN')}${
                      settings.data.updated_by_name ? ` by ${settings.data.updated_by_name}` : ''
                    }.`
                  : 'These are the defaults — nobody has changed them yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
