import { ArrowRight, ClipboardCheck, type LucideIcon,Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_TYPES } from '@/config/constants';
import { GATE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import type { DateRange } from '@/core/store/filtersSlice';
import { useGlobalDateRange } from '@/core/store/hooks';
import { useBSTGateOutwards } from '@/modules/warehouse/api';
import { Card, CardContent, Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useEmptyVehicleEligibleEntries,
  useEmptyVehicleGateInEntries,
  useEmptyVehicleGateOutEntries,
  useJobWorkGateInEntries,
  usePersonGateInDashboard,
  useRejectedQCReturnEntries,
  useSalesDispatchEntries,
  useVehicleEntriesCount,
} from '../api';
import { DateRangePicker } from '../components';
import { GATE_ENTRY_TYPES, type GateEntryTypeConfig } from '../constants/gateEntryTypes';
import { getJobWorkDisplayStatus, hasLinkedJobWorkProductionOrder } from '../utils';
import {
  CUSTOMER_RETURN_KEY,
  isCustomerReturnAwaitingFactoryHead,
  readCustomerFlowEntries,
} from './customerSalesFlow/customerSalesFlow.storage';
import { readRejectedQCReturnEntries } from './rejectedMaterialPages/rejectedQcReturn.storage';
import {
  getRepairMovementValue,
  readRepairMovementEntries,
  REPAIR_PARTS_IN_COMPLETED_KEY,
  REPAIR_PARTS_OUT_COMPLETED_KEY,
} from './repairMovementPages/repairMovement.storage';

const directionLabels: Record<GateEntryTypeConfig['direction'], string> = {
  in: 'Gate In',
  out: 'Gate Out',
  return: 'Gate In',
};

const directionSearchText: Record<GateEntryTypeConfig['direction'], string> = {
  in: 'gate in inward incoming receive',
  out: 'gate out outward outgoing dispatch',
  return: 'return returned receiving back',
};

type GateCategory = 'Gate In' | 'Gate Out' | 'Visitor';
const CATEGORY_ORDER: GateCategory[] = ['Gate In', 'Gate Out', 'Visitor'];

function categoryOf(entryType: GateEntryTypeConfig): GateCategory {
  if (entryType.id === 'visitor-labour') return 'Visitor';
  if (entryType.direction === 'out') return 'Gate Out';
  return 'Gate In';
}

interface GateToolConfig {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: LucideIcon;
  colorClassName: string;
  permissions: readonly string[];
  keywords: readonly string[];
}

// Standalone gate tools (not vehicle/person entry types) shown as their own
// dashboard section.
const GATE_TOOLS: GateToolConfig[] = [
  {
    id: 'daily-labour',
    title: 'Daily Labour',
    description: 'Enter and submit the daily casual-labour headcount per contractor.',
    route: '/gate/labour',
    icon: Users,
    colorClassName: 'text-red-600',
    permissions: [GATE_PERMISSIONS.LABOUR_COUNT.SUBMIT],
    keywords: ['labour', 'casual', 'count', 'contractor', 'daily', 'manday', 'mazdoor'],
  },
  {
    id: 'labour-verification',
    title: 'Labour Verification',
    description: 'Gate head-count — mark labour out in batches and finalize per department.',
    route: '/gate/labour/verify',
    icon: ClipboardCheck,
    colorClassName: 'text-emerald-600',
    permissions: [GATE_PERMISSIONS.LABOUR_COUNT.VERIFY],
    keywords: ['labour', 'verify', 'verification', 'out', 'gate', 'count'],
  },
];

type StatTone = 'total' | 'open' | 'completed' | 'cancelled' | 'info' | 'warning';

interface EntryTypeStat {
  label: string;
  value: number;
  tone?: StatTone;
}

interface EntryTypeStats {
  stats: EntryTypeStat[];
  isLoading?: boolean;
}

const STAT_TONE_CLASSES: Record<StatTone, string> = {
  total: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const FINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REJECTED', 'FINAL_REJECTED']);

export default function GateDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const { dateRange, dateRangeAsDateObjects, setDateRange, resetDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');

  const visibleEntryTypes = useMemo(
    () => GATE_ENTRY_TYPES.filter((entryType) => hasAnyPermission(entryType.viewPermissions)),
    [hasAnyPermission],
  );
  const statsByEntryType = useGateDashboardStats(visibleEntryTypes, dateRange);

  const filteredEntryTypes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return visibleEntryTypes;

    return visibleEntryTypes.filter((entryType) =>
      [
        entryType.title,
        entryType.description,
        directionLabels[entryType.direction],
        directionSearchText[entryType.direction],
        entryType.vehicleMode === 'vehicle' ? 'vehicle truck tanker' : 'person visitor labour',
        ...entryType.keywords,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm, visibleEntryTypes]);

  const groupedEntryTypes = useMemo(() => {
    const groups: Record<GateCategory, GateEntryTypeConfig[]> = {
      'Gate In': [],
      'Gate Out': [],
      Visitor: [],
    };
    filteredEntryTypes.forEach((entryType) => groups[categoryOf(entryType)].push(entryType));
    return groups;
  }, [filteredEntryTypes]);

  const visibleTools = useMemo(
    () => GATE_TOOLS.filter((tool) => hasAnyPermission(tool.permissions)),
    [hasAnyPermission],
  );
  const filteredTools = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return visibleTools;
    return visibleTools.filter((tool) =>
      [tool.title, tool.description, ...tool.keywords].join(' ').toLowerCase().includes(query),
    );
  }, [searchTerm, visibleTools]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gate Management</h2>
          <p className="text-muted-foreground">Complete gate control for all movements</p>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            className="w-full lg:w-[340px]"
            onDateChange={(date) => {
              if (date && 'from' in date) {
                setDateRange(date);
              } else {
                resetDateRange();
              }
            }}
          />
          <div className="relative w-full lg:w-[420px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search type, document, vehicle, reason"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {filteredEntryTypes.length === 0 && filteredTools.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              Nothing matches this search
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {CATEGORY_ORDER.map((category) => {
            const items = groupedEntryTypes[category];
            if (items.length === 0) return null;
            return (
              <div key={category} className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight">{category}</h3>
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {items.map((entryType) => (
                        <EntryTypeRow
                          key={entryType.id}
                          entryType={entryType}
                          stats={statsByEntryType[entryType.id]}
                          onOpen={() => navigate(entryType.dashboardRoute)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {filteredTools.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight">Labour</h3>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredTools.map((tool) => (
                      <ToolRow key={tool.id} tool={tool} onOpen={() => navigate(tool.route)} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ToolRow({ tool, onOpen }: { tool: GateToolConfig; onOpen: () => void }) {
  const Icon = tool.icon;

  return (
    <button
      type="button"
      className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(0,1fr)_auto]"
      onClick={onOpen}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="rounded-md border p-2">
          <Icon className={cn('h-4 w-4', tool.colorClassName)} />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{tool.title}</span>
          <span className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {tool.description}
          </span>
        </span>
      </span>

      <span className="hidden items-center text-sm font-medium text-muted-foreground md:flex">
        Open
        <ArrowRight className="ml-2 h-4 w-4" />
      </span>
    </button>
  );
}

function EntryTypeRow({
  entryType,
  stats,
  onOpen,
}: {
  entryType: GateEntryTypeConfig;
  stats?: EntryTypeStats;
  onOpen: () => void;
}) {
  const Icon = entryType.icon;

  return (
    <button
      type="button"
      className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
      onClick={onOpen}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="rounded-md border p-2">
          <Icon className={cn('h-4 w-4', entryType.colorClassName)} />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{entryType.title}</span>
          <span className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {entryType.description}
          </span>
        </span>
      </span>

      <EntryTypeStatsPills stats={stats} />

      <span className="hidden items-center text-sm font-medium text-muted-foreground md:flex">
        Open
        <ArrowRight className="ml-2 h-4 w-4" />
      </span>
    </button>
  );
}

function EntryTypeStatsPills({ stats }: { stats?: EntryTypeStats }) {
  if (!stats) return null;

  if (stats.isLoading) {
    return (
      <span className="flex items-center gap-2 lg:justify-end">
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          Loading stats...
        </span>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2 lg:justify-end">
      {stats.stats.map((stat) => (
        <span
          key={stat.label}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
            STAT_TONE_CLASSES[stat.tone || 'total'],
          )}
        >
          <span>{stat.label}</span>
          <span className="font-bold">{stat.value}</span>
        </span>
      ))}
    </span>
  );
}

function useGateDashboardStats(
  visibleEntryTypes: GateEntryTypeConfig[],
  dateRange: DateRange,
): Record<string, EntryTypeStats> {
  const dateParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
    }),
    [dateRange.from, dateRange.to],
  );
  const visibleEntryIds = useMemo(
    () => new Set(visibleEntryTypes.map((entryType) => entryType.id)),
    [visibleEntryTypes],
  );
  const isVisible = (entryTypeId: string) => visibleEntryIds.has(entryTypeId);

  const rawMaterialCounts = useVehicleEntriesCount(
    {
      ...dateParams,
      entry_type: ENTRY_TYPES.RAW_MATERIAL,
    },
    { enabled: isVisible('raw-materials') },
  );
  const dailyNeedsCounts = useVehicleEntriesCount(
    {
      ...dateParams,
      entry_type: ENTRY_TYPES.DAILY_NEED,
    },
    { enabled: isVisible('daily-needs') },
  );
  const maintenanceCounts = useVehicleEntriesCount(
    {
      ...dateParams,
      entry_type: ENTRY_TYPES.MAINTENANCE,
    },
    { enabled: isVisible('maintenance') },
  );
  const constructionCounts = useVehicleEntriesCount(
    {
      ...dateParams,
      entry_type: ENTRY_TYPES.CONSTRUCTION,
    },
    { enabled: isVisible('construction') },
  );
  const fixedAssetsCounts = useVehicleEntriesCount(
    {
      ...dateParams,
      entry_type: ENTRY_TYPES.FIXED_ASSET,
    },
    { enabled: isVisible('fixed-assets') },
  );
  const personDashboard = usePersonGateInDashboard(dateParams, {
    enabled: isVisible('visitor-labour'),
  });
  const emptyVehicleInEntries = useEmptyVehicleGateInEntries(dateParams, {
    enabled: isVisible('empty-vehicle-in'),
  });
  const emptyVehicleEligibleEntries = useEmptyVehicleEligibleEntries(dateParams, {
    enabled: isVisible('empty-vehicle-out'),
  });
  const emptyVehicleOutEntries = useEmptyVehicleGateOutEntries(dateParams, {
    enabled: isVisible('empty-vehicle-out'),
  });
  const rejectedQCReturnEntries = useRejectedQCReturnEntries(dateParams, {
    enabled: isVisible('rejected-qc-return'),
  });
  const jobWorkEntries = useJobWorkGateInEntries(dateParams, { enabled: isVisible('job-work') });
  const salesDispatchOutEntries = useSalesDispatchEntries(
    {
      from_date: dateRange.from,
      to_date: dateRange.to,
      document_type: 'INVOICE',
    },
    { enabled: isVisible('sales-dispatch') },
  );
  const bstOutEntries = useBSTGateOutwards(dateParams, { enabled: isVisible('bst-out') });

  const customerReturnEntries = useMemo(
    () =>
      filterCustomerFlowEntriesByDate(
        readCustomerFlowEntries(CUSTOMER_RETURN_KEY),
        dateRange,
        'gateInDate',
      ),
    [dateRange.from, dateRange.to],
  );
  const repairPartsOutEntries = useMemo(
    () =>
      filterRepairMovementEntriesByDate(
        readRepairMovementEntries(REPAIR_PARTS_OUT_COMPLETED_KEY),
        dateRange,
        'gateOutDate',
      ),
    [dateRange.from, dateRange.to],
  );
  const repairPartsInEntries = useMemo(
    () =>
      filterRepairMovementEntriesByDate(
        readRepairMovementEntries(REPAIR_PARTS_IN_COMPLETED_KEY),
        dateRange,
        'gateInDate',
      ),
    [dateRange.from, dateRange.to],
  );
  const localRejectedQCReturnEntries = useMemo(
    () => filterRejectedQCReturnEntriesByDate(readRejectedQCReturnEntries(), dateRange),
    [dateRange.from, dateRange.to],
  );

  const rejectedEntries = rejectedQCReturnEntries.data?.length
    ? rejectedQCReturnEntries.data
    : localRejectedQCReturnEntries;
  const activeRepairIns = repairPartsInEntries.filter((entry) => entry.status !== 'CANCELLED');
  const linkedRepairOutEntries = new Set(
    activeRepairIns.map((entry) => getRepairMovementValue(entry, 'sourceOutEntry')),
  );
  const returnableRepairOutEntries = repairPartsOutEntries.filter(
    (entry) =>
      entry.status !== 'CANCELLED' && getRepairMovementValue(entry, 'returnable') === 'Yes',
  );
  const awaitingRepairReturn = returnableRepairOutEntries.filter(
    (entry) => !linkedRepairOutEntries.has(entry.entryNo),
  ).length;
  const receivedRepairReturn = returnableRepairOutEntries.length - awaitingRepairReturn;

  return {
    'raw-materials': {
      isLoading: rawMaterialCounts.isLoading,
      stats: buildVehicleCountStats(rawMaterialCounts.data?.total_vehicle_entries),
    },
    'daily-needs': {
      isLoading: dailyNeedsCounts.isLoading,
      stats: buildVehicleCountStats(dailyNeedsCounts.data?.total_vehicle_entries),
    },
    maintenance: {
      isLoading: maintenanceCounts.isLoading,
      stats: buildVehicleCountStats(maintenanceCounts.data?.total_vehicle_entries),
    },
    construction: {
      isLoading: constructionCounts.isLoading,
      stats: buildVehicleCountStats(constructionCounts.data?.total_vehicle_entries),
    },
    'fixed-assets': {
      isLoading: fixedAssetsCounts.isLoading,
      stats: buildVehicleCountStats(fixedAssetsCounts.data?.total_vehicle_entries),
    },
    'visitor-labour': {
      isLoading: personDashboard.isLoading,
      stats: [
        {
          label: 'Inside',
          value: personDashboard.data?.current.total_inside ?? 0,
          tone: 'open',
        },
        {
          label: 'Done',
          value: personDashboard.data?.range?.exits ?? 0,
          tone: 'completed',
        },
        {
          label: 'Total',
          value: personDashboard.data?.range?.total_entries ?? 0,
          tone: 'total',
        },
      ],
    },
    'empty-vehicle-in': {
      isLoading: emptyVehicleInEntries.isLoading,
      stats: buildEntryArrayStats(emptyVehicleInEntries.data || [], {
        openLabel: 'Inside',
        isOpen: (entry) => !['COMPLETED', 'CANCELLED'].includes(entry.vehicle_entry_status),
        isCompleted: (entry) => entry.vehicle_entry_status === 'COMPLETED',
      }),
    },
    'customer-return': {
      stats: buildEntryArrayStats(customerReturnEntries, {
        openLabel: 'Open',
        isOpen: (entry) =>
          entry.status !== 'COMPLETED' &&
          entry.status !== 'CANCELLED' &&
          !isCustomerReturnAwaitingFactoryHead(entry),
        extraStats: [
          {
            label: 'FH',
            value: customerReturnEntries.filter(isCustomerReturnAwaitingFactoryHead).length,
            tone: 'warning',
          },
        ],
      }),
    },
    'repair-parts-in': {
      stats: [
        {
          label: 'Received',
          value: activeRepairIns.length,
          tone: 'completed',
        },
        {
          label: 'Linked',
          value: activeRepairIns.filter(
            (entry) => getRepairMovementValue(entry, 'sourceOutEntry') !== '-',
          ).length,
          tone: 'info',
        },
      ],
    },
    'rejected-qc-return': {
      isLoading: rejectedQCReturnEntries.isLoading,
      stats: [
        {
          label: 'Done',
          value: rejectedEntries.length,
          tone: 'completed',
        },
        {
          label: 'Items',
          value: rejectedEntries.reduce((sum, entry) => sum + (entry.items?.length || 0), 0),
          tone: 'total',
        },
      ],
    },
    'empty-vehicle-out': {
      isLoading: emptyVehicleEligibleEntries.isLoading || emptyVehicleOutEntries.isLoading,
      stats: [
        {
          label: 'Awaiting',
          value: emptyVehicleEligibleEntries.data?.length ?? 0,
          tone: 'warning',
        },
        ...buildEntryArrayStats(emptyVehicleOutEntries.data || []).slice(1),
      ],
    },
    'bst-out': {
      isLoading: bstOutEntries.isLoading,
      stats: buildEntryArrayStats(bstOutEntries.data || [], {
        openLabel: 'Awaiting',
        isOpen: (entry) => entry.status === 'AWAITING_GATE_OUT',
        isCompleted: (entry) =>
          entry.status !== 'AWAITING_GATE_OUT' && entry.status !== 'CANCELLED',
      }),
    },
    'sales-dispatch': {
      isLoading: salesDispatchOutEntries.isLoading,
      stats: buildEntryArrayStats(salesDispatchOutEntries.data || [], {
        isOpen: (entry) => !['DISPATCHED', 'CANCELLED', 'REJECTED'].includes(entry.status),
        isCompleted: (entry) => entry.status === 'DISPATCHED',
        extraStats: [
          {
            label: 'Ready',
            value: (salesDispatchOutEntries.data || []).filter(
              (entry) => entry.status === 'PRINT_COMMITTED',
            ).length,
            tone: 'info',
          },
        ],
      }),
    },
    'repair-parts-out': {
      stats: [
        {
          label: 'Awaiting',
          value: awaitingRepairReturn,
          tone: 'warning',
        },
        {
          label: 'Returned',
          value: receivedRepairReturn,
          tone: 'completed',
        },
        {
          label: 'Total',
          value: repairPartsOutEntries.length,
          tone: 'total',
        },
      ],
    },
    'job-work': {
      isLoading: jobWorkEntries.isLoading,
      stats: [
        {
          label: 'Pending',
          value: (jobWorkEntries.data || []).filter(
            (entry) => getJobWorkDisplayStatus(entry) === 'PENDING',
          ).length,
          tone: 'warning',
        },
        {
          label: 'Linked',
          value: (jobWorkEntries.data || []).filter(hasLinkedJobWorkProductionOrder).length,
          tone: 'info',
        },
        {
          label: 'Total',
          value: jobWorkEntries.data?.length ?? 0,
          tone: 'total',
        },
      ],
    },
  };
}

function filterCustomerFlowEntriesByDate(
  entries: ReturnType<typeof readCustomerFlowEntries>,
  dateRange: DateRange,
  dateField: string,
) {
  return entries.filter((entry) => {
    const storedDate = getCustomerFlowValue(entry, dateField);
    const comparableDate = storedDate !== '-' ? storedDate : entry.createdAt.slice(0, 10);
    return isDateInRange(comparableDate, dateRange);
  });
}

function filterRepairMovementEntriesByDate(
  entries: ReturnType<typeof readRepairMovementEntries>,
  dateRange: DateRange,
  dateField: string,
) {
  return entries.filter((entry) => {
    const storedDate = getRepairMovementValue(entry, dateField);
    const comparableDate = storedDate !== '-' ? storedDate : entry.createdAt.slice(0, 10);
    return isDateInRange(comparableDate, dateRange);
  });
}

function filterRejectedQCReturnEntriesByDate(
  entries: ReturnType<typeof readRejectedQCReturnEntries>,
  dateRange: DateRange,
) {
  return entries.filter((entry) => {
    const gateOutDate =
      typeof entry.values.gateOutDate === 'string' ? entry.values.gateOutDate : '';
    const comparableDate = gateOutDate || entry.createdAt.slice(0, 10);
    return isDateInRange(comparableDate, dateRange);
  });
}

function isDateInRange(value: string | undefined, dateRange: DateRange) {
  if (!value) return false;
  const date = value.slice(0, 10);
  if (dateRange.from && date < dateRange.from) return false;
  if (dateRange.to && date > dateRange.to) return false;
  return true;
}

function buildVehicleCountStats(
  counts?: Array<{ status: string; count: number }>,
): EntryTypeStat[] {
  const safeCounts = counts || [];
  const total = safeCounts.reduce((sum, item) => sum + item.count, 0);
  const completed = safeCounts
    .filter((item) => item.status === 'COMPLETED')
    .reduce((sum, item) => sum + item.count, 0);
  const open = safeCounts
    .filter((item) => !FINAL_STATUSES.has(item.status))
    .reduce((sum, item) => sum + item.count, 0);

  return [
    { label: 'Open', value: open, tone: 'open' },
    { label: 'Done', value: completed, tone: 'completed' },
    { label: 'Total', value: total, tone: 'total' },
  ];
}

function buildEntryArrayStats<T extends { status?: string }>(
  entries: T[],
  options: {
    openLabel?: string;
    statLimit?: number;
    isOpen?: (entry: T) => boolean;
    isCompleted?: (entry: T) => boolean;
    extraStats?: EntryTypeStat[];
  } = {},
): EntryTypeStat[] {
  const isOpen = options.isOpen || ((entry: T) => !FINAL_STATUSES.has(entry.status || ''));
  const isCompleted = options.isCompleted || ((entry: T) => entry.status === 'COMPLETED');
  const baseStats: EntryTypeStat[] = [
    {
      label: options.openLabel || 'Open',
      value: entries.filter(isOpen).length,
      tone: 'open',
    },
    {
      label: 'Done',
      value: entries.filter(isCompleted).length,
      tone: 'completed',
    },
    {
      label: 'Total',
      value: entries.length,
      tone: 'total',
    },
    ...(options.extraStats || []),
  ];

  return typeof options.statLimit === 'number' ? baseStats.slice(0, options.statLimit) : baseStats;
}
