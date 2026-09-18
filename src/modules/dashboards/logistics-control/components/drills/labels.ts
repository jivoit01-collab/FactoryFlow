/** The booking states, as a person reads them. */
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Not booked',
  BOOKED: 'Booked',
  DISPATCHED: 'Gone',
  CANCELLED: 'Cancelled',
};

/** The duty states, as a person reads them. */
export const VEHICLE_STATE_LABELS: Record<string, string> = {
  OUT_OF_SERVICE: 'Off the road',
  ON_BST: 'On a branch transfer',
  ON_DISPATCH: 'On a dispatch',
  AT_PLANT: 'At the plant',
  OUT: 'Out',
  FREE: 'Free',
};

/**
 * The order the duty states are read in: what is available first, what is
 * unavailable last. Alphabetical or feed order would put "off the road" above
 * "free", which inverts the question the tile is asked.
 */
export const VEHICLE_STATE_ORDER: readonly string[] = [
  'FREE',
  'ON_DISPATCH',
  'ON_BST',
  'AT_PLANT',
  'OUT',
  'OUT_OF_SERVICE',
];

/** The transit age bands, as the tile names them. */
export const TRANSIT_BAND_LABELS: Record<string, string> = {
  fresh: 'Up to 3 days',
  ageing: '4 – 7 days',
  stale: 'Over 7 days',
};

/** Freshest first — the list is read as a clock running out. */
export const TRANSIT_BAND_ORDER: readonly string[] = ['fresh', 'ageing', 'stale'];
