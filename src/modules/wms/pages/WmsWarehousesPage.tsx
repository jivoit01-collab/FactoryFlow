/**
 * Warehouses list (Step 3).
 *
 * Manage saved warehouses — open in the editor, clone, delete (cascading its
 * zones + locations), export a JSON backup, or import one. "New warehouse" opens
 * the designer.
 */
import { useMemo, useRef, useState } from 'react';
import {
  Copy,
  Download,
  LayoutTemplate as TemplateIcon,
  Plus,
  Trash2,
  Upload,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { AdminOnlyNotice } from '../components/AdminOnlyNotice';
import { useWarehouses, useWmsCollection, useWmsEnabled, useWmsRole, wmsStore } from '../store';
import {
  buildWarehouseExport,
  instantiateTemplate,
  parseWarehouseCsv,
  parseWarehouseExport,
  rekeyWarehouseBundle,
} from '../services';
import type { LayoutTemplate, Warehouse } from '../types';

export default function WmsWarehousesPage() {
  const enabled = useWmsEnabled();
  const { isAdmin } = useWmsRole();
  const navigate = useNavigate();
  const { warehouses, loading } = useWarehouses();
  const { data: locations } = useWmsCollection('locations');
  const { data: templates } = useWmsCollection('templates');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const locationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const location of locations) {
      counts.set(location.warehouseId, (counts.get(location.warehouseId) ?? 0) + 1);
    }
    return counts;
  }, [locations]);

  async function handleClone(warehouse: Warehouse) {
    setBusyId(warehouse.id);
    try {
      const bundle = await wmsStore.getWarehouseBundle(warehouse.id);
      if (!bundle) throw new Error('Warehouse not found.');
      const cloned = rekeyWarehouseBundle(bundle, {
        name: `${warehouse.name} (copy)`,
        code: `${warehouse.code}-COPY`,
      });
      await wmsStore.saveWarehouseBundle(cloned);
      toast.success(`Cloned "${warehouse.name}".`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Clone failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleExport(warehouse: Warehouse) {
    try {
      const bundle = await wmsStore.getWarehouseBundle(warehouse.id);
      if (!bundle) throw new Error('Warehouse not found.');
      const payload = buildWarehouseExport(bundle);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `warehouse-${warehouse.code || warehouse.id}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed.');
    }
  }

  async function handleDelete(warehouse: Warehouse) {
    if (!window.confirm(`Delete "${warehouse.name}" and all its locations? This cannot be undone.`)) {
      return;
    }
    setBusyId(warehouse.id);
    try {
      await wmsStore.deleteWarehouseCascade(warehouse.id);
      toast.success(`Deleted "${warehouse.name}".`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const isCsv = file.name.toLowerCase().endsWith('.csv') || !text.trim().startsWith('{');
      let warehouse: Warehouse;
      if (isCsv) {
        const baseName = file.name.replace(/\.csv$/i, '');
        const bundle = parseWarehouseCsv(text, { name: `${baseName} (imported)` });
        warehouse = await wmsStore.saveWarehouseBundle(bundle);
      } else {
        const bundle = parseWarehouseExport(JSON.parse(text));
        const imported = rekeyWarehouseBundle(bundle, {
          name: `${bundle.warehouse.name} (imported)`,
          code: `${bundle.warehouse.code}-IMP`,
        });
        warehouse = await wmsStore.saveWarehouseBundle(imported);
      }
      toast.success(`Imported "${warehouse.name}".`);
      navigate(`/warehouse-ops/warehouses/${warehouse.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not import that file.');
    }
  }

  async function handleUseTemplate(template: LayoutTemplate) {
    try {
      const bundle = instantiateTemplate(template, { name: `${template.name}` });
      const warehouse = await wmsStore.saveWarehouseBundle(bundle);
      setTemplateDialogOpen(false);
      toast.success(`Created "${warehouse.name}" from template.`);
      navigate(`/warehouse-ops/warehouses/${warehouse.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not use that template.');
    }
  }

  async function handleDeleteTemplate(template: LayoutTemplate) {
    try {
      await wmsStore.remove('templates', template.id);
      toast.success('Template deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed.');
    }
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <WmsDisabledNotice />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <AdminOnlyNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Warehouses</h1>
          <p className="text-sm text-muted-foreground">Design and manage your warehouse layouts.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json,.csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportFile(file);
              event.target.value = '';
            }}
          />
          <Button
            variant="outline"
            disabled={templates.length === 0}
            title={templates.length === 0 ? 'Save a template from a warehouse first' : undefined}
            onClick={() => setTemplateDialogOpen(true)}
          >
            <TemplateIcon className="mr-2 h-4 w-4" />
            From template
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button asChild>
            <Link to="/warehouse-ops/designer">
              <Plus className="mr-2 h-4 w-4" />
              New warehouse
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : warehouses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <WarehouseIcon className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No warehouses yet.</p>
            <Button asChild>
              <Link to="/warehouse-ops/designer">
                <Plus className="mr-2 h-4 w-4" />
                Design your first warehouse
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {warehouses.map((warehouse) => (
            <Card key={warehouse.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link to={`/warehouse-ops/warehouses/${warehouse.id}`} className="hover:underline">
                      {warehouse.name}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{warehouse.code}</span>
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {warehouse.type === 'SAP' ? (
                      <>SAP warehouse · {warehouse.sapWarehouseCode ?? '—'}</>
                    ) : (
                      <>
                        {warehouse.columns}×{warehouse.rows}
                        {warehouse.levels > 1 ? `×${warehouse.levels}` : ''} ·{' '}
                        {locationCounts.get(warehouse.id) ?? 0} locations
                        {warehouse.sapWarehouseCode ? ` · SAP ${warehouse.sapWarehouseCode}` : ''}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/warehouse-ops/warehouses/${warehouse.id}`}>Open</Link>
                  </Button>
                  <IconAction title="Clone" disabled={busyId === warehouse.id} onClick={() => void handleClone(warehouse)}>
                    <Copy className="h-4 w-4" />
                  </IconAction>
                  <IconAction title="Export backup" onClick={() => void handleExport(warehouse)}>
                    <Download className="h-4 w-4" />
                  </IconAction>
                  <IconAction
                    title="Delete"
                    disabled={busyId === warehouse.id}
                    onClick={() => void handleDelete(warehouse)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </IconAction>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create from template</DialogTitle>
            <DialogDescription>Spawn a new warehouse from a saved layout template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates saved yet.</p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {template.columns}×{template.rows}
                      {template.levels > 1 ? `×${template.levels}` : ''} · {template.zones.length} zones
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" onClick={() => void handleUseTemplate(template)}>
                      Use
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete template"
                      onClick={() => void handleDeleteTemplate(template)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconAction({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button variant="ghost" size="icon" title={title} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}
