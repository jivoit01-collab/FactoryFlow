/**
 * Which child of a sidebar group the current page belongs to.
 *
 * A child owns its own path and everything below it, so a detail page
 * (`/employees/42`) still lights up its list entry (`/employees`). But when two
 * siblings both contain the page, only the more specific one is active: on
 * `/organization/attendance`, Attendance is lit and the Ownership chart at
 * `/organization` is not. NavLink's own prefix match lit both.
 */
export function activeChildPath(
  children: readonly { path: string }[],
  pathname: string,
): string | null {
  let best: string | null = null;
  for (const { path } of children) {
    const contains =
      pathname === path || pathname.startsWith(path.endsWith('/') ? path : `${path}/`);
    if (contains && (best === null || path.length > best.length)) best = path;
  }
  return best;
}
