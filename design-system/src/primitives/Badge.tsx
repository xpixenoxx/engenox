// design-system/src/primitives/Badge.tsx
// Badge — status chip, integrity chip, surface tag, evidence tag

import * as React from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'critical' | 'outline' | 'brand' | 'intelligence';
  size?: 'xs' | 'sm' | 'md';
}

const variantStyles = {
  default: 'bg-surface-muted text-text',
  success: 'bg-success/10 text-success border-success/20 border',
  warning: 'bg-warning/10 text-warning border-warning/20 border',
  critical: 'bg-critical/10 text-critical border-critical/20 border',
  outline: 'bg-transparent text-text-muted border border-border',
  brand: 'bg-brand/10 text-brand border-brand/20 border',
  intelligence: 'bg-intelligence-probing/10 text-intelligence-probing border-intelligence-probing/20 border',
};

const sizeStyles = {
  xs: 'px-1.5 py-0.5 text-body-xs',
  sm: 'px-2 py-0.5 text-body-xs',
  md: 'px-2.5 py-1 text-body-sm',
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', children, ...props }, ref) => (
    <span
      ref={ref}
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
);
Badge.displayName = 'Badge';

export { Badge };