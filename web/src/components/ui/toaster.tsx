// web/src/components/ui/toaster.tsx
// Toaster using design-system Toast primitive

'use client';

import { Toast, ToastProvider, ToastViewport } from '@engenox/design-system/primitives';
import * as React from 'react';

interface ToastItemProps {
  title: string;
  description?: string | undefined;
  variant?: 'default' | 'success' | 'warning' | 'critical';
  action?: React.ReactNode;
  duration?: number | false;
}

function ToastItem({
  title,
  description,
  variant = 'default',
  action,
  duration = 5000,
}: ToastItemProps) {
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    if (duration !== false) {
      const timer = setTimeout(() => setOpen(false), duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  if (!open) return null;

  return (
    <Toast variant={variant} className="w-full max-w-sm">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-body-sm font-semibold text-text">{title}</div>
          {description && (
            <div className="text-body-xs text-text-muted mt-1">{description}</div>
          )}
          {action && <div className="mt-3">{action}</div>}
        </div>
        <button
          type="button"
          className="flex shrink-0 text-text-muted hover:text-text transition-colors"
          onClick={() => setOpen(false)}
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" role="img" aria-label="Dismiss">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Toast>
  );
}

let toastId = 0;
const toasts = new Map<number, React.ReactElement>();

let forceUpdate = () => {};

function addToast(toast: ToastItemProps) {
  const id = ++toastId;
  const element: React.ReactElement = <ToastItem key={id} {...toast} />;
  toasts.set(id, element);

  if (toast.duration !== false && toast.duration !== 0) {
    setTimeout(() => {
      toasts.delete(id);
      forceUpdate();
    }, toast.duration ?? 5000);
  }
  forceUpdate();
  return id;
}

export function Toaster() {
  const [tick, setTick] = React.useState(0);
  forceUpdate = () => setTick((t) => t + 1);

  return (
    <ToastProvider>
      <ToastViewport className="fixed bottom-4 right-4 z-[500] flex flex-col gap-2 w-full max-w-sm sm:bottom-6 sm:right-6">
        <React.Fragment>{Array.from(toasts.values())}</React.Fragment>
      </ToastViewport>
    </ToastProvider>
  );
}

export const toast = {
  default: (title: string, description?: string, options?: Partial<ToastItemProps>) =>
    addToast({ title, description, variant: 'default', ...options }),
  success: (title: string, description?: string, options?: Partial<ToastItemProps>) =>
    addToast({ title, description, variant: 'success', ...options }),
  warning: (title: string, description?: string, options?: Partial<ToastItemProps>) =>
    addToast({ title, description, variant: 'warning', ...options }),
  critical: (title: string, description?: string, options?: Partial<ToastItemProps>) =>
    addToast({ title, description, variant: 'critical', ...options }),
  dismiss: (id: number) => {
    toasts.delete(id);
    forceUpdate();
  },
};