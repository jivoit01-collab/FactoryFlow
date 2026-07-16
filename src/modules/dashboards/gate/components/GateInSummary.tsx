import { useQuery } from '@tanstack/react-query';
import { HardHat, type LucideIcon, Truck, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { useAuth, usePermission } from '@/core/auth';
import { personGateInApi } from '@/modules/gate/api/personGateIn/personGateIn.api';
import { type Accent, ACCENTS } from '@/shared/components/dashboard';
import { cn } from '@/shared/utils';

import { GATE_REFRESH_MS, type GateRange } from '../constants/gate-dashboard.constants';
import { useGateActivityCounts } from '../hooks/useGateActivityCounts';

/** Inbound vehicle activity routes — their sum is "vehicles in". */
const IN_ROUTES = [
  '/gate/empty-vehicle-in',
  '/gate/raw-materials',
  '/gate/daily-needs',
  '/gate/maintenance',
  '/gate/construction',
  '/gate/fixed-assets',
];

function retry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 1;
}

/** Decorative accent wave anchored to the card's bottom (visual motif, no data). */
function AccentWave({ accent, id }: { accent: Accent; id: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent.hex} stopOpacity={0.28} />
          <stop offset="100%" stopColor={accent.hex} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d="M0,28 C12,16 20,30 32,22 C44,14 52,26 64,18 C76,10 86,22 100,14 L100,40 L0,40 Z"
        fill={`url(#${id})`}
      />
      <path
        d="M0,28 C12,16 20,30 32,22 C44,14 52,26 64,18 C76,10 86,22 100,14"
        fill="none"
        stroke={accent.hex}
        strokeOpacity={0.5}
        strokeWidth={1.5}
      />
    </svg>
  );
}

function GateKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  waveId,
  onClick,
  delayMs,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub: string;
  accent: Accent;
  waveId: string;
  onClick: () => void;
  delayMs: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 pb-16 text-left shadow-sm',
        'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500',
        'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        accent.glow,
      )}
    >
      <div className="relative z-10 flex items-start justify-between">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
            accent.iconBg,
          )}
        >
          <Icon className={cn('h-5 w-5', accent.icon)} />
        </div>
      </div>
      <div className="relative z-10 mt-4 min-w-0">
        <div className="text-3xl font-bold tabular-nums tracking-tight">{value}</div>
        <div className="mt-0.5 truncate text-sm font-semibold">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      <AccentWave accent={accent} id={waveId} />
    </button>
  );
}

/**
 * The three headline gate counts: vehicles in, labours in and visitors in.
 * Vehicles come from the inbound gate-activity counts; labours from the
 * labour-gate register; visitors from the person-gate-in dashboard.
 */
export function GateInSummary({ range }: { range: GateRange }) {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const { currentCompany } = useAuth();

  const { counts } = useGateActivityCounts(range);
  const vehiclesIn = useMemo(
    () => IN_ROUTES.reduce((sum, r) => sum + (counts[r] ?? 0), 0),
    [counts],
  );
  const laboursIn = counts['/gate/labour-in'] ?? 0;

  const canViewPersons = hasAnyPermission([
    GATE_PERMISSIONS.PERSON_GATE_IN.VIEW,
    GATE_PERMISSIONS.DASHBOARD.VIEW,
  ]);

  const personQuery = useQuery({
    queryKey: ['gate-person-dashboard', currentCompany?.company_id, range.from, range.to],
    queryFn: () => personGateInApi.getDashboard({ from_date: range.from, to_date: range.to }),
    enabled: canViewPersons,
    staleTime: GATE_REFRESH_MS,
    refetchInterval: GATE_REFRESH_MS,
    refetchOnWindowFocus: true,
    retry,
  });

  const visitorsIn = personQuery.data?.today.visitors ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <GateKpiCard
        icon={Truck}
        label="Vehicles in"
        value={vehiclesIn}
        sub="Inbound gate entries"
        accent={ACCENTS.emerald}
        waveId="gate-kpi-vehicles"
        onClick={() => navigate('/gate')}
        delayMs={0}
      />
      <GateKpiCard
        icon={HardHat}
        label="Labours in"
        value={laboursIn}
        sub="Contractor head-count in"
        accent={ACCENTS.amber}
        waveId="gate-kpi-labours"
        onClick={() => navigate('/gate/labour-in')}
        delayMs={80}
      />
      <GateKpiCard
        icon={Users}
        label="Visitors in"
        value={visitorsIn}
        sub="Visitors entered"
        accent={ACCENTS.blue}
        waveId="gate-kpi-visitors"
        onClick={() => navigate('/gate/visitor-labour')}
        delayMs={160}
      />
    </div>
  );
}
