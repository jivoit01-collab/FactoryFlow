import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Settings2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
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
import { useScrollToError } from '@/shared/hooks';

import {
  useCreateRun,
  useMachines,
  usePreformSpecs,
  useRateConfigs,
  useRun,
  useUpdateRun,
} from '../api';
import { type RunFormData, type RunFormInput, runFormSchema } from '../schemas';
import type { BlowingRateConfig } from '../types';

const num = (v: unknown) => Number(v ?? 0) || 0;
const money = (v: number, d = 2) => v.toLocaleString('en-IN', { maximumFractionDigits: d });

function pickEffectiveRate(configs: BlowingRateConfig[], date: string) {
  return configs
    .filter((c) => c.is_active && c.effective_from <= date)
    .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))[0];
}

function RunFormPage() {
  const navigate = useNavigate();
  const { runId } = useParams();
  const isEdit = !!runId;
  const runIdNum = runId ? Number(runId) : undefined;

  const { data: machines = [] } = useMachines(true);
  const { data: specs = [] } = usePreformSpecs(true);
  const { data: rateConfigs = [] } = useRateConfigs(true);
  const { data: existing } = useRun(runIdNum);
  const createRun = useCreateRun();
  const updateRun = useUpdateRun();

  const form = useForm<RunFormInput, unknown, RunFormData>({
    resolver: zodResolver(runFormSchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10), preform_boxes_used: 0, remarks: '' },
  });
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = form;
  useScrollToError(errors);

  useEffect(() => {
    if (existing) {
      reset({
        date: existing.date,
        machine_id: existing.machine,
        preform_spec_id: existing.preform_spec,
        preform_boxes_used: Number(existing.preform_boxes_used),
        remarks: existing.remarks,
      });
    }
  }, [existing, reset]);

  const values = watch();
  const machine = machines.find((m) => m.id === Number(values.machine_id));
  const spec = specs.find((s) => s.id === Number(values.preform_spec_id));
  const effectiveRate = useMemo(
    () => pickEffectiveRate(rateConfigs, values.date || ''),
    [rateConfigs, values.date],
  );

  const onSubmit = async (data: RunFormData) => {
    try {
      if (isEdit && runIdNum) {
        const updated = await updateRun.mutateAsync({ id: runIdNum, data });
        toast.success('Run updated');
        navigate(`/production/blowing/runs/${updated.id}`);
      } else {
        const created = await createRun.mutateAsync(data);
        toast.success(`Run #${created.run_number} created`);
        navigate(`/production/blowing/runs/${created.id}`);
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to save run');
    }
  };

  const saving = createRun.isPending || updateRun.isPending;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={isEdit ? 'Edit Blowing Run' : 'New Blowing Run'}
        description="Set up the run — request preform, then Start / Stop / log breakdowns on the run page"
      >
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </DashboardHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Run setup</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>}
            </div>
            <div>
              <Label htmlFor="boxes">Preform boxes to load</Label>
              <Input id="boxes" type="number" step="0.01" {...register('preform_boxes_used')} />
              <p className="mt-1 text-xs text-muted-foreground">Drives the warehouse preform request (boxes × preforms/box)</p>
            </div>
            <div>
              <Label>Machine</Label>
              <Select
                value={values.machine_id ? String(values.machine_id) : ''}
                onValueChange={(v) => setValue('machine_id', Number(v), { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.machine_id && <p className="mt-1 text-sm text-red-500">{errors.machine_id.message}</p>}
            </div>
            <div>
              <Label>Preform spec</Label>
              <Select
                value={values.preform_spec_id ? String(values.preform_spec_id) : ''}
                onValueChange={(v) => setValue('preform_spec_id', Number(v), { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select preform" /></SelectTrigger>
                <SelectContent>
                  {specs.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.make} {Number(s.gram)}g</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.preform_spec_id && <p className="mt-1 text-sm text-red-500">{errors.preform_spec_id.message}</p>}
            </div>
          </CardContent>
        </Card>

        {values.date && (
          effectiveRate ? (
            <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="h-4 w-4 text-blue-600" /> Rate basis
                  <Badge variant="secondary" className="text-xs font-normal">effective {effectiveRate.effective_from}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                {[
                  { label: 'Operator/day', value: money(num(effectiveRate.operator_rate_per_day)) },
                  { label: 'Labour/day', value: money(num(effectiveRate.labour_rate_per_day)) },
                  { label: 'Electric/unit', value: money(num(effectiveRate.electricity_rate_per_unit), 4) },
                  { label: 'Preform/bottle', value: spec ? money(num(spec.preform_rate_per_bottle), 4) : '—' },
                  { label: 'Packing/bottle', value: money(num(effectiveRate.packing_rate_per_bottle), 4) },
                  { label: 'Machine dep/day', value: money(num(machine?.depreciation_per_day)) },
                ].map((t) => (
                  <div key={t.label} className="rounded border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    <p className="truncate text-sm font-medium">₹ {t.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
              <Settings2 className="h-4 w-4" />
              No active rate config for {values.date}.{' '}
              <button type="button" className="text-blue-600 hover:underline" onClick={() => navigate('/production/blowing/master-data')}>
                Configure rates
              </button>{' '}— a run can't be costed without it.
            </div>
          )
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create run'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default RunFormPage;
