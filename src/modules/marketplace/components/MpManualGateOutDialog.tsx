/**
 * New gate out — a truck leaving on a delivery note alone, with no sheet.
 *
 * The sheet ladder (scan → confirm → gate-approve → trip) exists so a parcel
 * cannot leave unaccounted for. A load cut by hand in SAP has no parcels in that
 * sense and could not use it, so the gate person either waited for a ladder that
 * did not apply or let the truck go unrecorded. This asks only for what is
 * actually in front of them and files the note against the trip.
 *
 * Vehicle and driver use the shared gate pickers, so a truck that is not on file
 * is added from here through the same dialog as everywhere else, rather than
 * being typed as loose text that no master ever learns about.
 *
 * One submit: the server opens the trip, files the note and marks it out in a
 * single transaction, so an abandoned form leaves nothing half-made behind.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DriverSelect, VehicleSelect } from '@/modules/gate/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { marketplaceApi } from '../api/marketplace.api';
import type { MarketplaceChannel, MpManualGateOutPayload } from '../types/marketplace.types';

const TODAY = new Date().toISOString().slice(0, 10);

const NO_VEHICLE = { id: 0, number: '', transporterId: 0 };
const NO_DRIVER = { id: 0, name: '' };

interface Props {
  channel: MarketplaceChannel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

export function MpManualGateOutDialog({ channel, open, onOpenChange, onDone }: Props) {
  const qc = useQueryClient();

  const [vehicle, setVehicle] = useState(NO_VEHICLE);
  const [driver, setDriver] = useState(NO_DRIVER);
  const [noteNo, setNoteNo] = useState('');
  const [noteDate, setNoteDate] = useState(TODAY);
  const [boxCount, setBoxCount] = useState('');
  const [tare, setTare] = useState('');
  const [gross, setGross] = useState('');
  const [slip, setSlip] = useState('');
  const [security, setSecurity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // The vehicle is the one thing a gate out cannot be without; everything else
  // is what happens to be known at the gate.
  const canSubmit = vehicle.id > 0;

  const reset = () => {
    setVehicle(NO_VEHICLE);
    setDriver(NO_DRIVER);
    setNoteNo('');
    setNoteDate(TODAY);
    setBoxCount('');
    setTare('');
    setGross('');
    setSlip('');
    setSecurity('');
    setRemarks('');
    setFile(null);
  };

  const send = useMutation({
    mutationFn: (markOut: boolean) => {
      const payload: MpManualGateOutPayload = {
        vehicle_id: vehicle.id || undefined,
        transporter_id: vehicle.transporterId || undefined,
        driver_id: driver.id || undefined,
        delivery_note_no: noteNo.trim(),
        delivery_note_date: noteNo.trim() ? noteDate : undefined,
        box_count: boxCount ? Number(boxCount) : undefined,
        tare_weight: tare || undefined,
        gross_weight: gross || undefined,
        weighbridge_slip_no: slip.trim(),
        security_name: security.trim(),
        remarks: remarks.trim(),
        file,
        mark_out: markOut,
      };
      return marketplaceApi.gatePassManual(channel, payload);
    },
    onSuccess: (trip) => {
      toast.success(
        trip.status === 'DISPATCHED'
          ? `${trip.vehicle_no} marked out — gatepass ${trip.gatepass_no}.`
          : `Gate out saved as a draft for ${trip.vehicle_no}.`,
      );
      qc.invalidateQueries({ queryKey: ['mp-gate-passes'] });
      qc.invalidateQueries({ queryKey: ['mp-gate-queue'] });
      reset();
      onOpenChange(false);
      onDone?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not record the gate out.')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> New gate out
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          For a truck leaving on a delivery note, with no sheet behind it. Only the vehicle is
          required — the weighbridge readings are optional.
        </p>

        <div className="space-y-4">
          <VehicleSelect
            label="Vehicle"
            required
            value={vehicle.number}
            onChange={(v) =>
              setVehicle({
                id: v.vehicleId,
                number: v.vehicleNumber,
                transporterId: v.transporterId,
              })
            }
          />

          <DriverSelect
            label="Driver"
            value={driver.name}
            onChange={(d) => setDriver({ id: d.driverId, name: d.driverName })}
          />

          {/* The note it travels on */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Delivery note no.</Label>
              <Input
                value={noteNo}
                onChange={(e) => setNoteNo(e.target.value)}
                placeholder="1508264519"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note date</Label>
              <Input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Delivery note copy</Label>
            <Input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Boxes</Label>
            <Input
              type="number"
              min={0}
              value={boxCount}
              onChange={(e) => setBoxCount(e.target.value)}
              placeholder="62"
            />
          </div>

          {/* Weighment — recorded if taken, never a blocker */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label>Tare (kg)</Label>
              <Input type="number" value={tare} onChange={(e) => setTare(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Gross (kg)</Label>
              <Input type="number" value={gross} onChange={(e) => setGross(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Slip no.</Label>
              <Input value={slip} onChange={(e) => setSlip(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Security</Label>
            <Input
              value={security}
              onChange={(e) => setSecurity(e.target.value)}
              placeholder="Who is letting it out"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Anything the gate should have on record"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            disabled={!canSubmit || send.isPending}
            onClick={() => send.mutate(false)}
          >
            Save as draft
          </Button>
          <Button disabled={!canSubmit || send.isPending} onClick={() => send.mutate(true)}>
            {send.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Mark out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
