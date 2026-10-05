import type { FreightBenchmarkRate, FreightSlab } from '../../types/freightBenchmark.types';

const RUPEES = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const RUPEES_PAISE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const KG = new Intl.NumberFormat('en-IN');

/** "₹13,000" for a truck, "₹1.20/kg" for a per-kg rate. */
export function formatRate(rate: Pick<FreightBenchmarkRate, 'basis' | 'amount'>): string {
  if (rate.basis === 'PER_KG') return `${RUPEES_PAISE.format(rate.amount)}/kg`;
  return Number.isInteger(rate.amount)
    ? RUPEES.format(rate.amount)
    : RUPEES_PAISE.format(rate.amount);
}

/** "up to 5,000 kg", "5,001–10,000 kg" — what a slab's label stands for. */
export function slabBand(slab: Pick<FreightSlab, 'above_kg' | 'up_to_kg'>): string {
  if (slab.above_kg === 0) return `up to ${KG.format(slab.up_to_kg)} kg`;
  return `${KG.format(slab.above_kg + 1)}–${KG.format(slab.up_to_kg)} kg`;
}

/**
 * The band, when the label does not already say it: "10 MT" needs
 * "5,001–10,000 kg" under it, "2,001-2,500 kg" does not.
 */
export function slabBandHint(slab: Pick<FreightSlab, 'label' | 'above_kg' | 'up_to_kg'>): string {
  const band = slabBand(slab);
  const said = slab.label.toLowerCase().replace(/\s*-\s*/g, '–');
  return said === band ? '' : band;
}

/** Two bands a single vehicle could fall into both of. */
export function slabsOverlap(
  a: Pick<FreightSlab, 'above_kg' | 'up_to_kg'>,
  b: Pick<FreightSlab, 'above_kg' | 'up_to_kg'>,
): boolean {
  return a.above_kg < b.up_to_kg && b.above_kg < a.up_to_kg;
}
