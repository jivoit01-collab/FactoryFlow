import { FileText, Fuel, IndianRupee, Plus, Truck, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  EmptyPanel,
  PageHeader,
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
import {
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import type { VehicleDocument } from '../api';
import {
  useFleetOptions,
  useFuelEntries,
  useOpenAttachment,
  useServiceEntries,
  useVehicleDocuments,
  useVehicleSummary,
} from '../api';
import {
  DocumentDialog,
  type EntryDetail,
  EntryDetailDialog,
  FuelEntryDialog,
  ServiceEntryDialog,
} from '../components';
import { km, money, monthStart, quantity, rupees, shortDate, today } from '../utils/format';

/**
 * One vehicle: what it has cost over a window, and the three registers behind
 * that figure — its fillings, its workshop bills and its papers.
 *
 * The window defaults to this month because that is the question people ask;
 * widen the two dates for the year.
 */
export default function FleetVehicleDetailPage() {
  const { id } = useParams();
  const vehicleId = Number(id);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [fuelOpen, setFuelOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<VehicleDocument | undefined>();
  const [viewing, setViewing] = useState<EntryDetail | null>(null);

  const { data: options } = useFleetOptions();
  const { data: summary, isLoading } = useVehicleSummary(vehicleId, { from, to });
  const { data: fuelEntries = [] } = useFuelEntries({ vehicle: vehicleId, from, to });
  const { data: serviceEntries = [] } = useServiceEntries({ vehicle: vehicleId, from, to });
  const { data: documents = [] } = useVehicleDocuments({ vehicle: vehicleId });
  const openAttachment = useOpenAttachment();

  const vehicle = summary?.vehicle;
  const mileages = Object.entries(summary?.mileage_by_fuel ?? {});

  if (!vehicle) {
    return (
      <div className="p-6">
        <EmptyPanel message={isLoading ? 'Loading…' : 'Vehicle not found'} loading={isLoading} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={vehicle.display_name}
        description={[vehicle.category_label, vehicle.make_model, vehicle.fuel_type_label]
          .filter(Boolean)
          .join(' · ')}
        icon={Truck}
        accent="blue"
        backTo="/fleet/vehicles"
        backLabel="Vehicles"
        meta={
          <div className="flex flex-wrap gap-1.5">
            <StatusPill tone={vehicle.status === 'ACTIVE' ? 'done' : 'neutral'} dot>
              {vehicle.status_label}
            </StatusPill>
            <StatusPill tone="info">Meter {km(vehicle.last_odometer)}</StatusPill>
            {vehicle.assigned_to && <StatusPill tone="neutral">{vehicle.assigned_to}</StatusPill>}
            {vehicle.next_service?.due && <StatusPill tone="warn">Service due</StatusPill>}
          </div>
        }
      >
        {options?.can_add_expense && (
          <>
            <Button variant="outline" onClick={() => setServiceOpen(true)}>
              <Wrench className="mr-2 h-4 w-4" />
              Service
            </Button>
            <Button onClick={() => setFuelOpen(true)}>
              <Fuel className="mr-2 h-4 w-4" />
              Add fuel
            </Button>
          </>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="detail-from" className="text-xs text-muted-foreground">
            From
          </label>
          <Input id="detail-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="detail-to" className="text-xs text-muted-foreground">
            To
          </label>
          <Input id="detail-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(summary?.pending_fuel || summary?.pending_service) && (
          <p className="pb-2 text-sm text-muted-foreground">
            {(summary.pending_fuel ?? 0) + (summary.pending_service ?? 0)} bill(s) still waiting for
            approval — not in these totals.
          </p>
        )}
      </div>

      <StatTileRow>
        <StatTile label="Total cost" value={money(summary?.total_cost)} icon={IndianRupee} accent="blue" />
        <StatTile
          label="Fuel"
          value={money(summary?.fuel_cost)}
          sub={`${summary?.fill_count ?? 0} filling(s) · ${quantity(summary?.fuel_quantity, vehicle.fuel_unit)}`}
          icon={Fuel}
          accent="amber"
        />
        <StatTile
          label="Service"
          value={money(summary?.service_cost)}
          sub={`${summary?.service_count ?? 0} bill(s)`}
          icon={Wrench}
          accent="violet"
        />
        <StatTile label="Distance" value={km(summary?.distance_km ?? null)} accent="slate" />
        <StatTile
          label="Cost per km"
          value={summary?.cost_per_km ? money(summary.cost_per_km) : '—'}
          sub={summary?.cost_per_km ? undefined : 'Needs two fillings in the window'}
          accent="emerald"
        />
        <StatTile
          label="Mileage"
          value={
            mileages.length
              ? mileages.map(([fuel, value]) => `${Number(value).toFixed(2)} (${fuel})`).join(' · ')
              : '—'
          }
          sub="Full tank to full tank"
          accent="sky"
        />
      </StatTileRow>

      <Tabs defaultValue="fuel">
        <TabsList>
          <TabsTrigger value="fuel">Fuel ({fuelEntries.length})</TabsTrigger>
          <TabsTrigger value="service">Service ({serviceEntries.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fuel" className="mt-4">
          <TableCard summary={`${fuelEntries.length} filling(s) in this window`}>
            <table className={TABLE_CLASSES}>
              <thead className={THEAD_CLASSES}>
                <tr>
                  <Th>Date</Th>
                  <Th align="right">Meter</Th>
                  <Th align="right">Quantity</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Run</Th>
                  <Th align="right">Mileage</Th>
                  <Th>Approval</Th>
                </tr>
              </thead>
              <tbody>
                {!fuelEntries.length ? (
                  <TableEmpty colSpan={8} message="No fillings in this window" icon={Fuel} />
                ) : (
                  fuelEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`${ROW_CLASSES} cursor-pointer`}
                      tabIndex={0}
                      onClick={() => setViewing({ kind: 'fuel', entry })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setViewing({ kind: 'fuel', entry });
                        }
                      }}
                    >
                      <Td>{shortDate(entry.entry_date)}</Td>
                      <Td numeric>{km(entry.odometer)}</Td>
                      <Td numeric>{quantity(entry.quantity, entry.unit)}</Td>
                      <Td numeric>{rupees(entry.rate)}</Td>
                      <Td numeric className="font-semibold">
                        {money(entry.amount)}
                      </Td>
                      <Td numeric>{km(entry.distance_km)}</Td>
                      <Td numeric>
                        {entry.mileage ? `${entry.mileage} ${entry.mileage_unit}` : '—'}
                      </Td>
                      <Td>
                        <StatusPill
                          tone={
                            entry.approval_status === 'APPROVED'
                              ? 'done'
                              : entry.approval_status === 'REJECTED'
                                ? 'blocked'
                                : 'warn'
                          }
                          dot
                        >
                          {entry.approval_status_label}
                        </StatusPill>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>
        </TabsContent>

        <TabsContent value="service" className="mt-4">
          <TableCard summary={`${serviceEntries.length} bill(s) in this window`}>
            <table className={TABLE_CLASSES}>
              <thead className={THEAD_CLASSES}>
                <tr>
                  <Th>Date</Th>
                  <Th>Work</Th>
                  <Th>Workshop</Th>
                  <Th align="right">Meter</Th>
                  <Th align="right">Total</Th>
                  <Th>Next due</Th>
                  <Th>Approval</Th>
                </tr>
              </thead>
              <tbody>
                {!serviceEntries.length ? (
                  <TableEmpty colSpan={7} message="No service in this window" icon={Wrench} />
                ) : (
                  serviceEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`${ROW_CLASSES} cursor-pointer`}
                      tabIndex={0}
                      onClick={() => setViewing({ kind: 'service', entry })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setViewing({ kind: 'service', entry });
                        }
                      }}
                    >
                      <Td>{shortDate(entry.entry_date)}</Td>
                      <Td>
                        {entry.kind_label}
                        {entry.description && (
                          <p className="max-w-[280px] truncate text-xs text-muted-foreground">
                            {entry.description}
                          </p>
                        )}
                      </Td>
                      <Td>{entry.workshop_name || '—'}</Td>
                      <Td numeric>{km(entry.odometer)}</Td>
                      <Td numeric className="font-semibold">
                        {money(entry.total_amount)}
                      </Td>
                      <Td>
                        {entry.next_service_date
                          ? shortDate(entry.next_service_date)
                          : entry.next_service_odometer
                            ? km(entry.next_service_odometer)
                            : '—'}
                      </Td>
                      <Td>
                        <StatusPill
                          tone={
                            entry.approval_status === 'APPROVED'
                              ? 'done'
                              : entry.approval_status === 'REJECTED'
                                ? 'blocked'
                                : 'warn'
                          }
                          dot
                        >
                          {entry.approval_status_label}
                        </StatusPill>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <TableCard
            summary={`${documents.length} document(s) on file`}
            actions={
              options?.can_manage_vehicles && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingDocument(undefined);
                    setDocumentOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add document
                </Button>
              )
            }
          >
            <table className={TABLE_CLASSES}>
              <thead className={THEAD_CLASSES}>
                <tr>
                  <Th>Document</Th>
                  <Th>Number</Th>
                  <Th>Issued by</Th>
                  <Th>Expires</Th>
                  <Th>Status</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody>
                {!documents.length ? (
                  <TableEmpty
                    colSpan={6}
                    message="No documents filed"
                    hint="Insurance, PUC, fitness, permit."
                    icon={FileText}
                  />
                ) : (
                  documents.map((document) => (
                    <tr key={document.id} className={ROW_CLASSES}>
                      <Td className="font-medium">{document.doc_type_label}</Td>
                      <Td>{document.document_number || '—'}</Td>
                      <Td>{document.issuing_authority || '—'}</Td>
                      <Td>{shortDate(document.expiry_date)}</Td>
                      <Td>
                        <StatusPill
                          tone={
                            document.expiry_state === 'EXPIRED'
                              ? 'blocked'
                              : document.expiry_state === 'EXPIRING'
                                ? 'warn'
                                : 'done'
                          }
                          dot
                        >
                          {document.expiry_state === 'EXPIRED'
                            ? `Expired ${Math.abs(document.days_to_expiry)}d ago`
                            : `${document.days_to_expiry}d left`}
                        </StatusPill>
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-2">
                          {document.file_url && (
                            <button
                              type="button"
                              className="text-sm text-primary hover:underline"
                              onClick={() =>
                                openAttachment.mutate(
                                  { kind: 'document', id: document.id },
                                  {
                                    onError: () => toast.error('That file could not be opened.'),
                                  },
                                )
                              }
                            >
                              Open
                            </button>
                          )}
                          {options?.can_manage_vehicles && (
                            <button
                              type="button"
                              className="text-sm text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingDocument(document);
                                setDocumentOpen(true);
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>
        </TabsContent>
      </Tabs>

      <EntryDetailDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        detail={viewing}
      />

      <FuelEntryDialog
        open={fuelOpen}
        onOpenChange={setFuelOpen}
        vehicles={[vehicle]}
        vehicleId={vehicle.id}
        options={options}
      />
      <ServiceEntryDialog
        open={serviceOpen}
        onOpenChange={setServiceOpen}
        vehicles={[vehicle]}
        vehicleId={vehicle.id}
        options={options}
      />
      <DocumentDialog
        open={documentOpen}
        onOpenChange={setDocumentOpen}
        options={options}
        vehicleId={vehicle.id}
        document={editingDocument}
      />
    </div>
  );
}
