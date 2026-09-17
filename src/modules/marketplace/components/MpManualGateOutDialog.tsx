/**
 * Gate out on a delivery note alone, with no sheet — raising one, and finishing it.
 *
 * The sheet ladder (scan → confirm → gate-approve → trip) exists so a parcel
 * cannot leave unaccounted for. A load cut by hand in SAP has no parcels in that
 * sense and could not use it, so the gate person either waited for a ladder that
 * did not apply or let the truck go unrecorded. This asks only for what is
 * actually in front of them and files the note against the trip.
 *
 * The SAME form finishes a draft. A draft used to get nothing but a Security box
 * when it was marked out, because marking out was the only write the gate screen
 * had — so everything the gate person had come back to do (the real note number,
 * the boxes actually loaded, the weighbridge reading finally taken) was
 * unreachable, and the truck left on whatever was known when the draft was
 * raised. Passing `trip` re-opens this form over that draft with its details
 * filled in, and Mark out is the same button it always was.
 *
 * Vehicle and driver use the shared gate pickers, so a truck that is not on file
 * is added from here through the same dialog as everywhere else, rather than
 * being typed as loose text that no master ever learns about.
 *
 * One submit: the server opens (or updates) the trip, files the note and marks
 * it out in a single transaction, so an abandoned form leaves nothing
 * half-made behind.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Paperclip, Truck } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
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
import type {
  MarketplaceChannel,
  MpGatePass,
  MpManualGateOutPayload,
} from '../types/marketplace.types';

const TODAY = new Date().toISOString().slice(0, 10);

const NO_VEHICLE = { id: 0, number: '', transporterId: 0 };
const NO_DRIVER = { id: 0, name: '' };

interface Props {
  channel: MarketplaceChannel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
  /** A draft to finish. Omitted (or null) raises a new gate out instead. */
  trip?: MpGatePass | null;
}

/** A weighbridge reading the operator actually took — blank or 0 means none. */
function weighed(value: string): string | undefined {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n > 0 ? value : undefined;
}

