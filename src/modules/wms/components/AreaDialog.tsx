/** Dialog to turn the selected cells into a numbered area. */
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
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { AREA_COLOR_PRESETS } from '../services';

export interface AreaFormValue {
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
  onSubmit: (value: AreaFormValue) => void | Promise<void>;
}

export function AreaDialog({ open, onOpenChange, cellCount, rectLabel, onSubmit }: AreaDialogProps) {
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [color, setColor] = useState(AREA_COLOR_PRESETS[0]);

  useEffect(() => {
    if (open) {
      setName('');
      setPrefix('');
      setColor(AREA_COLOR_PRESETS[0]);
    }
  }, [open]);

  function submit() {
    if (!name.trim()) return;
    void onSubmit({ name: name.trim(), prefix: prefix.trim(), color });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create area</DialogTitle>
          <DialogDescription>
            Number the selected {cellCount} cell{cellCount === 1 ? '' : 's'} from their top-left
            corner. Codes are rebuilt: the corner becomes <span className="font-mono">A-01</span>.
            {rectLabel ? <> Covers <span className="font-mono">{rectLabel}</span>.</> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            <div className="flex flex-wrap gap-2">
              {AREA_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={`Colour ${preset}`}
                  onClick={() => setColor(preset)}
                  style={{ backgroundColor: preset }}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition',
                    color === preset ? 'border-foreground ring-2 ring-ring' : 'border-transparent',
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} onClick={submit}>
            Create area
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
