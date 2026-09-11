import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  Trash2,
  Truck,
  Upload,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DriverSelect, StepHeader, VehicleSelect } from '@/modules/gate/components';
import { Badge, Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import { resolveFileUrl } from '@/shared/utils';

import {
  type GoodsReturnDetail,
  useAddInvoiceRef,
  useDeleteAttachment,
  useGoodsReturn,
  useRemoveInvoiceRef,
  useSetGoodsReturnVehicle,
  useUpdateGoodsReturnHeader,
  useUploadAttachment,
} from '../api';
import { ReturnCustomerPicker } from '../components/ReturnCustomerPicker';
import {
  ATTACHMENT_TYPE_BY_BASIS,
  BASIS_LABELS,
  formatDateTime,
  REF_NO_LABELS,
  toDateInputValue,
} from '../utils';

export default function GoodsReturnDetailsEditPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const id = Number(entryId);
  const { data: detail, isLoading } = useGoodsReturn(id);

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return <DetailsEditForm key={detail.id} id={id} detail={detail} />;
}

function DetailsEditForm({ id, detail }: { id: number; detail: GoodsReturnDetail }) {
  const navigate = useNavigate();
  const isInvoiceBasis = detail.basis === 'INVOICE';

  const addInvoice = useAddInvoiceRef(id);
  const removeInvoice = useRemoveInvoiceRef(id);
  const uploadAttachment = useUploadAttachment(id);
  const deleteAttachment = useDeleteAttachment(id);
  const updateHeader = useUpdateGoodsReturnHeader(id);
  const setVehicle = useSetGoodsReturnVehicle(id);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState(detail.customer_name);
  const [customerCode, setCustomerCode] = useState(detail.customer_code);
  const [customerRefNo, setCustomerRefNo] = useState(detail.customer_ref_no);
  const [vehicleId, setVehicleId] = useState<number | null>(detail.vehicle);
  const [vehicleNo, setVehicleNo] = useState(detail.vehicle_no);
  const [driverId, setDriverId] = useState<number | null>(detail.driver);
  const [driverName, setDriverName] = useState(detail.driver_name);
  const [expectedArrival, setExpectedArrival] = useState(
    toDateInputValue(detail.expected_arrival_at),
  );
  const [error, setError] = useState<string | null>(null);

  // Once the gate has marked the truck in there is nothing left to change here.
  const isGatedIn = Boolean(detail.gated_in_at);

  async function handleAddInvoice() {
    const number = invoiceNumber.trim();
    if (!number) {
      setError('Enter the SAP invoice number.');
      return;
    }
    setError(null);
    try {
      await addInvoice.mutateAsync(number);
      setInvoiceNumber('');
      toast.success(`Invoice ${number} added`);
    } catch (err) {
      setError(readError(err, `No SAP invoice found for ${number}.`));
    }
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    try {
      for (const file of Array.from(fileList)) {
        await uploadAttachment.mutateAsync({
          file,
          attachmentType: ATTACHMENT_TYPE_BY_BASIS[detail.basis],
        });
      }
      toast.success('Document uploaded');
    } catch (err) {
      setError(readError(err, 'Could not upload the document.'));
    }
  }

  async function handleContinue() {
    setError(null);
    if (!isGatedIn && (!vehicleId || !driverId)) {
      setError('Pick the vehicle and driver bringing the goods back.');
      return;
    }
    if (isInvoiceBasis && detail.invoice_refs.length === 0) {
      setError('Add at least one invoice.');
      return;
    }
    if (!isInvoiceBasis && !customerCode.trim()) {
      // Returns booked before the code was mandatory land here with a name
      // only — and an empty item list on the next step until it is set.
      setError('Pick the returning customer from SAP.');
      return;
    }
    if (detail.attachments.length === 0) {
      setError('Upload at least one supporting document.');
      return;
    }
    try {
      if (!isInvoiceBasis) {
        await updateHeader.mutateAsync({
          customer_name: customerName.trim(),
          customer_code: customerCode.trim(),
          customer_ref_no: customerRefNo.trim(),
        });
      }
      const vehicleChanged =
        vehicleId !== detail.vehicle ||
        driverId !== detail.driver ||
        expectedArrival !== toDateInputValue(detail.expected_arrival_at);
      if (!isGatedIn && vehicleChanged && vehicleId && driverId) {
        await setVehicle.mutateAsync({
          vehicle_id: vehicleId,
          driver_id: driverId,
          expected_arrival_at: expectedArrival || null,
        });
      }
      navigate(`/returns/customer/edit/${id}/items`);
    } catch (err) {
      setError(readError(err, 'Could not save the details.'));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <StepHeader currentStep={1} totalSteps={3} title="Goods Return" error={error} />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{detail.entry_no}</span>
        <Badge variant="outline">{BASIS_LABELS[detail.basis]}</Badge>
      </div>

      {/* Vehicle & driver — first, as on the new-return page: this is what the
          gate is waiting for. */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <SectionTitle icon={<Truck className="h-4 w-4" />} title="Vehicle &amp; Driver *" />
            <p className="mt-1 text-xs text-muted-foreground">
              {isGatedIn
                ? `Marked in at the gate on ${formatDateTime(detail.gated_in_at)} — the truck can no longer be changed.`
                : 'This return is in the gate’s “Goods Return In” queue. The truck can be swapped, but not removed.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Return Vehicle *</Label>
              <VehicleSelect
                value={vehicleNo}
                defaultDisplayText={vehicleNo}
                disabled={isGatedIn}
                onChange={(vehicle) => {
                  setVehicleId(vehicle.vehicleId);
                  setVehicleNo(vehicle.vehicleNumber);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Driver *</Label>
              <DriverSelect
                value={driverName}
                defaultDisplayText={driverName}
                disabled={isGatedIn}
                onChange={(driver) => {
                  setDriverId(driver.driverId);
                  setDriverName(driver.driverName);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Expected Gate Arrival
              </Label>
              <Input
                type="date"
                value={expectedArrival}
                disabled={isGatedIn}
                onChange={(event) => setExpectedArrival(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source */}
      {isInvoiceBasis ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <SectionTitle icon={<ReceiptText className="h-4 w-4" />} title="Source Invoice(s)" />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddInvoice();
                  }
                }}
                placeholder="Enter SAP invoice number"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddInvoice}
                disabled={addInvoice.isPending}
              >
                {addInvoice.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add Invoice
              </Button>
            </div>

            {detail.customer_name && (
              <p className="text-sm text-muted-foreground">
                Customer: <span className="font-medium text-foreground">{detail.customer_name}</span>{' '}
                ({detail.customer_code})
              </p>
            )}

            {detail.invoice_refs.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Search and add the invoice(s) this return is booked against.
              </p>
            ) : (
              <div className="space-y-2">
                {detail.invoice_refs.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">Invoice {ref.sap_invoice_doc_num}</p>
                      {/* Each invoice posts its own A/R Return, so the split is
                          worth stating where the invoices are chosen. */}
                      <p className="text-xs text-muted-foreground">
                        {detail.lines.filter((line) => line.invoice_ref === ref.id).length} item(s)
                        returning · posts its own SAP return
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeInvoice.mutate(ref.id)}
                      disabled={removeInvoice.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6">
            <SectionTitle icon={<ReceiptText className="h-4 w-4" />} title="Customer" />
            <div className="space-y-2">
              <Label>Customer *</Label>
              <ReturnCustomerPicker
                value={customerCode ? `${customerName} (${customerCode})` : customerName}
                onChange={(customer) => {
                  setCustomerCode(customer?.customer_code ?? '');
                  setCustomerName(customer?.customer_name ?? '');
                }}
              />
              <p className="text-xs text-muted-foreground">
                {customerCode
                  ? 'The next step offers only what this customer has actually been invoiced.'
                  : 'This return has a customer name but no SAP code, so the next step has no purchase history to offer. Pick the customer to fix it.'}
              </p>
            </div>

            {/* Their number for the document, not ours — optional, and
                searchable afterwards from the returns list. */}
            <div className="space-y-2">
              <Label>{REF_NO_LABELS[detail.basis]}</Label>
              <Input
                value={customerRefNo}
                onChange={(event) => setCustomerRefNo(event.target.value)}
                placeholder={`${REF_NO_LABELS[detail.basis]} (optional)`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <SectionTitle
            icon={<FileText className="h-4 w-4" />}
            title={`${isInvoiceBasis ? 'Invoice' : BASIS_LABELS[detail.basis]} Documents *`}
          />
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/40">
            {uploadAttachment.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
            <span>Click to upload documents (required)</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleUpload(event.target.files)}
            />
          </label>
          {detail.attachments.length > 0 && (
            <div className="space-y-2">
              {detail.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <a
                    href={resolveFileUrl(attachment.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:underline"
                  >
                    {attachment.original_filename || attachment.attachment_type}
                  </a>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteAttachment.mutate(attachment.id)}
                    disabled={deleteAttachment.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/returns/customer')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Button>
        <Button onClick={handleContinue} disabled={updateHeader.isPending || setVehicle.isPending}>
          {updateHeader.isPending || setVehicle.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          Save &amp; Continue
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      {icon}
      {title}
    </div>
  );
}

function readError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || fallback;
}
