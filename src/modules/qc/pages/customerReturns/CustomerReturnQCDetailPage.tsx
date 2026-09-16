import { ArrowLeft, CheckCircle2, Factory, PackageCheck, Save, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  CUSTOMER_RETURN_FACTORY_HEAD_DECISION_LABELS,
  CUSTOMER_RETURN_KEY,
  type CustomerFlowEntry,
  type CustomerFlowItem,
  type CustomerFlowStatus,
  findCustomerFlowEntry,
  formatCustomerFlowDateTime,
  getCustomerFlowRawValue,
  getCustomerFlowValue,
  getCustomerReturnStatusLabel,
  updateCustomerFlowEntry,
} from '@/modules/gate/pages/customerSalesFlow/customerSalesFlow.storage';
import {
  FACTORY_HEAD_DECISION_OPTIONS,
  FACTORY_HEAD_DECISIONS,
  type FactoryHeadDecision,
} from '@/modules/qc/utils/factoryHeadDecision';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

function getReturnedTotal(items: CustomerFlowItem[]) {
  return items.reduce((sum, item) => sum + Number(item.returnQty || 0), 0);
}

function applyWholeReturnDecision(
  items: CustomerFlowItem[],
  decision: 'ACCEPT' | 'REJECT',
) {
  return items.map((item) => ({
    ...item,
    acceptedQty: decision === 'ACCEPT' ? item.returnQty : '0',
    rejectedQty: decision === 'REJECT' ? item.returnQty : '0',
  }));
}

function getStoredFactoryHeadDecision(entry: CustomerFlowEntry): FactoryHeadDecision {
  const value = getCustomerFlowRawValue(entry, 'factoryHeadDecision');
  return Object.values(FACTORY_HEAD_DECISIONS).includes(value as FactoryHeadDecision)
    ? (value as FactoryHeadDecision)
    : FACTORY_HEAD_DECISIONS.ACCEPT_QC_OVERRIDE;
}

