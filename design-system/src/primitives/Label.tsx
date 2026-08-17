// design-system/src/primitives/Label.tsx
// Label — form label, helper text, error text triad

import * as React from 'react';
import { clsx } from 'clsx';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  helperText?: React.ReactNode;
  errorText?: React.ReactNode;
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, helperText, errorText, required, children, htmlFor, ...props }, ref) => (
    <div className={clsx('w-full', className)}>
      <label
        ref={ref}
        htmlFor={htmlFor}
        className={clsx(
          'block text-body-sm font-medium text-text mb-1.5 flex items-center gap-1.5',
          errorText && 'text-critical'
        )}
        {...props}
      >
        {children}
        {required && <span className="text-critical" aria-hidden="true">*</span>}
      </label>
      {errorText ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-body-xs text-critical" role="alert">
          {errorText}
        </p>
      ) : helperText ? (
        <p id={`${htmlFor}-helper`} className="mt-1.5 text-body-xs text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  )
);
Label.displayName = 'Label';

export { Label };