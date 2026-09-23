import {
  AlertTriangle,
  ClipboardCheck,
  Fuel,
  Gauge,
  IndianRupee,
  Truck,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  EmptyPanel,
  PageHeader,
  PageSection,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button } from '@/shared/components/ui';

import { useExpiringDocuments, useFleetCostReport, useFleetOptions, useFleetSummary } from '../api';
import { useFleetVehicles } from '../api';
import { FuelEntryDialog } from '../components';
import { km, money, monthStart, quantity, shortDate, today } from '../utils/format';

/**
 * The module's front page: what the fleet cost this month, what is waiting to
 * be approved, and what paperwork is about to run out.
 *
 * "Add fuel" sits in the header rather than behind the vehicles list, because
 * recording a filling is what somebody opens this module to do.
 */
export default function FleetDashboardPage() {
  const [fuelOpen, setFuelOpen] = useState(false);

  const { data: options } = useFleetOptions();
  const { data: summary, isLoading } = useFleetSummary();
  const { data: vehicles = [] } = useFleetVehicles({ status: 'ACTIVE' });
  const { data: expiring } = useExpiringDocuments();
  const { data: report } = useFleetCostReport({ from: monthStart(), to: today() });

  const pending = summary?.pending_approvals.total ?? 0;
  const paperwork = (summary?.expired_documents ?? 0) + (summary?.expiring_documents ?? 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Company Vehicles"
        description="The vehicles the company owns, and what they cost to run"
        icon={Truck}
        accent="blue"
      >
        {options?.can_add_expense && (
          <Button onClick={() => setFuelOpen(true)}>
            <Fuel className="mr-2 h-4 w-4" />
            Add fuel
          </Button>
        )}
      </PageHeader>

      <StatTileRow>
        <StatTile
          label="This month"
          value={money(summary?.month_total_cost)}
          sub="Fuel and service together"
          icon={IndianRupee}
          accent="blue"
        />
        <StatTile
          label="Fuel this month"
          value={money(summary?.month_fuel_cost)}
          sub={quantity(summary?.month_fuel_quantity, 'L/Kg')}
          icon={Fuel}
          accent="amber"
          to="/fleet/fuel"
        />
        <StatTile
          label="Service this month"
          value={money(summary?.month_service_cost)}
          icon={Wrench}
          accent="violet"
          to="/fleet/service"
        />
        <StatTile
          label="Bills to approve"
          value={pending}
          sub={pending ? 'Workshop bills, not counted yet' : 'Nothing pending'}
          icon={ClipboardCheck}
          accent={pending ? 'amber' : 'emerald'}
          to="/fleet/approvals"
        />
        <StatTile
          label="Daily reading"
          value="Write it down"
          sub="What each meter reads today"
          icon={Gauge}
          accent="sky"
          to="/fleet/readings"
        />
        <StatTile
          label="Vehicles"
          value={summary?.vehicle_count ?? 0}
          sub={paperwork ? `${paperwork} document(s) need attention` : 'Papers in order'}
          icon={Truck}
          accent="slate"
          to="/fleet/vehicles"
        />
      </StatTileRow>

      <PageSection
        title="This month, vehicle by vehicle"
        description="Every filling, plus approved workshop bills. Cost per km needs two fillings in the month."
        icon={IndianRupee}
      >
        <TableCard summary={`${report?.rows.length ?? 0} vehicles`}>
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th>Vehicle</Th>
                <Th align="right">Fuel</Th>
                <Th align="right">Service</Th>
                <Th align="right">Total</Th>
                <Th align="right">Run</Th>
                <Th align="right">Per km</Th>
              </tr>
            </thead>
            <tbody>
              {!report?.rows.length ? (
                <TableEmpty
                  colSpan={6}
                  message={isLoading ? 'Loading…' : 'Nothing recorded this month'}
                  hint="Record a filling or a workshop bill and it shows here."
                />
              ) : (
                report.rows.map((row) => (
                  <tr key={row.vehicle_id} className={ROW_CLASSES}>
                    <Td>
                      <Link
                        to={`/fleet/vehicles/${row.vehicle_id}`}
                        className="font-medium hover:underline"
                      >
                        {row.vehicle_number}
                      </Link>
                      {row.nickname && (
                        <span className="ml-2 text-xs text-muted-foreground">{row.nickname}</span>
                      )}
                    </Td>
                    <Td numeric>{money(row.fuel_cost)}</Td>
                    <Td numeric>{money(row.service_cost)}</Td>
                    <Td numeric className="font-semibold">
                      {money(row.total_cost)}
                    </Td>
                    <Td numeric>{km(row.distance_km)}</Td>
                    <Td numeric>{row.cost_per_km ? money(row.cost_per_km) : '—'}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>
      </PageSection>

      <PageSection
        title="Papers running out"
        description={`Expired, or expiring within ${options?.document_warning_days ?? 30} days`}
        icon={AlertTriangle}
      >
        {!expiring?.rows.length ? (
          <EmptyPanel message="Nothing expiring" hint="Every document on file is still valid." />
        ) : (
          <TableCard summary={`${expiring.rows.length} document(s)`}>
            <table className={TABLE_CLASSES}>
              <thead className={THEAD_CLASSES}>
                <tr>
                  <Th>Vehicle</Th>
                  <Th>Document</Th>
                  <Th>Expires</Th>
                  <Th align="right">Status</Th>
                </tr>
              </thead>
              <tbody>
                {expiring.rows.map((document) => (
                  <tr key={document.id} className={ROW_CLASSES}>
                    <Td className="font-medium">{document.vehicle_number}</Td>
                    <Td>{document.doc_type_label}</Td>
                    <Td>{shortDate(document.expiry_date)}</Td>
                    <Td align="right">
                      <StatusPill tone={document.expiry_state === 'EXPIRED' ? 'blocked' : 'warn'} dot>
                        {document.expiry_state === 'EXPIRED'
                          ? `Expired ${Math.abs(document.days_to_expiry)}d ago`
                          : `${document.days_to_expiry}d left`}
                      </StatusPill>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </PageSection>

      <FuelEntryDialog
        open={fuelOpen}
        onOpenChange={setFuelOpen}
        vehicles={vehicles}
        options={options}
      />
    </div>
  );
}
