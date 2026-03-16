import { useEffect, useMemo, useRef, useState } from 'react';

import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { getBreadcrumbMeta } from '@/app/registry';

/**
 * Get display name for a path segment.
 * Uses label overrides from the module registry, falls back to auto-formatting.
 */
function getDisplayName(segment: string, labels: Map<string, string>): string {
  if (/^\d+$/.test(segment)) return `#${segment}`;
  if (labels.has(segment)) return labels.get(segment)!;
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

/**
 * Check if a cumulative path matches any registered route.
 * Handles dynamic segments like :id by pattern-matching.
 */
function isNavigablePath(path: string, navigablePaths: Set<string>): boolean {
  // Direct match
  if (navigablePaths.has(path)) return true;

  // Check against patterns with dynamic segments (e.g. /grpo/preview/:vehicleEntryId)
  for (const registered of navigablePaths) {
    if (!registered.includes(':')) continue;
    const regParts = registered.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    if (regParts.length !== pathParts.length) continue;

    const matches = regParts.every(
      (part, i) => part.startsWith(':') || part === pathParts[i],
    );
    if (matches) return true;
  }

  return false;
}

/**
 * Get redirect path for non-navigable intermediate paths.
 * E.g., /gate/raw-materials/edit -> /gate/raw-materials
 */
function getRedirectPath(path: string, segments: string[]): string | null {
  if (path.includes('/edit')) {
    const editIndex = segments.indexOf('edit');
    if (editIndex > 0) return '/' + segments.slice(0, editIndex).join('/');
  }
  if (path.includes('/new')) {
    const newIndex = segments.indexOf('new');
    if (newIndex > 0) return '/' + segments.slice(0, newIndex).join('/');
  }
  if (path.includes('/inspections') && !path.includes('/pending')) {
    return '/qc/pending';
  }
  if (path === '/grpo/preview') {
    return '/grpo/pending';
  }
  return null;
}

interface BreadcrumbItem {
  path: string;
  segment: string;
  displayName: string;
  isNavigable: boolean;
  redirectPath: string | null;
  isClickable: boolean;
  isLast: boolean;
}

export function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [showCollapsed, setShowCollapsed] = useState(false);

  const { navigablePaths, labels } = useMemo(() => getBreadcrumbMeta(), []);

  const pathSegments = location.pathname.split('/').filter(Boolean);

  const items: BreadcrumbItem[] = useMemo(
    () =>
      pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const isLast = index === pathSegments.length - 1;
        const isNav = isNavigablePath(path, navigablePaths);
        const redirectPath = getRedirectPath(path, pathSegments);
        return {
          path,
          segment,
          displayName: getDisplayName(segment, labels),
          isNavigable: isNav,
          redirectPath,
          isClickable: !isLast && (isNav || !!redirectPath),
          isLast,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname, navigablePaths, labels],
  );

  // Detect overflow
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const check = () => {
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  const handleClick = (
    e: React.MouseEvent,
    item: BreadcrumbItem,
  ) => {
    if (!item.isNavigable && item.redirectPath) {
      e.preventDefault();
      navigate(item.redirectPath);
    } else if (!item.isNavigable) {
      e.preventDefault();
    }
  };

  // Determine which items to show
  // When overflowing: show first + "..." + last
  // When collapsed popover is open: show all middle items
  const shouldCollapse = isOverflowing && items.length > 2;
  const visibleItems = shouldCollapse
    ? [items[0], ...items.slice(-1)]
    : items;
  const collapsedItems = shouldCollapse ? items.slice(1, -1) : [];

  const renderItem = (item: BreadcrumbItem) => (
    <div key={item.path} className="flex items-center flex-shrink-0">
      <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
      {item.isLast ? (
        <span className="text-foreground font-medium bg-muted/30 rounded px-2 py-0.5">
          {item.displayName}
        </span>
      ) : item.isClickable ? (
        <Link
          to={item.isNavigable ? item.path : item.redirectPath || item.path}
          onClick={(e) => handleClick(e, item)}
          className="hover:text-foreground hover:bg-muted/50 rounded px-2 py-0.5 transition-colors"
        >
          {item.displayName}
        </Link>
      ) : (
        <span className="px-2 py-0.5">{item.displayName}</span>
      )}
    </div>
  );

  return (
    <nav
      ref={navRef}
      className="flex items-center text-xs sm:text-sm text-muted-foreground mb-4 overflow-x-auto pb-1 scrollbar-hide"
    >
      <Link
        to="/"
        className="hover:text-foreground hover:bg-muted/50 rounded p-1 transition-colors flex-shrink-0"
      >
        <Home className="h-4 w-4" />
      </Link>

      {shouldCollapse ? (
        <>
          {/* First item */}
          {renderItem(visibleItems[0])}

          {/* Collapsed "..." button */}
          <div className="flex items-center flex-shrink-0 relative">
            <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
            <button
              type="button"
              onClick={() => setShowCollapsed(!showCollapsed)}
              className="hover:text-foreground hover:bg-muted/50 rounded px-1.5 py-0.5 transition-colors"
              aria-label="Show full breadcrumb path"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {/* Dropdown with collapsed items */}
            {showCollapsed && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowCollapsed(false)}
                />
                <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-md py-1 min-w-[140px]">
                  {collapsedItems.map((item) => (
                    <div key={item.path} className="px-1">
                      {item.isClickable ? (
                        <Link
                          to={
                            item.isNavigable
                              ? item.path
                              : item.redirectPath || item.path
                          }
                          onClick={(e) => {
                            handleClick(e, item);
                            setShowCollapsed(false);
                          }}
                          className="block px-3 py-1.5 text-sm hover:bg-muted/50 rounded transition-colors"
                        >
                          {item.displayName}
                        </Link>
                      ) : (
                        <span className="block px-3 py-1.5 text-sm text-muted-foreground">
                          {item.displayName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Last item */}
          {renderItem(visibleItems[1])}
        </>
      ) : (
        items.map(renderItem)
      )}
    </nav>
  );
}
