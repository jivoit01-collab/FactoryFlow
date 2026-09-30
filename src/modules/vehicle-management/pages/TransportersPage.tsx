import { Plus, RefreshCw, Search, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';

import { VEHICLE_MANAGEMENT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { useTransporters } from '@/modules/gate/api/transporter/transporter.queries';
import { CreateTransporterDialog } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Input } from '@/shared/components/ui';

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

export default function TransportersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { hasPermission } = usePermission();
  const canManage = hasPermission(VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_TRANSPORTERS);
  const { data: transporters = [], isFetching, refetch } = useTransporters();

  const filteredTransporters = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return transporters;

    return transporters.filter((transporter) =>
      [transporter.name, transporter.contact_person, transporter.mobile_no, transporter.gstin]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm, transporters]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Transporters">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} disabled={!canManage}>
          <Plus className="mr-2 h-4 w-4" />
          New Transporter
        </Button>
      </DashboardHeader>

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search transporter, contact, GSTIN"
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Transporter</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mobile</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">GSTIN</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransporters.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <UsersRound className="mx-auto mb-2 h-5 w-5" />
                  No transporters found.
                </td>
              </tr>
            ) : (
              filteredTransporters.map((transporter) => (
                <tr key={transporter.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{transporter.name}</td>
                  <td className="px-4 py-3">{compactText(transporter.contact_person)}</td>
                  <td className="px-4 py-3">{compactText(transporter.mobile_no)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{compactText(transporter.gstin)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateTransporterDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
