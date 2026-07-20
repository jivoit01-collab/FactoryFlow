import { AlertCircle, ArrowLeft, Calendar, Camera, Clock, LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

import type {
  AttendanceDirection,
  AttendanceEmployee,
} from '../../api/attendance/attendance.api';
import { useCreateAttendanceRecord } from '../../api/attendance/attendance.queries';
import { EmployeeSelect } from '../../components/attendance';

function getCurrentLocalDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function getCurrentLocalTime(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(11, 16);
}

export default function NewAttendancePage() {
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<AttendanceEmployee | null>(null);
  const [direction, setDirection] = useState<AttendanceDirection>('IN');
  const [date, setDate] = useState<string>(getCurrentLocalDate());
  const [time, setTime] = useState<string>(getCurrentLocalTime());
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  useScrollToError(apiErrors);

  const createMutation = useCreateAttendanceRecord();

  const clearError = (field: string) => {
    if (apiErrors[field]) {
      setApiErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    clearError('photo');
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!employee) errors.employee = 'Please select an employee';
    if (!date) errors.date = 'Date is required';
    if (!time) errors.time = 'Time is required';
    if (!photo) errors.photo = 'A photo is required as proof of presence';

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    try {
      await createMutation.mutateAsync({
        employee: employee!.id,
        direction,
        date,
        time,
        photo: photo!,
      });
      toast.success(
        `${direction === 'IN' ? 'In' : 'Out'} marked for ${employee!.name}`,
      );
      navigate('/gate/attendance');
    } catch (error: unknown) {
      const err = error as { errors?: Record<string, string[]>; message?: string };
      const fieldErrors: Record<string, string> = {};
      if (err.errors) {
        Object.entries(err.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            // Map the model-level unique constraint error onto a visible field.
            const key = field === 'non_field_errors' ? 'general' : field;
            fieldErrors[key] = messages[0];
          }
        });
      }
      if (err.message && !fieldErrors.general) fieldErrors.general = err.message;
      setApiErrors(fieldErrors);
      toast.error(
        fieldErrors.general || `${employee!.name} may already be marked for this date`,
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gate/attendance')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mark Attendance</h2>
          <p className="text-muted-foreground">
            Manual attendance entry (fallback when the punching machine is unavailable)
          </p>
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

      <div className="max-w-xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attendance Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Direction toggle */}
            <div>
              <Label>Type</Label>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  variant={direction === 'IN' ? 'default' : 'outline'}
                  onClick={() => setDirection('IN')}
                  className="flex-1"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Coming In
                </Button>
                <Button
                  type="button"
                  variant={direction === 'OUT' ? 'default' : 'outline'}
                  onClick={() => setDirection('OUT')}
                  className="flex-1"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Going Out
                </Button>
              </div>
            </div>

            {/* Employee */}
            <EmployeeSelect
              value={employee?.id ?? null}
              onChange={(emp) => {
                setEmployee(emp);
                clearError('employee');
              }}
              label="Employee"
              placeholder="Search and select employee..."
              error={apiErrors.employee}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <Label>
                  <Calendar className="h-3.5 w-3.5 inline mr-1" />
                  Date *
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    clearError('date');
                  }}
                  className={cn('mt-1', apiErrors.date && 'border-destructive')}
                />
                {apiErrors.date && (
                  <p className="text-xs text-destructive mt-1">{apiErrors.date}</p>
                )}
              </div>

              {/* Time */}
              <div>
                <Label>
                  <Clock className="h-3.5 w-3.5 inline mr-1" />
                  Time *
                </Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    clearError('time');
                  }}
                  className={cn('mt-1', apiErrors.time && 'border-destructive')}
                />
                {apiErrors.time && (
                  <p className="text-xs text-destructive mt-1">{apiErrors.time}</p>
                )}
              </div>
            </div>

            {/* Photo */}
            <div>
              <Label>
                <Camera className="h-3.5 w-3.5 inline mr-1" />
                Photo (proof of presence) *
              </Label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className={cn('mt-1', apiErrors.photo && 'border-destructive')}
              />
              {apiErrors.photo && (
                <p className="text-xs text-destructive mt-1">{apiErrors.photo}</p>
              )}
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Attendance proof preview"
                  className="mt-3 max-h-48 rounded-md border object-contain"
                />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate('/gate/attendance')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending
                  ? 'Saving...'
                  : direction === 'IN'
                    ? 'Mark In'
                    : 'Mark Out'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
