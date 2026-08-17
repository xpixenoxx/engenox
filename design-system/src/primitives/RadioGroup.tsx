// design-system/src/primitives/RadioGroup.tsx
// RadioGroup — mutually exclusive selection (dial positions, filter modes, evidence view modes)

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { clsx } from 'clsx';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root className={clsx('grid gap-2', className)} {...props} ref={ref} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { label?: string; description?: string }
>(({ className, label, description, ...props }, ref) => (
  <label className={clsx('flex items-center gap-3 cursor-pointer', className)}>
    <RadioGroupPrimitive.Item
      ref={ref}
      className={clsx(
        'peer h-4 w-4 shrink-0 rounded-full border-2 border-border bg-surface-raised',
        'transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2',
        'data-[state=checked]:bg-brand data-[state=checked]:border-brand',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-brand transition-transform duration-fast scale-0 peer-data-[state=checked]:scale-100" aria-hidden="true" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
    {(label || description) && (
      <div className="text-body-sm">
        {label && <span className="font-medium text-text">{label}</span>}
        {description && <span className="block text-text-muted text-body-xs">{description}</span>}
      </div>
    )}
  </label>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };