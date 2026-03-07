import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Play } from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { createRunSchema, type CreateRunFormData } from '../schemas';
import { useProductionLines, useCreateRun } from '../api/execution.queries';

export default function StartRunPage() {
  const navigate = useNavigate();
  const { data: lines = [] } = useProductionLines(true);
  const createRun = useCreateRun();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateRunFormData>({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (data: CreateRunFormData) => {
    try {
      const run = await createRun.mutateAsync(data);
      toast.success('Production run created');
      navigate(`/production/execution/runs/${run.id}`);
    } catch {
      toast.error('Failed to create production run');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Start Production Run</h1>
          <p className="text-sm text-muted-foreground">Create a new production run entry</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && (
                <p className="text-xs text-red-500">{errors.date.message}</p>
              )}
            </div>

            {/* Production Plan ID */}
            <div className="space-y-2">
              <Label htmlFor="production_plan_id">Production Plan ID *</Label>
              <Input
                id="production_plan_id"
                type="number"
                placeholder="Enter plan ID"
                {...register('production_plan_id', { valueAsNumber: true })}
              />
              {errors.production_plan_id && (
                <p className="text-xs text-red-500">{errors.production_plan_id.message}</p>
              )}
            </div>

            {/* Line */}
            <div className="space-y-2">
              <Label htmlFor="line_id">Production Line *</Label>
              <select
                id="line_id"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...register('line_id', { valueAsNumber: true })}
              >
                <option value="">Select a line</option>
                {lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
              {errors.line_id && (
                <p className="text-xs text-red-500">{errors.line_id.message}</p>
              )}
            </div>

            {/* Brand & Pack */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" placeholder="e.g., Jivo Canola" {...register('brand')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pack">Pack Size</Label>
                <Input id="pack" placeholder="e.g., 1L" {...register('pack')} />
              </div>
            </div>

            {/* SAP Order & Rated Speed */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sap_order_no">SAP Order No.</Label>
                <Input
                  id="sap_order_no"
                  placeholder="SAP order number"
                  {...register('sap_order_no')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rated_speed">Rated Speed (cases/hr)</Label>
                <Input
                  id="rated_speed"
                  type="number"
                  placeholder="e.g., 500"
                  {...register('rated_speed', { valueAsNumber: true })}
                />
                {errors.rated_speed && (
                  <p className="text-xs text-red-500">{errors.rated_speed.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createRun.isPending}>
            <Play className="h-4 w-4 mr-2" />
            {createRun.isPending ? 'Creating...' : 'Start Run'}
          </Button>
        </div>
      </form>
    </div>
  );
}
