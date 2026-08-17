// design-system/src/patterns/ConflictTrio.tsx
// ConflictTrio — three-column comparison: AI says X / Evidence says Y / Engenox proposes Z

import * as React from 'react';
import { clsx } from 'clsx';
import { Panel, PanelSection } from './Panel';
import { Badge } from '../primitives/Badge';
import { IntegrityChip, IntegrityDot } from './IntegrityChip';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../primitives/Collapsible';
import { ChevronDown } from 'lucide-react';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export type ConflictColumn = 'ai' | 'evidence' | 'proposal';

const columnConfig: Record<ConflictColumn, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  ai: {
    label: 'AI Says',
    icon: <span className="text-brand">AI</span>,
    color: 'text-brand',
    bg: 'bg-brand/5',
    border: 'border-brand/20',
  },
  evidence: {
    label: 'Evidence Says',
    icon: <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />,
    color: 'text-success',
    bg: 'bg-success/5',
    border: 'border-success/20',
  },
  proposal: {
    label: 'Engenox Proposes',
    icon: <CheckCircle className="h-4 w-4 text-brand" aria-hidden="true" />,
    color: 'text-brand',
    bg: 'bg-brand/5',
    border: 'border-brand/20',
  },
};

interface ConflictTrioProps {
  aiClaim: ConflictClaim;
  evidence: ConflictClaim;
  proposal: ConflictClaim;
  entity?: { name: string; type: string; avatar?: string };
  onAcceptProposal?: () => void;
  onRejectProposal?: () => void;
  onViewEvidence?: (claim: ConflictClaim) => void;
  className?: string;
}

export interface ConflictClaim {
  value: string;
  confidence?: number;
  sources?: string[];
  evidence?: string[];
  status?: 'verified' | 'pending' | 'disputed' | 'fallback';
  integrity?: 'intact' | 'tampered' | 'unknown';
  metadata?: Record<string, string>;
}

export const ConflictTrio = React.forwardRef<HTMLDivElement, ConflictTrioProps>(
  ({ className, aiClaim, evidence, proposal, entity, onAcceptProposal, onRejectProposal, onViewEvidence, ...props }, ref) => {
    return (
      <Panel variant="outlined" density="comfortable" className={clsx('w-full', className)} {...props} ref={ref}>
        {entity && (
          <PanelSection
            title={
              <div className="flex items-center gap-3">
                {entity.avatar && <span className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-medium">{entity.avatar}</span>}
                <div>
                  <p className="font-semibold text-text">{entity.name}</p>
                  <p className="text-body-xs text-text-muted">{entity.type}</p>
                </div>
              </div>
            }
          >
            <ConflictTrioColumns aiClaim={aiClaim} evidence={evidence} proposal={proposal} onViewEvidence={onViewEvidence} />
          </PanelSection>
        )}

        <PanelDivider className="my-2" />

        <PanelSection title="Proposed Resolution">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-body-sm text-text">{proposal.value}</p>
              {proposal.confidence !== undefined && (
                <ConfidenceBar value={proposal.confidence} label="Proposal confidence" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRejectProposal}
                className="px-3 py-1.5 text-body-sm border border-border text-text-muted hover:bg-surface-muted rounded-md transition-colors"
                disabled={!onRejectProposal}
              >
                Reject
              </button>
              <button
                type="button"
                onClick={onAcceptProposal}
                className="px-3 py-1.5 text-body-sm bg-brand text-background hover:bg-brand/90 rounded-md transition-colors"
                disabled={!onAcceptProposal}
              >
                Accept Proposal
              </button>
            </div>
          </div>
        </PanelSection>
      </Panel>
    );
  }
);
ConflictTrio.displayName = 'ConflictTrio';

function ConflictTrioColumns({
  aiClaim,
  evidence,
  proposal,
  onViewEvidence,
}: {
  aiClaim: ConflictClaim;
  evidence: ConflictClaim;
  proposal: ConflictClaim;
  onViewEvidence?: ((claim: ConflictClaim) => void) | undefined;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {([
        { key: 'ai' as ConflictColumn, claim: aiClaim },
        { key: 'evidence' as ConflictColumn, claim: evidence },
        { key: 'proposal' as ConflictColumn, claim: proposal },
      ]).map(({ key, claim }) => (
        <ConflictColumn key={key} column={key} claim={claim} onViewEvidence={onViewEvidence} />
      ))}
    </div>
  );
}

function ConflictColumn({
  column,
  claim,
  onViewEvidence,
}: {
  column: ConflictColumn;
  claim: ConflictClaim;
  onViewEvidence?: ((claim: ConflictClaim) => void) | undefined;
}) {
  const config = columnConfig[column];

  return (
    <div className={clsx('rounded-lg p-4 border', config.bg, config.border)}>
      <div className="flex items-center gap-2 mb-3">
        <span className={clsx('font-medium text-body-sm', config.color)}>{config.icon}</span>
        <span className={clsx('font-medium text-body-sm', config.color)}>{config.label}</span>
      </div>

      <div className="space-y-3">
        <p className="text-body-sm text-text bg-background/50 p-3 rounded border border-border/50">{claim.value || '—'}</p>

        {claim.confidence !== undefined && (
          <ConfidenceBar value={claim.confidence} label={`${config.label} confidence`} />
        )}

        {claim.sources && claim.sources.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="text-body-xs text-text-muted hover:text-text flex items-center gap-1">
              Sources ({claim.sources.length})
              <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1 text-body-xs text-text-muted">
              {claim.sources.map((s, i) => (
                <span key={i} className="font-mono block">
                  {s}
                </span>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {claim.evidence && claim.evidence.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="text-body-xs text-text-muted hover:text-text flex items-center gap-1">
              Evidence ({claim.evidence.length})
              <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1 text-body-xs text-text">
              {claim.evidence.map((e, i) => (
                <div key={i} className="flex gap-1">
                  <span aria-hidden="true">•</span>
                  <span>{e}</span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Badge variant={claim.status === 'verified' ? 'success' : claim.status === 'fallback' ? 'warning' : 'outline'} size="xs">
            {claim.status || 'pending'}
          </Badge>
          {claim.integrity && <IntegrityChip integrity={claim.integrity} size="xs" />}
        </div>

        {onViewEvidence && (claim.evidence?.length || claim.sources?.length) && (
          <button
            type="button"
            onClick={() => onViewEvidence(claim)}
            className="w-full mt-2 px-2 py-1.5 text-body-xs text-brand hover:bg-brand/5 rounded border border-brand/20 transition-colors"
          >
            View details
          </button>
        )}
      </div>
    </div>
  );
}

function ConfidenceBar({ value, label }: { value: number; label?: string }) {
  const color = value >= 0.8 ? 'bg-success' : value >= 0.5 ? 'bg-warning' : 'bg-critical';
  return (
    <div className="space-y-1">
      {label && <span className="text-body-xs text-text-muted">{label}</span>}
      <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-normal', color)} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-body-xs font-mono text-text-muted">{Math.round(value * 100)}%</span>
    </div>
  );
}

const PanelDivider = ({ className }: React.HTMLAttributes<HTMLHRElement>) => <hr className={clsx('border-border', className)} />;