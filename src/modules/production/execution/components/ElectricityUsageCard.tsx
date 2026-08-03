import { Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/shared/components/ui';

import { useCreateElectricity, useDeleteElectricity, useElectricity } from '../api';

interface ElectricityUsageCardProps {
  runId: number;
}

const fmt = (value: string | number | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '0';
};

/**
 * Metered electricity entry for a run. Deliberately stays editable after the
 * run completes — meter readings and electricity bills often arrive later.
 * Recorded units replace the line-profile estimate in the cost breakdown,
 * priced at the Cost Master "Electricity — Usage" rate.
 */
export function ElectricityUsageCard({ runId }: ElectricityUsageCardProps) {
  const { data: entries = [] } = useElectricity(runId);
  const createEntry = useCreateElectricity(runId);
  const deleteEntry = useDeleteElectricity(runId);

  const [units, setUnits] = useState('');
  const [description, setDescription] = useState('');

  const totalUnits = entries.reduce((sum, e) => sum + Number(e.units_consumed || 0), 0);

  const handleAdd = async () => {
    const n = Number(units);
    if (!units || !Number.isFinite(n) || n <= 0) {
      toast.error('Enter the units consumed (a positive number).');
      return;
    }
    try {
      await createEntry.mutateAsync({ description, units_consumed: units });
      toast.success('Electricity entry added');
      setUnits('');
      setDescription('');
    } catch {
      toast.error('Failed to add electricity entry');
    }
  };

  const handleDelete = async (entryId: number) => {
    try {
      await deleteEntry.mutateAsync(entryId);
      toast.success('Electricity entry removed');
    } catch {
      toast.error('Failed to remove electricity entry');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4" /> Electricity Used
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Meter/bill readings — stays open after run completion
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium">Description</th>
                  <th className="text-right p-2 font-medium">Units (kWh)</th>
                  <th className="text-left p-2 font-medium">Recorded</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-2">{e.description || '—'}</td>
                    <td className="p-2 text-right font-mono">{fmt(e.units_consumed)}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(e.id)}
                        disabled={deleteEntry.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td className="p-2 font-medium">Total</td>
                  <td className="p-2 text-right font-mono font-medium">{fmt(totalUnits)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="w-40">
            <label className="text-xs text-muted-foreground">Units consumed (kWh)</label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="e.g. 150"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="text-xs text-muted-foreground">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. meter reading / bill for 30-07"
            />
          </div>
          <Button onClick={handleAdd} disabled={createEntry.isPending}>
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Units recorded here are taken as the run&apos;s actual electricity consumption,
          replacing the per-hour estimate from the line profile.
        </p>
      </CardContent>
    </Card>
  );
}
