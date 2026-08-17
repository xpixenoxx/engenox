// design-system/src/primitives/Collapsible.tsx
// Collapsible — progressive disclosure (provenance, evidence, contrarian block)

import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { clsx } from 'clsx';

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.Trigger
    ref={ref}
    className={clsx(
      'flex items-center justify-between w-full text-left font-medium transition-colors',
      'hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 rounded-sm',
      className
    )}
    {...props}
  >
    {children}
  </CollapsiblePrimitive.Trigger>
));
CollapsibleTrigger.displayName = CollapsiblePrimitive.Trigger.displayName;

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.Content
    ref={ref}
    className={clsx('overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down', className)}
    {...props}
  />
));
CollapsibleContent.displayName = CollapsiblePrimitive.Content.displayName;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };