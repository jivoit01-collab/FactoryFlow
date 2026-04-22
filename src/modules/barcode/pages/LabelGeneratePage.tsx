import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Plus, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label as FormLabel } from '@/shared/components/ui';

import { useLines, useLineConfigs } from '@/modules/production/execution/api';
import { useWMSWarehouses } from '@/modules/warehouse/api';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import type { WarehouseOption } from '@/modules/warehouse/types';
import { useGenerateBoxes, useCreatePallet, usePrintBulk } from '../api';
import BoxLabel from '../components/BoxLabel';
import type { Box, BoxLabelData } from '../types';
import type { LabelData } from '../types';

export default function LabelGeneratePage() {
  const generateMutation = useGenerateBoxes();
  const palletMutation = useCreatePallet();
  const printBulkMutation = usePrintBulk();

  // Line config selection for auto-fill
  const { data: lines = [] } = useLines(true);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const { data: lineConfigs = [] } = useLineConfigs(selectedLineId ?? undefined);

  // SAP warehouses
  const { data: whData } = useWMSWarehouses();
  const warehouses: WarehouseOption[] = whData?.warehouses ?? [];

  const [generatedBoxes, setGeneratedBoxes] = useState<Box[]>([]);
  const [labelDataList, setLabelDataList] = useState<LabelData[]>([]);
  const [selectedBoxIds, setSelectedBoxIds] = useState<number[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'Box Labels' });

  // Form state
  const [form, setForm] = useState({
    item_code: '',
    item_name: '',
    batch_number: '',
    qty: '',
    box_count: '',
    uom: 'PCS',
    mfg_date: '',
    exp_date: '',
    warehouse: '',
    production_line: '',
    g_weight: '',
    n_weight: '',
  });

  const updateForm = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleConfigSelect = (configId: string) => {
    const config = lineConfigs.find((c) => c.id === Number(configId));
    if (!config) return;
    const lineName = lines.find((l) => l.id === selectedLineId)?.name || '';
    setForm((prev) => ({
      ...prev,
      item_code: config.sku_code || prev.item_code,
      item_name: config.sku_name || prev.item_name,
      production_line: lineName,
    }));
  };

  const handleGenerate = async () => {
    try {
      const boxes = await generateMutation.mutateAsync({
        item_code: form.item_code,
        item_name: form.item_name,
        batch_number: form.batch_number,
        qty: Number(form.qty),
        box_count: Number(form.box_count),
        uom: form.uom,
        mfg_date: form.mfg_date,
        ...(form.exp_date ? { exp_date: form.exp_date } : {}),
        ...(form.g_weight ? { g_weight: Number(form.g_weight) } : {}),
        ...(form.n_weight ? { n_weight: Number(form.n_weight) } : {}),
        warehouse: form.warehouse,
        production_line: form.production_line,
      });
      setGeneratedBoxes(boxes);
      setSelectedBoxIds(boxes.map((b) => b.id));

      // Fetch label data for printing
      const labels = await printBulkMutation.mutateAsync(
        boxes.map((b) => ({ label_type: 'BOX' as const, id: b.id }))
      );
      setLabelDataList(labels);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (err as Error)?.message
        || 'Failed to generate boxes';
      toast.error(msg);
    }
  };

  const handleCreatePallet = async () => {
    if (selectedBoxIds.length === 0) return;
    try {
      await palletMutation.mutateAsync({
        box_ids: selectedBoxIds,
        warehouse: form.warehouse,
        production_line: form.production_line,
      });
      alert('Pallet created successfully!');
    } catch {
      // Error handled by mutation
    }
  };

  const toggleBox = (boxId: number) => {
    setSelectedBoxIds((prev) =>
      prev.includes(boxId) ? prev.filter((id) => id !== boxId) : [...prev, boxId]
    );
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Generate Labels"
        subtitle="Create box labels for a batch of items"
      />

      {/* Line Config Selector — auto-fill item from production config */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Quick Fill from Line Configuration</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-[200px]">
              <FormLabel className="text-xs">Production Line</FormLabel>
              <Select
                value={selectedLineId ? String(selectedLineId) : ''}
                onValueChange={(v) => setSelectedLineId(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select line" />
                </SelectTrigger>
                <SelectContent>
                  {lines.map((line) => (
                    <SelectItem key={line.id} value={String(line.id)}>{line.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedLineId && lineConfigs.length > 0 && (
              <div className="w-[300px]">
                <FormLabel className="text-xs">Configuration (SKU)</FormLabel>
                <Select onValueChange={handleConfigSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select config to auto-fill" />
                  </SelectTrigger>
                  <SelectContent>
                    {lineConfigs.map((cfg) => (
                      <SelectItem key={cfg.id} value={String(cfg.id)}>
                        {cfg.config_name} {cfg.sku_code ? `(${cfg.sku_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Item Code *</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.item_code} onChange={(e) => updateForm('item_code', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Item Name</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.item_name} onChange={(e) => updateForm('item_name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Batch Number *</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.batch_number} onChange={(e) => updateForm('batch_number', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Qty per Box *</label>
              <div className="flex gap-2 mt-1">
                <input type="number" className="flex-1 border rounded px-3 py-2 text-sm" value={form.qty} onChange={(e) => updateForm('qty', e.target.value)} />
                <select className="w-24 border rounded px-2 py-2 text-sm" value={form.uom} onChange={(e) => updateForm('uom', e.target.value)} title="Unit of Measure">
                  <option value="">UOM</option>
                  <option value="PCS">PCS</option>
                  <option value="BOX">BOX</option>
                  <option value="KG">KG</option>
                  <option value="LTR">LTR</option>
                  <option value="ML">ML</option>
                  <option value="GM">GM</option>
                  <option value="NOS">NOS</option>
                  <option value="SET">SET</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Number of Boxes *</label>
              <input type="number" className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.box_count} onChange={(e) => updateForm('box_count', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mfg Date *</label>
              <input type="date" className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.mfg_date} onChange={(e) => updateForm('mfg_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Exp Date</label>
              <input type="date" className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.exp_date} onChange={(e) => updateForm('exp_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">G.Weight</label>
              <input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.g_weight} onChange={(e) => updateForm('g_weight', e.target.value)} placeholder="Gross weight" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">N.Weight</label>
              <input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.n_weight} onChange={(e) => updateForm('n_weight', e.target.value)} placeholder="Net weight" />
            </div>
            <div>
              <SearchableSelect<WarehouseOption>
                items={warehouses}
                isLoading={false}
                getItemKey={(wh) => wh.code}
                getItemLabel={(wh) => `${wh.code} — ${wh.name}`}
                renderItem={(wh) => (
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-mono text-xs font-medium">{wh.code}</span>
                    <span className="text-sm truncate">{wh.name}</span>
                  </div>
                )}
                placeholder="Search warehouse..."
                label="Warehouse"
                required
                inputId="barcode-warehouse"
                loadingText="Loading..."
                emptyText="No warehouses available"
                notFoundText="No matching warehouse"
                value={form.warehouse ? `${form.warehouse} — ${warehouses.find((w) => w.code === form.warehouse)?.name ?? ''}` : ''}
                defaultDisplayText={form.warehouse ? `${form.warehouse} — ${warehouses.find((w) => w.code === form.warehouse)?.name ?? ''}` : ''}
                onItemSelect={(wh) => updateForm('warehouse', wh.code)}
                onClear={() => updateForm('warehouse', '')}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Production Line</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.production_line} onChange={(e) => updateForm('production_line', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleGenerate} disabled={generateMutation.isPending || !form.item_code || !form.batch_number || !form.qty || !form.box_count || !form.mfg_date || !form.warehouse}>
              <Plus className="h-4 w-4 mr-1" />
              {generateMutation.isPending ? 'Generating...' : 'Generate Boxes'}
            </Button>
          </div>

          {generateMutation.isError && (
            <p className="text-sm text-red-600 mt-2">
              {(generateMutation.error as Error)?.message || 'Failed to generate boxes'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generated boxes */}
      {generatedBoxes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                Generated {generatedBoxes.length} Boxes
              </h3>
              <div className="flex gap-2">
                {labelDataList.length > 0 && (
                  <Button size="sm" onClick={() => handlePrint()}>
                    <Printer className="h-4 w-4 mr-1" /> Print All Labels
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreatePallet}
                  disabled={palletMutation.isPending || selectedBoxIds.length === 0}
                >
                  Create Pallet ({selectedBoxIds.length} boxes)
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 w-8">
                      <input
                        type="checkbox"
                        checked={selectedBoxIds.length === generatedBoxes.length}
                        onChange={() =>
                          setSelectedBoxIds(
                            selectedBoxIds.length === generatedBoxes.length
                              ? []
                              : generatedBoxes.map((b) => b.id)
                          )
                        }
                      />
                    </th>
                    <th className="text-left p-2 font-medium">Barcode</th>
                    <th className="text-right p-2 font-medium">Qty</th>
                    <th className="text-left p-2 font-medium">Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedBoxes.map((box) => (
                    <tr key={box.id} className="border-b">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedBoxIds.includes(box.id)}
                          onChange={() => toggleBox(box.id)}
                        />
                      </td>
                      <td className="p-2 font-mono text-xs">{box.box_barcode}</td>
                      <td className="p-2 text-right">{box.qty} {box.uom}</td>
                      <td className="p-2">{box.current_warehouse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {palletMutation.isSuccess && (
              <p className="text-sm text-green-600 mt-2">Pallet created successfully!</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hidden print area */}
      <div className="hidden">
        <div ref={printRef}>
          {labelDataList.map((label) => (
            <BoxLabel key={label.id} data={label as BoxLabelData} />
          ))}
        </div>
      </div>
    </div>
  );
}
