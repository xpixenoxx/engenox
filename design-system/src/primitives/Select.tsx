// design-system/src/primitives/Select.tsx
// Radix Select wrapper — surface picker, comparator filters

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface SelectProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> {
  label?: string;
  helperText?: string;
  errorText?: string;
  placeholder?: string;
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, children, label, helperText, errorText, placeholder, ...props }, ref) => {
    const selectId = React.useId();
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    return (
      <div className="w-full" ref={ref}>
        {label && (
          <label htmlFor={selectId} className="block text-label-md text-text mb-1.5">
            {label}
          </label>
        )}
        <SelectPrimitive.Root {...props}>
          <SelectPrimitive.Trigger
            id={selectId}
            className={clsx(
              'w-full h-10 px-3 bg-surface-raised border border-border text-text',
              'rounded-md transition-colors duration-fast',
              'focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent',
              'disabled:opacity-50 disabled:pointer-events-none',
              'hover:border-border-strong',
              'data-[placeholder]:text-text-muted',
              'invalid:border-critical invalid:focus:ring-critical',
              errorText && 'border-critical focus:ring-critical',
              className
            )}
            aria-invalid={errorText ? 'true' : 'false'}
            aria-describedby={(helperText && !errorText ? helperId : undefined) || errorText ? errorId : undefined}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon>
              <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className={clsx(
                'bg-surface-raised border border-border rounded-md shadow-md',
                'overflow-hidden z-dropdown',
                'animate-in fade-in-0 zoom-in-95 duration-fast ease-out'
              )}
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.Viewport className="p-1">
                {children}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        {(helperText || errorText) && (
          <p
            id={errorText ? errorId : helperId}
            className={clsx('mt-1.5 text-body-xs', errorText ? 'text-critical' : 'text-text-muted')}
            role={errorText ? 'alert' : undefined}
          >
            {errorText || helperText}
          </p>
        )}
      </div>
    );
  }
);

const Trigger = SelectPrimitive.Trigger;
const Content = SelectPrimitive.Content;
const Viewport = SelectPrimitive.Viewport;
const Item = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={clsx(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-3 pr-8 text-sm outline-none',
      'data-[highlighted]:bg-surface-muted data-[highlighted]:text-text',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator>
      <Check className="h-4 w-4 text-brand" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));

export { Select, Trigger, Content, Viewport, Item };