/**
 * One registration: what was submitted, the documents, the SAP master data the
 * approver sets, and the history — with the actions the server says this user
 * may take (verify, edit, reject, create in SAP).
 *
 * SAP Portal's approvals.html detail modal, as a page. Creating in SAP asks
 * first (confirmSapPost); if SAP already has a partner with the same GSTIN or
 * PAN the server answers 409 with them, and the approver decides whether to
 * create another anyway. The SAP pickers read the registration's own company.
 */
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pencil,
  Save,
  Send,
  XCircle,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api';
import {
  confirmDialog,
  confirmSapPost,
  PageHeader,
  PageSection,
  promptDialog,
  ROW_CLASSES,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { formatDateTimeShort } from '@/shared/utils';

import {
  type DuplicateMatch,
  type RegistrationDetail,
  useApproveRegistration,
  useOpenDocument,
  usePartnerLookups,
  useRegistration,
  useRejectRegistration,
  useUpdateRegistration,
  useVerifyRegistration,
} from '../api';
import { EditRegistrationDialog } from '../components/EditRegistrationDialog';
import { LookupSelect, SapFieldsForm } from '../components/SapFieldsForm';
import { COUNTRIES, CURRENCIES, type Family, statusTone } from '../constants';
import { type ManagerDraft, managerDraftFrom, managerPayload } from '../utils/managerFields';

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm font-medium">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: 'warn' | 'error' | 'info' | 'done';
  children: ReactNode;
}) {
  const classes = {
    warn: 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200',
    error: 'border-destructive/40 bg-destructive/5 text-destructive',
    info: 'border-sky-300 bg-sky-50 text-sky-900 dark:bg-sky-500/10 dark:text-sky-200',
    done: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200',
  }[tone];
  return <div className={`flex gap-2 rounded-lg border p-3 text-sm ${classes}`}>{children}</div>;
}

const label = (options: readonly { value: string; label: string }[], value?: string) =>
  options.find((option) => option.value === value)?.label ?? value;

export function RegistrationDetailPage({ family }: { family: Family }) {
  const id = Number(useParams().id);
  const query = useRegistration(family, id);

  if (query.isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <p className="font-medium">This registration could not be loaded.</p>
        <p className="text-sm text-muted-foreground">
          It may belong to another company, or you may not have the right to see it.
        </p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <RegistrationView key={`${query.data.id}-${query.data.status}`} registration={query.data} />
  );
}

