import { Check, Loader2, Search, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useCashApprovers, useSetCashApprover } from '@/modules/accounts/api';
import { useCompanyUsers } from '@/modules/notifications/api/sendNotification.queries';
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
 * Nobody can appoint themselves. The person who records a payment holds the
 * settings right, and without that rule they could name themselves as its
 * approver and agree to their own spending, which is the one thing the
 * approval step exists to prevent. The server refuses it; this only explains
 * why the button is not there.
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
  const [search, setSearch] = useState('');
  const { data: approvers = [], isLoading: approversLoading } = useCashApprovers();
  const { data: users = [], isLoading: usersLoading } = useCompanyUsers();
  const setApprover = useSetCashApprover();

  const approverIds = useMemo(() => new Set(approvers.map((person) => person.id)), [approvers]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = users.filter(
      (user) =>
        !needle ||
        (user.full_name ?? '').toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle),
    );
    // Approvers first: the question this screen answers is "who approves",
    // and the rest of the directory is only there to add somebody.
    return [...rows].sort((a, b) => {
      const mine = Number(approverIds.has(b.id)) - Number(approverIds.has(a.id));
      if (mine !== 0) return mine;
      return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email);
    });
  }, [users, search, approverIds]);

  async function toggle(id: number, name: string, approving: boolean) {
    try {
      await setApprover.mutateAsync({ person: id, approving });
      toast.success(approving ? `${name} can now approve` : `${name} no longer approves`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'That could not be changed.'));
    }
  }

  const loading = approversLoading || usersLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Who approves cash</DialogTitle>
          <DialogDescription>
            A payment is sent to one of these people, and only they can decide it. Somebody with
            none of them on the list cannot record a cash out at all.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {approvers.length === 0
              ? 'Nobody approves cash yet.'
              : `${approvers.length} ${approvers.length === 1 ? 'person approves' : 'people approve'} cash.`}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading people…
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto rounded-md border">
              {shown.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Nobody matches that.
                </p>
              ) : (
                shown.map((user) => {
                  const approves = approverIds.has(user.id);
                  const self = currentUserId != null && user.id === currentUserId;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{user.full_name || user.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {approves && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-100 text-[10px] text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-400"
                          >
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Approves
                          </Badge>
                        )}
                        {self ? (
                          <span className="text-xs text-muted-foreground">Not yourself</span>
                        ) : (
                          <Button
                            variant={approves ? 'ghost' : 'outline'}
                            size="sm"
                            disabled={setApprover.isPending}
                            onClick={() => toggle(user.id, user.full_name || user.email, !approves)}
                          >
                            {approves ? (
                              <>
                                <X className="mr-2 h-4 w-4" /> Remove
                              </>
                            ) : (
                              <>
                                <Check className="mr-2 h-4 w-4" /> Make approver
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            You cannot make yourself an approver — approving your own spending is what this is meant
            to stop.
          </p>
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
