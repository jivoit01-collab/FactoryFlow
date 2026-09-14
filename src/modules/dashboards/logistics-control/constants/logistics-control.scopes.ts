import { COMPANY_CODES } from '@/config/constants';

import {
  LOGISTICS_CONTROL_DISPATCH_COMPANIES,
  LOGISTICS_CONTROL_SECTION_DEPARTMENTS,
  LOGISTICS_CONTROL_SECTION_EMPLOYEE_DEPARTMENTS,
  LOGISTICS_CONTROL_WAREHOUSE,
  LOGISTICS_CONTROL_WAREHOUSE_COMPANY,
} from './logistics-control.constants';

/** The three cards each band closes with a people strip for. */
export type LogisticsSection = 'warehouse' | 'dispatch' | 'transport';

/**
 * A tile whose source does not exist for a scope, and the sentence saying why.
 *
 * Deliberately a reason rather than a boolean. The board's one hard rule is
 * that a figure with no source behind it does not look like a figure, and "no
 * data" is not a reason — a reader has to be able to tell an empty warehouse
 * from an unbuilt feed without leaving the wall. Absent a key here, the tile
 * reads its feed normally.
 */
export interface LogisticsAbsentSources {
  /** WMS pallet slots — the fallback for "how full" where no tonnage capacity is set. */
  palletSpace?: string;
  /** The partial-scan register behind "Sent without barcodes". */
  barcodeScanning?: string;
  /** The intercompany transit read. */
  stockInTransit?: string;
}

/**
 * Everything that makes one operations board a different board from another.
 *
 * The board was written pinned to one plant — BH-BT, Oil plus Mart — and every
 * pinned value it needs now lives here instead, so a second plant is a second
 * object rather than a second copy of a 900-line page. Nothing else about the
 * board is parameterised: both boards run the same three bands, the same
 * sixteen tiles and the same hues, which is the whole point of a wall that two
 * different teams learn to read once.
 *
 * The fields divide into three kinds, and mixing them up is how this board
 * reports another company's numbers under this company's heading:
 *
 *   - `warehouseCompany` names whose SAP *chart of warehouses* holds the floor.
 *     Read `BH-FG` through Oil's schema and the answer is empty rather than
 *     wrong, which is much harder to notice on a wall than an error.
 *   - `settingsCompany` names whose *typed-in* rows the board reads — rated
 *     capacity, owned registrations, section salaries. These are stored per
 *     company and reached by the `Company-Code` header, so they follow the
 *     board rather than whoever happens to be signed in.
 *   - `dispatchCompanies` is what is ADDED. See the constants module for the
 *     three things that must hold before two companies can be summed.
 */
export interface LogisticsControlScope {
  /** Stable id — query keys, tests, and nothing a reader ever sees. */
  key: 'oil' | 'beverages';
  /** The heading on the topbar. */
  title: string;
  /** Where this board lives, for the settings screen's way back. */
  boardPath: string;
  /** Where this board's settings live. */
  settingsPath: string;
  /** The finished-goods floor the warehouse band reports on. */
  warehouse: string;
  /** The company whose SAP chart of warehouses holds that floor. */
  warehouseCompany: string;
  /** The company whose typed-in board and warehouse settings this board reads. */
  settingsCompany: string;
  /** The companies whose dispatch is added together. */
  dispatchCompanies: readonly string[];
  /** Gate labour department names counting against each card. */
  sectionDepartments: Record<LogisticsSection, readonly string[]>;
  /** Employee-directory department names counting against each card. */
  sectionEmployeeDepartments: Record<LogisticsSection, readonly string[]>;
  /** Tiles with no source under this scope, each with the sentence it prints. */
  absent: LogisticsAbsentSources;
}

/**
 * The original board: BH-BT, Oil and Mart added.
 *
 * Every value is the constant it was before this type existed, so the Oil board
 * is unchanged by the split — with one deliberate exception. `settingsCompany`
 * pins the typed-in figures to Oil, where they were previously read through
 * whichever company the viewer was signed into. That was a latent bug rather
 * than a feature: it is how an empty `JIVO_MART` settings row came to exist,
 * created the first time somebody signed into Mart opened this board, and a
 * wall screen must show the same capacity and the same fleet to everybody
 * standing in front of it.
 */
export const LOGISTICS_CONTROL_OIL_SCOPE: LogisticsControlScope = {
  key: 'oil',
  title: 'Operations board',
  boardPath: '/dashboards/logistics-control',
  settingsPath: '/dashboards/logistics-control/settings',
  warehouse: LOGISTICS_CONTROL_WAREHOUSE,
  warehouseCompany: LOGISTICS_CONTROL_WAREHOUSE_COMPANY,
  settingsCompany: LOGISTICS_CONTROL_WAREHOUSE_COMPANY,
  dispatchCompanies: LOGISTICS_CONTROL_DISPATCH_COMPANIES,
  sectionDepartments: LOGISTICS_CONTROL_SECTION_DEPARTMENTS,
  sectionEmployeeDepartments: LOGISTICS_CONTROL_SECTION_EMPLOYEE_DEPARTMENTS,
  absent: {},
};