function RegistrationView({ registration }: { registration: RegistrationDetail }) {
  const family = registration.family;
  const actions = registration.actions;
  const canSetSapFields = actions.can_approve || actions.can_edit;
  const [editing, setEditing] = useState(false);
  const [manager, setManager] = useState<ManagerDraft>(() => managerDraftFrom(registration));
  const [bankCodes, setBankCodes] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      (registration.bank_accounts ?? []).map((bank) => [bank.id, bank.sap_bank_code]),
    ),
  );
  const lookups = usePartnerLookups(registration.company_code, family, canSetSapFields);
  const verify = useVerifyRegistration(family, registration.id);
  const reject = useRejectRegistration(family, registration.id);
  const approve = useApproveRegistration(family, registration.id);
  const update = useUpdateRegistration(family, registration.id);
  const openDocument = useOpenDocument(family, registration.id);
  const busy = verify.isPending || reject.isPending || approve.isPending || update.isPending;
  const kind = family === 'customer' ? 'customer' : 'vendor';

  const onVerify = async () => {
    const note = await promptDialog({
      title: `Verify ${registration.reference}?`,
      description: 'The registration moves on to the SAP approver. Add a note if it helps them.',
      label: 'Note (optional)',
      confirmLabel: 'Verify',
      multiline: true,
      required: false,
    });
    if (note === null) return;
    await verify.mutateAsync(note);
    toast.success(`${registration.reference} verified`);
  };

  const onReject = async () => {
    const reason = await promptDialog({
      title: `Reject ${registration.reference}?`,
      description: 'The reason is recorded with the registration.',
      label: 'Reason',
      confirmLabel: 'Reject',
      destructive: true,
      multiline: true,
    });
    if (!reason) return;
    await reject.mutateAsync(reason);
    toast.success(`${registration.reference} rejected`);
  };

  const onSaveSapFields = async () => {
    try {
      await update.mutateAsync(managerPayload(manager));
      toast.success('SAP fields saved');
    } catch (error) {
      toast.error((error as ApiError).message || 'The SAP fields could not be saved');
    }
  };

  const createInSap = async (confirmDuplicate: boolean) => {
    try {
      const answer = await approve.mutateAsync({
        ...managerPayload(manager),
        bank_accounts: Object.entries(bankCodes).map(([bankId, code]) => ({
          id: Number(bankId),
          sap_bank_code: code,
        })),
        confirm_duplicate: confirmDuplicate,
      });
      toast.success(answer.message ?? `Created in SAP as ${answer.sap_card_code}`);
      (answer.warnings ?? []).forEach((warning) => toast.warning(warning));
    } catch (error) {
      const apiError = error as ApiError;
      const data = (apiError.response?.data ?? {}) as {
        code?: string;
        detail?: string;
        matches?: DuplicateMatch[];
      };
      if (apiError.status === 409 && data.code === 'possible_duplicate') {
        const again = await confirmDialog({
          title: `SAP already has a ${kind} with this GSTIN or PAN`,
          description:
            'Check these before creating another. Create anyway only if it really is a different partner.',
          body: (
            <ul className="space-y-1 text-sm">
              {(data.matches ?? []).map((match) => (
                <li key={match.card_code}>
                  <span className="font-mono font-semibold">{match.card_code}</span>{' '}
                  {match.card_name}{' '}
                  <span className="text-muted-foreground">
                    (same {match.matched_on.join(' and ')})
                  </span>
                </li>
              ))}
            </ul>
          ),
          confirmLabel: 'Create another anyway',
          destructive: true,
        });
        if (again) await createInSap(true);
        return;
      }
      toast.error(data.detail ?? apiError.message ?? 'SAP did not create the partner');
    }
  };

  const onApprove = async () => {
    const prefix = manager.card_code_prefix || registration.default_card_code_prefix;
    const ok = await confirmSapPost({
      title: `Create this ${kind} in ${registration.company_name}'s SAP?`,
      details: [
        { label: 'Name', value: registration.card_name },
        { label: 'Card code', value: registration.card_code || `next free ${prefix}…` },
        !!registration.gstin && { label: 'GSTIN', value: registration.gstin },
        { label: 'PAN', value: registration.pan || '—' },
        !!manager.bp_group_name && { label: 'BP group', value: manager.bp_group_name },
        {
          label: family === 'customer' ? 'AR account' : 'AP account',
          value: manager.control_account || registration.default_control_account,
        },
        { label: 'Documents', value: `${registration.attachments.length} (Aadhaar stays here)` },
      ],
      confirmLabel: 'Create in SAP',
    });
    if (ok) await createInSap(false);
  };

  const bill = registration.addresses.filter((a) => a.address_type === 'BILL_TO');

  return (
    <div className="space-y-6">
      <PageHeader
        title={registration.card_name}
        description={`${registration.reference} · ${registration.company_name} · ${registration.partner_type_label}${
          registration.legacy_portal_id ? ` · SAP Portal #${registration.legacy_portal_id}` : ''
        }`}
        backTo={`/partners/approvals${family === 'vendor' ? '?tab=vendors' : ''}`}
        backLabel="Registrations"
        meta={
          <StatusPill
            tone={registration.sap_posting ? 'progress' : statusTone(registration.status)}
            dot
          >
            {registration.sap_posting ? 'Creating in SAP…' : registration.status_label}
          </StatusPill>
        }
      >
        {actions.can_edit && (
          <Button variant="outline" onClick={() => setEditing(true)} disabled={busy}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}
        {actions.can_reject && (
          <Button variant="outline" onClick={onReject} disabled={busy}>
            <XCircle className="h-4 w-4 text-destructive" /> Reject
          </Button>
        )}
        {actions.can_verify && (
          <Button onClick={onVerify} disabled={busy}>
            <BadgeCheck className="h-4 w-4" /> Verify
          </Button>
        )}
        {actions.can_approve && (
          <Button onClick={onApprove} disabled={busy}>
            {approve.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Create in SAP
          </Button>
        )}
      </PageHeader>

      {registration.sap_posting && (
        <Banner tone="info">
          <Loader2 className="h-4 w-4 animate-spin" /> This {kind} is being created in SAP. Reload
          in a minute.
        </Banner>
      )}
      {registration.status === 'APPROVED' && (
        <Banner tone="done">
          <CheckCircle2 className="h-4 w-4" /> In SAP as{' '}
          <span className="font-mono font-semibold">{registration.sap_card_code}</span>
          {registration.approved_by_name && ` — by ${registration.approved_by_name}`}
          {registration.approved_at && `, ${formatDateTimeShort(registration.approved_at)}`}
        </Banner>
      )}
      {registration.status === 'VERIFIED' && registration.sap_error && (
        <Banner tone="error">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            The last attempt to create it in SAP failed: {registration.sap_error}
            {registration.card_code &&
              ` Card code ${registration.card_code} stays reserved for the next attempt.`}
          </span>
        </Banner>
      )}
      {registration.sap_warning && (
        <Banner tone="warn">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="whitespace-pre-line">{registration.sap_warning}</span>
        </Banner>
      )}
      {registration.status === 'REJECTED' && (
        <Banner tone="error">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>
            Rejected{registration.rejected_by_name && ` by ${registration.rejected_by_name}`}
            {registration.rejected_at && `, ${formatDateTimeShort(registration.rejected_at)}`}
            {registration.rejection_reason && `: ${registration.rejection_reason}`}
          </span>
        </Banner>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-semibold">Business and contact</h3>
            <Facts
              rows={[
                ['Foreign / trade name', registration.foreign_name],
                ['Type of business', registration.type_of_business],
                ['Industry', registration.industry],
                ['Products', registration.products],
                [
                  'Contact',
                  [registration.contact_name, registration.contact_title]
                    .filter(Boolean)
                    .join(', '),
                ],
                ['Mobile', registration.mobile],
                ['Alternate contact', registration.alt_contact],
                ['Email', registration.email],
                ['Alternate email', registration.contact_email],
                ['Website', registration.website],
                ['Currency', label(CURRENCIES, registration.currency)],
                ['Submitted', formatDateTimeShort(registration.submitted_at)],
                [
                  'Verified',
                  registration.verified_at &&
                    `${formatDateTimeShort(registration.verified_at)}${registration.verified_by_name ? ` by ${registration.verified_by_name}` : ''}`,
                ],
                ['Remarks', registration.remarks],
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-semibold">Tax and compliance</h3>
            <Facts
              rows={[
                [
                  'GSTIN',
                  registration.gstin && <span className="font-mono">{registration.gstin}</span>,
                ],
                ['PAN', registration.pan && <span className="font-mono">{registration.pan}</span>],
                ['TAN', registration.tan],
                ['FSSAI licence', registration.fssai_number],
                ['MSME / Udyam', registration.has_msme ? registration.msme_number || 'Yes' : 'No'],
                ['MSME type', registration.has_msme ? registration.msme_type : ''],
                [
                  'MSME business type',
                  registration.has_msme ? registration.msme_business_type : '',
                ],
                [
                  'TDS',
                  registration.has_tds
                    ? `${registration.tds_category} ${registration.tds_rate}%`.trim()
                    : '',
                ],
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <PageSection
        title="Addresses"
        description="As they will reach SAP; the first billing address carries the PAN."
      >
        <TableCard>
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th>Type</Th>
                <Th>Name in SAP</Th>
                <Th>Address</Th>
                <Th>State</Th>
                <Th>GSTIN</Th>
              </tr>
            </thead>
            <tbody>
              {registration.addresses.length === 0 ? (
                <TableEmpty colSpan={5} message="No addresses" />
              ) : (
                registration.addresses.map((address) => (
                  <tr key={address.id} className={ROW_CLASSES}>
                    <Td>{address.address_type_label}</Td>
                    <Td className="font-medium">{address.address_name}</Td>
                    <Td>
                      {[address.street, address.block, address.city, address.zip_code]
                        .filter(Boolean)
                        .join(', ')}
                      {address.country !== 'IN' && `, ${label(COUNTRIES, address.country)}`}
                    </Td>
                    <Td>{address.state || '—'}</Td>
                    <Td className="font-mono text-xs">
                      {address.gstin ||
                        (address.address_type === 'BILL_TO' &&
                        address.id === bill[0]?.id &&
                        registration.gstin
                          ? `${registration.gstin} (registration)`
                          : '—')}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>
      </PageSection>

      {family === 'vendor' && (
        <PageSection
          title="Bank accounts"
          description="Each needs its SAP bank code before the vendor can be created."
        >
          <TableCard>
            <table className={TABLE_CLASSES}>
              <thead className={THEAD_CLASSES}>
                <tr>
                  <Th>Bank</Th>
                  <Th>Account</Th>
                  <Th>IFSC</Th>
                  <Th>Type</Th>
                  <Th>SAP bank code</Th>
                </tr>
              </thead>
              <tbody>
                {(registration.bank_accounts ?? []).length === 0 ? (
                  <TableEmpty colSpan={5} message="No bank accounts" />
                ) : (
                  (registration.bank_accounts ?? []).map((bank) => (
                    <tr key={bank.id} className={ROW_CLASSES}>
                      <Td>
                        <div className="font-medium">{bank.bank_name}</div>
                        <div className="text-xs text-muted-foreground">{bank.branch}</div>
                      </Td>
                      <Td className="font-mono text-xs">{bank.account_number}</Td>
                      <Td className="font-mono text-xs">{bank.ifsc}</Td>
                      <Td>{bank.account_type}</Td>
                      <Td className="min-w-56">
                        {actions.can_approve ? (
                          <LookupSelect
                            id={`bank-code-${bank.id}`}
                            value={bankCodes[bank.id] ?? ''}
                            lookup={lookups.banks}
                            placeholder="— Choose the SAP bank —"
                            onChange={(value) =>
                              setBankCodes((current) => ({
                                ...current,
                                [bank.id]: value.toUpperCase(),
                              }))
                            }
                          />
                        ) : (
                          <span className="font-mono text-xs">{bank.sap_bank_code || '—'}</span>
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>
        </PageSection>
      )}

      <PageSection
        title="SAP master data"
        description={`Set by the approver; used when the ${kind} is created in SAP.`}
        actions={
          actions.can_edit && (
            <Button variant="outline" size="sm" onClick={onSaveSapFields} disabled={busy}>
              <Save className="h-4 w-4" /> Save SAP fields
            </Button>
          )
        }
      >
        <Card>
          <CardContent className="p-5">
            <SapFieldsForm
              family={family}
              draft={manager}
              defaultPrefix={registration.default_card_code_prefix}
              lookups={lookups}
              disabled={!canSetSapFields || busy}
              onChange={setManager}
            />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title="Documents"
        description="Opened through a permission check, never a public link."
      >
        <TableCard>
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th>Document</Th>
                <Th>File</Th>
                <Th>Uploaded</Th>
                <Th>In SAP</Th>
                <Th align="right">Open</Th>
              </tr>
            </thead>
            <tbody>
              {registration.attachments.length === 0 ? (
                <TableEmpty colSpan={5} message="No documents" />
              ) : (
                registration.attachments.map((document) => (
                  <tr key={document.id} className={ROW_CLASSES}>
                    <Td>{document.kind_label}</Td>
                    <Td className="max-w-64 truncate">{document.original_name}</Td>
                    <Td>{formatDateTimeShort(document.uploaded_at)}</Td>
                    <Td>
                      {document.sent_to_sap_at ? formatDateTimeShort(document.sent_to_sap_at) : '—'}
                    </Td>
                    <Td align="right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDocument.mutate(document.id)}
                        disabled={openDocument.isPending}
                        aria-label={`Open ${document.kind_label}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>
      </PageSection>

      <PageSection title="History">
        <Card>
          <CardContent className="p-5">
            <ol className="space-y-3">
              {registration.events.map((event) => (
                <li key={event.id} className="border-l-2 pl-3">
                  <div className="text-sm font-medium">
                    {event.kind_label}
                    {event.actor_name && (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        — {event.actor_name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTimeShort(event.at)}
                  </div>
                  {event.note && <p className="mt-1 whitespace-pre-line text-sm">{event.note}</p>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </PageSection>

      {actions.can_edit && (
        <EditRegistrationDialog
          open={editing}
          registration={registration}
          onOpenChange={setEditing}
        />
      )}
    </div>
  );
}
