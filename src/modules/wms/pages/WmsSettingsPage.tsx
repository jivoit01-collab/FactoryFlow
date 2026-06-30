/**
 * WMS Settings panel (Step 2).
 *
 * Backed by the `WmsSettings` singleton. Every control persists immediately
 * through the central store, so values save and load with no explicit Save
 * button. The master toggle gates the whole feature across the app (see
 * `WmsEnabledGate` / `useWmsEnabled`); the storage selector swaps the active
 * adapter for real.
 */
import { Loader2, Trash2, Wrench } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  Switch,
} from '@/shared/components/ui';

import { AdminOnlyNotice } from '../components/AdminOnlyNotice';
import { useWmsRole, useWmsSettings, wmsStore } from '../store';
import type {
  PickStrategy,
  PutawayMode,
  ViolationMode,
  WmsSettings,
} from '../types';
import { notifyOk } from '../utils';

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
  const { settings, loading, save } = useWmsSettings();
  const { isAdmin } = useWmsRole();
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState('');
  const [clearing, setClearing] = useState(false);

  async function clearStock() {
    setClearing(true);
    try {
      const { pallets, inventory, movements } = await wmsStore.clearStockData();
      notifyOk(`Cleared stock: ${pallets} pallet(s), ${inventory} inventory line(s), ${movements} movement(s).`);
      setClearOpen(false);
      setClearConfirm('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Clear failed.');
    } finally {
      setClearing(false);
    }
  }

  async function repairLinks() {
    setRepairing(true);
    try {
      const { relocated, relinked } = await wmsStore.reconcilePalletLinks();
      if (relocated === 0 && relinked === 0) {
        notifyOk('All pallets are already consistent — nothing to repair.');
      } else {
        notifyOk(`Repaired pallet links: ${relocated} relocated, ${relinked} re-linked.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Repair failed.');
    } finally {
      setRepairing(false);
    }
  }

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

      {/* Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance</CardTitle>
          <CardDescription>
            Repair tools for warehouse data consistency.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            title="Reconcile pallet & stock links"
            description="Fixes pallets that show stock at a location but appear as 'no pallet' — moves each pallet to where its stock is, and re-links stranded pallets to matching loose stock."
            control={
              <div className="flex sm:justify-end">
                <Button variant="outline" disabled={repairing} onClick={() => void repairLinks()}>
                  {repairing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wrench className="mr-2 h-4 w-4" />
                  )}
                  Reconcile now
                </Button>
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
            Warehouse data is saved to the backend server, so it is shared across devices
            and users and persists safely.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Irreversible actions. Proceed with care.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            title="Clear all stock data"
            description="Permanently deletes every pallet, inventory line, and movement-log entry. Your warehouse layout, locations, material profiles, templates, and these settings are kept."
            control={
              <div className="flex sm:justify-end">
                <Button variant="destructive" onClick={() => setClearOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Clear stock data
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Clear-stock confirmation */}
      <Dialog
        open={clearOpen}
        onOpenChange={(open) => {
          if (!clearing) {
            setClearOpen(open);
            if (!open) setClearConfirm('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Clear all stock data?</DialogTitle>
            <DialogDescription>
              This permanently deletes every <strong>pallet</strong>, <strong>inventory line</strong>, and{' '}
              <strong>movement</strong> on the backend. It cannot be undone. The warehouse layout,
              materials, templates, and settings are kept.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="clear-confirm">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </Label>
            <Input
              id="clear-confirm"
              value={clearConfirm}
              autoComplete="off"
              placeholder="DELETE"
              onChange={(event) => setClearConfirm(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={clearing} onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={clearing || clearConfirm.trim().toUpperCase() !== 'DELETE'}
              onClick={() => void clearStock()}
            >
              {clearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete stock data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
