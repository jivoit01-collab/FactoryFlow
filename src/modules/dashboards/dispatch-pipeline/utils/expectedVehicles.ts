import { PIPELINE_STAGE_ORDER } from '../constants';
import type { PipelineCard, PipelineStage } from '../types';

export interface ExpectedVehicle {
  vehicleId: number | null;
  vehicleNo: string;
  stage: PipelineStage;
  moduleLabel: string;
  stageAt: string | null;
  dispatchDate: string | null;
  docNums: string[];
  customers: string[];
  billCount: number;
  /** True when the vehicle's current stage is one this module can act on now. */
  startable: boolean;
}

function stageOrder(stage: PipelineStage): number {
  const index = PIPELINE_STAGE_ORDER.indexOf(stage);
  return index === -1 ? PIPELINE_STAGE_ORDER.length : index;
}

/**
 * Group per-bill pipeline cards into one row per vehicle. The headline is the
 * vehicle's least-advanced bill (what it is still waiting on) -- which equals
 * the shared stage when the bills move in parallel. ``startableStages`` marks
 * the rows this module can start now (e.g. READY_TO_DOCK for docking).
 */
export function buildExpectedVehicles(
  cards: PipelineCard[],
  startableStages: PipelineStage[],
): ExpectedVehicle[] {
  const startable = new Set(startableStages);
  const grouped = new Map<string, { headline: PipelineCard; cards: PipelineCard[] }>();

  for (const card of cards) {
    const key = card.vehicle_id != null ? `id:${card.vehicle_id}` : `no:${card.vehicle_no}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { headline: card, cards: [card] });
      continue;
    }
    existing.cards.push(card);
    const newOrder = stageOrder(card.stage);
    const curOrder = stageOrder(existing.headline.stage);
    if (
      newOrder < curOrder ||
      (newOrder === curOrder && (card.stage_at || '') < (existing.headline.stage_at || ''))
    ) {
      existing.headline = card;
    }
  }

  const rows: ExpectedVehicle[] = [];
  for (const { headline, cards: group } of grouped.values()) {
    rows.push({
      vehicleId: headline.vehicle_id,
      vehicleNo: headline.vehicle_no,
      stage: headline.stage,
      moduleLabel: headline.module_label,
      stageAt: headline.stage_at,
      dispatchDate: headline.dispatch_date,
      docNums: [...new Set(group.map((c) => c.sap_doc_num).filter(Boolean))],
      customers: [...new Set(group.map((c) => c.customer_name).filter(Boolean))],
      billCount: group.length,
      startable: startable.has(headline.stage),
    });
  }

  // Actionable rows first, then by dispatch date.
  return rows.sort((a, b) => {
    if (a.startable !== b.startable) return a.startable ? -1 : 1;
    return (a.dispatchDate || '').localeCompare(b.dispatchDate || '');
  });
}
