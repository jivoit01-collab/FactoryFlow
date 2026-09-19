import { Check, Loader2, Search, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ApproverCandidate, CashPerson } from '@/modules/accounts/api';
import {
  useApproverCandidates,
  useCashApprovers,
  useSetCashApprover,
} from '@/modules/accounts/api';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

/**
 * Who may agree to the factory's spending.
 *
 * Membership of the Cash Book Approver group, which is the same group the
 * setup command creates — so this screen and the command cannot drift into
 * two different ideas of who approves.
 *
 * TWO HALVES, BECAUSE THEY ARE DIFFERENT QUESTIONS
 * Below is the answer — who approves cash — which is a short list and the
 * whole point of the screen. Above is a search for adding somebody to it, and
 * it shows nothing until it is typed into. The live book has around a hundred
 * and fifty logins: listing them all buried the answer among people who have
 * nothing to do with cash, and put the whole staff directory on a screen that
 * needs one name from it.
 *
 * Everybody the search offers can actually be appointed — the server answers
 * with exactly the set it will accept, each row already saying whether that
 * person approves. Built the other way, from the directory on one side and
 * the approvers on the other, it offered seventeen drivers off the sheet who
 * cannot sign in, and went on saying nobody approved cash about somebody it
 * had just appointed.
 *
 * Nobody can appoint themselves. The person who records a payment holds the
 * settings right, and without that rule they could name themselves as its
 * approver and agree to their own spending, which is the one thing the
 * approval step exists to prevent. The server refuses it either way.
 */
export function ApproverSettingsDialog({
  open,
  onOpenChange,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** So the one person who cannot be appointed here is told why. */
  currentUserId?: number | null;
}) {
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const { data: approvers = [], isLoading: approversLoading } = useCashApprovers();
  const { data: found = [], isFetching: searching } = useApproverCandidates(
    open && search.trim().length > 0,
    search,
  );
  const setApprover = useSetCashApprover();

  // Debounced: every keystroke would otherwise be a query against the staff
  // directory.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed), 250);
    return () => clearTimeout(timer);
  }, [typed]);

  async function toggle(person: CashPerson, approving: boolean) {
    try {
      await setApprover.mutateAsync({ person: person.id, approving });
      toast.success(
        approving ? `${person.name} can now approve` : `${person.name} no longer approves`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be changed.'));
    }
  }

  const typing = typed.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Who approves cash</DialogTitle>
          <DialogDescription>
            A payment is sent to one of these people, and only they can decide it. With nobody on
            the list, a cash out cannot be recorded at all.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* --- adding somebody -------------------------------------- */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search a name or address to add…"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </div>

            {typing && (
              <div className="rounded-md border">
                {searching ? (
                  <p className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
                  </p>
                ) : found.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Nobody with a login for this company matches that.
                  </p>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto">
                    {found.map((person: ApproverCandidate) => {
                      const self = currentUserId != null && person.id === currentUserId;
                      return (
                        <div
                          key={person.id}
                          className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm">{person.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                          </div>
                          {person.approves ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              Already approves
                            </span>
                          ) : self ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              Not yourself
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              disabled={setApprover.isPending}
                              onClick={() => toggle(person, true)}
                            >
                              <Check className="mr-2 h-4 w-4" /> Make approver
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- who approves today, which is the answer --------------- */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Approving cash
              {approvers.length > 0 && (
                <span className="ml-1 text-muted-foreground">({approvers.length})</span>
              )}
            </p>

            {approversLoading ? (
              <p className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : approvers.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                Nobody approves cash yet. Until somebody does, no cash out can be recorded.
              </p>
            ) : (
              <div className="rounded-md border">
                {approvers.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{person.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-emerald-100 text-[10px] text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-400"
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Approves
                      </Badge>
                      {currentUserId != null && person.id === currentUserId ? (
                        <span className="text-xs text-muted-foreground">You</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={setApprover.isPending}
                          onClick={() => toggle(person, false)}
                        >
                          <X className="mr-2 h-4 w-4" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              You cannot make yourself an approver — approving your own spending is what this is
              meant to stop.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
