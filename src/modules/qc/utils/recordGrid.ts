/**
 * Helpers shared between the record fill grid and the page that hosts it.
 *
 * They live outside the component files so both can import them without
 * breaking fast refresh (a module that exports a component must export
 * nothing else).
 */

/** The API returns 'HH:MM:SS'; a freshly added column is already 'HH:MM'. */
export function toHHMM(slotTime: string): string {
  return slotTime.slice(0, 5);
}

/** Key for one cell of the grid: `HH:MM|parameterId`. */
export function cellKey(slotTime: string, parameterId: number): string {
  return `${toHHMM(slotTime)}|${parameterId}`;
}
