/**
 * The freight benchmark table: what a truckload should cost to each
 * destination, by vehicle-size slab. The company's own benchmark — not any
 * transporter's quote.
 */

/**
 * A band of vehicle capacity: over `above_kg`, up to and including `up_to_kg`.
 * "10 MT" is 5,000 < capacity ≤ 10,000 kg, so a truck falls in exactly one of
 * a destination's slabs.
 */
export interface FreightSlab {
  id: number;
  label: string;
  above_kg: number;
  up_to_kg: number;
  sort_order: number;
  is_active: boolean;
  /** Destinations holding a rate on it; a slab in use cannot be deleted. */
  destination_count: number;
}

/** Flat for the truck, or rupees per kg of load (Delhi NCR's 5,001–8,000 kg). */
export type FreightRateBasis = 'PER_TRIP' | 'PER_KG';

export interface FreightBenchmarkRate {
  slab: number;
  basis: FreightRateBasis;
  amount: number;
}

export interface FreightDestination {
  id: number;
  /** The state, or "DELHI NCR" for the capital-region groups. */
  state: string;
  district: string;
  name: string;
  pin_code: string;
  distance_km: number | null;
  remarks: string;
  is_active: boolean;
  updated_at: string;
  updated_by_name: string;
  rates: FreightBenchmarkRate[];
}

export interface FreightBenchmarkTable {
  slabs: FreightSlab[];
  destinations: FreightDestination[];
}

export interface FreightDestinationInput {
  state: string;
  district: string;
  name: string;
  pin_code: string;
  distance_km: number | null;
  remarks: string;
  is_active: boolean;
  /** The destination's whole rate list: a slab left out loses its rate. */
  rates: { slab: number; basis: FreightRateBasis; amount: string }[];
}

export interface FreightSlabInput {
  label: string;
  above_kg: number;
  up_to_kg: number;
  sort_order: number;
  is_active: boolean;
}
