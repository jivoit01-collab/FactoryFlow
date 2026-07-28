import type { MarketplaceChannel } from '../types/marketplace.types';

interface Props {
  value: MarketplaceChannel;
  onChange: (channel: MarketplaceChannel) => void;
  disabled?: boolean;
}

const CHANNELS: { value: MarketplaceChannel; label: string }[] = [
  { value: 'FLIPKART', label: 'Flipkart' },
  { value: 'AMAZON', label: 'Amazon' },
];

/**
 * Flipkart / Amazon channel toggle. The whole marketplace module is channel-scoped,
 * so switching here shows that channel's sheets, orders, mappings, warehouses and
 * settings — the two channels never share data.
 */
export function MpChannelSelect({ value, onChange, disabled }: Props) {
  return (
    <div className="inline-flex rounded-lg border p-0.5">
      {CHANNELS.map((c) => (
        <button
          key={c.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(c.value)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50 ${
            value === c.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
          aria-pressed={value === c.value}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
