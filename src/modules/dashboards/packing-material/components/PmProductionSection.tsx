import { Factory } from 'lucide-react';

import { ACCENTS } from '@/shared/components/dashboard';

import type { PmProductionResponse } from '../types';
import { PmTopTable } from './PmTopTable';

export interface PmProductionSectionProps {
  report?: PmProductionResponse;
  isLoading: boolean;
  top: number;
}

/**
 * Section one: the packing material the line actually used.
 *
 * The footer names the movement behind the figure, and it is not decoration.
 * Reading the store-to-line transfer instead of the goods issue reported 2
 * bottles against 603,505 really consumed on the live August data, so which
 * movement this is has to be legible on the screen that shows it.
 */
export function PmProductionSection({ report, isLoading, top }: PmProductionSectionProps) {
  const warehouses = report?.meta.consumption_warehouses ?? [];

  return (
    <PmTopTable
      icon={Factory}
      accent={ACCENTS.blue}
      title={`Top ${top} into production`}
      description="Packing material issued to the line over the month"
      items={report?.items ?? []}
      totals={report?.totals}
      isLoading={isLoading}
      emptyMessage="No packing material was issued to production in this month."
      footer={
        <span>
          Goods issues out of{' '}
          <span className="font-medium text-foreground">
            {warehouses.length ? warehouses.join(', ') : 'the production store'}
          </span>{' '}
          — what the line drew, not what was transferred down to it. The stores that feed it are not
          counted, or the same carton would be counted twice on its way to the floor. In-house blown
          bottles are included: they were issued like anything else.
        </span>
      }
    />
  );
}
