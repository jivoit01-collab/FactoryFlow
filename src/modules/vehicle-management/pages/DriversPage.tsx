import { IdCard, Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { VEHICLE_MANAGEMENT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { useDrivers } from '@/modules/gate/api/driver/driver.queries';
import { CreateDriverDialog } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Input } from '@/shared/components/ui';

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

export default function DriversPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { hasPermission } = usePermission();
  const canManage = hasPermission(VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_DRIVERS);
  const { data: drivers = [], isFetching, refetch } = useDrivers();

  const filteredDrivers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return drivers;

    return drivers.filter((driver) =>
      [
        driver.name,
        driver.mobile_no,
        driver.license_no,
        driver.id_proof_type,
        driver.id_proof_number,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [drivers, searchTerm]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Drivers">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} disabled={!canManage}>
          <Plus className="mr-2 h-4 w-4" />
          New Driver
        </Button>
      </DashboardHeader>

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search driver, mobile, license"
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Driver</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mobile</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">License</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID Proof</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <IdCard className="mx-auto mb-2 h-5 w-5" />
                  No drivers found.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((driver) => (
                <tr key={driver.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{driver.name}</td>
                  <td className="px-4 py-3">{compactText(driver.mobile_no)}</td>
                  <td className="px-4 py-3">{compactText(driver.license_no)}</td>
                  <td className="px-4 py-3">
                    <div>{compactText(driver.id_proof_type)}</div>
                    <div className="text-xs text-muted-foreground">
                      {compactText(driver.id_proof_number)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateDriverDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
