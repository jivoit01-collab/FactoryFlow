/**
 * Artwork Module Permissions
 *
 * Two strings, mapping 1:1 to the custom Django permissions on
 * `artwork.ArtworkRecord`, and two groups behind them:
 *
 *   Artwork Viewer  -> can_view_artwork
 *   Artwork Editor  -> can_view_artwork + can_manage_artwork
 *
 * `manage` implies `view` at the API, so the access list below is what reveals
 * the page: an editor who was granted only the manage right still gets in.
 */

export const ARTWORK_PERMISSIONS = {
  /** Read the register, open and download the PDF and CDR files. */
  VIEW: 'artwork.can_view_artwork',
  /** Capture, revise and retire artwork. */
  MANAGE: 'artwork.can_manage_artwork',
} as const;

export const ARTWORK_MODULE_PREFIX = 'artwork';

/** Anything that should reveal the artwork register. */
export const ARTWORK_ACCESS: readonly string[] = [
  ARTWORK_PERMISSIONS.VIEW,
  ARTWORK_PERMISSIONS.MANAGE,
];

export type ArtworkPermission = (typeof ARTWORK_PERMISSIONS)[keyof typeof ARTWORK_PERMISSIONS];
