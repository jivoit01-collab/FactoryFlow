/**
 * Leave settings — the leave types and the holiday calendar.
 *
 * These were the last two things that could only be reached through the Django
 * admin, which meant HR could not add a leave type without a developer. Both
 * masters feed rules the rest of the module enforces, so the page says what
 * each field actually does rather than leaving it to be discovered:
 *
 * - **Quota** is a ceiling on what may be applied for, not a report. 0 means
 *   the type is not tracked at all, which is what unpaid leave wants.
 * - **Needs paperwork** refuses an application that arrives without a file.
 * - **Half day** decides whether the apply form offers the choice.
 * - A holiday inside a leave span is not charged, so the calendar is what
 *   stands between somebody and losing a day of their entitlement to Diwali.
 *
 * Types are retired, never deleted — requests already reference them, and a
 * deleted type would take its history with it. Holidays can be deleted,
 * because a wrongly entered date has no history worth keeping.
 */
import { CalendarPlus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  useCreateHoliday,
  useCreateLeaveType,
  useDeleteHoliday,
  useHolidays,
  useLeaveTypes,
  useUpdateLeaveType,
} from '../api';
import type { LeaveType } from '../api/leave.api';
import { formatDate, todayLocal } from '../components/statusBits';

const BLANK_TYPE: Partial<LeaveType> = {
  code: '',
  name: '',
  description: '',
  is_paid: true,
  allow_half_day: true,
  requires_document: false,
  annual_quota: 0,
  max_consecutive_days: 0,
  status: 'ACTIVE',
};

