import { useState } from 'react';
import { toast } from 'sonner';

import { useWarehouseScope } from '@/modules/warehouse/api';
import type { WarehouseOption } from '@/modules/warehouse/types';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
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

import { useCreatePallet } from '../api';
import type { PalletDetail } from '../types';
import { toastBarcodeError } from '../utils/errors';

const MAX_PALLETS_PER_REQUEST = 50;

interface CreateEmptyPalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: WarehouseOption[];
  warehousesLoading?: boolean;
  /** The warehouse lookup failed — say so instead of showing an empty list. */
  warehousesError?: boolean;
  /** Prefilled warehouse code, usually whatever the print form already holds. */
  defaultWarehouse?: string;
  /** Called with every pallet created, in creation order. */
  onCreated?: (pallets: PalletDetail[]) => void;
}

export default function CreateEmptyPalletDialog({
  open,
  onOpenChange,
  ...formProps
}: CreateEmptyPalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>New Empty Pallet</DialogTitle>
          <DialogDescription>
            Create empty pallets to print onto. Item, batch and quantity are filled in later by the
            print form.
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while the dialog is open, so every open starts fresh. */}
        <CreateEmptyPalletForm onOpenChange={onOpenChange} {...formProps} />
      </DialogContent>
    </Dialog>
  );
}

function CreateEmptyPalletForm({
  onOpenChange,
  warehouses,
  warehousesLoading = false,
  warehousesError = false,
  defaultWarehouse = '',
  onCreated,
}: Omit<CreateEmptyPalletDialogProps, 'open'>) {
  const createPalletMutation = useCreatePallet();
  const scope = useWarehouseScope();

  // Only the warehouses this user runs. The hook fails open — an unknown scope
  // (still loading, endpoint unreachable) leaves every warehouse listed rather
  // than inventing a restriction the server never asked for.
  const managedWarehouses = warehouses.filter((wh) => scope.manages(wh.code));
  const canPrefill = scope.manages(defaultWarehouse);

  const [warehouse, setWarehouse] = useState(canPrefill ? defaultWarehouse : '');
  const [count, setCount] = useState('1');

  const palletCount = Number(count);

  const warehouseLabel = (code: string) => {
    const match = managedWarehouses.find((wh) => wh.code === code);
    return match ? `${match.code} - ${match.name}` : code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = warehouse.trim();
    const total = palletCount;

    if (!code) {
      toast.error('Select a warehouse for the new pallet.');
      return;
    }
    if (!scope.manages(code)) {
      toast.error(`You are not set as a manager of ${code}.`);
      return;
    }
    if (!Number.isInteger(total) || total < 1) {
      toast.error('Number of pallets must be a whole number, like 1 or 5.');
      return;
    }
    if (total > MAX_PALLETS_PER_REQUEST) {
      toast.error(`You can create at most ${MAX_PALLETS_PER_REQUEST} pallets at a time.`);
      return;
    }

    // Pallet IDs are handed out per request, so create them one after another
    // rather than firing the whole batch at once.
    const created: PalletDetail[] = [];
    try {
      for (let i = 0; i < total; i += 1) {
        const pallet = await createPalletMutation.mutateAsync({ box_ids: [], warehouse: code });
        created.push(pallet);
      }
    } catch (err: unknown) {
      if (created.length > 0) {
        toast.warning(
          `Created ${created.length} of ${total} pallets (${created
            .map((p) => p.pallet_id)
            .join(', ')}) before the run failed.`,
        );
        onCreated?.(created);
        onOpenChange(false);
      }
      toastBarcodeError(err, 'Unable to create pallet. Please check the warehouse.');
      return;
    }

    toast.success(
      created.length === 1
        ? `Created pallet ${created[0].pallet_id}`
        : `Created ${created.length} empty pallets in ${code}`,
    );
    onCreated?.(created);
    onOpenChange(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SearchableSelect<WarehouseOption>
        items={managedWarehouses}
        isLoading={warehousesLoading}
        isError={warehousesError}
        getItemKey={(wh) => wh.code}
        getItemLabel={(wh) => `${wh.code} - ${wh.name}`}
        renderItem={(wh) => (
          <div className="flex w-full items-center gap-2">
            <span className="font-mono text-xs font-medium">{wh.code}</span>
            <span className="truncate text-sm">{wh.name}</span>
          </div>
        )}
        placeholder="Search warehouse..."
        label="Warehouse"
        required
        inputId="new-pallet-warehouse"
        loadingText="Loading warehouses..."
        emptyText="No warehouses you manage"
        notFoundText="No matching warehouse"
        errorText="Could not load warehouses from SAP HANA. Please refresh and try again."
        value={warehouse ? warehouseLabel(warehouse) : ''}
        defaultDisplayText={warehouse ? warehouseLabel(warehouse) : ''}
        onItemSelect={(wh) => setWarehouse(wh.code)}
        onClear={() => setWarehouse('')}
      />

      {scope.managesNothing && (
        <p className="text-sm text-destructive">
          You are not set as the manager of any warehouse in this company, so there is nowhere to
          put a pallet. An administrator assigns this on Admin &rarr; Warehouse Managers.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="new-pallet-count">Number of Pallets</Label>
        <Input
          id="new-pallet-count"
          type="number"
          min={1}
          max={MAX_PALLETS_PER_REQUEST}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          disabled={createPalletMutation.isPending}
        />
        <p className="text-xs text-muted-foreground">
          Up to {MAX_PALLETS_PER_REQUEST} at a time. Only the first one gets selected here.
        </p>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={createPalletMutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createPalletMutation.isPending || scope.managesNothing}>
          {createPalletMutation.isPending
            ? 'Creating...'
            : `Create ${palletCount > 1 ? `${palletCount} Pallets` : 'Pallet'}`}
        </Button>
      </DialogFooter>
    </form>
  );
}
