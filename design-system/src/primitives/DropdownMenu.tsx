// design-system/src/primitives/DropdownMenu.tsx
// DropdownMenu — surface picker (ChatGPT/Perplexity/Gemini/Grok/Claude), entity actions, proposal actions

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';
import { Check, ChevronRight } from 'lucide-react';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Trigger
    ref={ref}
    className={clsx(
      'inline-flex h-10 w-full items-center justify-between rounded-md border border-border bg-surface-raised px-3 py-2 text-body-sm text-text',
      'hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & { align?: 'start' | 'end' }
>(({ className, align = 'start', sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={clsx(
        'z-dropdown min-w-[8rem] overflow-hidden rounded-md border border-border bg-surface-raised p-1.5 shadow-md',
        'data-[side=bottom]:animate-in data-[side=bottom]:fade-in-0 data-[side=bottom]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:animate-in data-[side=left]:fade-in-0 data-[side=left]:zoom-in-95 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:animate-in data-[side=right]:fade-in-0 data-[side=right]:zoom-in-95 data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:animate-in data-[side=top]:fade-in-0 data-[side=top]:zoom-in-95 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuGroup = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Group ref={ref} className={clsx('', className)} {...props} />
));
DropdownMenuGroup.displayName = DropdownMenuPrimitive.Group.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={clsx('px-2 py-1.5 text-body-xs font-medium text-text-muted', inset && 'pl-8', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean; icon?: React.ReactNode; shortcut?: string }
>(({ className, inset, icon, shortcut, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={clsx(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-body-sm outline-none',
      'data-[highlighted]:bg-surface-muted data-[highlighted]:text-text',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {icon && <span className="mr-2 h-4 w-4" aria-hidden="true">{icon}</span>}
    <span className="flex-1">{props.children}</span>
    {shortcut && (
      <span className="ml-auto text-body-xs text-text-muted tracking-widest" aria-hidden="true">
        {shortcut}
      </span>
    )}
    {props.checked && <Check className="ml-auto h-4 w-4 text-brand" aria-hidden="true" />}
  </DropdownMenuPrimitive.Item>
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={clsx('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
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
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={clsx(
      'z-dropdown min-w-[8rem] overflow-hidden rounded-md border border-border bg-surface-raised p-1.5 shadow-md',
      'data-[side=bottom]:animate-in data-[side=bottom]:fade-in-0 data-[side=bottom]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2',
      'data-[side=left]:animate-in data-[side=left]:fade-in-0 data-[side=left]:zoom-in-95 data-[side=left]:slide-in-from-right-2',
      'data-[side=right]:animate-in data-[side=right]:fade-in-0 data-[side=right]:zoom-in-95 data-[side=right]:slide-in-from-left-2',
      'data-[side=top]:animate-in data-[side=top]:fade-in-0 data-[side=top]:zoom-in-95 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) => (
  <span className={clsx('ml-auto text-body-xs text-text-muted tracking-widest', className)} {...props} />
);
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
};