/**
 * What the visitor is about to send, read back before it goes — SAP Portal's
 * review step. Nothing here edits: "Edit" returns to the form as it was.
 */
import { Loader2, Pencil, Send } from 'lucide-react';

import { Button } from '@/shared/components/ui';

import type { Family } from '../constants';
import type { DocumentFiles, RegistrationDraft } from '../utils/registrationForm';

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b py-1.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function address(a: RegistrationDraft['bill_addresses'][number]): string {
  return [a.street, a.block, a.city, a.state, a.zip_code].filter(Boolean).join(', ');
}

export function RegistrationReview({
  family,
  draft,
  files,
  companyName,
  sending,
  onEdit,
  onSend,
}: {
  family: Family;
  draft: RegistrationDraft;
  files: DocumentFiles;
  companyName: string;
  sending: boolean;
  onEdit: () => void;
  onSend: () => void;
}) {
  const fileNames = Object.values(files)
    .flat()
    .map((file) => file?.name)
    .filter(Boolean) as string[];
  const ships = draft.ship_same_as_bill ? [] : draft.ship_addresses;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Check your registration</h2>
        <p className="text-sm text-muted-foreground">
          This is what will be sent. Go back to change anything; nothing is sent until you press Submit.
        </p>
      </div>
      <dl>
        <Row label="Company" value={companyName} />
        <Row label="Name" value={draft.card_name} />
        <Row label="Type" value={family === 'vendor' ? draft.vendor_type : draft.customer_type} />
        <Row label="Business" value={[draft.type_of_business, draft.industry].filter(Boolean).join(' · ')} />
        <Row
          label="Contact"
          value={[draft.contact_first_name, draft.contact_last_name].filter(Boolean).join(' ')}
        />
        <Row label="Mobile" value={draft.mobile} />
        <Row label="Email" value={draft.email} />
        <Row label="GSTIN" value={draft.gstin} />
        <Row label="PAN" value={draft.pan} />
        {family === 'vendor' && <Row label="FSSAI" value={draft.fssai_number} />}
        <Row label="MSME" value={draft.has_msme ? `${draft.msme_number} (${draft.msme_type})` : ''} />
        {draft.bill_addresses.map((a, i) => (
          <Row key={`bill-${i}`} label={i === 0 ? 'Billing address' : `Billing address ${i + 1}`} value={address(a)} />
        ))}
        {draft.ship_same_as_bill && <Row label="Shipping address" value="Same as billing" />}
        {ships.map((a, i) => (
          <Row key={`ship-${i}`} label={i === 0 ? 'Shipping address' : `Shipping address ${i + 1}`} value={address(a)} />
        ))}
        {draft.bank_accounts.map((b, i) => (
          <Row
            key={`bank-${i}`}
            label={i === 0 ? 'Bank account' : `Bank account ${i + 1}`}
            value={[b.bank_name, b.account_number, b.ifsc].filter(Boolean).join(' · ')}
          />
        ))}
        <Row label="Documents" value={fileNames.join(', ')} />
        <Row label="Remarks" value={draft.remarks} />
      </dl>
      <div className="flex justify-between gap-2 border-t pt-4">
        <Button variant="outline" onClick={onEdit} disabled={sending}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button onClick={onSend} disabled={sending} size="lg">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit registration
        </Button>
      </div>
    </div>
  );
}
