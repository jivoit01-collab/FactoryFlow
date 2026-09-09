import { CalendarOff, Hourglass } from 'lucide-react';

import type { NonMovingItem } from '@/modules/dashboards/non-moving/types';
import { getMovementStatus } from '@/modules/dashboards/non-moving/utils/movementStatus';
import {
  ControlEmpty,
  ControlError,
  ControlScrollList,
  ControlSection,
  ControlSkeletonRows,
} from '@/modules/dashboards/warehouse-control/components';
import { MOVEMENT_AGE_TONE } from '@/modules/dashboards/warehouse-control/constants/warehouse-control.theme';
import {
  formatCompactCurrency,
  formatCount,
} from '@/modules/dashboards/warehouse-control/utils/format';
import { cn } from '@/shared/utils';

import {
  CONTROL_WAREHOUSE,
  MAX_RENDERED_ROWS,
  PANEL_ACCENT,
  STANDING_AGE_DAYS,
} from '../constants';

export interface StandingPanelProps {
  items: NonMovingItem[];
  totalValue: number;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
}

function StandingRow({ item }: { item: NonMovingItem }) {
  const days = item.days_since_last_movement;
  const tone = MOVEMENT_AGE_TONE[getMovementStatus(days)];

  return (
    <li className="px-3 py-2 transition-colors hover:bg-muted/40">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.item_name || item.item_code}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.item_code}
            {item.sub_group ? ` · ${item.sub_group}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              'flex items-center justify-end gap-1 text-sm font-semibold tabular-nums',
              tone,
            )}
          >
            <CalendarOff className="h-3 w-3" />
            {formatCount(days)}d
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatCompactCurrency(item.value)} · {formatCount(item.quantity)} pcs
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * Finished stock that has not left BH-PF in three days.
 *
 * Three days is a deliberately short fuse: this floor turns its whole contents
 * about every 3.3 days, so the list is a "not shipped yet" queue rather than
 * dead stock, and the panel says so rather than letting a large rupee figure
 * read as write-off. The consumption ratio the report also returns is left out
 * on purpose — it is trailing-year issues over current on-hand, which on a
 * floor this fast produces figures like 1,587,906%.
 */
export function StandingPanel({
  items,
  totalValue,
  loading,
  isFetching,
  error,
  onRetry,
  className,
}: StandingPanelProps) {
  const visible = items.slice(0, MAX_RENDERED_ROWS);
  const hidden = items.length - visible.length;
  const oldest = items.reduce((max, item) => Math.max(max, item.days_since_last_movement), 0);

  return (
    <ControlSection
      className={className}
      id="standing"
      title={`Standing Over ${STANDING_AGE_DAYS} Days`}
      description={`Finished stock that has not moved out of ${CONTROL_WAREHOUSE}`}
      meta={
        loading
          ? undefined
          : `${formatCount(items.length)} item${items.length === 1 ? '' : 's'} · ${formatCompactCurrency(totalValue)}${oldest > 0 ? ` · oldest ${formatCount(oldest)}d` : ''}`
      }
      icon={Hourglass}
      accent={PANEL_ACCENT.standing}
      isFetching={isFetching && !loading}
      action={{ label: 'Full report', to: '/dashboards/non-moving' }}
    >
      {error ? (
        <ControlError
          error={error}
          fallback="The non-moving report could not be read from SAP."
          onRetry={onRetry}
        />
      ) : loading ? (
        <ControlSkeletonRows rows={5} />
      ) : visible.length === 0 ? (
        <ControlEmpty
          message={`Everything in ${CONTROL_WAREHOUSE} has moved within ${STANDING_AGE_DAYS} days.`}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <ControlScrollList grow>
            {visible.map((item) => (
              <StandingRow key={`${item.item_code}-${item.warehouse}`} item={item} />
            ))}
          </ControlScrollList>

          <div className="shrink-0 space-y-1 text-xs text-muted-foreground">
            {hidden > 0 && (
              <p>
                {formatCount(hidden)} further item{hidden === 1 ? '' : 's'} are not drawn.
              </p>
            )}
            <p>
              {CONTROL_WAREHOUSE} turns over about every 3 days, so this is a shipping queue rather
              than dead stock.
            </p>
          </div>
        </div>
      )}
    </ControlSection>
  );
}
