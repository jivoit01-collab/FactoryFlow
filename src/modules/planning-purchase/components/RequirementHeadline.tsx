import { cn } from '@/shared/utils';

import type { RequirementMeta } from '../types';
import { moneyShort } from './format';
import { KpiCard, KpiRow } from './KpiCard';
import { NO_DRILL, type RequirementDrill,sameDrill } from './requirementDrill';

/**
 * Five numbers a planner needs before reading the table, each a way into it.
 *
 * Coloured only when it needs action, so a plan with nothing short reads quiet
 * and the colour keeps meaning something.
 */
export function RequirementHeadline({
  meta,
  drill,
  onDrill,
}: {
  meta: RequirementMeta;
  drill?: RequirementDrill;
  onDrill?: (next: RequirementDrill) => void;
}) {
  const current = drill ?? NO_DRILL;

  const cards: {
    label: string;
    value: string;
    hint?: string;
    tone: 'critical' | 'warning' | 'neutral';
    drill: RequirementDrill;
    drillLabel: string;
    /** Nothing to open when the count is zero. */
    enabled: boolean;
  }[] = [
    {
      label: 'Components short',
      value: String(meta.shortage_count),
      hint: `of ${meta.component_count} exploded`,
      tone: meta.shortage_count > 0 ? 'critical' : 'neutral',
      drill: { materialType: '', shortagesOnly: true, extra: 'NONE' },
      drillLabel: 'Show only components that are short',
      enabled: meta.shortage_count > 0,
    },
    {
      label: 'Packaging',
      value: String(meta.packaging_shortage_count),
      hint: 'shortages',
      tone: meta.packaging_shortage_count > 0 ? 'warning' : 'neutral',
      drill: { materialType: 'PACKAGING', shortagesOnly: true, extra: 'NONE' },
      drillLabel: 'Show only packaging shortages',
      enabled: meta.packaging_shortage_count > 0,
    },
    {
      label: 'Raw material',
      value: String(meta.raw_shortage_count),
      hint: 'shortages',
      tone: meta.raw_shortage_count > 0 ? 'warning' : 'neutral',
      drill: { materialType: 'RAW', shortagesOnly: true, extra: 'NONE' },
      drillLabel: 'Show only raw-material shortages',
      enabled: meta.raw_shortage_count > 0,
    },
    {
      label: 'No lead time',
      value: String(meta.no_lead_time_count),
      hint: 'cannot be dated',
      tone: meta.no_lead_time_count > 0 ? 'warning' : 'neutral',
      drill: { materialType: '', shortagesOnly: true, extra: 'NO_LEAD_TIME' },
      drillLabel: 'Show the shortages with no lead time on file',
      enabled: meta.no_lead_time_count > 0,
    },
    {
      label: 'Estimated spend',
      value: moneyShort(meta.estimated_purchase_value),
      hint:
        meta.no_price_count > 0
          ? `${meta.no_price_count} unpriced`
          : 'at last purchase price',
      tone: 'neutral',
      drill: { materialType: '', shortagesOnly: true, extra: 'BY_VALUE' },
      drillLabel: 'Show the shortages that make up this spend, dearest first',
      enabled: meta.shortage_count > 0,
    },
  ];

  return (
    <KpiRow columns={5}>
      {cards.map((card) => {
        const active = sameDrill(current, card.drill);
        return (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
            tone={card.tone}
            active={active}
            drillLabel={card.drillLabel}
            onClick={
              onDrill && card.enabled
                ? () => onDrill(active ? NO_DRILL : card.drill)
                : undefined
            }
          />
        );
      })}
    </KpiRow>
  );
}

/**
 * The things the numbers above cannot be trusted about.
 *
 * Plain notices rather than an icon to hover: a plan with four SKUs that have no
 * BOM has four SKUs nobody is buying for, and that has to be visible on the
 * screen where the buying happens.
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
      } more stock committed than is on hand — already over-promised before this plan is counted. Click a Committed figure to see which documents hold it.`,
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
