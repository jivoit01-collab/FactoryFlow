import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui';

import { useCreateRun, useLines, useSAPOrders } from '../api';
import { createRunSchema, type CreateRunFormData } from '../schemas';

function StartRunPage() {
  const navigate = useNavigate();
  const { data: sapOrders, isLoading: loadingSAP } = useSAPOrders();
  const { data: lines } = useLines(true);
  const createRun = useCreateRun();

  const form = useForm<CreateRunFormData>({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      brand: '',
      pack: '',
      sap_order_no: '',
      rated_speed: '',
    },
  });

  const onSelectSAPOrder = (docEntry: string) => {
    const order = sapOrders?.find((o) => o.DocEntry === Number(docEntry));
    if (order) {
      form.setValue('sap_doc_entry', order.DocEntry);
      form.setValue('sap_order_no', String(order.DocNum));
      form.setValue('brand', order.ItemName);
      form.setValue('pack', order.ItemCode);
    }
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
      <DashboardHeader title="Start Production Run" description="Create a new production run from a SAP order" />

      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle>SAP Order</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select SAP Production Order</Label>
              <Select onValueChange={onSelectSAPOrder} disabled={loadingSAP}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingSAP ? 'Loading orders...' : 'Select an order'} />
                </SelectTrigger>
                <SelectContent>
                  {sapOrders?.map((order) => (
                    <SelectItem key={order.DocEntry} value={String(order.DocEntry)}>
                      #{order.DocNum} - {order.ItemName} ({order.RemainingQty} remaining)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.sap_doc_entry && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.sap_doc_entry.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Run Details</CardTitle></CardHeader>
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
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.line_id.message}</p>
                )}
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" {...form.register('date')} />
                {form.formState.errors.date && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.date.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Brand</Label>
                <Input {...form.register('brand')} />
                {form.formState.errors.brand && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.brand.message}</p>
                )}
              </div>
              <div>
                <Label>Pack</Label>
                <Input {...form.register('pack')} />
                {form.formState.errors.pack && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.pack.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SAP Order No.</Label>
                <Input {...form.register('sap_order_no')} readOnly />
              </div>
              <div>
                <Label>Rated Speed (cases/hr)</Label>
                <Input {...form.register('rated_speed')} placeholder="e.g., 150" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={createRun.isPending}>
            {createRun.isPending ? 'Creating...' : 'Start Run'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default StartRunPage;
