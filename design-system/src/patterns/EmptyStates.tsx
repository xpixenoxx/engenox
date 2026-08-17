// design-system/src/patterns/EmptyStates.tsx
// EmptyStates — domain-specific empty states with actionable CTAs, not generic placeholders

import * as React from 'react';
import { clsx } from 'clsx';
import { Panel } from './Panel';
import { Button } from '../primitives/Button';
import { Badge } from '../primitives/Badge';
import {
  SearchX,
  FileText,
  Brain,
  Zap,
  AlertTriangle,
  EyeOff,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface EmptyStateConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' };
  secondaryAction?: { label: string; onClick: () => void };
  meta?: React.ReactNode;
}

const EMPTY_STATES: Record<string, EmptyStateConfig> = {
  noBrand: {
    icon: <Brain className="h-12 w-12 text-text-muted/50" aria-hidden="true" />,
    title: 'No brand configured',
    description: 'Add your company or product to start tracking AI visibility across surfaces.',
    primaryAction: { label: 'Add Brand', onClick: () => {}, variant: 'primary' },
    secondaryAction: { label: 'Learn what a brand entity needs', onClick: () => {} },
    meta: <Badge variant="outline" size="sm">Required for MVP</Badge>,
  },
  noBuyerQueries: {
    icon: <SearchX className="h-12 w-12 text-text-muted/50" aria-hidden="true" />,
    title: 'No buyer queries defined',
    description: 'Define the questions your buyers ask AI systems. These drive perception probes across all surfaces.',
    primaryAction: { label: 'Add Buyer Queries', onClick: () => {}, variant: 'primary' },
    secondaryAction: { label: 'See example queries for your industry', onClick: () => {} },
    meta: <Badge variant="outline" size="sm">Required for perception</Badge>,
  },
  noPerceptionData: {
    icon: <EyeOff className="h-12 w-12 text-text-muted/50" aria-hidden="true" />,
    title: 'No perception data yet',
    description: 'Run an AtlasCycle to probe AI surfaces. Results will appear here as assertions with evidence and confidence.',
    primaryAction: { label: 'Run AtlasCycle', onClick: () => {}, variant: 'primary' },
    secondaryAction: { label: 'Configure surfaces to probe', onClick: () => {} },
    meta: <Badge variant="outline" size="sm">Post-AtlasCycle</Badge>,
  },
  noAssertions: {
    icon: <FileText className="h-12 w-12 text-text-muted/50" aria-hidden="true" />,
    title: 'No assertions found',
    description: 'Assertions are extracted claims from AI responses. Run a perception cycle or check probe configuration.',
    primaryAction: { label: 'Run Perception Probe', onClick: () => {}, variant: 'primary' },
    secondaryAction: { label: 'Review probe configuration', onClick: () => {} },
    meta: <Badge variant="outline" size="sm">Post-perception</Badge>,
  },
  noEvidence: {
    icon: <AlertTriangle className="h-12 w-12 text-warning/80" aria-hidden="true" />,
    title: 'No supporting evidence',
    description: 'This assertion has no verifiable citations. It may be a fallback or hallucination. Treat with low confidence.',
    primaryAction: { label: 'Flag as fallback', onClick: () => {}, variant: 'secondary' },
    secondaryAction: { label: 'Request re-probe with citations', onClick: () => {} },
    meta: <Badge variant="warning" size="sm">Candor: Low</Badge>,
  },
  noProposals: {
    icon: <Zap className="h-12 w-12 text-text-muted/50" aria-hidden="true" />,
    title: 'No interventions proposed',
    description: 'Engenox proposes interventions when confidence is high and evidence supports action. Run a full cycle or adjust thresholds.',
    primaryAction: { label: 'Run Full AtlasCycle', onClick: () => {}, variant: 'primary' },
    secondaryAction: { label: 'Adjust proposal thresholds', onClick: () => {} },
    meta: <Badge variant="brand" size="sm">Dial: Propose</Badge>,
  },
  noInterventions: {
    icon: <RefreshCw className="h-12 w-12 text-text-muted/50" aria-hidden="true" />,
    title: 'No interventions executed',
    description: 'Approved proposals become interventions. Execute approved items to create corpus rows and measure uplift.',
    primaryAction: { label: 'View Pending Proposals', onClick: () => {}, variant: 'primary' },
    secondaryAction: { label: 'Review proposal history', onClick: () => {} },
    meta: <Badge variant="outline" size="sm">Post-approval</Badge>,
  },
  noMeasurement: {
    icon: <HelpCircle className="h-12 w-12 text-text-muted/50" aria-hidden="true" />,
    title: 'No measurement data',
    description: 'Measurement requires executed interventions with before/after probes. The CIO corpus builds over cycles.',
    primaryAction: { label: 'Execute an intervention', onClick: () => {}, variant: 'primary' },
    secondaryAction: { label: 'Understand CIO corpus', onClick: () => {} },
    meta: <Badge variant="brand" size="sm">Post-intervention</Badge>,
  },
  noCompetitors: {
    icon: <ExternalLink className="h-12 w-12 text-text-muted/50" aria-hidden="true" />,
    title: 'No competitors tracked',
    description: 'Competitor tracking shows relative visibility. Add competitors to see comparative perception.',
    primaryAction: { label: 'Add Competitors', onClick: () => {}, variant: 'primary' },
    secondaryAction: { label: 'See how competitor tracking works', onClick: () => {} },
    meta: <Badge variant="outline" size="sm">Optional</Badge>,
  },
  noConsent: {
    icon: <Settings className="h-12 w-12 text-text-muted/50" aria-hidden="true" />,
    title: 'Consent panel not configured',
    description: 'The consented panel powers human evaluation. Add panelists to enable calibrated ground truth.',
    primaryAction: { label: 'Configure Consent Panel', onClick: () => {}, variant: 'primary' },
    secondaryAction: { label: 'Learn about consented panel', onClick: () => {} },
    meta: <Badge variant="warning" size="sm">MVP Requirement</Badge>,
  },
  error: {
    icon: <AlertTriangle className="h-12 w-12 text-critical/80" aria-hidden="true" />,
    title: 'Something went wrong',
    description: 'We couldn\'t load this data. Check your connection and try again.',
    primaryAction: { label: 'Retry', onClick: () => {}, variant: 'primary' },
    secondaryAction: { label: 'Contact support', onClick: () => {} },
    meta: <Badge variant="critical" size="sm">Error</Badge>,
  },
  loading: {
    icon: <RefreshCw className="h-12 w-12 text-brand animate-spin" aria-hidden="true" />,
    title: 'Loading...',
    description: 'Fetching the latest data from your perception cycle.',
    meta: <Badge variant="intelligence" size="sm">Live</Badge>,
  },
};

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  type: keyof typeof EMPTY_STATES;
  customTitle?: string;
  customDescription?: string;
  customPrimaryAction?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' };
  customSecondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      type,
      customTitle,
      customDescription,
      customPrimaryAction,
      customSecondaryAction,
      className,
      ...props
    },
    ref
  ) => {
    const config = EMPTY_STATES[type];
    const title = customTitle || config.title;
    const description = customDescription || config.description;
    const primaryAction = customPrimaryAction || config.primaryAction;
    const secondaryAction = customSecondaryAction || config.secondaryAction;

    return (
      <Panel
        ref={ref}
        variant="default"
        density="spacious"
        className={clsx('min-h-[300px] flex flex-col items-center justify-center text-center', className)}
        {...props}
      >
        <div className="space-y-4 max-w-md w-full">
          <div className="flex justify-center">{config.icon}</div>
          <div className="space-y-1">
            <h3 className="text-heading-sm font-semibold text-text">{title}</h3>
            <p className="text-body-sm text-text-muted">{description}</p>
          </div>
          {config.meta && <div className="flex justify-center">{config.meta}</div>}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            {primaryAction && (
              <Button
                variant={primaryAction.variant === 'secondary' ? 'secondary' : 'primary'}
                onClick={primaryAction.onClick}
                className="w-full sm:w-auto"
              >
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="ghost" size="sm" onClick={secondaryAction.onClick} className="w-full sm:w-auto">
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </Panel>
    );
  }
);
EmptyState.displayName = 'EmptyState';

// Convenience exports for each empty state type
export const EmptyStates = {
  NoBrand: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="noBrand" {...props} />,
  NoBuyerQueries: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="noBuyerQueries" {...props} />,
  NoPerceptionData: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="noPerceptionData" {...props} />,
  NoAssertions: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="noAssertions" {...props} />,
  NoEvidence: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="noEvidence" {...props} />,
  NoProposals: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="noProposals" {...props} />,
  NoInterventions: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="noInterventions" {...props} />,
  NoMeasurement: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="noMeasurement" {...props} />,
  NoCompetitors: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="noCompetitors" {...props} />,
  NoConsent: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="noConsent" {...props} />,
  Error: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="error" {...props} />,
  Loading: (props: Omit<EmptyStateProps, 'type'>) => <EmptyState type="loading" {...props} />,
};