/**
 * The beverages plant: BH-FG, Jivo Beverages alone.
 *
 * `BH-FG` — Bhakharpur Finished Basement — is the exact counterpart of Oil's
 * BH-BT rather than a guess at one: 354 of the 365 invoices Beverages raised in
 * the thirty days to 12 September 2026 shipped out of it, and it holds 1.03 m
 * pieces of finished goods against BH-PF's 99 k. Note the code collision that
 * makes the warehouse company matter — Beverages has its own `BH-PF` and its
 * own `BH-WST`, and those are different floors from Oil's.
 *
 * One company, not two, so none of the intercompany arithmetic the Oil board
 * needs applies here: nothing is de-duplicated across dockings and no group
 * customer has to be stripped out, because there is no second schema to add.
 *
 * Three of the sixteen tiles have no source on this side of the plant. They
 * stay in the grid and say why — see `absent` below and the rule it enforces.
 */
export const LOGISTICS_CONTROL_BEVERAGES_SCOPE: LogisticsControlScope = {
  key: 'beverages',
  title: 'Beverages operations',
  // The same route as the Oil board. Which plant a reader gets is decided by
  // the company they are signed into, not by the URL — see
  // `logisticsControlScopeForCompany`. One menu entry, one address, and the
  // company switcher is the only control: a Beverages wall screen is a browser
  // signed into Beverages, which is how every other company-scoped screen in
  // this app already works.
  boardPath: '/dashboards/logistics-control',
  settingsPath: '/dashboards/logistics-control/settings',
  warehouse: 'BH-FG',
  warehouseCompany: COMPANY_CODES.JIVO_BEVERAGES,
  settingsCompany: COMPANY_CODES.JIVO_BEVERAGES,
  dispatchCompanies: [COMPANY_CODES.JIVO_BEVERAGES],
  sectionDepartments: {
    // The gate's own name for this floor's intake. "Warehouse Basement" is
    // Oil's and "Warehouse Gupta" is a third floor again — folding any of them
    // together would price one section's labour against another's head count.
    warehouse: ['Warehouse Beverage'],
    // Empty for the same reason they are empty on the Oil board: no gate labour
    // department names either section, and a card whose list is empty says it is
    // unassigned rather than reporting a zero that looks like an answer.
    dispatch: [],
    transport: [],
  },
  // The employee directory holds no departments at all today, so these never
  // match and every section falls back to the head count typed on the settings
  // screen. Listed anyway, and identically to Oil's: the fallback is the right
  // answer while the directory is empty, and the wrong one the day it is filled.
  sectionEmployeeDepartments: LOGISTICS_CONTROL_SECTION_EMPLOYEE_DEPARTMENTS,
  absent: {
    // No WMS floor is mapped to a Beverages warehouse — WMS holds two Oil
    // warehouses and one Mart godown and nothing else. The tile's first choice
    // is the rated tonnage capacity anyway, which is typed in and works here;
    // this only removes the slot-count fallback behind it.
    palletSpace:
      'No WMS floor is mapped for Beverages, so pallet slots cannot stand in for a rated capacity.',
    // 22 barcoded boxes against Oil's 327,738. Beverages stock is not barcoded,
    // so the partial-scan register is structurally empty — and a tile reading
    // "0 boxes, none this month" would report perfect scanning discipline on a
    // floor that does not scan at all.
    barcodeScanning:
      'Beverages stock is not barcoded, so there is no box scan for a dispatch to fall short of.',
    // The transit read matches A/R invoices against the receiving company's
    // goods receipt, and its route table covers Oil → Mart only. Beverages has
    // never raised a branch stock transfer.
    stockInTransit:
      'No intercompany route is configured for Beverages — this read covers Oil to Mart only.',
  },
};

/**
 * The board the signed-in company should see.
 *
 * Beverages gets its own plant; everyone else — Oil, Mart, and an unknown or
 * not-yet-loaded company — gets the Oil board, which is what the single board
 * showed before this split and so the safe answer while the company is still
 * resolving.
 *
 * Mart deliberately maps to the Oil board rather than to nothing: Mart's
 * dispatch is one of the two halves that board adds together, so a Mart user
 * opening it is reading a board their own shipments are inside.
 */
export function logisticsControlScopeForCompany(
  companyCode: string | null | undefined,
): LogisticsControlScope {
  return companyCode === COMPANY_CODES.JIVO_BEVERAGES
    ? LOGISTICS_CONTROL_BEVERAGES_SCOPE
    : LOGISTICS_CONTROL_OIL_SCOPE;
}

/** Both boards, for anything that has to enumerate them. */
export const LOGISTICS_CONTROL_SCOPES: readonly LogisticsControlScope[] = [
  LOGISTICS_CONTROL_OIL_SCOPE,
  LOGISTICS_CONTROL_BEVERAGES_SCOPE,
];
