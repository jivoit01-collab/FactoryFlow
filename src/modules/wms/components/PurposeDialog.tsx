/** Dialog to define a cell purpose and apply it to the selected locations. */
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
  Switch,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { PURPOSE_COLOR_PRESETS } from '../services';

export interface PurposeFormValue {
  name: string;
  color: string;
  holdsStock: boolean;
}

interface PurposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationCount: number;
  onSubmit: (value: PurposeFormValue) => void | Promise<void>;
}

const PURPOSE_NAME_SUGGESTIONS = [
  'Walkable path',
  'Damaged goods',
  'Staging',
  'Receiving',
  'Dock',
  'Quarantine',
  'Returns',
  'Obstacle',
];

export function PurposeDialog({ open, onOpenChange, locationCount, onSubmit }: PurposeDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PURPOSE_COLOR_PRESETS[0]);
  const [holdsStock, setHoldsStock] = useState(false);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName('');
      setColor(PURPOSE_COLOR_PRESETS[0]);
      setHoldsStock(false);
    }
  }, [open]);

  function submit() {
    if (!name.trim()) return;
    void onSubmit({ name: name.trim(), color, holdsStock });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create cell purpose</DialogTitle>
          <DialogDescription>
            Define what the {locationCount} selected cell{locationCount === 1 ? '' : 's'} are used
            for (e.g. a walkable path or damaged-goods area).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="purpose-name">Name</Label>
            <Input
              id="purpose-name"
              value={name}
              autoFocus
              list="purpose-name-suggestions"
              placeholder="e.g. Walkable path"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
            />
            <datalist id="purpose-name-suggestions">
              {PURPOSE_NAME_SUGGESTIONS.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {PURPOSE_COLOR_PRESETS.map((preset) => (
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

          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-normal">Holds stock</Label>
              <p className="text-xs text-muted-foreground">
                Off for paths, obstacles and offices — those cells are excluded from occupancy and
                cannot receive pallets.
              </p>
            </div>
            <Switch checked={holdsStock} onChange={setHoldsStock} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} onClick={submit}>
            Create purpose
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
