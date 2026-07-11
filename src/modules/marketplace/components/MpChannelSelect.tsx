import { Badge } from '@/shared/components/ui';

import type { MarketplaceChannel } from '../types/marketplace.types';

interface Props {
  value: MarketplaceChannel;
  onChange: (channel: MarketplaceChannel) => void;
  disabled?: boolean;
}

/**
 * Channel indicator. Amazon is parked for now — the marketplace flow is
 * Flipkart-only, so this shows a static "Flipkart" chip instead of a toggle.
 * (Kept as a component, and pages still default their channel state to
 * 'FLIPKART', so re-enabling Amazon later is a one-file change.)
 */
export function MpChannelSelect(_props: Props) {
  return (
    <Badge variant="outline" className="h-8 px-3 text-sm font-medium">
      Flipkart
    </Badge>
  );
}
