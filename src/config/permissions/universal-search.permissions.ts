/**
 * Universal Search Permissions
 *
 * One right, mapping to the Django permission on
 * `universal_search.UniversalSearchPermission`. It opens the modal and nothing
 * else: every result the search returns is filtered again on the server
 * against the view permission of the module that owns it, so holding this
 * cannot reveal a record the user could not already open.
 */

export const UNIVERSAL_SEARCH_PERMISSIONS = {
  /** Open the search modal and look a number up */
  USE: 'universal_search.can_use_universal_search',
} as const;

export const UNIVERSAL_SEARCH_MODULE_PREFIX = 'universal_search';

/** Any permission that should reveal the search. */
export const UNIVERSAL_SEARCH_ACCESS: readonly string[] = [
  UNIVERSAL_SEARCH_PERMISSIONS.USE,
];

export type UniversalSearchPermission =
  (typeof UNIVERSAL_SEARCH_PERMISSIONS)[keyof typeof UNIVERSAL_SEARCH_PERMISSIONS];
