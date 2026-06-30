/** Dialog to group the selected locations into a zone (Step 3). */
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

import { ZONE_COLOR_PRESETS } from '../services';
import type { TemperatureClass } from '../types';

export interface ZoneFormValue {
  name: string;
  type: string;
  temperatureClass: TemperatureClass | null;
  color: string;
}

interface ZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationCount: number;
  onSubmit: (value: ZoneFormValue) => void | Promise<void>;
}

const ZONE_TYPES = ['STORAGE', 'PICK', 'BULK', 'RECEIVING', 'SHIPPING', 'STAGING', 'QUARANTINE'];

export function ZoneDialog({ open, onOpenChange, locationCount, onSubmit }: ZoneDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState(ZONE_TYPES[0]);
  const [temperatureClass, setTemperatureClass] = useState<TemperatureClass | ''>('');
  const [color, setColor] = useState(ZONE_COLOR_PRESETS[0]);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName('');
      setType(ZONE_TYPES[0]);
      setTemperatureClass('');
      setColor(ZONE_COLOR_PRESETS[0]);
    }
  }, [open]);

  function submit() {
    if (!name.trim()) return;
    void onSubmit({
      name: name.trim(),
      type,
      temperatureClass: temperatureClass || null,
      color,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create zone</DialogTitle>
          <DialogDescription>
            Group the {locationCount} selected location{locationCount === 1 ? '' : 's'} into a zone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="zone-name">Name</Label>
            <Input
              id="zone-name"
              value={name}
              autoFocus
              placeholder="e.g. Chilled Pick Zone"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="zone-type">Type</Label>
              <NativeSelect id="zone-type" value={type} onChange={(event) => setType(event.target.value)}>
                {ZONE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0) + value.slice(1).toLowerCase()}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone-temp">Temperature</Label>
              <NativeSelect
                id="zone-temp"
                value={temperatureClass}
                onChange={(event) => setTemperatureClass(event.target.value as TemperatureClass | '')}
              >
                <option value="">None</option>
                <option value="AMBIENT">Ambient</option>
                <option value="CHILLED">Chilled</option>
                <option value="FROZEN">Frozen</option>
                <option value="CONTROLLED">Controlled</option>
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {ZONE_COLOR_PRESETS.map((preset) => (
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
            Create zone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
