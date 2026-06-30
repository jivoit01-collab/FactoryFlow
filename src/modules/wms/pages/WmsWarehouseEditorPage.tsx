/**
 * Warehouse editor (Step 3) — full layout editing.
 *
 * Open a saved warehouse and refine it: switch levels; select cells (click,
 * shift-click range, or click a header to take a whole column/row); group a
 * selection into a zone; assign/clear zones; bulk enable/disable; delete;
 * rename a single location; add/remove columns, rows, and levels; undo/redo;
 * save the layout as a reusable template; and export the locations as CSV.
 * Every edit persists immediately and is undoable.
 */
import { ArrowLeft, Download, Loader2, Map as MapIcon, Redo2, Save, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  NativeSelect,
} from '@/shared/components/ui';

import { AdminOnlyNotice } from '../components/AdminOnlyNotice';
import { LocationPropertiesPanel } from '../components/LocationPropertiesPanel';
import { TextPromptDialog } from '../components/TextPromptDialog';
import { type GridCell,WarehouseGrid } from '../components/WarehouseGrid';
import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { WmsPrintLabelButton } from '../components/WmsPrintLabelButton';
import { ZoneDialog, type ZoneFormValue } from '../components/ZoneDialog';
import type { LocationDraft, LocationDraftField } from '../services';
import {
  addColumn,
  addLevel,
  addRow,
  applyLocationDraft,
  axisLabel,
  buildLocationsCsv,
  buildTemplate,
  makeZone,
  removeColumn,
  removeLevel,
  removeRow,
  renameLocation,
} from '../services';
import { useWarehouseEditor, useWmsEnabled, useWmsRole, wmsStore } from '../store';
import type { WarehouseLocation } from '../types';
import { nowIso } from '../utils';

