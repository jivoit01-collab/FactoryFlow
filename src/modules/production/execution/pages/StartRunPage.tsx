import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';

import { useCreateRun, useLines, useMachines, useSAPOrders, useBOMPreview } from '../api';
import { createRunSchema, type CreateRunFormData } from '../schemas';
import type { SAPProductionOrder } from '../types';

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
  const { data: machines } = useMachines();
  const createRun = useCreateRun();

  const [selectedDocEntry, setSelectedDocEntry] = useState<number | null>(null);
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const { data: bomData, isLoading: loadingBOM } = useBOMPreview(selectedItemCode);

  const form = useForm<CreateRunFormData>({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      product: '',
      rated_speed: '',
      machine_ids: [],
      labour_count: 0,
      other_manpower_count: 0,
      supervisor: '',
      operators: '',
      materials: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'materials',
  });

  // Auto-populate materials from BOM when a SAP order is selected
  const lastPopulatedItemCode = useRef<string | null>(null);
  useEffect(() => {
    if (
      bomData?.components?.length &&
      selectedItemCode &&
      lastPopulatedItemCode.current !== selectedItemCode
    ) {
      lastPopulatedItemCode.current = selectedItemCode;
      replace(
        bomData.components.map((c) => ({
          material_code: c.ItemCode,
          material_name: c.ItemName,
          opening_qty: '0',
          issued_qty: '0',
          uom: c.UomCode ?? '',
        })),
      );
    }
  }, [bomData, selectedItemCode, replace]);

  const selectedMachineIds = form.watch('machine_ids') ?? [];

  const handleAddMachine = (machineId: string) => {
    const id = Number(machineId);
    if (!selectedMachineIds.includes(id)) {
      form.setValue('machine_ids', [...selectedMachineIds, id]);
    }
  };

  const handleRemoveMachine = (machineId: number) => {
    form.setValue(
      'machine_ids',
      selectedMachineIds.filter((id) => id !== machineId),
    );
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
                <Select onValueChange={(v) => form.setValue('line_id', Number(v))}>
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
                <Label>Rated Speed (cases/hr)</Label>
                <Input {...form.register('rated_speed')} placeholder="e.g., 150" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Machines Card */}
        <Card>
          <CardHeader>
            <CardTitle>Machines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Add Machine</Label>
              <Select onValueChange={handleAddMachine}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a machine to add" />
                </SelectTrigger>
                <SelectContent>
                  {machines
                    ?.filter((m) => !selectedMachineIds.includes(m.id))
                    .map((machine) => (
                      <SelectItem key={machine.id} value={String(machine.id)}>
                        {machine.name} ({machine.machine_type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMachineIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMachineIds.map((id) => {
                  const machine = machines?.find((m) => m.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                      {machine?.name ?? `Machine #${id}`}
                      <button
                        type="button"
                        onClick={() => handleRemoveMachine(id)}
                        className="ml-1 rounded-full hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Raw Materials Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Raw Materials
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
                      <th className="text-left py-2 px-3">Opening Qty</th>
                      <th className="text-left py-2 px-3">Issued Qty</th>
                      <th className="text-left py-2 px-3">UoM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-mono text-xs">
                          {field.material_code}
                        </td>
                        <td className="py-2 px-3">{field.material_name}</td>
                        <td className="py-2 px-3">
                          <Input
                            className="h-8 w-28"
                            type="number"
                            step="any"
                            min="0"
                            {...form.register(`materials.${index}.opening_qty`)}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            className="h-8 w-28"
                            type="number"
                            step="any"
                            min="0"
                            {...form.register(`materials.${index}.issued_qty`)}
                          />
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{field.uom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
