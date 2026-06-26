/**
 * Warehouse Designer — layout builder (Step 3).
 *
 * Configure a grid (columns × rows × optional levels) and a naming scheme, watch
 * a live preview update, then create every location in one action. Zones and
 * post-generation edits happen in the warehouse editor the user lands on after
 * creating.
 */
import { useMemo, useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
} from '@/shared/components/ui';

import { WarehouseGrid, type GridCell } from '../components/WarehouseGrid';
import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { useWmsEnabled } from '../store';
import { wmsStore } from '../store';
import {
  DEFAULT_NAMING_SCHEME,
  countLocations,
  generateLayout,
  makeWarehouseLocation,
  validateLayoutParams,
} from '../services';
import type { AxisStyle } from '../services';
import type { Warehouse, WarehouseNamingScheme } from '../types';
import { createWmsId, nowIso } from '../utils';

export default function WmsDesignerPage() {
  const enabled = useWmsEnabled();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [columns, setColumns] = useState(6);
  const [rows, setRows] = useState(4);
  const [levels, setLevels] = useState(1);
  const [naming, setNaming] = useState<WarehouseNamingScheme>(DEFAULT_NAMING_SCHEME);
  const [previewLevel, setPreviewLevel] = useState(0);
  const [creating, setCreating] = useState(false);

  const params = useMemo(
    () => ({ columns, rows, levels, naming }),
    [columns, rows, levels, naming],
  );
  const generated = useMemo(() => generateLayout(params), [params]);
  const total = countLocations({ columns, rows, levels });
  const safeLevel = Math.min(previewLevel, Math.max(0, levels - 1));

  const previewCells: GridCell[] = useMemo(
    () =>
      generated
        .filter((cell) => cell.level === safeLevel)
        .map((cell) => ({ id: cell.code, column: cell.column, row: cell.row, code: cell.code })),
    [generated, safeLevel],
  );

  function setNamingField<K extends keyof WarehouseNamingScheme>(key: K, value: WarehouseNamingScheme[K]) {
    setNaming((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Give the warehouse a name.');
      return;
    }
    const error = validateLayoutParams({ columns, rows, levels });
    if (error) {
      toast.error(error);
      return;
    }

    setCreating(true);
    try {
      const timestamp = nowIso();
      const warehouse: Warehouse = {
        id: createWmsId(),
        code: code.trim() || name.trim().toUpperCase().replace(/\s+/g, '-'),
        name: name.trim(),
        description: '',
        enabled: true,
        columns,
        rows,
        levels,
        namingScheme: naming,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const locations = generated.map((cell) => makeWarehouseLocation(warehouse.id, cell));
      await wmsStore.saveWarehouseBundle({ warehouse, zones: [], locations });
      toast.success(`Created "${warehouse.name}" with ${locations.length} locations.`);
      navigate(`/warehouse-ops/warehouses/${warehouse.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create the warehouse.');
    } finally {
      setCreating(false);
    }
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <WmsDisabledNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Warehouse Designer</h1>
        <p className="text-sm text-muted-foreground">
          Build a grid of storage locations, then refine zones and properties in the editor.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Config */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="wh-name">Name</Label>
                <Input
                  id="wh-name"
                  value={name}
                  placeholder="e.g. Main Warehouse"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wh-code">Code (optional)</Label>
                <Input
                  id="wh-code"
                  value={code}
                  placeholder="Auto from name"
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grid</CardTitle>
              <CardDescription>{total} locations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <NumberField id="wh-cols" label="Columns" value={columns} onChange={setColumns} />
                <NumberField id="wh-rows" label="Rows" value={rows} onChange={setRows} />
                <NumberField id="wh-levels" label="Levels" value={levels} onChange={setLevels} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Naming</CardTitle>
              <CardDescription>How location codes are generated.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AxisStyleField
                id="naming-col"
                label="Columns"
                value={naming.columnStyle}
                onChange={(value) => setNamingField('columnStyle', value)}
              />
              <AxisStyleField
                id="naming-row"
                label="Rows"
                value={naming.rowStyle}
                onChange={(value) => setNamingField('rowStyle', value)}
              />
              {levels > 1 ? (
                <AxisStyleField
                  id="naming-level"
                  label="Levels"
                  value={naming.levelStyle}
                  onChange={(value) => setNamingField('levelStyle', value)}
                />
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="naming-prefix">Prefix</Label>
                  <Input
                    id="naming-prefix"
                    value={naming.prefix}
                    placeholder="none"
                    onChange={(event) => setNamingField('prefix', event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="naming-sep">Separator</Label>
                  <Input
                    id="naming-sep"
                    value={naming.separator}
                    maxLength={3}
                    onChange={(event) => setNamingField('separator', event.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" disabled={creating} onClick={() => void handleCreate()}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Create warehouse
          </Button>
        </div>

        {/* Live preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Live preview</CardTitle>
              <CardDescription>
                Example code: <span className="font-mono">{generated[0]?.code ?? '—'}</span>
              </CardDescription>
            </div>
            {levels > 1 ? (
              <div className="flex items-center gap-2">
                <Label htmlFor="preview-level" className="text-xs">
                  Level
                </Label>
                <NativeSelect
                  id="preview-level"
                  className="w-24"
                  value={safeLevel}
                  onChange={(event) => setPreviewLevel(Number(event.target.value))}
                >
                  {Array.from({ length: levels }, (_, level) => (
                    <option key={level} value={level}>
                      {level + 1}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {total > 0 ? (
              <WarehouseGrid columns={columns} rows={rows} naming={naming} cells={previewCells} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Set columns and rows to preview the grid.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={100}
        value={value}
        onChange={(event) => onChange(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
      />
    </div>
  );
}

function AxisStyleField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: AxisStyle;
  onChange: (value: AxisStyle) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <NativeSelect
        id={id}
        className="w-32"
        value={value}
        onChange={(event) => onChange(event.target.value as AxisStyle)}
      >
        <option value="LETTERS">Letters</option>
        <option value="NUMBERS">Numbers</option>
      </NativeSelect>
    </div>
  );
}
