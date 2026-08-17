// design-system/src/primitives/ContextMenu.tsx
// ContextMenu — evidence row actions, entity row actions, corpus row right-click menu

import * as React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { clsx } from 'clsx';
import { Check, ChevronRight } from 'lucide-react';

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Trigger ref={ref} className={clsx('', className)} {...props} />
));
ContextMenuTrigger.displayName = ContextMenuPrimitive.Trigger.displayName;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={clsx(
        'z-dropdown min-w-[180px] max-w-[240px] rounded-md border border-border bg-surface-raised p-1.5 shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuGroup = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Group>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Group ref={ref} className={clsx('', className)} {...props} />
));
ContextMenuGroup.displayName = ContextMenuPrimitive.Group.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={clsx('px-2 py-1.5 text-body-xs font-medium text-text-muted', inset && 'pl-8', className)}
    {...props}
  />
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & { inset?: boolean; icon?: React.ReactNode; shortcut?: string; variant?: 'default' | 'destructive' }
>(({ className, inset, icon, shortcut, variant = 'default', ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={clsx(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-body-sm outline-none transition-colors',
      'data-[highlighted]:bg-surface-muted data-[highlighted]:text-text',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      variant === 'destructive' && 'text-critical data-[highlighted]:text-critical data-[highlighted]:bg-critical/10',
      className
    )}
    {...props}
  >
    {icon && <span className="mr-2 h-4 w-4" aria-hidden="true">{icon}</span>}
    <span className="flex-1">{props.children}</span>
    {shortcut && <span className="ml-auto text-body-xs text-text-muted tracking-widest" aria-hidden="true">{shortcut}</span>}
    {props.checked && <Check className="ml-auto h-4 w-4 text-brand" aria-hidden="true" />}
  </ContextMenuPrimitive.Item>
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={clsx(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body-sm outline-none',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      'data-[highlighted]:bg-surface-muted data-[highlighted]:text-text',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {props.children}
  </ContextMenuPrimitive.CheckboxItem>
));
ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={clsx(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body-sm outline-none',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      'data-[highlighted]:bg-surface-muted data-[highlighted]:text-text',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {props.children}
  </ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator ref={ref} className={clsx('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={clsx(
      'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-body-sm outline-none',
      'data-[highlighted]:bg-surface-muted data-[highlighted]:text-text',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {props.children}
    <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
  </ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={clsx(
      'z-dropdown min-w-[180px] max-w-[240px] rounded-md border border-border bg-surface-raised p-1.5 shadow-md',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuShortcut = ({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) => (
  <span className={clsx('ml-auto text-body-xs text-text-muted tracking-widest', className)} {...props} />
);
ContextMenuShortcut.displayName = 'ContextMenuShortcut';

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
};