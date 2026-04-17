import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAppSelector } from '@/core/store/hooks';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import type { LabourDetailItem } from '../../api/labourVerification/labourVerification.api';
import {
  useMyDepartmentResponse,
  useSubmitDepartmentResponse,
} from '../../api/labourVerification/labourVerification.queries';

export default function DepartmentResponsePage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const numericRequestId = requestId ? Number(requestId) : null;
  const { data: myResponse, isLoading } = useMyDepartmentResponse(numericRequestId);
  const submitMutation = useSubmitDepartmentResponse();

  const [labourCount, setLabourCount] = useState(0);
  const [labourDetails, setLabourDetails] = useState<LabourDetailItem[]>([]);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill form when response data loads
  useEffect(() => {
    if (myResponse) {
      setLabourCount(myResponse.labour_count);
      setLabourDetails(myResponse.labour_details || []);
      setRemarks(myResponse.remarks || '');
      if (myResponse.status === 'SUBMITTED') {
        setSubmitted(true);
      }
    }
  }, [myResponse]);

  const addLabourDetail = () => {
    setLabourDetails((prev) => [...prev, { name: '', contractor: '', skill_type: '' }]);
  };

  const removeLabourDetail = (index: number) => {
    setLabourDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLabourDetail = (index: number, field: keyof LabourDetailItem, value: string) => {
    setLabourDetails((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmit = async () => {
    if (labourCount < 0) {
      setError('Labour count cannot be negative');
      return;
    }

    if (!numericRequestId) return;
    setError('');

    try {
      await submitMutation.mutateAsync({
        requestId: numericRequestId,
        data: {
          labour_count: labourCount,
          labour_details: labourDetails.filter((d) => d.name.trim()),
          remarks,
        },
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to submit response');
    }
  };

  const departmentName = (user as Record<string, unknown>)?.department_name as string || myResponse?.department_name || 'Your Department';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!myResponse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gate/labour')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Labour Verification</h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-md border">
          <AlertCircle className="h-12 w-12 mb-2" />
          <p className="text-lg">No verification request found for your department</p>
          <p className="text-sm mt-1">You may not be assigned to a department, or no request exists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gate/labour')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Labour Verification</h2>
          <p className="text-muted-foreground">
            Submit labour count for <span className="font-medium">{departmentName}</span>
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {submitted && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-400">
                Response submitted successfully
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                You can update your response until the gate person closes the request.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Labour Count</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Total Labourers in Department *</Label>
            <Input
              type="number"
              min={0}
              value={labourCount}
              onChange={(e) => setLabourCount(Number(e.target.value))}
              className="mt-1 max-w-xs"
              placeholder="0"
            />
          </div>

          <div>
            <Label>Remarks</Label>
            <textarea
              value={remarks}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRemarks(e.target.value)}
              placeholder="Any additional notes..."
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Labour Details (Optional) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Labour Details (Optional)</CardTitle>
            <Button variant="outline" size="sm" onClick={addLabourDetail}>
              <Plus className="h-3 w-3 mr-1" />
              Add Labour
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add individual labourer names for reconciliation
          </p>
        </CardHeader>
        <CardContent>
          {labourDetails.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground border rounded-lg border-dashed">
              No individual details added
            </div>
          ) : (
            <div className="space-y-3">
              {labourDetails.map((detail, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground mt-2 w-5">{index + 1}.</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={detail.name}
                        onChange={(e) => updateLabourDetail(index, 'name', e.target.value)}
                        placeholder="Labour name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Contractor</Label>
                      <Input
                        value={detail.contractor || ''}
                        onChange={(e) => updateLabourDetail(index, 'contractor', e.target.value)}
                        placeholder="Contractor name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Skill Type</Label>
                      <Input
                        value={detail.skill_type || ''}
                        onChange={(e) => updateLabourDetail(index, 'skill_type', e.target.value)}
                        placeholder="e.g., Welder"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive mt-5"
                    onClick={() => removeLabourDetail(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/gate/labour')} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="flex-1"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : submitted ? (
            'Update Response'
          ) : (
            'Submit Response'
          )}
        </Button>
      </div>
    </div>
  );
}
