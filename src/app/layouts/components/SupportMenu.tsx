import { Bug, Copy, Headset, Phone } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { SUPPORT_CONTACT, SUPPORT_TEL_HREF } from '@/config/constants';
import { ISSUE_CREATE_ACCESS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { Button } from '@/shared/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';

import { HEADER_TOUR_TARGETS } from './headerTour';

/**
 * Customer support, one tap away from every screen: the phone number for
 * anything urgent, and the in-app issues page for anything that should be
 * written down and tracked. A phone dials straight from here; on a desktop the
 * number can be copied instead, because the dialler is not going to help.
 */
export function SupportMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyPermission } = usePermission();
  const canReportIssue = hasAnyPermission(ISSUE_CREATE_ACCESS);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_CONTACT.phone);
      toast.success('Support number copied.');
    } catch {
      toast.error('Could not copy — note the number down instead.');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Customer support"
          data-tour={HEADER_TOUR_TARGETS.support}
        >
          <Headset className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-sm font-medium">Customer support</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Stuck on something? Call and tell them which screen you are on, or raise an issue so it
          stays tracked.
        </p>

        <a
          href={SUPPORT_TEL_HREF}
          className="mt-3 flex items-center gap-2 text-base font-semibold tracking-wide hover:underline"
        >
          <Phone className="h-4 w-4 text-muted-foreground" />
          {SUPPORT_CONTACT.phone}
        </a>

        <div className="mt-3 flex items-center gap-2">
          <Button asChild size="sm" className="flex-1">
            <a href={SUPPORT_TEL_HREF}>
              <Phone className="mr-2 h-4 w-4" />
              Call
            </a>
          </Button>
          {canReportIssue && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setOpen(false);
                navigate(`/issues/new?from=${encodeURIComponent(location.pathname)}`);
              }}
            >
              <Bug className="mr-2 h-4 w-4" />
              Raise issue
            </Button>
          )}
          <Button size="sm" variant="outline" title="Copy the number" onClick={copyNumber}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
