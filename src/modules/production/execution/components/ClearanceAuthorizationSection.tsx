import { CheckCircle2 } from 'lucide-react';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';

interface ClearanceAuthorizationSectionProps {
  supervisorSign: string;
  inchargeSign: string;
  qaApproved: boolean;
  qaApprovedBy: number | null;
  qaApprovedAt: string | null;
  disabled?: boolean;
  onSupervisorChange: (value: string) => void;
  onInchargeChange: (value: string) => void;
}

export function ClearanceAuthorizationSection({
  supervisorSign,
  inchargeSign,
  qaApproved,
  qaApprovedAt,
  disabled = false,
  onSupervisorChange,
  onInchargeChange,
}: ClearanceAuthorizationSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Authorization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Production Supervisor */}
          <div className="space-y-2">
            <Label htmlFor="supervisor_sign">Production Supervisor</Label>
            <Input
              id="supervisor_sign"
              value={supervisorSign}
              onChange={(e) => onSupervisorChange(e.target.value)}
              disabled={disabled}
              placeholder="Enter name to sign"
            />
            {supervisorSign && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Signed
              </p>
            )}
          </div>

          {/* Production Incharge */}
          <div className="space-y-2">
            <Label htmlFor="incharge_sign">Production Incharge</Label>
            <Input
              id="incharge_sign"
              value={inchargeSign}
              onChange={(e) => onInchargeChange(e.target.value)}
              disabled={disabled}
              placeholder="Enter name to sign"
            />
            {inchargeSign && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Signed
              </p>
            )}
          </div>

          {/* QA Officer (read-only, set by approve action) */}
          <div className="space-y-2">
            <Label>QA Officer</Label>
            {qaApproved ? (
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  QA Approved
                  {qaApprovedAt && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({new Date(qaApprovedAt).toLocaleDateString()})
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                <span className="text-sm text-muted-foreground">Pending QA approval</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
