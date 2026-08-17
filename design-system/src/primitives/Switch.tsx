// design-system/src/primitives/Switch.tsx
// Switch — dry-run / commit toggle; consent toggles

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { clsx } from 'clsx';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={clsx(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
      'border-2 border-border bg-surface-raised transition-colors duration-fast',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-brand data-[state=checked]:border-brand',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={clsx(
        'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0',
        'transition-transform duration-fast',
        'translate-x-0 peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus',
        'data-[state=checked]:translate-x-5'
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };