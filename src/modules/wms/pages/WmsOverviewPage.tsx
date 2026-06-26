/**
 * Warehouse Ops overview (Step 2).
 *
 * A small landing page whose content flips with the master flag, demonstrating
 * that toggling WMS enables/disables the feature across the app. Operational
 * surfaces (designer, map, scan flows) arrive in later steps and will live
 * behind the same `useWmsEnabled` gate shown here.
 */
import { CheckCircle2, PowerOff, Settings2, Warehouse } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import { useWmsEnabled, useWmsRole, useWmsSettings } from '../store';

export default function WmsOverviewPage() {
  const { loading } = useWmsSettings();
  const enabled = useWmsEnabled();
  const { role, setRole } = useWmsRole();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Warehouse className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Warehouse Ops</h1>
            <p className="text-sm text-muted-foreground">
              Dynamic warehouse management — design, track, and scan.
            </p>
          </div>
        </div>
        {!loading ? (
          <Badge variant={enabled ? 'default' : 'secondary'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        ) : null}
      </div>

      {/* Role switcher — gates the designer, settings, and approvals */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Role: {role === 'ADMIN' ? 'Administrator' : 'Operator'}</p>
          <p className="text-xs text-muted-foreground">
            {role === 'ADMIN'
              ? 'Full access — design, settings, and approvals.'
              : 'Scan workflows only — designer and settings are hidden.'}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant={role === 'ADMIN' ? 'default' : 'outline'} onClick={() => void setRole('ADMIN')}>
            Admin
          </Button>
          <Button size="sm" variant={role === 'OPERATOR' ? 'default' : 'outline'} onClick={() => void setRole('OPERATOR')}>
            Operator
          </Button>
        </div>
      </div>

      {enabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Module active
            </CardTitle>
            <CardDescription>
              Warehouse Ops is on. The building blocks below arrive in the next steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/warehouse-ops/designer">Design a warehouse</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/warehouse-ops/warehouses">View warehouses</Link>
              </Button>
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Warehouse designer &amp; layout builder (Step 3) ✓</li>
              <li>Block property editor (Step 4)</li>
              <li>Visual map &amp; occupancy (Step 5)</li>
              <li>Transfer, receiving &amp; pallet scan flows (Steps 6–8)</li>
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PowerOff className="h-5 w-5 text-muted-foreground" />
              Module turned off
            </CardTitle>
            <CardDescription>
              The app behaves exactly as it does today — no warehouse steps appear
              anywhere. Enable the module in settings to start designing your warehouse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/warehouse-ops/settings">
                <Settings2 className="mr-2 h-4 w-4" />
                Open settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <Button asChild variant="outline">
          <Link to="/warehouse-ops/settings">
            <Settings2 className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  );
}
