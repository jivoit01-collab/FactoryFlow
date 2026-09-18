import { Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { NewCashPerson } from '@/modules/accounts/api';
import { useCreateCashPerson } from '@/modules/accounts/api';
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
import { getErrorMessage } from '@/shared/utils';

/**
 * Add somebody who can hold the factory's cash.
 *
 * The book's people are drivers, tradesmen and contractors with no login, and
 * the custodian meets them at the moment of handing cash over — so they are
 * added from the form rather than from an admin screen they would have to go
 * and find.
 *
 * A name that is already somebody comes back as that person instead of a
 * second one, and this says so rather than quietly selecting them. Ten
 * duplicate people once reached the live book from an import that matched on
 * exact full names alone — each holding a float while the real account sat
 * empty — and a button offered to anybody typing a name is a faster way to
 * make more of them.
 */
export function AddPersonDialog(props: AddPersonDialogProps) {
  // Mounted only while open, so the field starts from whatever was typed in
  // the picker without an effect reaching in to reset it afterwards.
  if (!props.open) return null;
  return <AddPersonForm {...props} />;
}

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whatever was typed in the picker, so it does not have to be typed twice. */
  suggestedName?: string;
  onAdded: (person: NewCashPerson) => void;
}

function AddPersonForm({
  onOpenChange,
  suggestedName = '',
  onAdded,
}: AddPersonDialogProps) {
  const [name, setName] = useState(suggestedName);
  const create = useCreateCashPerson();

  async function submit() {
    const cleaned = name.trim();
    if (!cleaned) {
      toast.error('Say who this is.');
      return;
    }
    try {
      const person = await create.mutateAsync(cleaned);
      toast.success(
        person.created
          ? `${person.name} added`
          : `${person.name} is already on the book — picked them instead`,
      );
      onAdded(person);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That person could not be added.'));
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add somebody</DialogTitle>
          <DialogDescription>
            For a driver, a tradesman or anybody else who holds the factory’s cash
            without having a login. They can be given cash straight away; they
            cannot sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor="new-person-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="new-person-name"
            autoFocus
            value={name}
            placeholder="Ravi Kumar"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
          />
          <p className="text-xs text-muted-foreground">
            Write it the way the book already does. If this name is somebody the
            book knows, they will be picked rather than added twice.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
