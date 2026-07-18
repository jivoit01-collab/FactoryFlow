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

export function MpVariantPicker({ variant }: { variant: LineVariant }) {
  const choose = useChooseVariant();
  const current =
    variant.chosen_option_id ?? variant.options.find((o) => o.is_default)?.id ?? '';

  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">Ship as</span>
      <span className="relative inline-flex items-center">
        <select
          className="rounded border bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
          value={current}
          disabled={choose.isPending}
          onChange={(e) =>
            choose.mutate(
              { lineId: variant.line_id, optionId: Number(e.target.value) },
              {
                onSuccess: () => toast.success('Variant updated'),
                onError: (err) => toast.error(getErrorMessage(err, 'Could not change variant')),
              },
            )
          }
        >
          {variant.options.map((o) => (
            <option key={o.id} value={o.id}>
              {(o.label || o.fg_item_code || o.combo_code) + (o.is_default ? ' (default)' : '')}
            </option>
          ))}
        </select>
        {choose.isPending ? (
          <Loader2 className="pointer-events-none absolute right-1 h-3 w-3 animate-spin" />
        ) : null}
      </span>
    </label>
  );
}
