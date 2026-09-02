import { type ReactNode, useState, useSyncExternalStore } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';

/**
 * App-wide replacement for `window.confirm` / `window.prompt`.
 *
 * Native popups are unstyled, easy to misfire on factory-floor tablets, and
 * blocked entirely by some kiosk browsers, so every confirmation renders as a
 * proper modal instead. The API stays imperative and promise-based to keep
 * call sites as simple as the natives they replace:
 *
 *   if (!(await confirmDialog({ title: 'Delete entry?', destructive: true }))) return;
 *   const reason = await promptDialog({ title: 'Skip plan', label: 'Reason' });
 *   if (reason === null) return; // cancelled, same contract as window.prompt
 *
 * `ConfirmDialogHost` is mounted once in `AppProviders`; requests queue, so a
 * second dialog opened while one is up simply shows next.
 */

export interface ConfirmDialogOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the destructive (red) style. */
  destructive?: boolean;
}

export interface PromptDialogOptions extends ConfirmDialogOptions {
  label?: string;
  placeholder?: string;
  /** Pre-filled input value, like `window.prompt`'s second argument. */
  defaultValue?: string;
  /** Confirm stays disabled until the field is non-empty (default true). */
  required?: boolean;
}

type DialogRequest = { id: number } & (
  | { kind: 'confirm'; options: ConfirmDialogOptions; resolve: (confirmed: boolean) => void }
  | { kind: 'prompt'; options: PromptDialogOptions; resolve: (value: string | null) => void }
);

let nextRequestId = 1;
let queue: readonly DialogRequest[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DialogRequest | null {
  return queue[0] ?? null;
}

function settle<T>(request: DialogRequest, resolve: () => T) {
  queue = queue.filter((queued) => queued !== request);
  emit();
  return resolve();
}

/** Ask the user to confirm an action. Resolves `true` only on explicit confirm. */
export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    queue = [...queue, { id: nextRequestId++, kind: 'confirm', options, resolve }];
    emit();
  });
}

/**
 * Ask the user for a short text value. Resolves the trimmed input on confirm
 * and `null` on cancel — the same contract as `window.prompt`.
 */
export function promptDialog(options: PromptDialogOptions): Promise<string | null> {
  return new Promise((resolve) => {
    queue = [...queue, { id: nextRequestId++, kind: 'prompt', options, resolve }];
    emit();
  });
}

/** Renders the current request. Mounted once, next to the toaster. */
export function ConfirmDialogHost() {
  const request = useSyncExternalStore(subscribe, getSnapshot);

  if (!request) return null;

  // Keyed by id so the input state resets for every new request.
  return <ConfirmDialogRequest key={request.id} request={request} />;
}

function ConfirmDialogRequest({ request }: { request: DialogRequest }) {
  const [value, setValue] = useState(
    request.kind === 'prompt' ? (request.options.defaultValue ?? '') : '',
  );

  const { title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive } =
    request.options;
  const isPrompt = request.kind === 'prompt';
  const required = isPrompt && (request.options.required ?? true);
  const missing = required && !value.trim();

  function cancel() {
    if (request.kind === 'prompt') settle(request, () => request.resolve(null));
    else settle(request, () => request.resolve(false));
  }

  function confirm() {
    if (missing) return;
    if (request.kind === 'prompt') settle(request, () => request.resolve(value.trim()));
    else settle(request, () => request.resolve(true));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && cancel()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {isPrompt && (
          <div className="space-y-1">
            {request.options.label && (
              <label
                htmlFor="confirm-dialog-input"
                className="text-xs font-medium text-muted-foreground"
              >
                {request.options.label}
                {required && <span className="text-red-500"> *</span>}
              </label>
            )}
            <Input
              id="confirm-dialog-input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={request.options.placeholder}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  confirm();
                }
              }}
            />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={cancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={missing}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
