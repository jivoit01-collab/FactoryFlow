/**
 * WMS Settings panel (Step 2).
 *
 * Backed by the `WmsSettings` singleton. Every control persists immediately
 * through the central store, so values save and load with no explicit Save
 * button. The master toggle gates the whole feature across the app (see
 * `WmsEnabledGate` / `useWmsEnabled`); the storage selector swaps the active
 * adapter for real.
 */
import { useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  NativeSelect,
  Separator,
  Switch,
} from '@/shared/components/ui';

import { useWmsRole, useWmsSettings } from '../store';
import { AdminOnlyNotice } from '../components/AdminOnlyNotice';
import type {
  PickStrategy,
  PutawayMode,
  StorageAdapterKind,
  ViolationMode,
  WmsSettings,
} from '../types';

function SettingRow({
  title,
  description,
  htmlFor,
  control,
}: {
  title: string;
  description: string;
  htmlFor?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5 pr-4">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {title}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0 sm:w-56">{control}</div>
    </div>
  );
}

export default function WmsSettingsPage() {
  const { settings, loading, save, switchStorageAdapter } = useWmsSettings();
  const { isAdmin } = useWmsRole();
  const [saving, setSaving] = useState(false);

  async function patch(change: Partial<Omit<WmsSettings, 'id'>>) {
    setSaving(true);
    try {
      await save(change);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save WMS settings.');
    } finally {
      setSaving(false);
    }
  }

  const adapterLabel: Record<StorageAdapterKind, string> = {
    indexeddb: 'IndexedDB',
    localstorage: 'localStorage',
    api: 'the backend API',
  };

  async function changeAdapter(kind: StorageAdapterKind) {
    setSaving(true);
    try {
      await switchStorageAdapter(kind);
      toast.success(`Storage switched to ${adapterLabel[kind]}.`);
    } catch {
      // The backend isn't reachable here — revert so the module stays usable.
      await switchStorageAdapter('indexeddb');
      toast.error('Could not reach that storage backend. Reverted to IndexedDB.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <AdminOnlyNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Warehouse Ops — Settings</h1>
          <p className="text-sm text-muted-foreground">
            Control how the warehouse module behaves. Changes save automatically.
          </p>
        </div>
        {saving ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
          </span>
        ) : null}
      </div>

      {/* Master toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Warehouse Module
                <Badge variant={settings.masterEnabled ? 'default' : 'secondary'}>
                  {settings.masterEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </CardTitle>
              <CardDescription>
                When disabled, the app behaves exactly as it does today — no warehouse
                steps appear anywhere.
              </CardDescription>
            </div>
            <Switch
              id="wms-master"
              checked={settings.masterEnabled}
              disabled={saving}
              onChange={(checked) => void patch({ masterEnabled: checked })}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Workflow behaviour */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
          <CardDescription>How transfers, putaway, picking and audits behave.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            title="Force location selection on transfers"
            description="Require a destination location to be scanned/chosen for every move."
            htmlFor="wms-force-location"
            control={
              <div className="flex sm:justify-end">
                <Switch
                  id="wms-force-location"
                  checked={settings.forceLocationOnTransfer}
                  disabled={saving}
                  onChange={(checked) => void patch({ forceLocationOnTransfer: checked })}
                />
              </div>
            }
          />
          <SettingRow
            title="Putaway mode"
            description="Directed suggests a block, manual lets the operator choose, hybrid does both."
            htmlFor="wms-putaway"
            control={
              <NativeSelect
                id="wms-putaway"
                value={settings.putawayMode}
                disabled={saving}
                onChange={(event) =>
                  void patch({ putawayMode: event.target.value as PutawayMode })
                }
              >
                <option value="DIRECTED">Directed</option>
                <option value="MANUAL">Manual</option>
                <option value="HYBRID">Hybrid</option>
              </NativeSelect>
            }
          />
          <SettingRow
            title="Pick strategy"
            description="Order stock is suggested in: first-in-first-out, last-in, or first-expired."
            htmlFor="wms-pick"
            control={
              <NativeSelect
                id="wms-pick"
                value={settings.pickStrategy}
                disabled={saving}
                onChange={(event) =>
                  void patch({ pickStrategy: event.target.value as PickStrategy })
                }
              >
                <option value="FIFO">FIFO — First in, first out</option>
                <option value="LIFO">LIFO — Last in, first out</option>
                <option value="FEFO">FEFO — First expired, first out</option>
              </NativeSelect>
            }
          />
          <SettingRow
            title="Mandatory outbound pallet audit"
            description="Force the verify-before-remove audit screen when taking a pallet out."
            htmlFor="wms-audit"
            control={
              <div className="flex sm:justify-end">
                <Switch
                  id="wms-audit"
                  checked={settings.mandatoryOutboundAudit}
                  disabled={saving}
                  onChange={(checked) => void patch({ mandatoryOutboundAudit: checked })}
                />
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Validation behaviour */}
      <Card>
        <CardHeader>
          <CardTitle>Validation</CardTitle>
          <CardDescription>Whether rule violations hard-block an action or only warn.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            title="Capacity violations"
            description="When a move would exceed a block's pallet/unit/weight/volume limits."
            htmlFor="wms-capacity"
            control={
              <NativeSelect
                id="wms-capacity"
                value={settings.capacityViolation}
                disabled={saving}
                onChange={(event) =>
                  void patch({ capacityViolation: event.target.value as ViolationMode })
                }
              >
                <option value="BLOCK">Hard block</option>
                <option value="WARN">Warn only</option>
              </NativeSelect>
            }
          />
          <SettingRow
            title="Material-rule violations"
            description="When a block's allowed/restricted material or mixing rules are broken."
            htmlFor="wms-material"
            control={
              <NativeSelect
                id="wms-material"
                value={settings.materialRuleViolation}
                disabled={saving}
                onChange={(event) =>
                  void patch({ materialRuleViolation: event.target.value as ViolationMode })
                }
              >
                <option value="BLOCK">Hard block</option>
                <option value="WARN">Warn only</option>
              </NativeSelect>
            }
          />
          <SettingRow
            title="Allow negative stock"
            description="Permit outbound moves that would drive a location's stock below zero."
            htmlFor="wms-negative"
            control={
              <div className="flex sm:justify-end">
                <Switch
                  id="wms-negative"
                  checked={settings.allowNegativeStock}
                  disabled={saving}
                  onChange={(checked) => void patch({ allowNegativeStock: checked })}
                />
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
          <CardDescription>
            Where warehouse data is saved. The choice is remembered across reloads; each
            backend keeps its own data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingRow
            title="Storage adapter"
            description="IndexedDB (default), localStorage (fallback), or the backend API (Step 10)."
            htmlFor="wms-adapter"
            control={
              <NativeSelect
                id="wms-adapter"
                value={settings.storageAdapter}
                disabled={saving}
                onChange={(event) =>
                  void changeAdapter(event.target.value as StorageAdapterKind)
                }
              >
                <option value="indexeddb">IndexedDB (default)</option>
                <option value="localstorage">localStorage (fallback)</option>
                <option value="api">Backend API</option>
              </NativeSelect>
            }
          />
          <Separator />
          <p className="pt-4 text-xs text-muted-foreground">
            Switching storage reloads data from the selected backend, so existing records
            may not be visible there.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
