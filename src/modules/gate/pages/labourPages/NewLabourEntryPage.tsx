import { AlertCircle, ArrowLeft, Clock } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { VALIDATION_PATTERNS } from '@/config/constants';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import {
  type CreateEntryRequest,
  type Gate,
  type Labour,
  PERSON_TYPE_IDS,
} from '../../api/personGateIn/personGateIn.api';
import { useCreatePersonEntry } from '../../api/personGateIn/personGateIn.queries';
import { GateSelect, LabourSelect } from '../../components/personGateIn';

function getCurrentLocalDateTime(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

interface FormData {
  labour: number | null;
  gate_in: number | null;
  purpose: string;
  vehicle_no: string;
  remarks: string;
  actual_entry_time: string;
}

export default function NewLabourEntryPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    labour: null,
    gate_in: null,
    purpose: '',
    vehicle_no: '',
    remarks: '',
    actual_entry_time: getCurrentLocalDateTime(),
  });
  const [selectedLabour, setSelectedLabour] = useState<Labour | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  useScrollToError(apiErrors);
  const createEntryMutation = useCreatePersonEntry();

  const handleLabourChange = (labour: Labour | null) => {
    setSelectedLabour(labour);
    setFormData((prev) => ({ ...prev, labour: labour?.id || null }));
    if (apiErrors.labour) {
      setApiErrors((prev) => { const n = { ...prev }; delete n.labour; return n; });
    }
  };

  const handleGateChange = (gate: Gate | null) => {
    setFormData((prev) => ({ ...prev, gate_in: gate?.id || null }));
    if (apiErrors.gate_in) {
      setApiErrors((prev) => { const n = { ...prev }; delete n.gate_in; return n; });
    }
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!formData.gate_in) errors.gate_in = 'Gate is required';
    if (!formData.labour) errors.labour = 'Please select a labour';
    if (formData.vehicle_no.trim() && !VALIDATION_PATTERNS.vehicleNumber.test(formData.vehicle_no.trim().toUpperCase())) {
      errors.vehicle_no = 'Please enter a valid vehicle number (e.g., MH12AB1234)';
    }

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    try {
      const requestData: CreateEntryRequest = {
        person_type: PERSON_TYPE_IDS.LABOUR,
        labour: formData.labour!,
        gate_in: formData.gate_in!,
        purpose: formData.purpose || undefined,
        vehicle_no: formData.vehicle_no || undefined,
        remarks: formData.remarks || undefined,
        actual_entry_time: formData.actual_entry_time
          ? new Date(formData.actual_entry_time).toISOString()
          : undefined,
      };

      const entry = await createEntryMutation.mutateAsync(requestData);
      navigate(`/gate/labour/entry/${entry.id}`);
    } catch (error: unknown) {
      const err = error as { errors?: Record<string, string[]>; message?: string };
      const fieldErrors: Record<string, string> = {};
      if (err.errors) {
        Object.entries(err.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) fieldErrors[field] = messages[0];
        });
      }
      if (err.message) fieldErrors.general = err.message;
      setApiErrors(fieldErrors);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gate/labour')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Labour Entry</h2>
          <p className="text-muted-foreground">Create a new gate entry for a labour</p>
        </div>
      </div>

      {apiErrors.general && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm font-medium text-destructive">{apiErrors.general}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Labour</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <LabourSelect
                value={formData.labour}
                onChange={handleLabourChange}
                label="Labour"
                placeholder="Search and select labour..."
                error={apiErrors.labour}
                required
              />
              {selectedLabour && (
                <div className="p-3 rounded-lg border-2 border-primary bg-primary/5">
                  <p className="font-medium">{selectedLabour.name}</p>
                  {selectedLabour.skill_type && (
                    <p className="text-sm text-muted-foreground">{selectedLabour.skill_type}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Entry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GateSelect value={formData.gate_in} onChange={handleGateChange} label="Entry Gate" placeholder="Select gate..." error={apiErrors.gate_in} required />
              <div>
                <Label><Clock className="h-3.5 w-3.5 inline mr-1" />Entry Time</Label>
                <Input type="datetime-local" value={formData.actual_entry_time} onChange={(e) => setFormData((prev) => ({ ...prev, actual_entry_time: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Purpose</Label>
                <Input value={formData.purpose} onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))} placeholder="e.g., Daily work" className="mt-1" />
              </div>
              <div>
                <Label>Vehicle Number</Label>
                <Input
                  value={formData.vehicle_no}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/\s/g, '');
                    setFormData((prev) => ({ ...prev, vehicle_no: value }));
                    if (apiErrors.vehicle_no) {
                      setApiErrors((prev) => { const n = { ...prev }; delete n.vehicle_no; return n; });
                    }
                  }}
                  placeholder="MH12AB1234"
                  className={cn('mt-1', apiErrors.vehicle_no && 'border-destructive')}
                />
                {apiErrors.vehicle_no && <p className="text-xs text-destructive mt-1">{apiErrors.vehicle_no}</p>}
              </div>
              <div>
                <Label>Remarks</Label>
                <textarea
                  value={formData.remarks}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Any additional notes..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/gate/labour')} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={createEntryMutation.isPending} className="flex-1">
              {createEntryMutation.isPending ? 'Creating...' : 'Create Entry'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
