import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Input, Label, Switch } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useExpenseSettings, useSaveSettings } from '../../api';
import { BUCKET_META } from '../../constants';
import type { ExpenseBucketKey } from '../../types';

const PANEL_FIELDS: { bucket: ExpenseBucketKey; field: string }[] = [
  { bucket: 'LABOUR', field: 'show_labour' },
  { bucket: 'SALARY', field: 'show_salary' },
  { bucket: 'ELECTRICITY', field: 'show_electricity' },
  { bucket: 'MAINTENANCE', field: 'show_maintenance' },
];

/**
 * The wall itself — which cost lines appear on it and how often it re-reads.
 *
 * Refresh is a setting rather than a constant because the right answer depends
 * on the screen: a board in the admin's room wants a minute, one being watched
 * during a shift changeover wants less.
 */
export function BoardSettingsTab() {
  const { data: settings, isLoading } = useExpenseSettings();
  const save = useSaveSettings();

  const update = (payload: Record<string, unknown>) => {
    save.mutate(payload, {
      onError: (error) => toast.error(getErrorMessage(error, 'That setting could not be saved.')),
    });
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold">Panels on the wall</h3>
          <p className="text-sm text-muted-foreground">
            Switching a cost line off hides its tile and its panel, and drops it from
            the trend. Nothing is deleted.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PANEL_FIELDS.map(({ bucket, field }) => (
            <label
              key={bucket}
              className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-muted/30"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: BUCKET_META[bucket].hex }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {BUCKET_META[bucket].label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {BUCKET_META[bucket].source}
                  </span>
                </span>
              </span>
              <Switch
                checked={settings[field as keyof typeof settings] as boolean}
                onChange={(value) => update({ [field]: value })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold">Timing</h3>
          <p className="text-sm text-muted-foreground">
            The board polls on its own and never needs a keystroke. Lists longer than
            their panel creep past at the rotate speed.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refresh-seconds">Refresh every (seconds)</Label>
            <Input
              id="refresh-seconds"
              type="number"
              min="15"
              step="5"
              inputMode="numeric"
              defaultValue={settings.refresh_seconds}
              onBlur={(event) => {
                const value = Number(event.target.value);
                if (value >= 15 && value !== settings.refresh_seconds) {
                  update({ refresh_seconds: value });
                }
              }}
            />
            <span className="text-xs text-muted-foreground">Minimum 15 seconds.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rotate-seconds">List scroll pause (seconds)</Label>
            <Input
              id="rotate-seconds"
              type="number"
              min="4"
              step="1"
              inputMode="numeric"
              defaultValue={settings.rotate_seconds}
              onBlur={(event) => {
                const value = Number(event.target.value);
                if (value >= 4 && value !== settings.rotate_seconds) {
                  update({ rotate_seconds: value });
                }
              }}
            />
            <span className="text-xs text-muted-foreground">Minimum 4 seconds.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
