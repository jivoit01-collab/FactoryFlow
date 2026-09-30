/**
 * /partners/approvals — the customer and vendor registration queues.
 *
 * SAP Portal's approvals.html, customer and vendor sections, for the company in
 * the switcher. A tab shows only with a right of its kind; the rows open the
 * detail page, where the buttons follow what the server says this user may do.
 */
import { Copy, Search, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  CUSTOMER_REGISTRATIONS_ACCESS,
  PARTNER_ONBOARDING_PERMISSIONS,
  VENDOR_REGISTRATIONS_ACCESS,
} from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input, Tabs, TabsList, TabsTrigger } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { formatDateTimeShort } from '@/shared/utils';

import { useRegistrations } from '../api';
import {
  type Family,
  FAMILY_PATH,
  type RegistrationStatus,
  STATUS_OPTIONS,
  statusTone,
} from '../constants';

const PUBLIC_LINKS: Record<Family, string> = {
  customer: '/register/customer',
  vendor: '/register/vendor',
};

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const { hasAnyPermission, hasPermission } = usePermission();
  const canCustomers = hasAnyPermission(CUSTOMER_REGISTRATIONS_ACCESS);
  const canVendors = hasAnyPermission(VENDOR_REGISTRATIONS_ACCESS);
  const [params, setParams] = useSearchParams();

  const wanted = params.get('tab') === 'vendors' ? 'vendor' : 'customer';
  const family: Family =
    (wanted === 'vendor' && canVendors) || !canCustomers ? 'vendor' : 'customer';
  const status = (params.get('status') ?? '') as RegistrationStatus | '';
  // "My turn" (SAP Portal's filter): what is waiting on a step this person takes —
  // verifying pending ones, creating verified ones in SAP.
  const P = PARTNER_ONBOARDING_PERMISSIONS;
  const myStatuses = [
    hasPermission(family === 'vendor' ? P.VERIFY_VENDORS : P.VERIFY_CUSTOMERS) && 'PENDING',
    hasPermission(family === 'vendor' ? P.APPROVE_VENDORS : P.APPROVE_CUSTOMERS) && 'VERIFIED',
  ].filter(Boolean) as RegistrationStatus[];
  const mine = params.get('mine') === '1' && myStatuses.length > 0;
  const [search, setSearch] = useState(params.get('search') ?? '');
  const debounced = useDebounce(search.trim());
  const list = useRegistrations(family, {
    status: mine ? myStatuses.join(',') : status,
    search: debounced,
    limit: 200,
  });
  const rows = list.data?.results ?? [];
  const counts = list.data?.counts;
  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : undefined;

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const copyLink = async () => {
    const link = `${window.location.origin}${PUBLIC_LINKS[family]}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Registration link copied');
    } catch {
      toast.info(link);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner Onboarding"
        icon={UserPlus}
      >
        <Button variant="outline" onClick={copyLink}>
          <Copy className="h-4 w-4" />
          Copy {family} registration link
        </Button>
      </PageHeader>

      <Tabs
        value={family}
        onValueChange={(value) => update({ tab: value === 'vendor' ? 'vendors' : '' })}
      >
        <TabsList>
          {canCustomers && <TabsTrigger value="customer">Customers</TabsTrigger>}
          {canVendors && <TabsTrigger value="vendor">Vendors</TabsTrigger>}
        </TabsList>
      </Tabs>

      <FilterBar
        isFetching={list.isFetching}
        onReset={() => {
          setSearch('');
          update({ status: '', search: '', mine: '' });
        }}
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
          {myStatuses.length > 0 && (
            <Button
              size="sm"
              variant={mine ? 'default' : 'outline'}
              onClick={() => update({ mine: '1', status: '' })}
              title={myStatuses.includes('PENDING') ? 'Waiting on your verification or SAP approval' : 'Waiting on your SAP approval'}
            >
              My turn
              {counts && ` (${myStatuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0)})`}
            </Button>
          )}
          <Button
            size="sm"
            variant={!mine && status === '' ? 'default' : 'outline'}
            onClick={() => update({ status: '', mine: '' })}
          >
            All{total !== undefined && ` (${total})`}
          </Button>
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={!mine && status === option.value ? 'default' : 'outline'}
              onClick={() => update({ status: option.value, mine: '' })}
            >
              {option.label}
              {counts && ` (${counts[option.value] ?? 0})`}
            </Button>
          ))}
        </div>
        <FilterField label="Search" htmlFor="registration-search">
          <div className="relative">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="registration-search"
              className="w-72 pl-8"
              value={search}
              placeholder="Name, GSTIN, PAN, mobile, reference…"
              onChange={(e) => {
                setSearch(e.target.value);
                update({ search: e.target.value.trim() });
              }}
            />
          </div>
        </FilterField>
      </FilterBar>

      <TableCard
        summary={`${list.data?.count ?? 0} ${family === 'customer' ? 'customer' : 'vendor'} registrations`}
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Reference</Th>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>GSTIN</Th>
              <Th>City</Th>
              <Th>Submitted</Th>
              <Th>Status</Th>
              <Th>SAP code</Th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <TableLoading colSpan={8} />
            ) : rows.length === 0 ? (
              <TableEmpty
                colSpan={8}
                message={
                  list.isError ? 'The registrations could not be loaded' : 'No registrations here'
                }
              />
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`${ROW_CLASSES} cursor-pointer`}
                  onClick={() => navigate(`/partners/approvals/${FAMILY_PATH[family]}/${row.id}`)}
                >
                  <Td className="font-mono text-xs">
                    {row.reference}
                    {row.legacy_portal_id && (
                      <div className="text-muted-foreground">portal #{row.legacy_portal_id}</div>
                    )}
                  </Td>
                  <Td>
                    <div className="font-medium">{row.card_name}</div>
                    <div className="text-xs text-muted-foreground">{row.contact_name}</div>
                  </Td>
                  <Td>{row.partner_type_label}</Td>
                  <Td className="font-mono text-xs">{row.gstin || '—'}</Td>
                  <Td>{[row.city, row.state].filter(Boolean).join(', ') || '—'}</Td>
                  <Td>{formatDateTimeShort(row.submitted_at)}</Td>
                  <Td>
                    <StatusPill tone={row.sap_posting ? 'progress' : statusTone(row.status)} dot>
                      {row.sap_posting ? 'Creating in SAP…' : row.status_label}
                    </StatusPill>
                    {row.sap_error && row.status === 'VERIFIED' && (
                      <div className="mt-1 text-xs text-destructive">
                        SAP refused the last attempt
                      </div>
                    )}
                  </Td>
                  <Td className="font-mono text-xs">{row.sap_card_code || row.card_code || '—'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
