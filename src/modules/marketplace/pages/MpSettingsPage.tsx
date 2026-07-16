/**
 * Marketplace Settings — flexible per-channel toggles for how the pipeline
 * behaves. Currently exposes "Defer delivery note": when on, confirming a
 * dispatch does not post its SAP delivery note; they are cut in bulk instead.
 * The behaviour is enforced server-side, so this switch is the single source of
 * truth.
 */
import { FileText, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Switch,
} from '@/shared/components/ui';

import {
  useMarketplaceSettings,
  useUpdateMarketplaceSettings,
} from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import type { MarketplaceChannel } from '../types/marketplace.types';

const CHANNEL: MarketplaceChannel = 'FLIPKART';

export default function MpSettingsPage() {
  const { data: settings, isLoading } = useMarketplaceSettings(CHANNEL);
  const update = useUpdateMarketplaceSettings(CHANNEL);

  const deferDeliveryNote = settings?.defer_delivery_note ?? false;

  function save(payload: { defer_delivery_note?: boolean }, message: string) {
    update.mutate(payload, {
      onSuccess: () => toast.success(message),
      onError: (e: unknown) =>
        toast.error((e as { message?: string })?.message ?? 'Could not save setting'),
    });
  }

  function toggleDeferDeliveryNote(next: boolean) {
    save(
      { defer_delivery_note: next },
      next
        ? 'Delivery notes deferred — cut them in bulk from SAP Delivery Notes.'
        : 'Delivery notes post automatically at confirm again.',
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Settings2 className="h-6 w-6 text-muted-foreground" /> Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure how the marketplace flow behaves for this channel.
          </p>
        </div>
        <MpChannelSelect value={CHANNEL} onChange={() => {}} />
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" /> SAP Delivery Note
          </CardTitle>
          <CardDescription>Control when the SAP delivery note is posted.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-6 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="defer-dn" className="text-sm font-medium">
                Defer delivery note (cut in bulk)
              </Label>
              <p className="text-sm text-muted-foreground">
                When on, confirming a dispatch does <strong>not</strong> post its SAP delivery note.
                Instead, cut one delivery note for all confirmed dispatches at once from the{' '}
                <strong>SAP Delivery Notes</strong> page. Turn off to post each delivery note
                automatically at confirm.
              </p>
              {deferDeliveryNote && (
                <Badge variant="outline" className="mt-1 border-amber-300 text-amber-700">
                  Delivery notes are cut in bulk
                </Badge>
              )}
            </div>
            <Switch
              id="defer-dn"
              checked={deferDeliveryNote}
              onChange={toggleDeferDeliveryNote}
              disabled={isLoading || update.isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
