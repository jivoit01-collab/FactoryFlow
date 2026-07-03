/** Dialog to turn the selected cells into a numbered area (new, or a block of an existing one). */
import { useEffect, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { AREA_COLOR_PRESETS } from '../services';

export interface AreaFormValue {
  name: string;
  prefix: string;
  color: string;
  /** Set when the block joins an existing area (shared numbering). */
  groupId?: string;
}

export interface ExistingAreaOption {
  groupId: string;
  name: string;
  prefix: string;
  color: string;
}

interface AreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellCount: number;
  /** Grid extent of the selection, shown so the user can confirm the rectangle. */
  rectLabel?: string;
  /** Areas already created, to add this block to one of them. */
  existingAreas: ExistingAreaOption[];
  onSubmit: (value: AreaFormValue) => void | Promise<void>;
}

export function AreaDialog({
  open,
  onOpenChange,
  cellCount,
  rectLabel,
  existingAreas,
  onSubmit,
}: AreaDialogProps) {
  const [existingId, setExistingId] = useState('');
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [color, setColor] = useState(AREA_COLOR_PRESETS[0]);

  useEffect(() => {
    if (open) {
      setExistingId('');
      setName('');
      setPrefix('');
      setColor(AREA_COLOR_PRESETS[0]);
    }
  }, [open]);

  const chosen = existingAreas.find((a) => a.groupId === existingId) ?? null;
  const canSubmit = chosen != null || name.trim().length > 0;

  function submit() {
    if (chosen) {
      void onSubmit({ name: chosen.name, prefix: chosen.prefix, color: chosen.color, groupId: chosen.groupId });
      return;
    }
    if (!name.trim()) return;
    void onSubmit({ name: name.trim(), prefix: prefix.trim(), color });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{chosen ? `Add block to ${chosen.name}` : 'Create area'}</DialogTitle>
          <DialogDescription>
            {chosen
              ? `The selected ${cellCount} cell${cellCount === 1 ? '' : 's'} join "${chosen.name}" and are numbered continuously with it.`
              : `Number the selected ${cellCount} cell${cellCount === 1 ? '' : 's'} from their top-left corner (A-01).`}
            {rectLabel ? <> Covers <span className="font-mono">{rectLabel}</span>.</> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {existingAreas.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="area-existing">Area</Label>
              <NativeSelect
                id="area-existing"
                value={existingId}
                onChange={(event) => setExistingId(event.target.value)}
              >
                <option value="">➕ New area</option>
                {existingAreas.map((area) => (
                  <option key={area.groupId} value={area.groupId}>
                    Add to “{area.name}”{area.prefix ? ` (${area.prefix}-)` : ''}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}

          {chosen ? null : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="area-name">Name</Label>
                  <Input
                    id="area-name"
                    value={name}
                    autoFocus
                    placeholder="e.g. Main Hall"
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submit();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="area-prefix">Identifier prefix</Label>
                  <Input
                    id="area-prefix"
                    value={prefix}
                    placeholder="none / e.g. S"
                    onChange={(event) => setPrefix(event.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave the prefix blank for the primary area (codes like{' '}
                <span className="font-mono">A-01</span>). A prefix distinguishes other areas —{' '}
                <span className="font-mono">S</span> gives <span className="font-mono">S-A-01</span>.
              </p>

              <div className="space-y-1.5">
                <Label>Colour</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {AREA_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      aria-label={`Colour ${preset}`}
                      onClick={() => setColor(preset)}
                      style={{ backgroundColor: preset }}
                      className={cn(
                        'h-7 w-7 rounded-full border-2 transition',
                        color.toLowerCase() === preset.toLowerCase()
                          ? 'border-foreground ring-2 ring-ring'
                          : 'border-transparent',
                      )}
                    />
                  ))}
                  <label
                    className="flex h-7 items-center gap-1.5 rounded-full border px-2 text-xs text-muted-foreground"
                    title="Pick any colour"
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
                    />
                    Custom
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            {chosen ? 'Add block' : 'Create area'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