export function MpManualGateOutDialog({ channel, open, onOpenChange, onDone, trip }: Props) {
  const qc = useQueryClient();
  const editing = !!trip;
  // Every box is wired to its label: the gate person tabs through this form
  // with a truck waiting, and the ids must not collide with the copy of this
  // same dialog the page keeps mounted for raising a new trip.
  const uid = useId();

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

  // A trip cannot be without a vehicle, but it need not be a registered one —
  // an unknown truck's number is frozen as text, and a draft re-opened here
  // already carries whichever of the two it was raised with.
  const canSubmit = vehicle.id > 0 || vehicle.number.trim() !== '';

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

  // Fill the form from the draft each time it is opened, so re-opening after a
  // failed submit shows what is actually on the trip rather than a stale form.
  useEffect(() => {
    if (!open) return;
    if (!trip) {
      reset();
      return;
    }
    setVehicle({
      id: trip.vehicle ?? 0,
      number: trip.vehicle_no,
      transporterId: trip.transporter ?? 0,
    });
    setDriver({ id: trip.driver ?? 0, name: trip.driver_name });
    setNoteNo(trip.delivery_note_no);
    setNoteDate(trip.delivery_note_date ?? TODAY);
    setBoxCount(trip.box_count ? String(trip.box_count) : '');
    setTare(trip.tare_weight ?? '');
    setGross(trip.gross_weight ?? '');
    setSlip(trip.weighbridge_slip_no);
    setSecurity(trip.security_name ?? '');
    setRemarks(trip.remarks);
    setFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trip?.id]);

  const send = useMutation({
    mutationFn: (markOut: boolean) => {
      const payload: MpManualGateOutPayload = {
        vehicle_id: vehicle.id || undefined,
        transporter_id: vehicle.transporterId || undefined,
        driver_id: driver.id || undefined,
        // Typed text for a truck or driver no master knows: only sent when there
        // is no id, since the server lets a chosen master win either way.
        vehicle_no: vehicle.id ? undefined : vehicle.number.trim(),
        driver_name: driver.id ? undefined : driver.name.trim(),
        delivery_note_no: noteNo.trim(),
        delivery_note_date: noteNo.trim() ? noteDate : undefined,
        box_count: boxCount ? Number(boxCount) : undefined,
        // A typed 0 means "never went on the weighbridge", not "weighs nothing" —
        // the same reading gate_core gives a 0 tare. Sending it would make the
        // server reject the whole gate out over a weighment this entry point
        // deliberately treats as optional, stranding the truck at the gate.
        tare_weight: weighed(tare),
        gross_weight: weighed(gross),
        weighbridge_slip_no: slip.trim(),
        security_name: security.trim(),
        remarks: remarks.trim(),
        file,
        mark_out: markOut,
      };
      return trip
        ? marketplaceApi.gatePassManualUpdate(trip.id, payload)
        : marketplaceApi.gatePassManual(channel, payload);
    },
    onSuccess: (saved) => {
      toast.success(
        saved.status === 'DISPATCHED'
          ? `${saved.vehicle_no} marked out — gatepass ${saved.gatepass_no}.`
          : editing
            ? `Gate out for ${saved.vehicle_no} updated.`
            : `Gate out saved as a draft for ${saved.vehicle_no}.`,
      );
      qc.invalidateQueries({ queryKey: ['mp-gate-passes'] });
      qc.invalidateQueries({ queryKey: ['mp-gate-queue'] });
      reset();
      onOpenChange(false);
      onDone?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not record the gate out.')),
  });

  const filedNote = trip?.attachments?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {editing ? `Gate out ${trip?.vehicle_no || ''}`.trim() : 'New gate out'}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {editing
            ? 'Check what the truck is actually leaving with, then mark it out. Anything you correct here is saved with it.'
            : 'For a truck leaving on a delivery note, with no sheet behind it. Only the vehicle is required — the weighbridge readings are optional.'}
        </p>

        <div className="space-y-4">
          <VehicleSelect
            label="Vehicle"
            required
            value={vehicle.number}
            defaultDisplayText={vehicle.number}
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
            defaultDisplayText={driver.name}
            onChange={(d) => setDriver({ id: d.driverId, name: d.driverName })}
          />

          {/* The note it travels on */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-note`}>Delivery note no.</Label>
              <Input
                id={`${uid}-note`}
                value={noteNo}
                onChange={(e) => setNoteNo(e.target.value)}
                placeholder="1508264519"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-note-date`}>Note date</Label>
              <Input id={`${uid}-note-date`} type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-note-file`}>Delivery note copy</Label>
            <Input
              id={`${uid}-note-file`}
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {/* A draft is often opened before the PDF is in hand, so say what is
                already filed rather than looking like nothing was. */}
            {filedNote && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                <a
                  href={filedNote.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {filedNote.original_filename || 'Note'}
                </a>
                already filed — choosing a file adds another.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-boxes`}>Boxes</Label>
            <Input
              id={`${uid}-boxes`}
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
              <Label htmlFor={`${uid}-tare`}>Tare (kg)</Label>
              <Input id={`${uid}-tare`} type="number" value={tare} onChange={(e) => setTare(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-gross`}>Gross (kg)</Label>
              <Input id={`${uid}-gross`} type="number" value={gross} onChange={(e) => setGross(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-slip`}>Slip no.</Label>
              <Input id={`${uid}-slip`} value={slip} onChange={(e) => setSlip(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-security`}>Security</Label>
            <Input
              id={`${uid}-security`}
              value={security}
              onChange={(e) => setSecurity(e.target.value)}
              placeholder="Who is letting it out"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-remarks`}>Remarks</Label>
            <Textarea
              id={`${uid}-remarks`}
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
            {editing ? 'Save, keep waiting' : 'Save as draft'}
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
