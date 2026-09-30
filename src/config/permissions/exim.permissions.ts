/**
 * Import / Export permissions — EXIM's own rights, carried over 1:1.
 *
 * EXIM (the import/export system that ran on its own server) is moving into
 * this app one module at a time. Its users arrived first, holding the rights
 * they hold in EXIM under the `exim` label: `license.view_advancelicenseheaders`
 * there is `exim.view_advancelicenseheaders` here. The backend (`exim/`) checks
 * exactly these strings.
 *
 * EXIM gated a licence per part — the header, its import lines, its export
 * lines — and per kind, so `licenceRight` picks the string the same way the
 * backend's `exim.permissions.licence_right` does.
 */
export type LicenceKind = 'ADVANCE' | 'DFIA';
export type LineDirection = 'IMPORT' | 'EXPORT';
export type LicenceAction = 'view' | 'add' | 'change' | 'delete';

/** EXIM's model name inside the codename, for each part of a licence. */
const LICENCE_MODELS: Record<LicenceKind, Record<'HEADER' | LineDirection, string>> = {
  ADVANCE: {
    HEADER: 'advancelicenseheaders',
    IMPORT: 'advancelicenseimportlines',
    EXPORT: 'advancelicenseexportlines',
  },
  DFIA: {
    HEADER: 'dfialicenseheader',
    IMPORT: 'dfialicenseimportlines',
    EXPORT: 'dfialicenseexportlines',
  },
};

/** The right to `action` a licence of `kind` — its header, or its lines of `direction`. */
export function licenceRight(
  action: LicenceAction,
  kind: LicenceKind,
  direction?: LineDirection,
): string {
  return `exim.${action}_${LICENCE_MODELS[kind][direction ?? 'HEADER']}`;
}

export const EXIM_PERMISSIONS = {
  VIEW_ADVANCE_LICENCES: licenceRight('view', 'ADVANCE'),
  VIEW_DFIA_LICENCES: licenceRight('view', 'DFIA'),
  /** EXIM filed this under its accounts app; the codename is unchanged. */
  VIEW_CUSTOMS_RATES: 'exim.view_exim_rates',

  // The tank farm. EXIM's codenames: an oil is a "tankitem", a tank "tankdata".
  OIL_VIEW: 'exim.view_tankitem',
  OIL_ADD: 'exim.add_tankitem',
  OIL_CHANGE: 'exim.change_tankitem',
  OIL_DELETE: 'exim.delete_tankitem',
  TANK_VIEW: 'exim.view_tankdata',
  TANK_ADD: 'exim.add_tankdata',
  TANK_CHANGE: 'exim.change_tankdata',
  TANK_DELETE: 'exim.delete_tankdata',
  /** What the oil in the tanks cost, lot by lot. */
  TANK_AVERAGE: 'exim.view_itemwise_average',
  TANK_LOG_VIEW: 'exim.view_tanklog',
  /** EXIM filed this under its accounts app too. */
  OPENING_STOCK: 'exim.add_opening_rate',

  // Oil lots. EXIM's "stockstatus"; a shortage is its "debitentry".
  LOT_VIEW: 'exim.view_stockstatus',
  LOT_ADD: 'exim.add_stockstatus',
  LOT_CHANGE: 'exim.change_stockstatus',
  LOT_DELETE: 'exim.delete_stockstatus',
  VEHICLE_REPORT: 'exim.view_vehicle_report',
  SHORTAGE_VIEW: 'exim.view_debitentry',
  /** Every change to every lot; a lot's own history needs LOT_VIEW only. */
  CHANGE_LOG_VIEW: 'exim.view_stockstatusupdatelog',
  CONTRACT_HISTORY_VIEW: 'exim.view_contractualhistory',
  DASHBOARD_ORDER_CHANGE: 'exim.change_dashboardorder',
  /** A vendor SAP does not have yet. EXIM's vendors were "party". */
  TEMP_VENDOR_ADD: 'exim.add_party',
  DIRECTOR_REPORT: 'exim.view_director_report',

  // Oil contracts. EXIM's register was "domesticreports", its landed-cost
  // sheet "domesticcontractdetails"; either opens the contracts.
  CONTRACT_VIEW: 'exim.view_domesticreports',
  LANDED_COST_VIEW: 'exim.view_domesticcontractdetails',
  /** Set a PO's delivery terms, freight and brokerage. */
  CONTRACT_CHANGE: 'exim.change_domesticreports',
} as const;

export const EXIM_CONTRACT_ACCESS: string[] = [
  EXIM_PERMISSIONS.CONTRACT_VIEW,
  EXIM_PERMISSIONS.LANDED_COST_VIEW,
];

export const EXIM_TANK_ACCESS: string[] = [
  EXIM_PERMISSIONS.TANK_VIEW,
  EXIM_PERMISSIONS.OIL_VIEW,
  EXIM_PERMISSIONS.TANK_LOG_VIEW,
  EXIM_PERMISSIONS.TANK_AVERAGE,
];

export const EXIM_LOT_ACCESS: string[] = [
  EXIM_PERMISSIONS.LOT_VIEW,
  EXIM_PERMISSIONS.SHORTAGE_VIEW,
  EXIM_PERMISSIONS.VEHICLE_REPORT,
  EXIM_PERMISSIONS.CHANGE_LOG_VIEW,
  EXIM_PERMISSIONS.CONTRACT_HISTORY_VIEW,
];

export const EXIM_LICENCE_ACCESS: string[] = [
  EXIM_PERMISSIONS.VIEW_ADVANCE_LICENCES,
  EXIM_PERMISSIONS.VIEW_DFIA_LICENCES,
];

/**
 * Anyone holding one of these sees the Import / Export entry.
 *
 * Deliberately a list rather than the `exim` module prefix. EXIM's users hold
 * `exim.*` rights for every EXIM screen, most of which have not moved yet; a
 * prefix gate would show somebody with tank rights alone an entry that opens
 * onto nothing. Each module that moves adds its view rights here.
 */
export const EXIM_ACCESS: string[] = [
  ...EXIM_LICENCE_ACCESS,
  EXIM_PERMISSIONS.VIEW_CUSTOMS_RATES,
  ...EXIM_TANK_ACCESS,
  ...EXIM_LOT_ACCESS,
  EXIM_PERMISSIONS.DIRECTOR_REPORT,
  ...EXIM_CONTRACT_ACCESS,
];
