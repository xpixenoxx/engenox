// design-system/src/primitives/ScrollArea.tsx
// ScrollArea — custom scrollbar for dense panels (evidence panels, evidence lists)

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { clsx } from 'clsx';

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & { hideScrollbar?: boolean }
>(({ className, hideScrollbar, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={clsx('relative overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {props.children}
    </ScrollAreaPrimitive.Viewport>
    {!hideScrollbar && (
      <ScrollAreaPrimitive.ScrollAreaScrollbar
        orientation="vertical"
        className="flex h-full w-2.5 items-center justify-center px-1"
      >
        <ScrollAreaPrimitive.ScrollAreaThumb
          className="relative flex-1 rounded-full bg-border/60 hover:bg-border transition-colors"
        />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
    )}
    <ScrollAreaPrimitive.Corner className="h-4 w-4" />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

export { ScrollArea };