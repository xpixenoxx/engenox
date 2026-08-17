// design-system/src/primitives/Popover.tsx
// Popover — audit hover expanded view, contrarian block detail

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { clsx } from 'clsx';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverPortal = PopoverPrimitive.Portal;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, sideOffset = 8, alignOffset = 0, ...props }, ref) => (
  <PopoverPortal>
    <PopoverPrimitive.Content
      ref={ref}
      className={clsx(
        'z-provenance-hover bg-surface-raised border border-border rounded-lg shadow-lg p-4',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      {...props}
    />
  </PopoverPortal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const PopoverClose = PopoverPrimitive.Close;

export { Popover, PopoverTrigger, PopoverContent, PopoverClose, PopoverPortal };