export default function LeaveSettingsPage() {
  const currentYear = Number(todayLocal().slice(0, 4));

  const { data: types = [], isLoading: typesLoading } = useLeaveTypes(false);
  const [year, setYear] = useState(currentYear);
  const { data: holidays = [], isLoading: holidaysLoading } = useHolidays(year);

  const createType = useCreateLeaveType();
  const updateType = useUpdateLeaveType();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [typeDraft, setTypeDraft] = useState<Partial<LeaveType> | null>(null);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayDraft, setHolidayDraft] = useState({
    date: todayLocal(),
    name: '',
    is_optional: false,
  });

  function saveType() {
    if (!typeDraft) return;
    if (!typeDraft.code?.trim() || !typeDraft.name?.trim()) {
      toast.error('A code and a name are both required.');
      return;
    }

    const payload = { ...typeDraft, code: typeDraft.code.trim(), name: typeDraft.name.trim() };
    const done = {
      onSuccess: () => {
        toast.success(typeDraft.id ? 'Leave type updated.' : 'Leave type added.');
        setTypeDraft(null);
      },
      onError: () => undefined,
    };

    if (typeDraft.id) updateType.mutate({ id: typeDraft.id, payload }, done);
    else createType.mutate(payload, done);
  }

  function saveHoliday() {
    if (!holidayDraft.name.trim()) {
      toast.error('Give the holiday a name.');
      return;
    }
    createHoliday.mutate(
      { ...holidayDraft, name: holidayDraft.name.trim() },
      {
        onSuccess: () => {
          toast.success('Holiday added.');
          setHolidayOpen(false);
          setHolidayDraft({ date: todayLocal(), name: '', is_optional: false });
        },
        onError: () => undefined,
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leave settings</h1>
        <p className="text-sm text-muted-foreground">
          The kinds of leave this plant offers, and the days it is closed.
        </p>
      </div>

      {/* ---- Leave types ---- */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="font-medium">Leave types</h2>
              <p className="text-xs text-muted-foreground">
                Quota is a ceiling on what may be applied for. 0 means untracked.
              </p>
            </div>
            <Button size="sm" onClick={() => setTypeDraft({ ...BLANK_TYPE })}>
              <Plus className="mr-1 h-4 w-4" />
              Add type
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Code</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Paid</th>
                  <th className="px-4 py-2 font-medium">Half day</th>
                  <th className="px-4 py-2 font-medium">Paperwork</th>
                  <th className="px-4 py-2 font-medium">Quota / yr</th>
                  <th className="px-4 py-2 font-medium">Max run</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {typesLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : types.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                      No leave types yet — nobody can apply until there is one.
                    </td>
                  </tr>
                ) : (
                  types.map((type) => (
                    <tr key={type.id} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{type.code}</td>
                      <td className="px-4 py-2">{type.name}</td>
                      <td className="px-4 py-2">{type.is_paid ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-2">{type.allow_half_day ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-2">{type.requires_document ? 'Required' : '—'}</td>
                      <td className="px-4 py-2">
                        {type.annual_quota || (
                          <span className="text-muted-foreground">untracked</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {type.max_consecutive_days || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            type.status === 'ACTIVE' ? 'text-emerald-700' : 'text-muted-foreground'
                          }
                        >
                          {type.status === 'ACTIVE' ? 'Active' : 'Retired'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setTypeDraft(type)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ---- Holidays ---- */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h2 className="font-medium">Holiday calendar</h2>
              <p className="text-xs text-muted-foreground">
                A mandatory holiday inside a leave span is not charged. A restricted one is.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NativeSelect
                value={String(year)}
                onChange={(event) => setYear(Number(event.target.value))}
                className="w-28"
                aria-label="Year"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((value) => (
                  <SelectOption key={value} value={String(value)}>
                    {value}
                  </SelectOption>
                ))}
              </NativeSelect>
              <Button size="sm" onClick={() => setHolidayOpen(true)}>
                <CalendarPlus className="mr-1 h-4 w-4" />
                Add holiday
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Kind</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {holidaysLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : holidays.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      Nothing for {year}. Leave spans will be charged for every working day.
                    </td>
                  </tr>
                ) : (
                  holidays.map((holiday) => (
                    <tr key={holiday.id} className="border-t">
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(holiday.date)}</td>
                      <td className="px-4 py-2">{holiday.name}</td>
                      <td className="px-4 py-2">
                        {holiday.is_optional ? (
                          <span className="text-muted-foreground">Restricted — still charged</span>
                        ) : (
                          'Mandatory'
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            deleteHoliday.mutate(holiday.id, {
                              onSuccess: () => toast.success('Holiday removed.'),
                              onError: () => undefined,
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ---- Type dialog ---- */}
      <Dialog open={Boolean(typeDraft)} onOpenChange={(open) => (open ? null : setTypeDraft(null))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{typeDraft?.id ? 'Edit leave type' : 'Add leave type'}</DialogTitle>
          </DialogHeader>

          {typeDraft ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="type-code">Code</Label>
                  <Input
                    id="type-code"
                    value={typeDraft.code ?? ''}
                    disabled={Boolean(typeDraft.id)}
                    onChange={(event) =>
                      setTypeDraft({ ...typeDraft, code: event.target.value.toUpperCase() })
                    }
                    placeholder="CL"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="type-name">Name</Label>
                  <Input
                    id="type-name"
                    value={typeDraft.name ?? ''}
                    onChange={(event) => setTypeDraft({ ...typeDraft, name: event.target.value })}
                    placeholder="Casual Leave"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type-desc">Description</Label>
                <Textarea
                  id="type-desc"
                  rows={2}
                  value={typeDraft.description ?? ''}
                  onChange={(event) =>
                    setTypeDraft({ ...typeDraft, description: event.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="type-quota">Days per year</Label>
                  <Input
                    id="type-quota"
                    type="number"
                    min={0}
                    value={typeDraft.annual_quota ?? 0}
                    onChange={(event) =>
                      setTypeDraft({ ...typeDraft, annual_quota: Number(event.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = not tracked. Anything higher is enforced when applying.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type-run">Longest single run</Label>
                  <Input
                    id="type-run"
                    type="number"
                    min={0}
                    value={typeDraft.max_consecutive_days ?? 0}
                    onChange={(event) =>
                      setTypeDraft({
                        ...typeDraft,
                        max_consecutive_days: Number(event.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">0 = no limit.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(typeDraft.is_paid)}
                    onCheckedChange={(checked) =>
                      setTypeDraft({ ...typeDraft, is_paid: Boolean(checked) })
                    }
                  />
                  Paid leave
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(typeDraft.allow_half_day)}
                    onCheckedChange={(checked) =>
                      setTypeDraft({ ...typeDraft, allow_half_day: Boolean(checked) })
                    }
                  />
                  Can be taken as a half day
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(typeDraft.requires_document)}
                    onCheckedChange={(checked) =>
                      setTypeDraft({ ...typeDraft, requires_document: Boolean(checked) })
                    }
                  />
                  Needs paperwork attached — an application without a file is refused
                </label>
              </div>

              {typeDraft.id ? (
                <div className="space-y-2">
                  <Label htmlFor="type-status">Status</Label>
                  <NativeSelect
                    id="type-status"
                    value={typeDraft.status ?? 'ACTIVE'}
                    onChange={(event) =>
                      setTypeDraft({
                        ...typeDraft,
                        status: event.target.value as LeaveType['status'],
                      })
                    }
                  >
                    <SelectOption value="ACTIVE">Active</SelectOption>
                    <SelectOption value="INACTIVE">Retired — no longer offered</SelectOption>
                  </NativeSelect>
                  <p className="text-xs text-muted-foreground">
                    Retiring keeps every request that already used it. Types are never deleted.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDraft(null)}>
              Cancel
            </Button>
            <Button onClick={saveType} disabled={createType.isPending || updateType.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Holiday dialog ---- */}
      <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add holiday</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-date">Date</Label>
              <Input
                id="holiday-date"
                type="date"
                value={holidayDraft.date}
                onChange={(event) => setHolidayDraft({ ...holidayDraft, date: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Name</Label>
              <Input
                id="holiday-name"
                value={holidayDraft.name}
                onChange={(event) => setHolidayDraft({ ...holidayDraft, name: event.target.value })}
                placeholder="Diwali"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={holidayDraft.is_optional}
                onCheckedChange={(checked) =>
                  setHolidayDraft({ ...holidayDraft, is_optional: Boolean(checked) })
                }
              />
              Restricted holiday — the plant still runs, so leave is charged
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveHoliday} disabled={createHoliday.isPending}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
