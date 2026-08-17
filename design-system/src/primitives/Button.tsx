// design-system/src/primitives/Button.tsx
// Button primitive — variants: primary, secondary, ghost, danger; sizes: sm, md, lg

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-fast',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50 disabled:aria-disabled',
  'active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-text-inverse hover:bg-brand/90 border border-transparent',
        secondary: 'bg-surface-raised text-text hover:bg-surface-muted border border-border',
        ghost: 'bg-transparent text-text hover:bg-surface-muted border border-transparent',
        danger: 'bg-critical text-text-inverse hover:bg-critical/90 border border-transparent',
      },
      size: {
        sm: 'h-8 px-3 text-body-sm rounded-sm',
        md: 'h-10 px-4 text-body-md rounded-md',
        lg: 'h-12 px-6 text-body-lg rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonVariants = VariantProps<typeof buttonVariants>['variant'];
type ButtonSizes = VariantProps<typeof buttonVariants>['size'];

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Pick<VariantProps<typeof buttonVariants>, 'variant' | 'size'> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    if (asChild) {
      let validElement: React.ReactElement | null = null;
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          validElement = child as React.ReactElement;
        }
      });

      if (validElement) {
        return React.cloneElement(validElement, {
          className: clsx(buttonVariants({ variant, size, className }), validElement.props.className),
          ref,
          disabled: disabled || loading,
          'aria-busy': loading,
          'aria-disabled': disabled || loading,
          ...props
        } as any);
      }
      return <>{children}</>;
    }

    return (
      <button
        className={clsx(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonVariants, ButtonSizes };