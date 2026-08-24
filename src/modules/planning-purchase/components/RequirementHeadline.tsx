import { cn } from '@/shared/utils';

import type { RequirementMeta } from '../types';
import { moneyShort } from './format';

interface Tile {
  label: string;
  value: string;
  hint?: string;
  /** Coloured only when it needs action, so a healthy plan reads quiet. */
  tone: 'critical' | 'warning' | 'neutral';
}

const TONE_CLASS: Record<Tile['tone'], string> = {
  critical: 'border-destructive/30 bg-destructive/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  neutral: 'border-border bg-card',
};

const VALUE_CLASS: Record<Tile['tone'], string> = {
  critical: 'text-destructive',
  warning: 'text-amber-600 dark:text-amber-400',
  neutral: '',
};

/**
 * Five numbers a planner needs before reading the table.
 *
 * Each tile is coloured only when it needs action. A plan with nothing short
 * should read as quiet, or the colour stops meaning anything.
 */
export function RequirementHeadline({ meta }: { meta: RequirementMeta }) {
  const tiles: Tile[] = [
    {
      label: 'Components short',
      value: String(meta.shortage_count),
      hint: `of ${meta.component_count} exploded`,
      tone: meta.shortage_count > 0 ? 'critical' : 'neutral',
    },
    {
      label: 'Packaging',
      value: String(meta.packaging_shortage_count),
      hint: 'shortages',
      tone: meta.packaging_shortage_count > 0 ? 'warning' : 'neutral',
    },
    {
      label: 'Raw material',
      value: String(meta.raw_shortage_count),
      hint: 'shortages',
      tone: meta.raw_shortage_count > 0 ? 'warning' : 'neutral',
    },
    {
      label: 'No lead time',
      value: String(meta.no_lead_time_count),
      hint: 'cannot be dated',
      tone: meta.no_lead_time_count > 0 ? 'warning' : 'neutral',
    },
    {
      label: 'Estimated spend',
      value: moneyShort(meta.estimated_purchase_value),
      hint: meta.no_price_count > 0 ? `${meta.no_price_count} unpriced` : 'at last purchase price',
      tone: 'neutral',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <div key={tile.label} className={cn('rounded-lg border p-3', TONE_CLASS[tile.tone])}>
          <p className="text-xs text-muted-foreground">{tile.label}</p>
          <p className={cn('mt-1 text-2xl font-semibold tabular-nums', VALUE_CLASS[tile.tone])}>
            {tile.value}
          </p>
          {tile.hint ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{tile.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * The things the numbers above cannot be trusted about.
 *
 * Rendered as plain notices rather than hidden behind an icon: a plan with four
 * SKUs that have no BOM has four SKUs whose materials nobody is buying, and that
 * has to be visible on the screen where the buying happens.
 */
export function RequirementCaveats({ meta }: { meta: RequirementMeta }) {
  const notices: { tone: 'warning' | 'muted'; text: string }[] = [];

  if (meta.items_without_bom.length) {
    notices.push({
      tone: 'warning',
      text: `${meta.items_without_bom.length} planned SKU${
        meta.items_without_bom.length === 1 ? '' : 's'
      } have no production BOM in SAP (${meta.items_without_bom
        .slice(0, 4)
        .map((item) => item.item_code)
        .join(', ')}${meta.items_without_bom.length > 4 ? '…' : ''}). Nothing is being bought for them.`,
    });
  }

  if (meta.no_lead_time_count === meta.shortage_count && meta.shortage_count > 0) {
    notices.push({
      tone: 'warning',
      text: 'No material has a lead time on file, so no order-by date can be calculated. Ask procurement to complete the lead-time sheet in Supply Chain reference data.',
    });
  }

  if (meta.over_committed_count) {
    notices.push({
      tone: 'warning',
      text: `${meta.over_committed_count} component${
        meta.over_committed_count === 1 ? ' has' : 's have'
      } more stock committed than is on hand — already over-promised before this plan is counted.`,
    });
  }

  if (meta.unusable_boms.length) {
    notices.push({
      tone: 'warning',
      text: `${meta.unusable_boms.length} BOM line${
        meta.unusable_boms.length === 1 ? '' : 's'
      } could not be used: the recipe's base quantity is zero in SAP.`,
    });
  }

  if (meta.resource_line_count) {
    notices.push({
      tone: 'muted',
      text: `${meta.resource_line_count} conversion cost${
        meta.resource_line_count === 1 ? '' : 's'
      } (filling, blowing, job work) are excluded from purchasing — they are costs, not materials.`,
    });
  }

  if (meta.sub_assembly_count) {
    notices.push({
      tone: 'muted',
      text: `${meta.sub_assembly_count} component${
        meta.sub_assembly_count === 1 ? '' : 's'
      } can also be made in-house and are not exploded further.`,
    });
  }

  if (!notices.length) return null;

  return (
    <div className="space-y-1.5">
      {notices.map((notice) => (
        <p
          key={notice.text}
          className={cn(
            'rounded-md border px-3 py-2 text-xs',
            notice.tone === 'warning'
              ? 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300'
              : 'border-border bg-muted/40 text-muted-foreground',
          )}
        >
          {notice.text}
        </p>
      ))}
    </div>
  );
}
