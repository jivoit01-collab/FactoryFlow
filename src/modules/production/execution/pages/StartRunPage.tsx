import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { useScrollToError } from '@/shared/hooks';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';

import { useCreateRun, useLines, useSAPOrders, useBOMPreview, useLineConfigs } from '../api';
import { createRunSchema, type CreateRunFormData } from '../schemas';
import type { SAPProductionOrder, LineSkuConfig } from '../types';

// ============================================================================
// SAP Order Detail Popover Content
// ============================================================================

function SAPOrderPopoverContent({ docEntry }: { docEntry: number | null }) {
  const { data: detail, isLoading } = useSAPOrderDetail(docEntry);

  if (!docEntry) {
    return <p className="text-sm text-muted-foreground">Select an order to view details.</p>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading details...</span>
      </div>
    );
  }

  if (!detail) {
    return <p className="text-sm text-muted-foreground">No details available.</p>;
  }

  const { header, components } = detail;

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-muted-foreground">Doc Num:</span>
        <span className="font-medium">#{header.DocNum}</span>
        <span className="text-muted-foreground">Item Code:</span>
        <span className="font-medium">{header.ItemCode}</span>
        <span className="text-muted-foreground">Item Name:</span>
        <span className="font-medium">{header.ProdName}</span>
        <span className="text-muted-foreground">Planned Qty:</span>
        <span className="font-medium">{header.PlannedQty}</span>
        <span className="text-muted-foreground">Completed:</span>
        <span className="font-medium">{header.CmpltQty}</span>
        <span className="text-muted-foreground">Remaining:</span>
        <span className="font-medium">{header.RemainingQty}</span>
        <span className="text-muted-foreground">Start Date:</span>
        <span className="font-medium">{header.StartDate}</span>
        <span className="text-muted-foreground">Due Date:</span>
        <span className="font-medium">{header.DueDate}</span>
        <span className="text-muted-foreground">Warehouse:</span>
        <span className="font-medium">{header.Warehouse}</span>
      </div>

      {components && components.length > 0 && (
        <div>
          <p className="font-medium mb-1">Components</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Item Code</th>
                <th className="text-left py-1">Item Name</th>
                <th className="text-right py-1">Planned</th>
                <th className="text-right py-1">Issued</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1">{c.ItemCode}</td>
                  <td className="py-1">{c.ItemName}</td>
                  <td className="text-right py-1">{c.PlannedQty}</td>
                  <td className="text-right py-1">{c.IssuedQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Start Run Page
// ============================================================================

function StartRunPage() {
  const navigate = useNavigate();
  const { data: sapOrders, isLoading: loadingSAP, isError: sapError } = useSAPOrders();
  const { data: lines } = useLines(true);
  const createRun = useCreateRun();

  const [selectedDocEntry, setSelectedDocEntry] = useState<number | null>(null);
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const { data: bomData, isLoading: loadingBOM } = useBOMPreview(selectedItemCode);

  // Fetch all configs for the selected line
  const { data: lineConfigs = [] } = useLineConfigs(selectedLineId ?? undefined);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  // Store raw per-unit BOM for scaling
  const [rawBOM, setRawBOM] = useState<{ code: string; name: string; perUnit: number; uom: string }[]>([]);

  const form = useForm<CreateRunFormData>({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      product: '',
      required_qty: '',
      rated_speed: '',
      machine_ids: [],
      labour_count: 0 as number,
      other_manpower_count: 0 as number,
      supervisor: '',
      operators: '',
      materials: [],
    },
  });

  useScrollToError(form.formState.errors);

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'materials',
  });

  const watchedRequiredQty = form.watch('required_qty');

  // Store raw BOM when SAP order changes
  const lastPopulatedItemCode = useRef<string | null>(null);
  useEffect(() => {
    if (
      bomData?.components?.length &&
      selectedItemCode &&
      lastPopulatedItemCode.current !== selectedItemCode
    ) {
      lastPopulatedItemCode.current = selectedItemCode;
      const raw = bomData.components.map((c) => ({
        code: c.ItemCode,
        name: c.ItemName,
        perUnit: c.PlannedQty,
        uom: c.UomCode ?? '',
      }));
      setRawBOM(raw);

      // Scale by required_qty if already filled, otherwise show per-unit
      const qty = parseFloat(watchedRequiredQty || '0') || 1;
      replace(
        raw.map((c) => ({
          material_code: c.code,
          material_name: c.name,
          opening_qty: (c.perUnit * qty).toFixed(3),
          issued_qty: '0',
          uom: c.uom,
        })),
      );
    }
  }, [bomData, selectedItemCode, replace, watchedRequiredQty]);

  // Re-scale BOM when required_qty changes
  useEffect(() => {
    if (rawBOM.length === 0) return;
    const qty = parseFloat(watchedRequiredQty || '0');
    if (!qty || qty <= 0) return;
    replace(
      rawBOM.map((c) => ({
        material_code: c.code,
        material_name: c.name,
        opening_qty: (c.perUnit * qty).toFixed(3),
        issued_qty: '0',
        uom: c.uom,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedRequiredQty]);

  // Reset config selection when line changes
  useEffect(() => {
    setSelectedConfigId('');
  }, [selectedLineId]);

  // Apply selected config to form fields
  const applyConfig = (configId: string) => {
    setSelectedConfigId(configId);
    if (!configId) return;

    const cfg = lineConfigs.find((c) => String(c.id) === configId);
    if (!cfg) return;

    if (cfg.rated_speed) form.setValue('rated_speed', cfg.rated_speed);
    form.setValue('labour_count', cfg.labour_count);
    form.setValue('other_manpower_count', cfg.other_manpower_count);
    if (cfg.supervisor) form.setValue('supervisor', cfg.supervisor);
    if (cfg.operators) form.setValue('operators', cfg.operators);
    toast.success(`Applied config: ${cfg.config_name}`);
  };

  const onSubmit = async (data: CreateRunFormData) => {
    try {
      const run = await createRun.mutateAsync(data);
      toast.success('Production run created successfully');
      navigate(`/production/execution/runs/${run.id}`);
    } catch {
      toast.error('Failed to create production run');
    }
  };

  const selectedConfig = lineConfigs.find((c) => String(c.id) === selectedConfigId);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Start Production Run"
        description="Create a new production run from a SAP order"
      />

      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* SAP Order Card */}
        <Card>
          <CardHeader>
            <CardTitle>SAP Order</CardTitle>
          </CardHeader>
          <CardContent>
            <SearchableSelect<SAPProductionOrder>
              items={sapOrders ?? []}
              isLoading={loadingSAP}
              isError={sapError}
              getItemKey={(o) => o.DocEntry}
              getItemLabel={(o) => `#${o.DocNum} - ${o.ProdName}`}
              filterFn={(item, search) =>
                `${item.DocNum} ${item.ProdName} ${item.ItemCode}`
                  .toLowerCase()
                  .includes(search.toLowerCase())
              }
              renderItem={(item) => (
                <div>
                  <span className="font-medium">#{item.DocNum}</span>{' '}
                  <span className="text-muted-foreground">- {item.ProdName}</span>{' '}
                  <span className="text-xs text-muted-foreground">
                    ({item.RemainingQty} remaining)
                  </span>
                </div>
              )}
              placeholder="Search by order number or product..."
              label="SAP Production Order"
              required
              inputId="sap-order"
              loadingText="Loading SAP orders..."
              emptyText="No SAP orders available"
              notFoundText="No matching orders found"
              onItemSelect={(order) => {
                form.setValue('sap_doc_entry', order.DocEntry);
                form.setValue('product', order.ProdName);
                setSelectedItemCode(order.ItemCode);
              }}
              onClear={() => {
                form.setValue('sap_doc_entry', undefined);
                form.setValue('product', '');
                setSelectedItemCode(null);
                lastPopulatedItemCode.current = null;
                replace([]);
              }}
              onSelectedKeyChange={(key) => setSelectedDocEntry(key as number | null)}
              renderPopoverContent={() => (
                <SAPOrderPopoverContent docEntry={selectedDocEntry} />
              )}
            />
            {form.formState.errors.sap_doc_entry && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.sap_doc_entry.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Run Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Run Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Production Line</Label>
                <Select onValueChange={(v) => {
                  const id = Number(v);
                  form.setValue('line_id', id);
                  setSelectedLineId(id);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select line" />
                  </SelectTrigger>
                  <SelectContent>
                    {lines?.map((line) => (
                      <SelectItem key={line.id} value={String(line.id)}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.line_id && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.line_id.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" {...form.register('date')} />
                {form.formState.errors.date && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product</Label>
                <Input {...form.register('product')} placeholder="Auto-filled from SAP order" />
                {form.formState.errors.product && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.product.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Required Quantity (units)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('required_qty')}
                  placeholder="e.g., 500"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  BOM materials will scale based on this quantity
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rated Speed (cases/hr)</Label>
                <Input {...form.register('rated_speed')} placeholder="e.g., 150" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Configuration Card — only visible when a line is selected and has configs */}
        {selectedLineId && lineConfigs.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-blue-600" />
                Line Configuration
                <Badge variant="secondary" className="text-xs font-normal">
                  {lineConfigs.length} preset{lineConfigs.length > 1 ? 's' : ''} available
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Select a preset to auto-fill speed, labour & manpower</Label>
                <Select value={selectedConfigId} onValueChange={applyConfig}>
                  <SelectTrigger className="mt-1.5 bg-background">
                    <SelectValue placeholder="Choose a line configuration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lineConfigs.map((cfg) => (
                      <SelectItem key={cfg.id} value={String(cfg.id)}>
                        <span className="font-medium">{cfg.config_name}</span>
                        <span className="text-muted-foreground ml-2">
                          — {cfg.rated_speed || '?'} cases/hr, {cfg.labour_count} labour
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show selected config summary */}
              {selectedConfig && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                  {[
                    { label: 'Speed', value: `${selectedConfig.rated_speed || '-'} cases/hr` },
                    { label: 'Labour', value: selectedConfig.labour_count },
                    { label: 'Other', value: selectedConfig.other_manpower_count },
                    { label: 'Supervisor', value: selectedConfig.supervisor || '-' },
                    { label: 'Operators', value: selectedConfig.operators || '-' },
                  ].map((item) => (
                    <div key={item.label} className="bg-background rounded px-3 py-2 border">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedLineId && lineConfigs.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
            <Settings2 className="h-4 w-4" />
            No presets for this line.{' '}
            <button
              type="button"
              className="text-blue-600 hover:underline"
              onClick={() => navigate('/production/execution/line-management')}
            >
              Configure in Line Management
            </button>
          </div>
        )}

        {/* Raw Materials Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Raw Materials (BOM)
              {loadingBOM && (
                <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading BOM...
                </span>
              )}
              {bomData && fields.length > 0 && !loadingBOM && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {bomData.component_count} from BOM
                </Badge>
              )}
              {rawBOM.length > 0 && parseFloat(watchedRequiredQty || '0') > 0 && (
                <Badge className="bg-blue-100 text-blue-800 border-0 text-xs font-normal">
                  Scaled for {watchedRequiredQty} units
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fields.length === 0 && !loadingBOM && (
              <p className="text-sm text-muted-foreground">
                {selectedItemCode
                  ? 'No BOM components found for this item.'
                  : 'Select a SAP order to auto-load BOM materials.'}
              </p>
            )}

            {fields.length > 0 && (
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-3">Code</th>
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-right py-2 px-3">Per Unit</th>
                      <th className="text-left py-2 px-3">Required Qty</th>
                      <th className="text-left py-2 px-3">UoM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const perUnit = rawBOM[index]?.perUnit;
                      return (
                        <tr key={field.id} className="border-b last:border-0">
                          <td className="py-2 px-3 font-mono text-xs">
                            {field.material_code}
                          </td>
                          <td className="py-2 px-3">{field.material_name}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground text-xs">
                            {perUnit !== undefined ? perUnit : '—'}
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              className="h-8 w-28"
                              type="number"
                              step="any"
                              min="0"
                              {...form.register(`materials.${index}.opening_qty`)}
                            />
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{field.uom}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {rawBOM.length > 0 && !parseFloat(watchedRequiredQty || '0') && (
              <p className="text-xs text-amber-600 mt-2">
                Enter "Required Quantity" above to auto-calculate scaled BOM quantities.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Manpower Card */}
        <Card>
          <CardHeader>
            <CardTitle>Manpower</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expected Labour</Label>
                <Input
                  type="number"
                  min={0}
                  {...form.register('labour_count', { valueAsNumber: true })}
                />
                {form.formState.errors.labour_count && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.labour_count.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Expected Other Manpower</Label>
                <Input
                  type="number"
                  min={0}
                  {...form.register('other_manpower_count', { valueAsNumber: true })}
                />
                {form.formState.errors.other_manpower_count && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.other_manpower_count.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supervisor Name</Label>
                <Input {...form.register('supervisor')} placeholder="Enter supervisor name" />
              </div>
              <div>
                <Label>Engineer/Operators</Label>
                <Input {...form.register('operators')} placeholder="Enter engineer/operators" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createRun.isPending}>
            {createRun.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Start Run'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default StartRunPage;
