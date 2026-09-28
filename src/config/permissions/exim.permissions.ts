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
} as const;

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
export const EXIM_ACCESS: string[] = [...EXIM_LICENCE_ACCESS, EXIM_PERMISSIONS.VIEW_CUSTOMS_RATES];