export default function CustomerReturnQCDetailPage() {
  const navigate = useNavigate();
  const { returnId } = useParams();
  const { currentCompany } = usePermission();
  const [entry, setEntry] = useState<CustomerFlowEntry | null>(() => (
    returnId ? findCustomerFlowEntry(CUSTOMER_RETURN_KEY, returnId) : null
  ));
  const [items, setItems] = useState<CustomerFlowItem[]>(() => entry?.items || []);
  const [qcRemarks, setQcRemarks] = useState(entry ? getCustomerFlowValue(entry, 'qcRemarks') : '');
  const [factoryHeadDecision, setFactoryHeadDecision] = useState<FactoryHeadDecision>(() => (
    entry ? getStoredFactoryHeadDecision(entry) : FACTORY_HEAD_DECISIONS.ACCEPT_QC_OVERRIDE
  ));
  const [factoryHeadRemarks, setFactoryHeadRemarks] = useState(
    entry ? getCustomerFlowRawValue(entry, 'factoryHeadRemarks') : '',
  );
  const [formError, setFormError] = useState('');

  if (!entry) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/qc/customer-returns')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <EmptyState text="Customer return not found" />
      </div>
    );
  }

  const isPendingQc = entry.status === 'PENDING_QC';
  const isFactoryHead = currentCompany?.role === 'Factory Head';
  const showFactoryHeadDecision = entry.status === 'QC_REJECTED';
  const canRecordFactoryHeadDecision = showFactoryHeadDecision && isFactoryHead;
  const returnedTotal = getReturnedTotal(items);

  const updateItem = (itemId: string, key: keyof CustomerFlowItem, value: string) => {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)));
    setFormError('');
  };

  const handleQcDecision = (decision: 'ACCEPT' | 'REJECT') => {
    if (returnedTotal <= 0) {
      setFormError('Returned quantity is missing for this customer return');
      return;
    }

    const now = new Date().toISOString();
    const nextItems = applyWholeReturnDecision(items, decision);
    const acceptedTotal = decision === 'ACCEPT' ? returnedTotal : 0;
    const rejectedTotal = decision === 'REJECT' ? returnedTotal : 0;
    const nextStatus: CustomerFlowStatus = decision === 'ACCEPT' ? 'PENDING_SAP_GR' : 'QC_REJECTED';

    const updatedEntry = updateCustomerFlowEntry(CUSTOMER_RETURN_KEY, entry.id, (current) => ({
      ...current,
      status: nextStatus,
      items: nextItems,
      values: {
        ...current.values,
        qcDecision: decision,
        qcRemarks,
        qcVerifiedAt: now,
        acceptedQtyTotal: `${acceptedTotal}`,
        rejectedQtyTotal: `${rejectedTotal}`,
        factoryHeadDecision: decision === 'REJECT' ? '' : getCustomerFlowRawValue(current, 'factoryHeadDecision'),
        factoryHeadRemarks: decision === 'REJECT' ? '' : getCustomerFlowRawValue(current, 'factoryHeadRemarks'),
        factoryHeadDecidedAt: decision === 'REJECT' ? '' : getCustomerFlowRawValue(current, 'factoryHeadDecidedAt'),
      },
      updatedAt: now,
    }));

    if (!updatedEntry) {
      setFormError('Failed to save QC result');
      return;
    }

    setItems(nextItems);
    setEntry(updatedEntry);
    setFormError('');
    toast.success(decision === 'ACCEPT'
      ? 'Customer return accepted. SAP GR is pending.'
      : 'Customer return rejected and sent to Factory Head');
  };

  const handleFactoryHeadDecisionSave = () => {
    const now = new Date().toISOString();
    const isAcceptedOverride = factoryHeadDecision === FACTORY_HEAD_DECISIONS.ACCEPT_QC_OVERRIDE;
    const nextItems = applyWholeReturnDecision(items, isAcceptedOverride ? 'ACCEPT' : 'REJECT');
    const updatedEntry = updateCustomerFlowEntry(CUSTOMER_RETURN_KEY, entry.id, (current) => ({
      ...current,
      status: isAcceptedOverride ? 'PENDING_SAP_GR' : 'QC_REJECTED',
      items: nextItems,
      values: {
        ...current.values,
        factoryHeadDecision,
        factoryHeadRemarks,
        factoryHeadDecidedAt: now,
        acceptedQtyTotal: isAcceptedOverride ? `${returnedTotal}` : '0',
        rejectedQtyTotal: isAcceptedOverride ? '0' : `${returnedTotal}`,
      },
      updatedAt: now,
    }));

    if (!updatedEntry) {
      setFormError('Failed to save Factory Head decision');
      return;
    }

    setItems(nextItems);
    setEntry(updatedEntry);
    setFormError('');
    toast.success('Factory Head decision saved');
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/qc/customer-returns')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{entry.entryNo}</h2>
            <p className="text-muted-foreground">Customer return QC verification</p>
          </div>
        </div>
        <StatusBadge entry={entry} />
      </div>

      {formError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Return Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Return Entry" value={entry.entryNo} />
          <InfoItem label="Dispatch" value={getCustomerFlowValue(entry, 'dispatchEntry')} />
          <InfoItem label="Invoice" value={getCustomerFlowValue(entry, 'invoiceNo')} />
          <InfoItem label="Customer" value={getCustomerFlowValue(entry, 'customerName')} />
          <InfoItem label="Gate In" value={formatCustomerFlowDateTime(entry.values.gateInDate, entry.values.inTime)} />
          <InfoItem label="Claim No." value={getCustomerFlowValue(entry, 'customerClaimNo')} />
          <InfoItem label="Returned Qty" value={`${returnedTotal}`} />
          <InfoItem label="QC Decision" value={getCustomerFlowValue(entry, 'qcDecision')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QC Item Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ItemsTable items={items} isLocked={!isPendingQc} onChange={updateItem} />
          <div className="space-y-2">
            <Label htmlFor="customer-return-qc-remarks">QC Remarks</Label>
            <Textarea
              id="customer-return-qc-remarks"
              value={qcRemarks}
              disabled={!isPendingQc}
              onChange={(event) => setQcRemarks(event.target.value)}
              placeholder="Inspection result, damage notes, photos reference"
            />
          </div>
        </CardContent>
      </Card>

      {showFactoryHeadDecision && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Factory Head Final Call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canRecordFactoryHeadDecision && !getCustomerFlowRawValue(entry, 'factoryHeadDecision') && (
              <div className="rounded-md border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-400">
                This rejected customer return is waiting for Factory Head decision.
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-return-fh-decision">Decision</Label>
                <NativeSelect
                  id="customer-return-fh-decision"
                  value={factoryHeadDecision}
                  disabled={!canRecordFactoryHeadDecision}
                  onChange={(event) => setFactoryHeadDecision(event.target.value as FactoryHeadDecision)}
                >
                  {FACTORY_HEAD_DECISION_OPTIONS.map((option) => (
                    <SelectOption key={option.value} value={option.value}>
                      {option.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>
              <InfoItem
                label="Saved Decision"
                value={
                  getCustomerFlowRawValue(entry, 'factoryHeadDecision')
                    ? CUSTOMER_RETURN_FACTORY_HEAD_DECISION_LABELS[
                        getCustomerFlowRawValue(entry, 'factoryHeadDecision')
                      ]
                    : ''
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-return-fh-remarks">Factory Head Remarks</Label>
              <Textarea
                id="customer-return-fh-remarks"
                value={factoryHeadRemarks}
                disabled={!canRecordFactoryHeadDecision}
                onChange={(event) => setFactoryHeadRemarks(event.target.value)}
                placeholder="Final decision notes"
              />
            </div>

            {canRecordFactoryHeadDecision && (
              <div className="flex justify-end">
                <Button onClick={handleFactoryHeadDecisionSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Final Call
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isPendingQc && (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => handleQcDecision('REJECT')}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject Return
          </Button>
          <Button onClick={() => handleQcDecision('ACCEPT')}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Accept Return
          </Button>
        </div>
      )}
    </div>
  );
}

function ItemsTable({
  items,
  isLocked,
  onChange,
}: {
  items: CustomerFlowItem[];
  isLocked: boolean;
  onChange: (itemId: string, key: keyof CustomerFlowItem, value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Return Qty</th>
              <th className="p-3 text-left text-sm font-medium">QC Result</th>
              <th className="p-3 text-left text-sm font-medium">Condition</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 text-sm">
                  <div className="font-medium">{item.itemName}</div>
                  <div className="text-xs text-muted-foreground">{item.itemCode}</div>
                </td>
                <td className="whitespace-nowrap p-3 text-sm">{item.returnQty} {item.uom}</td>
                <td className="whitespace-nowrap p-3 text-sm">
                  {Number(item.acceptedQty || 0) > 0 ? (
                    <Badge variant="success">Accepted</Badge>
                  ) : Number(item.rejectedQty || 0) > 0 ? (
                    <Badge variant="destructive">Rejected</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </td>
                <td className="p-3">
                  <Input
                    disabled={isLocked}
                    value={item.condition}
                    onChange={(event) => onChange(item.id, 'condition', event.target.value)}
                    placeholder="Damaged / reusable / scrap"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ entry }: { entry: CustomerFlowEntry }) {
  if (entry.status === 'PENDING_QC') return <Badge variant="warning">PENDING QC</Badge>;
  if (entry.status === 'PENDING_SAP_GR') return <Badge variant="warning">PENDING SAP GR</Badge>;
  if (entry.status === 'QC_REJECTED') return <Badge variant="destructive">{getCustomerReturnStatusLabel(entry)}</Badge>;
  return <Badge variant="success">{getCustomerReturnStatusLabel(entry)}</Badge>;
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value && value !== '-' ? value : '-'}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
