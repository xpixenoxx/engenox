// design-system/src/patterns/IntegrityChip.tsx
// Integrity Chip — cryptographic integrity status (intact/tampered/unknown)

import * as React from 'react';
import { clsx } from 'clsx';
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

export type IntegrityStatus = 'intact' | 'tampered' | 'unknown';

const statusConfig: Record<IntegrityStatus, { label: string; icon: React.ReactNode; className: string }> = {
  intact: {
    label: 'Intact',
    icon: <ShieldCheck className="h-3 w-3" aria-hidden="true" />,
    className: 'bg-success/10 text-success border-success/20',
  },
  tampered: {
    label: 'Tampered',
    icon: <ShieldAlert className="h-3 w-3" aria-hidden="true" />,
    className: 'bg-critical/10 text-critical border-critical/20',
  },
  unknown: {
    label: 'Unknown',
    icon: <ShieldQuestion className="h-3 w-3" aria-hidden="true" />,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
};

interface IntegrityChipProps {
  integrity: IntegrityStatus;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
  title?: string;
}

export const IntegrityChip = React.forwardRef<HTMLSpanElement, IntegrityChipProps>(
  ({ integrity, size = 'sm', showLabel = true, showIcon = true, className, title, ...props }, ref) => {
    const config = statusConfig[integrity];
    const sizeStyles = {
      xs: 'px-1.5 py-0.5 text-body-xs gap-1',
      sm: 'px-2 py-0.5 text-body-xs gap-1.5',
      md: 'px-2.5 py-1 text-body-sm gap-2',
    };

    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center font-medium rounded-full border transition-colors',
          config.className,
          sizeStyles[size],
          className
        )}
        title={title}
        {...props}
      >
        {showIcon && <span aria-hidden="true">{config.icon}</span>}
        {showLabel && <span>{config.label}</span>}
      </span>
    );
  }
);
IntegrityChip.displayName = 'IntegrityChip';

interface IntegrityDotProps {
  integrity: IntegrityStatus;
  size?: number;
  className?: string;
}

export function IntegrityDot({ integrity, size = 8, className }: IntegrityDotProps) {
  const colors = {
    intact: 'bg-success',
    tampered: 'bg-critical',
    unknown: 'bg-warning',
  };
  return (
    <span
      className={clsx('inline-block rounded-full', colors[integrity], className)}
      style={{ width: size, height: size }}
      aria-label={`Integrity: ${integrity}`}
    />
  );
}