// design-system/src/primitives/Separator.tsx
// Separator — visual & semantic section divider

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { clsx } from 'clsx';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & { orientation?: 'horizontal' | 'vertical'; decorative?: boolean }
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={clsx(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };