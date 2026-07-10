import { Button } from '@/shared/components/ui';

import { MARKETPLACE_CHANNELS, type MarketplaceChannel } from '../types/marketplace.types';

interface Props {
  value: MarketplaceChannel;
  onChange: (channel: MarketplaceChannel) => void;
  disabled?: boolean;
}

/** Segmented Flipkart/Amazon selector. Drives every channel-scoped query. */
export function MpChannelSelect({ value, onChange, disabled }: Props) {
  return (
    <div className="inline-flex gap-1.5">
      {MARKETPLACE_CHANNELS.map((channel) => (
        <Button
          key={channel.value}
          size="sm"
          variant={value === channel.value ? 'default' : 'outline'}
          disabled={disabled}
          onClick={() => onChange(channel.value)}
        >
          {channel.label}
        </Button>
      ))}
    </div>
  );
}
