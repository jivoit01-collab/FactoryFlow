import { useSearchParams } from 'react-router-dom';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui';

import { useMeterScope, useTreeMeters } from '../api';
import { DaySheetTab } from '../components/electricity/DaySheetTab';
import { MeterTreeTab } from '../components/electricity/MeterTreeTab';
import { ReadingsTab } from '../components/electricity/ReadingsTab';
import { SplitTab } from '../components/electricity/SplitTab';

const TABS = ['sheet', 'split', 'tree', 'readings'] as const;
type Tab = (typeof TABS)[number];

/**
 * Daily Electricity++: the Daily Electricity register as a meter tree, with
 * who pays for each meter.
 *
 * The same meters and readings as the Daily Electricity page, which is left
 * exactly as it was — as is every board that reads electricity. Here the
 * campus's meters are sub-meters of sub-meters: a meter pays only for what it
 * reads that its own sub-meters do not, and each meter's dated setup says who
 * pays for that. Four tabs, one tree:
 *
 * - **Day sheet** — every meter's reading for one day, in tree order.
 * - **Split** — who used how much, and what it cost, between two dates.
 * - **Meter tree** — where each meter sits and who pays for it.
 * - **Readings** — the register as typed, for looking up and correcting.
 */
export default function MaintenanceDailyElectricityPlusPage() {
  const { hasPermission } = usePermission();
  // can_manage_daily_electricity stays the legacy superset; each granular right
  // below can also be granted on its own (meter keeper, data-entry operator...).
  const canManageAll = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY);
  const canManageMeters = canManageAll || hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_ELECTRICITY_METER);
  const canAddReading = canManageAll || hasPermission(MAINTENANCE_PERMISSIONS.ADD_DAILY_ELECTRICITY);
  const canEditReading = canManageAll || hasPermission(MAINTENANCE_PERMISSIONS.EDIT_DAILY_ELECTRICITY);
  const canDeleteReading = canManageAll || hasPermission(MAINTENANCE_PERMISSIONS.DELETE_DAILY_ELECTRICITY);
  const canManageAllocation =
    canManageAll || hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_ELECTRICITY_ALLOCATION);

  // A permission says WHICH operations this user may perform; the assignment
  // says on which meters. Both are enforced server-side — this only keeps the
  // user out of a form the server would refuse. It fails open on purpose: when
  // the scope cannot be fetched nothing here is narrowed (see useMeterScope).
  const meterScope = useMeterScope();
  const { data: meters = [], isLoading: metersLoading } = useTreeMeters();

  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : 'sheet';
  const setTab = (value: string) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', value);
      return next;
    });

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Daily Electricity++"
        description="The meter tree, each day's readings, and who pays for what"
      />

      {/* Only when the scope is KNOWN and genuinely empty. An unreachable
          endpoint must never produce this message — it would send people to an
          administrator over a network blip. */}
      {meterScope.managesNothing && (canManageMeters || canAddReading) && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-200">
            You are not the manager of any meter, so you cannot change a meter or enter a reading. The register is still
            yours to read. An administrator assigns this on Admin → Electricity Meter Managers.
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sheet">Day sheet</TabsTrigger>
          <TabsTrigger value="split">Split</TabsTrigger>
          <TabsTrigger value="tree">Meter tree</TabsTrigger>
          <TabsTrigger value="readings">Readings</TabsTrigger>
        </TabsList>
        <TabsContent value="sheet" className="mt-4">
          <DaySheetTab canAdd={canAddReading} canEdit={canEditReading} />
        </TabsContent>
        <TabsContent value="split" className="mt-4">
          <SplitTab />
        </TabsContent>
        <TabsContent value="tree" className="mt-4">
          <MeterTreeTab
            meters={meters}
            isLoading={metersLoading}
            canManageMeters={canManageMeters}
            canManageAllocation={canManageAllocation}
            keeps={meterScope.manages}
          />
        </TabsContent>
        <TabsContent value="readings" className="mt-4">
          <ReadingsTab
            meters={meters}
            canEdit={canEditReading}
            canDelete={canDeleteReading}
            keeps={meterScope.manages}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
