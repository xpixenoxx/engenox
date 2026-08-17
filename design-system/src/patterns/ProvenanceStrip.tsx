// design-system/src/patterns/ProvenanceStrip.tsx
// Provenance Strip — evidence chain display, citation hover, provenance audit hover

import * as React from 'react';
import { clsx } from 'clsx';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../primitives';
import { Separator } from '../primitives';
import { Badge } from '../primitives/Badge';
import { IntegrityChip } from './IntegrityChip';
import { type ProvenanceEntry, type EvidenceCitation } from './types';

interface ProvenanceStripProps {
  entries: ProvenanceEntry[];
  density?: 'compact' | 'comfortable';
  maxVisible?: number;
  showIntegrity?: boolean;
  onEntryClick?: (entry: ProvenanceEntry) => void;
}

export const ProvenanceStrip = React.forwardRef<HTMLDivElement, ProvenanceStripProps>(
  ({ className, entries, density = 'comfortable', maxVisible = 5, showIntegrity = true, onEntryClick, ...props }, ref) => {
    const visibleEntries = entries.slice(0, maxVisible);
    const hiddenCount = entries.length - maxVisible;

    return (
      <div ref={ref} className={clsx('space-y-2', className)} {...props}>
        {visibleEntries.map((entry, index) => (
          <ProvenanceEntryItem
            key={entry.id}
            entry={entry}
            index={index}
            density={density}
            showIntegrity={showIntegrity}
            onClick={onEntryClick}
          />
        ))}
        {hiddenCount > 0 && (
          <div className="flex items-center justify-center px-2 py-1.5 text-body-xs text-text-muted border-t border-border">
            <button
              type="button"
              className="text-brand hover:text-brand/80 font-medium underline-offset-2 hover:underline"
              onClick={() => onEntryClick?.(entries[maxVisible])}
            >
              +{hiddenCount} more evidence items
            </button>
          </div>
        )}
      </div>
    );
  }
);
ProvenanceStrip.displayName = 'ProvenanceStrip';

interface ProvenanceEntryItemProps {
  entry: ProvenanceEntry;
  index: number;
  density: 'compact' | 'comfortable';
  showIntegrity: boolean;
  onClick?: (entry: ProvenanceEntry) => void;
}

function ProvenanceEntryItem({ entry, index, density, showIntegrity, onClick }: ProvenanceEntryItemProps) {
  const isCompact = density === 'compact';
  const padding = isCompact ? 'px-2 py-1.5' : 'px-3 py-2';
  const gap = isCompact ? 'gap-2' : 'gap-3';
  const textSize = isCompact ? 'text-body-xs' : 'text-body-sm';

  const content = (
    <div className={clsx('flex items-start gap-2', gap, padding, textSize, 'bg-provenance-bg/50 rounded-md')}>
      <span className={clsx('flex-shrink-0 w-5 text-center text-text-muted font-mono', isCompact ? 'text-body-xs' : 'text-body-sm')}>
        {index + 1}.
      </span>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2">
          <span className="font-mono text-brand/80">{entry.sourceId}</span>
          <Badge variant="outline" size="sm" className={clsx('text-body-xs', entry.status === 'verified' && 'text-success border-success/30')}>
            {entry.status}
          </Badge>
          {showIntegrity && entry.integrity && <IntegrityChip integrity={entry.integrity} size="sm" />}
        </div>
        <p className="text-text-muted line-clamp-2">{entry.claim}</p>
        {entry.confidence !== undefined && (
          <div className="flex items-center gap-2">
            <ConfidenceIndicator value={entry.confidence} size="sm" />
            <span className="text-text-muted font-mono">{Math.round(entry.confidence * 100)}%</span>
          </div>
        )}
        {entry.timestamp && (
          <time className="text-text-muted font-mono" dateTime={entry.timestamp.toISOString()}>
            {entry.timestamp.toLocaleString()}
          </time>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className={clsx('w-full text-left transition-colors', 'hover:bg-provenance-bg/80 rounded-md', content.props.className)}
            onClick={() => onClick(entry)}
          >
            {content}
          </button>
        </HoverCardTrigger>
        <HoverCardContent align="start" sideOffset={8} className="w-80 max-h-60 overflow-auto">
          <ProvenanceDetail entry={entry} />
        </HoverCardContent>
      </HoverCard>
    );
  }

  return <div>{content}</div>;
}

interface ProvenanceDetailProps {
  entry: ProvenanceEntry;
}

function ProvenanceDetail({ entry }: ProvenanceDetailProps) {
  return (
    <div className="space-y-3 p-1">
      <div className="flex items-start gap-2">
        <span className="font-mono text-brand/80">{entry.sourceId}</span>
        <Badge variant={entry.status === 'verified' ? 'success' : 'outline'} size="sm">
          {entry.status}
        </Badge>
      </div>
      <div className="space-y-1 text-body-sm">
        <p className="font-medium text-text">Claim</p>
        <p className="text-text-muted">{entry.claim}</p>
      </div>
      {entry.evidence && entry.evidence.length > 0 && (
        <div className="space-y-1">
          <p className="font-medium text-text">Evidence</p>
          <ul className="space-y-1 pl-4 list-disc text-text-muted">
            {entry.evidence.map((e, i) => (
              <li key={i} className="text-body-xs">{e}</li>
            ))}
          </ul>
        </div>
      )}
      {entry.confidence !== undefined && (
        <div className="flex items-center gap-2">
          <ConfidenceIndicator value={entry.confidence} size="md" />
          <span className="text-text-muted">Confidence: {Math.round(entry.confidence * 100)}%</span>
        </div>
      )}
      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="font-medium text-text mb-1">Metadata</p>
          <dl className="space-y-1 text-body-xs text-text-muted">
            {Object.entries(entry.metadata).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="font-mono text-brand/80 min-w-[100px]">{k}:</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

interface ConfidenceIndicatorProps {
  value: number;
  size: 'sm' | 'md' | 'lg';
}

function ConfidenceIndicator({ value, size }: ConfidenceIndicatorProps) {
  const sizeClasses = { sm: 'h-1.5 w-16', md: 'h-2 w-24', lg: 'h-2.5 w-32' };
  const getColor = (v: number) => (v >= 0.8 ? 'bg-success' : v >= 0.5 ? 'bg-warning' : 'bg-critical');

  return (
    <div className={clsx(sizeClasses[size], 'rounded-full bg-surface-muted overflow-hidden')}>
      <div className={clsx('h-full rounded-full transition-all duration-normal', getColor(value))} style={{ width: `${value * 100}%` }} />
    </div>
  );
}

export interface ProvenanceEntry {
  id: string;
  sourceId: string;
  claim: string;
  status: 'verified' | 'pending' | 'disputed' | 'fallback';
  confidence?: number;
  evidence?: string[];
  timestamp?: Date;
  integrity?: 'intact' | 'tampered' | 'unknown';
  metadata?: Record<string, string>;
}