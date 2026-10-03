import { ChevronDown, PackageCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import {
  useAddSparePhotos,
  useCreateMaintenanceSpare,
  useDeleteSparePhoto,
  useSparePhotos,
  useUpdateMaintenanceSpare,
} from '../../api';
import type { MaintenanceSpare, MaintenanceSparePayload } from '../../types';
import { ItemPhotosField } from './ItemPhotosField';
import { parseCount, STORE_UNITS, toNumber } from './storeFormat';

function numberText(value: MaintenanceSpare['reorder_level'] | undefined) {
  const parsed = toNumber(value);
  return parsed ? String(parsed) : '';
}

/**
 * Add an item to the store, or fix one's details. Only name, unit, count,
 * place and photos are asked for; part number, SAP code, cost and "critical"
 * wait behind "More" for whoever needs them. Stock on an existing item changes
 * only by receiving, giving out or counting again, never here.
 *
 * Photos go up after the item is saved, one by one. The item stands even if a
 * photo does not, and the toast says how many to add again from Edit.
 */
export function ItemFormDialog({
  spare,
  initialName,
  onOpenChange,
}: {
  spare?: MaintenanceSpare | null;
  /** A new item's name to start with, e.g. what was searched for and not found. */
  initialName?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateMaintenanceSpare();
  const update = useUpdateMaintenanceSpare();
  const savedPhotosQuery = useSparePhotos(spare?.id ?? null);
  const addPhotos = useAddSparePhotos();
  const deletePhoto = useDeleteSparePhoto();
  const [name, setName] = useState(spare?.name ?? initialName ?? '');
  const [uom, setUom] = useState(spare?.uom ?? 'NOS');
  const [count, setCount] = useState('');
  const [place, setPlace] = useState(spare?.storage_location ?? '');
  const [warnAt, setWarnAt] = useState(numberText(spare?.reorder_level));
  const [partNumber, setPartNumber] = useState(spare?.part_number ?? '');
  const [sapCode, setSapCode] = useState(spare?.sap_item_code ?? '');
  const [unitCost, setUnitCost] = useState(numberText(spare?.unit_cost));
  const [critical, setCritical] = useState(spare?.is_critical ?? false);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<number[]>([]);
  const [error, setError] = useState('');

  const savedPhotos = (savedPhotosQuery.data ?? []).filter(
    (photo) => !removedPhotoIds.includes(photo.id),
  );
  const busy = create.isPending || update.isPending || addPhotos.isPending || deletePhoto.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Write the item name.');
      return;
    }
    const opening = spare ? 0 : (parseCount(count || '0') ?? -1);
    const warn = parseCount(warnAt || '0') ?? -1;
    const cost = parseCount(unitCost || '0') ?? -1;
    if (opening < 0 || warn < 0 || cost < 0) {
      setError('Numbers cannot be below 0.');
      return;
    }
    const payload: MaintenanceSparePayload = {
      name: name.trim(),
      uom: uom.trim().toUpperCase() || 'NOS',
      storage_location: place.trim(),
      reorder_level: String(warn),
      part_number: partNumber.trim(),
      sap_item_code: sapCode.trim(),
      unit_cost: String(cost),
      is_critical: critical,
      ...(spare ? {} : { current_stock: String(opening) }),
    };
    let saved: MaintenanceSpare;
    try {
      saved = spare
        ? await update.mutateAsync({ spareId: spare.id, payload })
        : await create.mutateAsync(payload);
    } catch {
      // The API client has already shown the error.
      return;
    }

    for (const photoId of removedPhotoIds) {
      try {
        await deletePhoto.mutateAsync({ spareId: saved.id, photoId });
      } catch {
        // The API client has already shown the error; the photo stays.
      }
    }
    const failed = newPhotos.length
      ? await addPhotos.mutateAsync({ spareId: saved.id, files: newPhotos })
      : 0;

    const done = spare ? 'Saved' : 'Added to store';
    if (failed) {
      toast.error(
        `${done}, but ${failed === 1 ? '1 photo' : `${failed} photos`} did not go up. Add again from Edit.`,
      );
    } else {
      toast.success(done);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-md"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{spare ? 'Edit item' : 'Add item'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="item-name" className="text-base">
              Name
            </Label>
            <Input
              id="item-name"
              className="h-12 text-lg"
              autoFocus
              value={name}
              onChange={(event) => {
                setError('');
                setName(event.target.value);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-uom" className="text-base">
                Unit
              </Label>
              <Input
                id="item-uom"
                list="store-units"
                className="h-12 text-lg"
                value={uom}
                onChange={(event) => setUom(event.target.value)}
              />
              <datalist id="store-units">
                {STORE_UNITS.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>
            </div>
            {!spare && (
              <div className="space-y-2">
                <Label htmlFor="item-count" className="text-base">
                  How many now?
                </Label>
                <Input
                  id="item-count"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="0"
                  className="h-12 text-lg tabular-nums"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-place" className="text-base">
              Where is it kept?
            </Label>
            <Input
              id="item-place"
              className="h-12 text-lg"
              placeholder="Rack / shelf"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-warn" className="text-base">
              Warn me when only this many left
            </Label>
            <Input
              id="item-warn"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="No warning"
              className="h-12 text-lg tabular-nums"
              value={warnAt}
              onChange={(event) => setWarnAt(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-base font-medium leading-none">Photos</p>
            <ItemPhotosField
              saved={savedPhotos}
              onRemoveSaved={(photoId) => setRemovedPhotoIds((ids) => [...ids, photoId])}
              files={newPhotos}
              onFilesChange={setNewPhotos}
              disabled={busy}
            />
          </div>

          <Collapsible>
            <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              More
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="item-part">Part no.</Label>
                  <Input
                    id="item-part"
                    placeholder="Same as name"
                    value={partNumber}
                    onChange={(event) => setPartNumber(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="item-sap">SAP code</Label>
                  <Input
                    id="item-sap"
                    value={sapCode}
                    onChange={(event) => setSapCode(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="item-cost">Cost of one (₹)</Label>
                  <Input
                    id="item-cost"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(event) => setUnitCost(event.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="item-critical" checked={critical} onCheckedChange={setCritical} />
                  <Label htmlFor="item-critical">Critical</Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={busy}>
              <PackageCheck />
              {addPhotos.isPending ? 'Sending photos…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
