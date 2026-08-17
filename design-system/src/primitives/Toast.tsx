// design-system/src/primitives/Toast.tsx
// Toast — demotion-on-alert notification, foreign-change-quarantine

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { clsx } from 'clsx';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={clsx(
      'fixed top-0 z-[500] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const variantStyles = {
  default: 'border-border bg-surface-raised text-text',
  success: 'border-success/30 bg-success-bg text-success',
  warning: 'border-warning/30 bg-warning-bg text-warning',
  critical: 'border-critical/30 bg-critical-bg text-critical',
} as const;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & { variant?: keyof typeof variantStyles }
>(({ className, variant = 'default', ...props }, ref) => {
  const icons = {
    default: <Info className="h-5 w-5" aria-hidden="true" />,
    success: <CheckCircle className="h-5 w-5" aria-hidden="true" />,
    warning: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
    critical: <AlertCircle className="h-5 w-5" aria-hidden="true" />,
  };

  return (
    <ToastPrimitive.Root
      ref={ref}
      className={clsx(
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4',
        'shadow-lg transition-all duration-normal',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
        'data-[swipe=cancel]:translate-x-0',
        'data-[swipe=end]:animate-out data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
        variantStyles[variant],
        className
      )}
      role="status"
      {...props}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="shrink-0 text-current">{icons[variant]}</div>
        <div className="flex-1">
          <ToastPrimitive.Title className="text-body-sm font-medium text-current" />
          <ToastPrimitive.Description className="text-body-xs text-current/80 mt-0.5" />
        </div>
      </div>
      <ToastPrimitive.Close className="flex shrink-0 text-current/50 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border">
        <X className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Dismiss</span>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
});
Toast.displayName = ToastPrimitive.Root.displayName;

export { ToastProvider, ToastViewport, Toast };