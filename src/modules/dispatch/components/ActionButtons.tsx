import {
  Anchor,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Link2,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { Button } from '@/shared/components/ui';

import {
  useConfirmPack,
  useGenerateBOL,
  useGeneratePicks,
  useStageShipment,
  useSupervisorConfirm,
} from '../api';
import type { ShipmentOrder } from '../types/dispatch.types';
import DispatchForm from './DispatchForm';
import DockBayForm from './DockBayForm';
import LinkVehicleForm from './LinkVehicleForm';
import LoadingForm from './LoadingForm';
import TrailerInspectionForm from './TrailerInspectionForm';

interface ActionButtonsProps {
  shipment: ShipmentOrder;
}

export default function ActionButtons({ shipment }: ActionButtonsProps) {
  const { hasPermission } = usePermission();
  const { status, id } = shipment;

  const [showBayForm, setShowBayForm] = useState(false);
  const [showLinkVehicle, setShowLinkVehicle] = useState(false);
  const [showInspection, setShowInspection] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);

  const generatePicks = useGeneratePicks(id);
  const confirmPack = useConfirmPack(id);
  const stageShipment = useStageShipment(id);
  const supervisorConfirm = useSupervisorConfirm(id);
  const generateBOL = useGenerateBOL(id);

  const hasVehicle = !!shipment.vehicle_entry_no;
  const hasBOL = !!shipment.bill_of_lading_no;

  const actions: {
    key: string;
    label: string;
    icon: typeof Truck;
    visible: boolean;
    permission: string;
    onClick: () => void;
    loading?: boolean;
    variant?: 'default' | 'outline' | 'destructive';
  }[] = [
    {
      key: 'assign-bay',
      label: 'Assign Bay',
      icon: Anchor,
      visible: status === 'RELEASED',
      permission: DISPATCH_PERMISSIONS.ASSIGN_BAY,
      onClick: () => setShowBayForm(true),
    },
    {
      key: 'generate-picks',
      label: 'Generate Picks',
      icon: Search,
      visible: status === 'RELEASED' && !!shipment.dock_bay,
      permission: DISPATCH_PERMISSIONS.PICK,
      onClick: () => {
        generatePicks.mutate(undefined, {
          onSuccess: () => toast.success('Pick tasks generated'),
          onError: (err) => toast.error(err.message || 'Failed to generate picks'),
        });
      },
      loading: generatePicks.isPending,
    },
    {
      key: 'confirm-pack',
      label: 'Confirm Pack',
      icon: PackageCheck,
      visible: status === 'PICKING',
      permission: DISPATCH_PERMISSIONS.PICK,
      onClick: () => {
        confirmPack.mutate(undefined, {
          onSuccess: () => toast.success('Packing confirmed'),
          onError: (err) => toast.error(err.message || 'Failed to confirm pack'),
        });
      },
      loading: confirmPack.isPending,
    },
    {
      key: 'stage',
      label: 'Stage at Dock',
      icon: Package,
      visible: status === 'PACKED',
      permission: DISPATCH_PERMISSIONS.LOAD,
      onClick: () => {
        stageShipment.mutate(undefined, {
          onSuccess: () => toast.success('Shipment staged'),
          onError: (err) => toast.error(err.message || 'Failed to stage'),
        });
      },
      loading: stageShipment.isPending,
    },
    {
      key: 'link-vehicle',
      label: 'Link Vehicle',
      icon: Link2,
      visible: (status === 'STAGED' || status === 'LOADING') && !hasVehicle,
      permission: DISPATCH_PERMISSIONS.LOAD,
      onClick: () => setShowLinkVehicle(true),
    },
    {
      key: 'inspect',
      label: 'Inspect Trailer',
      icon: ClipboardCheck,
      visible: (status === 'STAGED' || status === 'LOADING') && hasVehicle,
      permission: DISPATCH_PERMISSIONS.INSPECT,
      onClick: () => setShowInspection(true),
    },
    {
      key: 'load',
      label: 'Load Truck',
      icon: Truck,
      visible: (status === 'STAGED' || status === 'LOADING') && hasVehicle,
      permission: DISPATCH_PERMISSIONS.LOAD,
      onClick: () => setShowLoading(true),
    },
    {
      key: 'supervisor-confirm',
      label: 'Supervisor Confirm',
      icon: CheckCircle2,
      visible: status === 'LOADING',
      permission: DISPATCH_PERMISSIONS.CONFIRM,
      onClick: () => {
        supervisorConfirm.mutate(undefined, {
          onSuccess: () => toast.success('Loading confirmed by supervisor'),
          onError: (err) => toast.error(err.message || 'Failed to confirm'),
        });
      },
      loading: supervisorConfirm.isPending,
    },
    {
      key: 'generate-bol',
      label: 'Generate BOL',
      icon: FileText,
      visible: status === 'LOADING' && !hasBOL,
      permission: DISPATCH_PERMISSIONS.DISPATCH,
      onClick: () => {
        generateBOL.mutate(undefined, {
          onSuccess: () => toast.success('Bill of Lading generated'),
          onError: (err) => toast.error(err.message || 'Failed to generate BOL'),
        });
      },
      loading: generateBOL.isPending,
    },
    {
      key: 'dispatch',
      label: 'Dispatch',
      icon: Truck,
      visible: status === 'LOADING',
      permission: DISPATCH_PERMISSIONS.DISPATCH,
      onClick: () => setShowDispatch(true),
      variant: 'default',
    },
    {
      key: 'retry-gi',
      label: 'Retry GI',
      icon: RefreshCw,
      visible: status === 'LOADING',
      permission: DISPATCH_PERMISSIONS.DISPATCH,
      onClick: () => setShowDispatch(true),
      variant: 'outline',
    },
  ];

  const visibleActions = actions.filter(
    (a) => a.visible && hasPermission(a.permission),
  );

  if (visibleActions.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.key}
              variant={action.variant ?? 'outline'}
              size="sm"
              onClick={action.onClick}
              disabled={action.loading}
            >
              <Icon className={`h-4 w-4 mr-1.5 ${action.loading ? 'animate-spin' : ''}`} />
              {action.label}
            </Button>
          );
        })}
      </div>

      {/* Dialogs */}
      <DockBayForm
        shipmentId={id}
        open={showBayForm}
        onOpenChange={setShowBayForm}
      />
      <LinkVehicleForm
        shipmentId={id}
        open={showLinkVehicle}
        onOpenChange={setShowLinkVehicle}
      />
      <TrailerInspectionForm
        shipmentId={id}
        open={showInspection}
        onOpenChange={setShowInspection}
      />
      <LoadingForm
        shipmentId={id}
        items={shipment.items}
        open={showLoading}
        onOpenChange={setShowLoading}
      />
      <DispatchForm
        shipmentId={id}
        open={showDispatch}
        onOpenChange={setShowDispatch}
      />
    </>
  );
}
