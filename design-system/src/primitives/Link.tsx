// design-system/src/primitives/Link.tsx
// Link — every node pointer is a link; audit hover is on it

import * as React from 'react';
import { clsx } from 'clsx';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'default' | 'muted' | 'provenance' | 'danger';
  underline?: 'always' | 'hover' | 'never';
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant = 'default', underline = 'hover', children, ...props }, ref) => {
    const baseStyles = clsx(
      'inline-flex items-center gap-1 transition-colors duration-fast',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2',
      {
        'text-brand hover:text-brand/80': variant === 'default' && underline !== 'never',
        'text-text-muted hover:text-text': variant === 'muted',
        'text-text hover:text-text/80': variant === 'provenance',
        'text-critical hover:text-critical/80': variant === 'danger',
        'underline': underline === 'always',
        'underline-offset-2': underline !== 'never',
        'no-underline hover:underline': underline === 'hover',
      }
    );

    return (
      <a
        ref={ref}
        className={clsx(baseStyles, className)}
        {...props}
      >
        {children}
      </a>
    );
  }
);

Link.displayName = 'Link';
export { Link };