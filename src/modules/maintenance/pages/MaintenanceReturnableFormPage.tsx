import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/shared/components/ui';

import { useReturnableGatePass } from '../api/returnableGatePass.queries';
import { ReturnableForm } from '../components/returnable';

/**
 * Create and edit screen for a returnable / non-returnable gate pass.
 *
 * Routed at `/maintenance/returnable/new` and `/maintenance/returnable/:passId/edit`.
 * The form is long — a toggle, two conditional detail blocks, a dynamic item
 * grid and attachments — so it gets a page rather than a dialog.
 */
export default function MaintenanceReturnableFormPage() {
  const { passId } = useParams<{ passId: string }>();
  const navigate = useNavigate();

  const id = passId ? Number(passId) : null;
  const { data: gatePass, isLoading } = useReturnableGatePass(id);
  const isEdit = id !== null;

  if (isEdit && isLoading) {
    return <div className="p-6 text-muted-foreground">Loading gate pass…</div>;
  }

  // Only a draft can be edited — the backend refuses anything else, so don't
  // hand the user a form that is guaranteed to fail on save.
  if (isEdit && gatePass && gatePass.status !== 'DRAFT') {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/maintenance/returnable/${id}`)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to gate pass
        </Button>
        <p className="text-muted-foreground">
          {gatePass.pass_no} is <strong>{gatePass.status_display}</strong> and can no longer be
          edited. Cancel it and raise a new one.
        </p>
      </div>
    );
  }

  const goBack = () =>
    navigate(isEdit ? `/maintenance/returnable/${id}` : '/maintenance/returnable');

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

      <ReturnableForm
        gatePass={gatePass}
        onCancel={goBack}
        onSaved={(savedId) => navigate(`/maintenance/returnable/${savedId}`)}
      />
    </div>
  );
}
