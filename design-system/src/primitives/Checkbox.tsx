// design-system/src/primitives/Checkbox.tsx
// Checkbox — evidence selection, consent checkboxes, bulk actions

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={clsx(
      'peer h-4 w-4 shrink-0 rounded-sm border-2 border-border bg-surface-raised',
      'transition-colors duration-fast',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2',
      'data-[state=checked]:bg-brand data-[state=checked]:border-brand',
      'data-[state=indeterminate]:bg-brand data-[state=indeterminate]:border-brand',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={clsx('flex items-center justify-center text-brand', 'peer-focus-visible:ring-2 peer-focus-visible:ring-brand')}>
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };