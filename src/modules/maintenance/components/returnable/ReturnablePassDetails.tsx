import { FileText, Image as ImageIcon, Paperclip } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import type { ReturnableGatePass, ReturnableGatePassAttachment } from '../../types';

interface ReturnablePassDetailsProps {
  pass: ReturnableGatePass;
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value || '—'}</dd>
    </div>
  );
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

function isImage(attachment: ReturnableGatePassAttachment) {
  return attachment.doc_type === 'PHOTO' || IMAGE_EXT.test(attachment.file);
}

function fileName(attachment: ReturnableGatePassAttachment) {
  return attachment.caption || attachment.file.split('/').pop() || 'attachment';
}

/**
 * Read-only summary of a returnable / non-returnable gate pass — every field the
 * department entered, plus its attachments. Shown to gate staff so they can
 * cross-verify the physical items against what was requested, and against the
 * photos the department uploaded.
 */
export function ReturnablePassDetails({ pass }: ReturnablePassDetailsProps) {
  const images = pass.attachments.filter(isImage);
  const documents = pass.attachments.filter((attachment) => !isImage(attachment));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gate Pass Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Purpose" value={pass.purpose_display} />
            <Field label="Department" value={pass.department_name} />

            {pass.is_returnable ? (
              <>
                <Field label="Requested By" value={pass.requested_by_name} />
                <Field label="Contact" value={pass.contact_no} />
                <Field label="Party / Vendor" value={pass.party_name} />
                <Field label="Party Contact" value={pass.party_contact} />
                <Field label="Party GSTIN" value={pass.party_gstin} />
                <Field label="Party Address" value={pass.party_address} />
                <Field
                  label="Expected Return"
                  value={
                    pass.expected_return_date
                      ? new Date(pass.expected_return_date).toLocaleDateString()
                      : ''
                  }
                />
              </>
            ) : (
              <>
                <Field label="Issued By" value={pass.issued_by_name} />
                <Field
                  label="Issued To"
                  value={pass.recipient_display_name || pass.recipient_name}
                />
                <Field label="Recipient Contact" value={pass.recipient_contact} />
                <Field label="Recipient Department" value={pass.recipient_department} />
                <Field label="Destination / Firm" value={pass.party_name} />
              </>
            )}

            <Field label="Linked Asset" value={pass.asset_name} />
            <Field label="Work Order" value={pass.work_order_no} />
            <Field label="Purpose Detail" value={pass.purpose_detail} />
            <Field label="Raised By" value={pass.created_by_name} />
            <Field label="Submitted By" value={pass.submitted_by_name} />
            <Field
              label="Approved By"
              value={
                pass.approved_at
                  ? `${pass.approved_by_name} · ${new Date(pass.approved_at).toLocaleDateString()}`
                  : ''
              }
            />
          </dl>
        </CardContent>
      </Card>

      {pass.attachments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Paperclip className="h-4 w-4" />
              Attachments ({pass.attachments.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Uploaded by the department. Check the photos against the physical items.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-md border"
                    title={fileName(attachment)}
                  >
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={attachment.file}
                        alt={fileName(attachment)}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1.5 text-xs">
                      <ImageIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{fileName(attachment)}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : null}

            {documents.length > 0 ? (
              <ul className="space-y-2">
                {documents.map((attachment) => (
                  <li key={attachment.id} className="flex items-center gap-2 text-sm">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <a
                      href={attachment.file}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-medium underline-offset-2 hover:underline"
                    >
                      {fileName(attachment)}
                    </a>
                    <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {attachment.doc_type_display}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
