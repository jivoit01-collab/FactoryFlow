/**
 * The slabs: the bands of vehicle capacity a benchmark is quoted for.
 *
 * A band is open at the bottom and closed at the top — "10 MT" is over
 * 5,000 kg up to 10,000 kg — so a vehicle of any size falls in exactly one of a
 * destination's slabs. Widening a band into a neighbour that a destination also
 * has a rate on is refused by the server, which names the destinations.
 */
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { confirmDialog, StatusPill } from '@/shared/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useDeleteFreightSlab, useSaveFreightSlab } from '../../api/freightBenchmark.api';
import type { FreightSlab } from '../../types/freightBenchmark.types';
import { slabBandHint } from './freightBenchmark';

interface SlabDraft {
  id: number | null;
  label: string;
  above: string;
  upTo: string;
  sortOrder: string;
  isActive: boolean;
}

function draftOf(slab: FreightSlab | null, after: FreightSlab | undefined): SlabDraft {
  if (slab) {
    return {
      id: slab.id,
      label: slab.label,
      above: String(slab.above_kg),
      upTo: String(slab.up_to_kg),
      sortOrder: String(slab.sort_order),
      isActive: slab.is_active,
    };
  }
  // A new slab most likely continues the largest: it opens where that closes.
  return {
    id: null,
    label: '',
    above: after ? String(after.up_to_kg) : '0',
    upTo: '',
    sortOrder: after ? String(after.sort_order + 1) : '0',
    isActive: true,
  };
}

function SlabForm({
  draft,
  onCancel,
  onSaved,
}: {
  draft: SlabDraft;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const save = useSaveFreightSlab();
  const [value, setValue] = useState(draft);
  const [problem, setProblem] = useState('');

  function set(patch: Partial<SlabDraft>) {
    setValue((current) => ({ ...current, ...patch }));
    setProblem('');
  }

  async function onSave() {
    const above = Number(value.above || 0);
    const upTo = Number(value.upTo);
    if (!value.label.trim()) return setProblem('Give the slab a label, e.g. 20 MT.');
    if (!Number.isInteger(above) || above < 0) return setProblem('The lower limit is whole kg.');
    if (!Number.isInteger(upTo) || upTo <= above) {
      return setProblem('The upper limit is whole kg, above the lower one.');
    }
    try {
      const saved = await save.mutateAsync({
        id: value.id,
        data: {
          label: value.label.trim(),
          above_kg: above,
          up_to_kg: upTo,
          sort_order: Number(value.sortOrder || 0),
          is_active: value.isActive,
        },
      });
      toast.success(`${saved.label} saved`);
      onSaved();
    } catch (error) {
      setProblem(getErrorMessage(error, 'Could not save the slab.'));
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="slab-label">Label</Label>
          <Input
            id="slab-label"
            value={value.label}
            onChange={(event) => set({ label: event.target.value })}
            placeholder="20 MT"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slab-above">Over (kg)</Label>
          <Input
            id="slab-above"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={value.above}
            onChange={(event) => set({ above: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slab-up-to">Up to (kg)</Label>
          <Input
            id="slab-up-to"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={value.upTo}
            onChange={(event) => set({ upTo: event.target.value })}
            placeholder="20000"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="slab-sort">Column order</Label>
            <Input
              id="slab-sort"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={value.sortOrder}
              onChange={(event) => set({ sortOrder: event.target.value })}
              className="w-24"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Switch
              id="slab-active"
              checked={value.isActive}
              onChange={(checked) => set({ isActive: checked })}
            />
            In use
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : value.id === null ? 'Add slab' : 'Save slab'}
          </Button>
        </div>
      </div>
      {problem && <p className="text-sm text-rose-600">{problem}</p>}
    </div>
  );
}

export function SlabsDialog({
  open,
  onOpenChange,
  slabs,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slabs: FreightSlab[];
  canManage: boolean;
}) {
  const remove = useDeleteFreightSlab();
  const [draft, setDraft] = useState<SlabDraft | null>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(null);
  }

  const largest = [...slabs].sort((a, b) => b.up_to_kg - a.up_to_kg)[0];

  async function onDelete(slab: FreightSlab) {
    const confirmed = await confirmDialog({
      title: `Delete ${slab.label}?`,
      description: 'No destination has a rate on it, so nothing else changes.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(slab.id);
      toast.success(`${slab.label} deleted`);
    } catch {
      // The API client has already shown why.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Slabs</DialogTitle>
          <DialogDescription>
            The vehicle sizes a benchmark is quoted for. Each is a band of capacity — over its lower
            limit, up to and including its upper — so a vehicle falls in exactly one slab per
            destination.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border">
          {slabs.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">No slabs yet.</p>
          ) : (
            slabs.map((slab) => (
              <div
                key={slab.id}
                className={cn(
                  'flex items-center gap-3 border-b px-3 py-2 last:border-0',
                  !slab.is_active && 'opacity-60',
                  draft?.id === slab.id && 'bg-muted/40',
                )}
              >
                <div className="min-w-0 flex-1 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {slab.label}
                    {!slab.is_active && <StatusPill tone="neutral">Out of use</StatusPill>}
                  </span>
                  {slabBandHint(slab) && (
                    <span className="block text-xs text-muted-foreground">
                      {slabBandHint(slab)}
                    </span>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {slab.destination_count} destination{slab.destination_count === 1 ? '' : 's'}
                </span>
                {canManage && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Edit ${slab.label}`}
                      title="Edit"
                      onClick={() => setDraft(draftOf(slab, undefined))}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10"
                      aria-label={`Delete ${slab.label}`}
                      title={
                        slab.destination_count > 0
                          ? 'In use — clear its rates first, or mark it out of use'
                          : 'Delete'
                      }
                      disabled={slab.destination_count > 0 || remove.isPending}
                      onClick={() => onDelete(slab)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {canManage &&
          (draft ? (
            <SlabForm
              key={draft.id ?? 'new'}
              draft={draft}
              onCancel={() => setDraft(null)}
              onSaved={() => setDraft(null)}
            />
          ) : (
            <div>
              <Button variant="outline" onClick={() => setDraft(draftOf(null, largest))}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add slab
              </Button>
            </div>
          ))}
      </DialogContent>
    </Dialog>
  );
}
