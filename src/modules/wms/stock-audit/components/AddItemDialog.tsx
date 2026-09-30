import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils';

import { useAddItem, useSapItemSearch } from '../api';

/**
 * Put an item on the audit that SAP's copy did not list — something found on
 * the floor that SAP says the warehouse does not hold.
 */
export function AddItemDialog({
  auditId,
  open,
  onClose,
  onAdded,
}: {
  auditId: number;
  open: boolean;
  onClose: () => void;
  /** Called with the item's code, so the page can show it to be counted. */
  onAdded: (itemCode: string) => void;
}) {
  const [search, setSearch] = useState('');
  const term = useDebounce(search, 300);
  const results = useSapItemSearch(auditId, term);
  const addItem = useAddItem(auditId);

  const handleAdd = async (itemCode: string) => {
    try {
      await addItem.mutateAsync(itemCode);
      toast.success(`${itemCode} is on the audit`);
      onAdded(itemCode);
      setSearch('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'The item was not added.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add an item found on the floor</DialogTitle>
          <DialogDescription>
            For something SAP does not list in this warehouse. Search SAP by code or name.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          aria-label="Search SAP items"
          placeholder="e.g. CAPS 28 or PM0000010"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ul className="max-h-80 divide-y overflow-y-auto text-sm">
          {term.trim().length < 2 ? (
            <li className="py-6 text-center text-muted-foreground">Type at least 2 letters.</li>
          ) : results.isLoading ? (
            <li className="py-6 text-center text-muted-foreground">Searching SAP…</li>
          ) : results.isError ? (
            <li className="py-6 text-center text-destructive">
              {getErrorMessage(results.error, 'SAP is not answering.')}
            </li>
          ) : !results.data?.length ? (
            <li className="py-6 text-center text-muted-foreground">No SAP item matches.</li>
          ) : (
            results.data.map((item) => (
              <li key={item.item_code} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="font-mono">{item.item_code}</span>{' '}
                  <span className="text-muted-foreground">{item.item_name}</span>
                </span>
                {item.on_audit ? (
                  <Button variant="ghost" size="sm" onClick={() => onAdded(item.item_code)}>
                    Already listed
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAdd(item.item_code)}
                    disabled={addItem.isPending}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </Button>
                )}
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
