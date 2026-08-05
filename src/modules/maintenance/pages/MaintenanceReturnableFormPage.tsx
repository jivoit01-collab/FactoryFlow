import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { RETURNABLE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Button } from '@/shared/components/ui';

import { useReturnableGatePass } from '../api/returnableGatePass.queries';
import { ReturnableForm } from '../components/returnable';

/**
 * Create and edit screen for a returnable / non-returnable gate pass.
 *
 * Routed at `/maintenance/returnable/new` and `/maintenance/returnable/:passId/edit`.
 * The form is long — a toggle, two conditional detail blocks, a dynamic item
 * grid and attachments — so it gets a page rather than a dialog.
 *
 * Two different people reach the edit route. The department edits its own draft.
 * The approver edits a pass waiting on their sign-off, and holds a wider licence
 * there: they can also switch the pass type, because they are the authority
 * correcting the request rather than the one making it.
 */
export default function MaintenanceReturnableFormPage() {
  const { passId } = useParams<{ passId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const id = passId ? Number(passId) : null;
  const { data: gatePass, isLoading } = useReturnableGatePass(id);
  const isEdit = id !== null;

  const canManage = hasPermission(RETURNABLE_PERMISSIONS.MANAGE_GATEPASS);
  const canApprove = hasPermission(RETURNABLE_PERMISSIONS.APPROVE_GATEPASS);

  // Set when the approver arrived from the admin queue, so Cancel and Save land
  // them back on it instead of stranding them in the Maintenance register.
  const returnTo = searchParams.get('from') === 'approvals' ? '/admin/returnable-approvals' : null;

  if (isEdit && isLoading) {
    return <div className="p-6 text-muted-foreground">Loading gate pass…</div>;
  }

  const isApproverEdit = Boolean(isEdit && gatePass?.status === 'PENDING_APPROVAL' && canApprove);
  const isDraftEdit = Boolean(isEdit && gatePass?.status === 'DRAFT' && canManage);

  // Don't hand the user a form the backend is guaranteed to refuse on save.
  if (isEdit && gatePass && !isApproverEdit && !isDraftEdit) {
    const isPending = gatePass.status === 'PENDING_APPROVAL';
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/maintenance/returnable/${id}`)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to gate pass
        </Button>
        <p className="text-muted-foreground">
          {isPending ? (
            <>
              {gatePass.pass_no} is with its approver. Only they can change it while it waits for
              sign-off.
            </>
          ) : (
            <>
              {gatePass.pass_no} is <strong>{gatePass.status_display}</strong> and can no longer be
              edited. Cancel it and raise a new one.
            </>
          )}
        </p>
      </div>
    );
  }

  const goBack = () =>
    navigate(returnTo ?? (isEdit ? `/maintenance/returnable/${id}` : '/maintenance/returnable'));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <h1 className="mt-2 text-2xl font-semibold">
          {isEdit && gatePass ? `Edit ${gatePass.pass_no}` : 'New Gate Pass'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Record what is leaving the factory and who it is going to. The gate fills in the vehicle
          details when the material actually leaves.
        </p>
      </div>

      {isApproverEdit ? (
        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            You are editing this pass as its approver. Every field is open, including the pass type.
            The change is recorded on the pass timeline, and the pass stays in your approval queue —
            it is not signed off until you approve it.
          </p>
        </div>
      ) : null}

      <ReturnableForm
        gatePass={gatePass}
        canChangeType={isApproverEdit}
        onCancel={goBack}
        onSaved={(savedId) => navigate(returnTo ?? `/maintenance/returnable/${savedId}`)}
      />
    </div>
  );
}