export default function WmsWarehouseEditorPage() {
  const { warehouseId = '' } = useParams();
  const enabled = useWmsEnabled();
  const { isAdmin } = useWmsRole();
  const editor = useWarehouseEditor(warehouseId);
  const { bundle, loading, busy, canUndo, canRedo, mutate, undo, redo } = editor;

  const warehouse = bundle?.warehouse ?? null;
  const zones = bundle?.zones ?? [];
  const locations = useMemo(() => bundle?.locations ?? [], [bundle]);

  const [level, setLevel] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClicked, setLastClicked] = useState<{ column: number; row: number } | null>(null);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<WarehouseLocation | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [propsTargets, setPropsTargets] = useState<WarehouseLocation[]>([]);
  const [propsOpen, setPropsOpen] = useState(false);

  const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const safeLevel = warehouse ? Math.min(level, Math.max(0, warehouse.levels - 1)) : 0;

  const levelLocations = useMemo(
    () => locations.filter((location) => location.level === safeLevel),
    [locations, safeLevel],
  );

  const cells: GridCell[] = useMemo(
    () =>
      levelLocations.map((location) => ({
        id: location.id,
        column: location.column,
        row: location.row,
        code: location.code,
        zoneColor: location.zoneId ? zoneById.get(location.zoneId)?.color ?? null : null,
        enabled: location.enabled,
        status: location.status,
      })),
    [levelLocations, zoneById],
  );

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const isSelected = (id: string) => selectedIds.has(id);

  function clearSelection() {
    setSelectedIds(new Set());
    setLastClicked(null);
  }

  function handleCellClick(cell: GridCell, shiftKey: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastClicked) {
        const [minC, maxC] = [Math.min(lastClicked.column, cell.column), Math.max(lastClicked.column, cell.column)];
        const [minR, maxR] = [Math.min(lastClicked.row, cell.row), Math.max(lastClicked.row, cell.row)];
        for (const location of levelLocations) {
          if (location.column >= minC && location.column <= maxC && location.row >= minR && location.row <= maxR) {
            next.add(location.id);
          }
        }
      } else if (next.has(cell.id)) {
        next.delete(cell.id);
      } else {
        next.add(cell.id);
      }
      return next;
    });
    setLastClicked({ column: cell.column, row: cell.row });
  }

  function handleHeaderClick(axis: 'column' | 'row', index: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const location of levelLocations) {
        if (location[axis] === index) next.add(location.id);
      }
      return next;
    });
  }

  async function run(action: () => Promise<unknown>, successMessage?: string, keepSelection = false) {
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      if (!keepSelection) clearSelection();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed.');
    }
  }

  // -- selection-based edits (all undoable via mutate) ----------------------

  function handleCreateZone(value: ZoneFormValue) {
    if (!warehouse) return;
    const ids = new Set(selectedArray);
    void run(
      () =>
        mutate((current) => {
          const zone = makeZone(current.warehouse.id, value);
          return {
            warehouse: current.warehouse,
            zones: [...current.zones, zone],
            locations: current.locations.map((location) =>
              ids.has(location.id) ? { ...location, zoneId: zone.id, updatedAt: nowIso() } : location,
            ),
          };
        }),
      `Created zone "${value.name}" over ${ids.size} locations.`,
    );
    setZoneDialogOpen(false);
  }

  function assignZone(zoneId: string | null) {
    const ids = new Set(selectedArray);
    void run(
      () =>
        mutate((current) => ({
          ...current,
          locations: current.locations.map((location) =>
            ids.has(location.id) ? { ...location, zoneId, updatedAt: nowIso() } : location,
          ),
        })),
      zoneId ? 'Zone assigned.' : 'Zone cleared.',
    );
  }

  function setEnabledForSelection(value: boolean) {
    const ids = new Set(selectedArray);
    void run(
      () =>
        mutate((current) => ({
          ...current,
          locations: current.locations.map((location) =>
            ids.has(location.id) ? { ...location, enabled: value, updatedAt: nowIso() } : location,
          ),
        })),
      value ? 'Locations enabled.' : 'Locations disabled.',
    );
  }

  function deleteSelected() {
    if (!window.confirm(`Delete ${selectedArray.length} location(s)?`)) return;
    const ids = new Set(selectedArray);
    void run(
      () => mutate((current) => ({ ...current, locations: current.locations.filter((l) => !ids.has(l.id)) })),
      'Locations deleted.',
    );
  }

  function handleRename(code: string) {
    const target = renameTarget;
    if (!target) return;
    void run(() => mutate((current) => renameLocation(current, target.id, code)), 'Location renamed.');
    setRenameTarget(null);
  }

  // -- property editor ------------------------------------------------------

  function openProperties(targets: WarehouseLocation[]) {
    if (!targets.length) return;
    setPropsTargets(targets);
    setPropsOpen(true);
  }

  function handleSaveProperties(draft: LocationDraft, touched: Set<LocationDraftField>) {
    const ids = new Set(propsTargets.map((location) => location.id));
    void run(
      () =>
        mutate((current) => ({
          ...current,
          locations: current.locations.map((location) =>
            ids.has(location.id) ? applyLocationDraft(location, draft, touched) : location,
          ),
        })),
      ids.size > 1 ? `Updated ${ids.size} locations.` : 'Location updated.',
    );
    setPropsOpen(false);
  }

  // -- structural edits -----------------------------------------------------

  const addAxisAction = (fn: typeof addColumn, label: string) =>
    void run(() => mutate((current) => fn(current)), `Added ${label}.`);

  const removeAxisAction = (fn: typeof removeColumn, index: number, label: string) =>
    void run(() => mutate((current) => fn(current, index)), `Removed ${label}.`);

  // -- template / export ----------------------------------------------------

  function handleSaveTemplate(name: string) {
    if (!bundle) return;
    void run(() => wmsStore.create('templates', buildTemplate(name, bundle)), `Saved template "${name}".`, true);
    setTemplateOpen(false);
  }

  function handleExportCsv() {
    if (!bundle) return;
    const blob = new Blob([buildLocationsCsv(bundle)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `warehouse-${warehouse?.code || warehouseId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Warehouse not found.</p>
        <Button asChild variant="outline">
          <Link to="/warehouse-ops/warehouses">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to warehouses
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" title="Back">
            <Link to="/warehouse-ops/warehouses">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{warehouse.name}</h1>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{warehouse.code}</span> · {warehouse.columns}×
              {warehouse.rows}
              {warehouse.levels > 1 ? `×${warehouse.levels}` : ''} · {locations.length} locations
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="icon" title="Undo" disabled={!canUndo || busy} onClick={() => void undo()}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Redo" disabled={!canRedo || busy} onClick={() => void redo()}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/warehouse-ops/map?warehouse=${warehouse.id}`}>
              <MapIcon className="mr-2 h-4 w-4" /> Map
            </Link>
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setTemplateOpen(true)}>
            <Save className="mr-2 h-4 w-4" /> Save as template
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Structure + level controls */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
          <span className="text-muted-foreground">Structure:</span>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => addAxisAction(addColumn, 'column')}>
            + Column
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => addAxisAction(addRow, 'row')}>
            + Row
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => addAxisAction(addLevel, 'level')}>
            + Level
          </Button>

          {warehouse.columns > 1 ? (
            <RemoveSelect
              label="Remove column"
              disabled={busy}
              options={Array.from({ length: warehouse.columns }, (_, i) => ({
                value: i,
                label: axisLabel(warehouse.namingScheme.columnStyle, i, warehouse.columns),
              }))}
              onSelect={(index) => removeAxisAction(removeColumn, index, 'column')}
            />
          ) : null}
          {warehouse.rows > 1 ? (
            <RemoveSelect
              label="Remove row"
              disabled={busy}
              options={Array.from({ length: warehouse.rows }, (_, i) => ({
                value: i,
                label: axisLabel(warehouse.namingScheme.rowStyle, i, warehouse.rows),
              }))}
              onSelect={(index) => removeAxisAction(removeRow, index, 'row')}
            />
          ) : null}
          {warehouse.levels > 1 ? (
            <RemoveSelect
              label="Remove level"
              disabled={busy}
              options={Array.from({ length: warehouse.levels }, (_, i) => ({ value: i, label: String(i + 1) }))}
              onSelect={(index) => removeAxisAction(removeLevel, index, 'level')}
            />
          ) : null}

          {warehouse.levels > 1 ? (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Level</span>
              <NativeSelect
                className="w-24"
                value={safeLevel}
                onChange={(event) => {
                  setLevel(Number(event.target.value));
                  clearSelection();
                }}
              >
                {Array.from({ length: warehouse.levels }, (_, index) => (
                  <option key={index} value={index}>
                    {index + 1}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Zone legend */}
      {zones.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {zones.map((zone) => (
            <Badge key={zone.id} variant="outline" className="gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
              {zone.name}
              {zone.temperatureClass ? (
                <span className="text-[10px] text-muted-foreground">· {zone.temperatureClass}</span>
              ) : null}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Click to select · shift-click for a range · click a header for a column/row
          </CardTitle>
          {selectedArray.length === 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const target = levelLocations.find((l) => l.id === selectedArray[0]) ?? null;
                setRenameTarget(target);
              }}
            >
              Rename
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <WarehouseGrid
            columns={warehouse.columns}
            rows={warehouse.rows}
            naming={warehouse.namingScheme}
            cells={cells}
            selectable
            selectedIds={selectedIds}
            onCellClick={handleCellClick}
            onCellDoubleClick={(cell) => {
              const location = levelLocations.find((l) => l.id === cell.id);
              if (location) openProperties([location]);
            }}
            onHeaderClick={handleHeaderClick}
          />
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selectedArray.length > 0 ? (
        <Card className="sticky bottom-3 border-primary/40 shadow-lg">
          <CardContent className="flex flex-wrap items-center gap-2 py-3">
            <span className="mr-1 text-sm font-medium">{selectedArray.length} selected</span>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => openProperties(locations.filter((l) => isSelected(l.id)))}
            >
              Properties
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setZoneDialogOpen(true)}>
              Create zone
            </Button>
            <NativeSelect
              className="h-9 w-40"
              value=""
              disabled={busy || zones.length === 0}
              onChange={(event) => {
                if (event.target.value) assignZone(event.target.value);
              }}
            >
              <option value="">Assign zone…</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </NativeSelect>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => assignZone(null)}>
              Clear zone
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setEnabledForSelection(true)}>
              Enable
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setEnabledForSelection(false)}>
              Disable
            </Button>
            <WmsPrintLabelButton
              label="Print labels"
              documentTitle="Location labels"
              labels={locations
                .filter((l) => isSelected(l.id))
                .map((l) => ({
                  code: l.barcode || l.code,
                  title: l.code,
                  heading: 'LOCATION',
                  subtitle: l.type,
                }))}
            />
            {selectedArray.length === 1 ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setRenameTarget(levelLocations.find((l) => isSelected(l.id)) ?? null)}
              >
                Rename
              </Button>
            ) : null}
            <Button size="sm" variant="destructive" disabled={busy} onClick={deleteSelected}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={clearSelection}>
              Clear
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ZoneDialog
        open={zoneDialogOpen}
        onOpenChange={setZoneDialogOpen}
        locationCount={selectedArray.length}
        onSubmit={handleCreateZone}
      />
      <TextPromptDialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title="Rename location"
        label="Code"
        defaultValue={renameTarget?.code ?? ''}
        submitLabel="Rename"
        onSubmit={handleRename}
      />
      <TextPromptDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        title="Save as template"
        description="Reuse this layout (grid, naming, and zones) to create new warehouses."
        label="Template name"
        defaultValue={`${warehouse.name} template`}
        submitLabel="Save template"
        onSubmit={handleSaveTemplate}
      />
      <LocationPropertiesPanel
        open={propsOpen}
        onOpenChange={setPropsOpen}
        locations={propsTargets}
        zones={zones}
        onSave={handleSaveProperties}
      />
    </div>
  );
}

function RemoveSelect({
  label,
  options,
  disabled,
  onSelect,
}: {
  label: string;
  options: { value: number; label: string }[];
  disabled?: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <NativeSelect
      className="h-9 w-40"
      value=""
      disabled={disabled}
      onChange={(event) => {
        if (event.target.value !== '') onSelect(Number(event.target.value));
        event.target.value = '';
      }}
    >
      <option value="">{label}…</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {label.replace('Remove ', '')} {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}
