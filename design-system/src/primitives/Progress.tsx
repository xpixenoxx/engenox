// design-system/src/primitives/Progress.tsx
// Progress — AtlasCycle progress, probe progress, intervention rollout, corpus fill

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { clsx } from 'clsx';

const Root = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { variant?: 'default' | 'indeterminate' | 'segmented' }
>(({ className, variant = 'default', value, max = 100, ...props }, ref) => {
  const percentage = variant === 'indeterminate' ? undefined : Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100));

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={clsx(
        'relative h-2 w-full overflow-hidden rounded-full bg-surface-muted',
        variant === 'indeterminate' && 'bg-surface-muted',
        className
      )}
      value={variant === 'indeterminate' ? undefined : value}
      max={max}
      {...props}
    >
      {variant === 'indeterminate' ? (
        <ProgressPrimitive.Indicator
          className={clsx(
            'h-full w-1/4 flex-none rounded-full bg-brand animate-progress-indeterminate',
            'translate-x-[-100%] animate-[progress-indeterminate_1.5s_ease-in-out_infinite]'
          )}
        />
      ) : (
        <ProgressPrimitive.Indicator
          className={clsx(
            'h-full w-full flex-1 rounded-full bg-brand transition-all duration-normal ease-out',
            'data-[state=indeterminate]:animate-progress-indeterminate'
          )}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      )}
    </ProgressPrimitive.Root>
  );
});
Root.displayName = ProgressPrimitive.Root.displayName;

const Label = React.forwardRef<
  React.ElementRef<'div'>,
  React.HTMLAttributes<HTMLDivElement> & { position?: 'top' | 'inline' }
>(({ className, position = 'top', children, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      'flex items-center gap-2 text-body-sm text-text-muted',
      position === 'top' && 'flex-col items-start gap-1',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
Label.displayName = 'ProgressLabel';

const ValueLabel = React.forwardRef<
  React.ElementRef<'span'>,
  React.HTMLAttributes<HTMLSpanElement> & { value: number; max?: number; showPercent?: boolean }
>(({ className, value, max = 100, showPercent = true, children, ...props }, ref) => (
  <span
    ref={ref}
    className={clsx('font-mono tabular-nums text-brand font-medium', className)}
    {...props}
  >
    {children ?? (showPercent ? `${Math.round((value / max) * 100)}%` : `${value} / ${max}`)}
  </span>
));
ValueLabel.displayName = 'ProgressValueLabel';

export { Root, Label, ValueLabel };