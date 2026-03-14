import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Labels for every URL segment used in the app
// ---------------------------------------------------------------------------
const SEGMENT_LABELS: Record<string, string> = {
  // Gate module
  gate: 'Gate',
  'raw-materials': 'Raw Materials',
  'daily-needs': 'Daily Needs',
  maintenance: 'Maintenance',
  construction: 'Construction',
  'visitor-labour': 'Visitor / Labour',
  visitors: 'Visitors',
  labours: 'Labours',
  contractors: 'Contractors',
  contractor: 'Contractor',
  inside: 'Inside',
  entry: 'Entry',
  // QC module
  qc: 'Quality Control',
  'quality-check': 'QC',
  pending: 'Pending',
  approvals: 'Approvals',
  inspections: 'Inspections',
  master: 'Master Data',
  'material-types': 'Material Types',
  parameters: 'Parameters',
  // GRPO module
  grpo: 'GRPO',
  preview: 'Preview',
  history: 'History',
  // Production module
  production: 'Production',
  planning: 'Planning',
  execution: 'Execution',
  breakdowns: 'Breakdowns',
  waste: 'Waste',
  reports: 'Reports',
  'line-clearance': 'Line Clearance',
  'machine-checklists': 'Machine Checklists',
  'start-run': 'Start Run',
  runs: 'Runs',
  yield: 'Yield',
  'bulk-import': 'Bulk Import',
  create: 'Create',
  daily: 'Daily Report',
  // Common wizard / shared
  new: 'New',
  edit: 'Edit',
  all: 'All',
  step1: 'Step 1',
  step2: 'Step 2',
  step3: 'Step 3',
  step4: 'Step 4',
  step5: 'Step 5',
  attachments: 'Attachments',
  review: 'Review',
  // Misc
  notifications: 'Notifications',
  profile: 'Profile',
};

// ---------------------------------------------------------------------------
// Every path that has a real page component behind it
// Only paths that can appear as a non-last breadcrumb segment matter here.
// ---------------------------------------------------------------------------
const NAVIGABLE_PATHS = new Set([
  '/',
  // Gate
  '/gate',
  '/gate/raw-materials',
  '/gate/raw-materials/all',
  '/gate/daily-needs',
  '/gate/daily-needs/all',
  '/gate/maintenance',
  '/gate/maintenance/all',
  '/gate/construction',
  '/gate/construction/all',
  '/gate/visitor-labour',
  '/gate/visitor-labour/all',
  '/gate/visitor-labour/inside',
  '/gate/visitor-labour/new',
  '/gate/visitor-labour/visitors',
  '/gate/visitor-labour/labours',
  '/gate/visitor-labour/contractors',
  // QC
  '/qc',
  '/qc/pending',
  '/qc/approvals',
  '/qc/master/material-types',
  '/qc/master/parameters',
  // GRPO
  '/grpo',
  '/grpo/pending',
  '/grpo/history',
  // Production
  '/production',
  '/production/planning',
  '/production/execution',
  '/production/execution/line-clearance',
  '/production/execution/machine-checklists',
  '/production/execution/breakdowns',
  '/production/execution/waste',
  '/production/execution/reports',
  // Misc
  '/notifications',
  '/profile',
]);

