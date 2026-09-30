import type { FormEvent } from 'react';
import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { useAddStoreItem, useStoreItemSearch } from '../../api/returnableGatePass.queries';
import type { StoreItem } from '../../types';

interface StoreItemSelectProps {
  inputId: string;
  /** Shown before the list arrives, when editing a saved line. */
  defaultDisplayText?: string;
  error?: string;
  label?: string;
  onSelect: (item: StoreItem) => void;
  onClear: () => void;
}

/**
 * Add an item the store has no record of, so the line can still take it: it
 * starts at 0 and goes below zero when the pass leaves the gate, until the
 * store's real stock is entered. The same name again gives back the same item.
 */
function AddStoreItemDialog({
  open,
  initialName,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  initialName: string;
  onOpenChange: (open: boolean) => void;
  onAdded: (item: StoreItem) => void;
}) {
  const add = useAddStoreItem();
  const [name, setName] = useState(initialName);
  const [uom, setUom] = useState('NOS');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // The picker sits inside the gate pass form; keep this submit out of it.
    event.preventDefault();
    event.stopPropagation();
    if (!name.trim()) return;
    try {
      const item = await add.mutateAsync({ name: name.trim(), uom: uom.trim() || 'NOS' });
      onAdded(item);
      onOpenChange(false);
    } catch {
      // The API client has already shown the error.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Add to store</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="add-store-name">Item name</Label>
            <Input
              id="add-store-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-store-uom">Unit</Label>
            <Input
              id="add-store-uom"
              value={uom}
              onChange={(event) => setUom(event.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending || !name.trim()}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Pick a line from Store / Spares. Every item is offered whatever its stock,
 * and one the store has no record of can be added on the spot. The item's
 * stock goes down when the pass leaves the gate, and back up when a
 * returnable pass brings it back.
 */
export function StoreItemSelect({
  inputId,
  defaultDisplayText,
  error,
  label,
  onSelect,
  onClear,
}: StoreItemSelectProps) {
  const [search, setSearch] = useState('');
  const { data: items = [], isLoading, isError } = useStoreItemSearch(search);

  return (
    <SearchableSelect<StoreItem>
      inputId={inputId}
      label={label}
      required
      defaultDisplayText={defaultDisplayText}
      error={error}
      items={items}
      isLoading={isLoading}
      isError={isError}
      placeholder="Search store item"
      loadingText="Loading store…"
      emptyText="Nothing in the store yet. Add it above."
      notFoundText="Not in the store yet. Add it above."
      errorText="The store list could not be loaded."
      getItemKey={(item) => item.id}
      getItemLabel={(item) => item.name}
      // Already narrowed server-side, which also matches part number and place.
      filterFn={() => true}
      renderItem={(item) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">
            In store: {Number(item.current_stock).toLocaleString('en-IN')} {item.uom}
            {item.storage_location ? ` · ${item.storage_location}` : ''}
          </span>
        </div>
      )}
      onSearchChange={(next) => setSearch(next.trim())}
      onItemSelect={onSelect}
      onClear={onClear}
      addNewLabel={search ? `Add “${search}” to the store` : 'Add an item to the store'}
      renderCreateDialog={(open, onOpenChange, updateSelection) => (
        <AddStoreItemDialog
          // Opened afresh each time, with what was being searched for.
          key={open ? search : 'closed'}
          open={open}
          initialName={search}
          onOpenChange={onOpenChange}
          onAdded={(item) => {
            updateSelection(item.id, item.name);
            onSelect(item);
          }}
        />
      )}
    />
  );
}
