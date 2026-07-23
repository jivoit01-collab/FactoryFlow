/**
 * Variant picker — for a Flipkart product (FSN) linked to several SAP items, lets
 * the operator choose which one ships for THIS order line. Used on the Outward
 * board (sheet processing) and the Delivery Notes cut screen. Only render it when
 * `variant.has_choice` is true.
 */
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { getErrorMessage } from '@/shared/utils';

import { useChooseVariant } from '../api/marketplace.queries';
import type { LineVariant } from '../types/marketplace.types';

function Picker({
  label,
  value,
  options,
  pending,
  onPick,
}: {
  label: string;
  value: number | string;
  options: { id: number; text: string; is_default: boolean }[];
  pending: boolean;
  onPick: (id: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="relative inline-flex items-center">
        <select
          className="rounded border bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
          value={value}
          disabled={pending}
          onChange={(e) => onPick(Number(e.target.value))}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.text}{o.is_default ? ' (default)' : ''}
            </option>
          ))}
        </select>
        {pending ? (
          <Loader2 className="pointer-events-none absolute right-1 h-3 w-3 animate-spin" />
        ) : null}
      </span>
    </label>
  );
}

export function MpVariantPicker({ variant }: { variant: LineVariant }) {
  const choose = useChooseVariant();
  const current =
    variant.chosen_option_id ?? variant.options.find((o) => o.is_default)?.id ?? '';

  const pick = (optionId: number, componentId?: number) =>
    choose.mutate(
      { lineId: variant.line_id, optionId, componentId },
      {
        onSuccess: () => toast.success('Variant updated'),
        onError: (err) => toast.error(getErrorMessage(err, 'Could not change variant')),
      },
    );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {/* Whole-SKU choice (only when the SKU itself maps to several SAP items) */}
      {variant.options.length > 1 ? (
        <Picker
          label="Ship as"
          value={current}
          pending={choose.isPending}
          onPick={(id) => pick(id)}
          options={variant.options.map((o) => ({
            id: o.id,
            text: o.label || o.fg_item_code || o.combo_code,
            is_default: o.is_default,
          }))}
        />
      ) : null}

      {/* Per-combo-slot choices */}
      {(variant.components ?? [])
        .filter((c) => c.has_choice)
        .map((c) => (
          <Picker
            key={c.component_id}
            label={`${c.label} ×${Number(c.quantity)}`}
            value={c.chosen_option_id}
            pending={choose.isPending}
            onPick={(id) => pick(id, c.component_id)}
            options={c.options.map((o) => ({
              id: o.id,
              text: `${o.item_name || o.item_code}${o.quantity ? ` ×${Number(o.quantity)}` : ''}`,
              is_default: o.is_default,
            }))}
          />
        ))}
    </div>
  );
}
