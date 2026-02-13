import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Short display names for breadcrumb segments
const SHORT_NAMES: Record<string, string> = {
  'raw-materials': 'RM',
  'daily-needs': 'Daily',
  maintenance: 'Maint.',
  construction: 'Const.',
  'visitor-labour': 'Visitors',
  'quality-check': 'QC',
  qc: 'QC',
  grpo: 'GRPO',
  gate: 'Gate',
  step1: 'Step 1',
  step2: 'Step 2',
  step3: 'Step 3',
  step4: 'Step 4',
  step5: 'Step 5',
  review: 'Review',
  edit: 'Edit',
  new: 'New',
  all: 'All',
  master: 'Master',
  'material-types': 'Materials',
  parameters: 'Params',
  pending: 'Pending',
  approvals: 'Approvals',
  inspections: 'Inspections',
  preview: 'Preview',
  history: 'History',
};

// Paths that have actual route components (navigable)
const NAVIGABLE_PATHS = [
  '/',
  '/gate',
  '/gate/raw-materials',
  '/gate/raw-materials/all',
  '/gate/daily-needs',
  '/gate/daily-needs/all',
  '/gate/maintenance',
  '/gate/construction',
  '/gate/visitor-labour',
  '/qc',
  '/qc/pending',
  '/qc/approvals',
  '/qc/master',
  '/qc/master/material-types',
  '/qc/master/parameters',
  '/grpo',
  '/grpo/pending',
  '/grpo/history',
];

/**
 * Get display name for a path segment
 */
function getDisplayName(segment: string): string {
  // Check if it's a numeric ID
  if (/^\d+$/.test(segment)) {
    return `#${segment}`;
  }
  // Use short name if available
  if (SHORT_NAMES[segment]) {
    return SHORT_NAMES[segment];
  }
  // Capitalize and replace dashes
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

/**
 * Check if a path is directly navigable
 */
function isNavigablePath(path: string): boolean {
  return NAVIGABLE_PATHS.includes(path);
}

/**
 * Get redirect path for non-navigable intermediate paths
 * E.g., /gate/raw-materials/edit -> /gate/raw-materials
 */
function getRedirectPath(path: string, segments: string[]): string | null {
  // For /edit paths, redirect to parent list
  if (path.includes('/edit')) {
    const editIndex = segments.indexOf('edit');
    if (editIndex > 0) {
      return '/' + segments.slice(0, editIndex).join('/');
    }
  }
  // For /new paths, redirect to parent list
  if (path.includes('/new')) {
    const newIndex = segments.indexOf('new');
    if (newIndex > 0) {
      return '/' + segments.slice(0, newIndex).join('/');
    }
  }
  // For /inspections paths, redirect to pending
  if (path.includes('/inspections') && !path.includes('/pending')) {
    return '/qc/pending';
  }
  // For /grpo/preview paths, redirect to pending list
  if (path === '/grpo/preview') {
    return '/grpo/pending';
  }
  return null;
}

export function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const handleClick = (
    e: React.MouseEvent,
    _path: string,
    isNavigable: boolean,
    redirectPath: string | null,
  ) => {
    if (!isNavigable && redirectPath) {
      e.preventDefault();
      navigate(redirectPath);
    } else if (!isNavigable) {
      e.preventDefault();
    }
  };

  return (
    <nav className="flex items-center text-xs sm:text-sm text-muted-foreground mb-4 overflow-x-auto pb-1 scrollbar-hide">
      <Link
        to="/"
        className="hover:text-foreground hover:bg-muted/50 rounded p-1 transition-colors flex-shrink-0"
      >
        <Home className="h-4 w-4" />
      </Link>

      {pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const isLast = index === pathSegments.length - 1;
        const displayName = getDisplayName(segment);
        const isNavigable = isNavigablePath(path);
        const redirectPath = getRedirectPath(path, pathSegments);
        const isClickable = !isLast && (isNavigable || redirectPath);

        return (
          <div key={path} className="flex items-center flex-shrink-0">
            <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
            {isLast ? (
              <span className="text-foreground font-medium bg-muted/30 rounded px-2 py-0.5">
                {displayName}
              </span>
            ) : isClickable ? (
              <Link
                to={isNavigable ? path : redirectPath || path}
                onClick={(e) => handleClick(e, path, isNavigable, redirectPath)}
                className="hover:text-foreground hover:bg-muted/50 rounded px-2 py-0.5 transition-colors"
              >
                {displayName}
              </Link>
            ) : (
              <span className="px-2 py-0.5">{displayName}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