// ---------------------------------------------------------------------------
// Resolve where a breadcrumb segment should navigate.
// `path`     – the full path up to and including this segment
// `segments` – the individual segments up to and including this segment
// Returns a target URL string, or null if the segment is not clickable.
// ---------------------------------------------------------------------------
function resolveTarget(path: string, segments: string[]): string | null {
  // Directly navigable — link to itself
  if (NAVIGABLE_PATHS.has(path)) return path;

  // ── Edit workflows ────────────────────────────────────────────────────────
  // Any path under a /*/edit/... tree redirects back to the parent list.
  // e.g. /gate/raw-materials/edit → /gate/raw-materials
  //      /gate/raw-materials/edit/123 → /gate/raw-materials
  const editIdx = segments.indexOf('edit');
  if (editIdx > 0) {
    const editBasePath = '/' + segments.slice(0, editIdx + 1).join('/');
    if (path === editBasePath || path.startsWith(editBasePath + '/')) {
      return '/' + segments.slice(0, editIdx).join('/');
    }
  }

  // ── QC ───────────────────────────────────────────────────────────────────
  // /qc/inspections and /qc/inspections/:id → Pending Inspections
  if (path === '/qc/inspections' || path.startsWith('/qc/inspections/')) {
    return '/qc/pending';
  }
  // /qc/master has no landing page — redirect to Material Types (first subpage)
  if (path === '/qc/master') {
    return '/qc/master/material-types';
  }

  // ── GRPO ─────────────────────────────────────────────────────────────────
  // /grpo/preview and /grpo/preview/:id → Pending Entries
  if (path === '/grpo/preview' || path.startsWith('/grpo/preview/')) {
    return '/grpo/pending';
  }
  // /grpo/history/:id → History list
  if (path.startsWith('/grpo/history/')) {
    return '/grpo/history';
  }

  // ── Gate — Visitor / Labour ───────────────────────────────────────────────
  // /gate/visitor-labour/entry/:id → All Entries
  if (
    path === '/gate/visitor-labour/entry' ||
    path.startsWith('/gate/visitor-labour/entry/')
  ) {
    return '/gate/visitor-labour/all';
  }
  // /gate/visitor-labour/contractor/:id → Contractors list
  if (
    path === '/gate/visitor-labour/contractor' ||
    path.startsWith('/gate/visitor-labour/contractor/')
  ) {
    return '/gate/visitor-labour/contractors';
  }

  // ── Production — Planning ─────────────────────────────────────────────────
  // /production/planning/:planId  → Planning dashboard
  // /production/planning/:planId/edit → Planning dashboard
  // (create and bulk-import are actual navigable pages, handled by NAVIGABLE_PATHS above)
  if (segments[0] === 'production' && segments[1] === 'planning') {
    const planId = segments[2];
    if (planId && planId !== 'create' && planId !== 'bulk-import') {
      // Both the plan detail path and anything nested under it → list
      return '/production/planning';
    }
  }

  // ── Production — Execution ────────────────────────────────────────────────
  // /production/execution/runs and /runs/:runId/* → Execution dashboard
  if (
    path === '/production/execution/runs' ||
    path.startsWith('/production/execution/runs/')
  ) {
    return '/production/execution';
  }
  // /production/execution/line-clearance/:id → Line Clearance list
  if (path.startsWith('/production/execution/line-clearance/')) {
    return '/production/execution/line-clearance';
  }
  // /production/execution/reports/daily is its own navigable page (last segment case)
  // If it ever appears as intermediate just fall through to null

  // ── Fallback for pure numeric IDs ─────────────────────────────────────────
  // Walk up the segment list to find the nearest navigable ancestor
  if (/^\d+$/.test(segments[segments.length - 1])) {
    for (let i = segments.length - 2; i >= 0; i--) {
      const ancestor = '/' + segments.slice(0, i + 1).join('/');
      if (NAVIGABLE_PATHS.has(ancestor)) return ancestor;
    }
    return '/';
  }

  // No clickable target found — render as plain text
  return null;
}

function getLabel(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  // Numeric ID → show as #123
  if (/^\d+$/.test(segment)) return `#${segment}`;
  // Capitalise and replace dashes with spaces as a last resort
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Nothing to show for root
  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center text-xs sm:text-sm text-muted-foreground mb-4 overflow-x-auto pb-1 scrollbar-hide"
    >
      {/* Home icon always links to dashboard */}
      <Link
        to="/"
        aria-label="Home"
        className="hover:text-foreground hover:bg-muted/50 rounded p-1 transition-colors flex-shrink-0"
      >
        <Home className="h-4 w-4" />
      </Link>

      {segments.map((segment, index) => {
        const currentSegments = segments.slice(0, index + 1);
        const path = '/' + currentSegments.join('/');
        const isLast = index === segments.length - 1;
        const label = getLabel(segment);
        const target = isLast ? null : resolveTarget(path, currentSegments);

        return (
          <div key={path} className="flex items-center flex-shrink-0">
            <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" aria-hidden="true" />

            {isLast ? (
              // Current page — bold, not a link
              <span
                className="text-foreground font-medium bg-muted/30 rounded px-2 py-0.5"
                aria-current="page"
              >
                {label}
              </span>
            ) : target ? (
              // Ancestor with a known destination — clickable link
              <Link
                to={target}
                className="hover:text-foreground hover:bg-muted/50 rounded px-2 py-0.5 transition-colors"
              >
                {label}
              </Link>
            ) : (
              // Structural segment with no standalone page (e.g. "edit" before an ID)
              <span className="px-2 py-0.5">{label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
