/** Step 4 — list of warehouse issue requests raised from imported sheets. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import { useIssueRequests, useWarehouseInsights } from '../api/marketplace.queries';
import { useMpChannel } from '../hooks/useMpChannel';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { MpFlowSteps } from '../components/MpFlowSteps';
import { WarehouseInsightsPanel } from '../components/WarehouseInsightsPanel';
import type { MarketplaceChannel, MpIssueStatus } from '../types/marketplace.types';

const STATUS_TONE: Record<MpIssueStatus, string> = {
  DRAFT: 'outline',
  SENT: 'default',
  APPROVED: 'default',
  PARTIALLY_APPROVED: 'secondary',
  REJECTED: 'destructive',
  ISSUED: 'default',
  RECEIVED: 'default',
};

export default function MpIssueRequestsPage() {
  const navigate = useNavigate();
  const [channel, setChannel] = useMpChannel();
  const { data: requests = [], isLoading } = useIssueRequests(channel);
  const { data: insights } = useWarehouseInsights(channel);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Warehouse Issue Requests</h1>
          <MpChannelSelect value={channel} onChange={setChannel} />
        </div>
        <p className="text-sm text-muted-foreground">
          Approve, issue and receive the material the warehouse hands to packing.
        </p>
        <MpFlowSteps current={4} />
      </header>

      {insights && <WarehouseInsightsPanel insights={insights} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="-mx-2 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[660px] text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Request</th>
                  <th className="p-3">Sheet</th>
                  <th className="p-3">Warehouse</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No requests yet — send one from a batch.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3 font-medium">MPIR-{r.id}</td>
                      <td className="p-3">{r.batch_filename || `batch #${r.batch}`}</td>
                      <td className="p-3">{r.sap_warehouse_code || '—'}</td>
                      <td className="p-3">
                        <Badge variant={STATUS_TONE[r.status] as 'default'}>{r.status}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/marketplace/issues/${r.id}`)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
