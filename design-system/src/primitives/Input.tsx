// design-system/src/primitives/Input.tsx
// Radix-free custom Input — label + helper + error triad

import * as React from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, errorText, showCharacterCount, maxLength, id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const inputId = id || React.useId();
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const describedBy = clsx(
      helperText && !errorText ? helperId : undefined,
      errorText ? errorId : undefined,
      ariaDescribedBy
    );

    const length = props.value?.toString().length || 0;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-label-md text-text mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full h-10 px-3 bg-surface-raised border border-border text-text placeholder:text-text-subtle',
            'rounded-md transition-colors duration-fast',
            'focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent',
            'disabled:opacity-50 disabled:pointer-events-none disabled:aria-disabled',
            'invalid:border-critical invalid:focus:ring-critical',
            errorText && 'border-critical focus:ring-critical',
            className
          )}
          aria-invalid={errorText ? 'true' : 'false'}
          aria-describedby={describedBy || undefined}
          {...props}
        />
        {(helperText || errorText || (showCharacterCount && maxLength)) && (
          <div className="mt-1.5 flex items-center justify-between">
            <p
              id={errorText ? errorId : helperId}
              className={clsx(
                'text-body-xs',
                errorText ? 'text-critical' : 'text-text-muted'
              )}
              role={errorText ? 'alert' : undefined}
            >
              {errorText || helperText}
            </p>
            {showCharacterCount && maxLength && (
              <span className="text-body-xs text-text-subtle font-mono">
                {length}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { Input };