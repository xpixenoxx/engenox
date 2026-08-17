// design-system/src/primitives/Tabs.tsx
// Tabs — Brand Card per-entity editor, report section nav

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { clsx } from 'clsx';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={clsx(
      'inline-flex h-10 items-center justify-center gap-1 bg-surface-muted rounded-md p-1',
      'data-[orientation=vertical]:flex-col data-[orientation=vertical]:w-10',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={clsx(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5',
      'text-body-sm font-medium text-text-muted transition-colors duration-fast',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
      'data-[state=active]:bg-surface-raised data-[state=active]:text-text data-[state=active]:shadow-sm',
      'data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start',
      'disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={clsx(
      'mt-4 ring-offset-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
      'data-[orientation=vertical]:mt-0 data-[orientation=vertical]:ml-4',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };