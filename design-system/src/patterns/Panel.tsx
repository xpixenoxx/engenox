// design-system/src/patterns/Panel.tsx
// Panel — foundational content container with consistent rhythm, density modes

import * as React from 'react';
import { clsx } from 'clsx';
import { Separator } from '../primitives';

export type PanelDensity = 'compact' | 'comfortable' | 'spacious';
export type PanelVariant = 'default' | 'elevated' | 'outlined' | 'provenance';

const densityClasses: Record<PanelDensity, string> = {
  compact: 'p-3 space-y-2',
  comfortable: 'p-4 space-y-3',
  spacious: 'p-6 space-y-4',
};

const variantClasses: Record<PanelVariant, string> = {
  default: 'bg-surface-raised',
  elevated: 'bg-surface-raised shadow-card',
  outlined: 'bg-surface-raised border border-border',
  provenance: 'bg-provenance-bg border-l-3 border-provenance-border pl-3',
};

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: PanelDensity;
  variant?: PanelVariant;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  divider?: boolean;
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, density = 'comfortable', variant = 'default', title, subtitle, actions, divider, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('rounded-lg', variantClasses[variant], densityClasses[density], className)}
      {...props}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {title && <h3 className="text-body-base font-semibold text-text truncate">{title}</h3>}
            {subtitle && <p className="text-body-sm text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {divider && title && <Separator className="my-3" />}
      <div className={clsx(density === 'compact' ? 'space-y-2' : density === 'comfortable' ? 'space-y-3' : 'space-y-4')}>
        {children}
      </div>
    </div>
  )
);
Panel.displayName = 'Panel';

interface PanelSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

const PanelSection = React.forwardRef<HTMLDivElement, PanelSectionProps>(
  ({ className, title, description, children, ...props }, ref) => (
    <div ref={ref} className={clsx('space-y-1.5', className)} {...props}>
      {(title || description) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title && <h4 className="text-body-sm font-medium text-text">{title}</h4>}
            {description && <p className="text-body-xs text-text-muted mt-0.5">{description}</p>}
          </div>
        </div>
      )}
      <div className={clsx('space-y-2', title && 'mt-2')}>{children}</div>
    </div>
  )
);
PanelSection.displayName = 'PanelSection';

export const PanelDivider = ({ className }: React.HTMLAttributes<HTMLHRElement>) => (
  <Separator className={clsx('my-3', className)} />
);
PanelDivider.displayName = 'PanelDivider';

export { Panel, PanelSection, PanelDivider };
export type { PanelProps, PanelSectionProps, PanelDensity, PanelVariant };