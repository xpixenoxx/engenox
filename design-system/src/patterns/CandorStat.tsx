// design-system/src/patterns/CandorStat.tsx
// CandorStat — single metric tile with CI badge, Honesty toggle proxy, provenance hover

import * as React from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { Badge } from '../primitives/Badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../primitives/HoverCard';
import { Button } from '../primitives/Button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../primitives/Collapsible';

interface CandorStatProps {
  label: string;
  value: string | number;
  unit?: string;
  ci?: { lower: number; upper: number; level?: number };
  delta?: { value: number; label: string; trend: 'up' | 'down' | 'neutral' };
  honesty?: 'high' | 'medium' | 'low';
  honestyDetail?: string[];
  provenance?: {
    sourceId: string;
    claim: string;
    confidence: number;
    evidence: string[];
  }[];
  onHonestyToggle?: () => void;
  className?: string;
}

export const CandorStat = React.memo(function CandorStat({
  label,
  value,
  unit,
  ci,
  delta,
  honesty = 'high',
  honestyDetail,
  provenance,
  onHonestyToggle,
  className,
}: CandorStatProps) {
  const honestyColors = {
    high: 'text-success bg-success/10 border-success/20',
    medium: 'text-warning bg-warning/10 border-warning/20',
    low: 'text-critical bg-critical/10 border-critical/20',
  };

  return (
    <div className={clsx('p-4 rounded-lg border bg-surface-raised', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-body-sm font-medium text-text">{label}</span>
            {ci && (
              <Badge variant="outline" size="xs" className="whitespace-nowrap">
                CI {Math.round((ci.level ?? 0.95) * 100)}%
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-display-sm font-mono tabular-nums text-text">{value}</span>
            {unit && <span className="text-body-sm text-text-muted">{unit}</span>}
          </div>
          {ci && (
            <div className="mt-1 text-body-xs text-text-muted font-mono">
              [{ci.lower.toFixed(2)}, {ci.upper.toFixed(2)}]
            </div>
          )}
          {delta && (
            <div className={clsx('mt-1.5 flex items-center gap-1 text-body-xs font-medium', delta.trend === 'up' ? 'text-success' : delta.trend === 'down' ? 'text-critical' : 'text-text-muted')}>
              <span aria-hidden="true">{delta.trend === 'up' ? '↑' : delta.trend === 'down' ? '↓' : '→'}</span>
              <span>{Math.abs(delta.value).toFixed(1)}% vs {delta.label}</span>
            </div>
          )}
        </div>
        {onHonestyToggle && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Badge
                variant="outline"
                size="sm"
                className={clsx('cursor-pointer transition-colors', honestyColors[honesty])}
              >
                <span className="flex items-center gap-1">
                  <span className={clsx('w-1.5 h-1.5 rounded-full', honesty === 'high' && 'bg-success', honesty === 'medium' && 'bg-warning', honesty === 'low' && 'bg-critical')} />
                  Honesty: {honesty}
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </span>
              </Badge>
            </HoverCardTrigger>
            <HoverCardContent align="end" sideOffset={4} className="w-64">
              {honestyDetail && (
                <div className="space-y-2 p-1">
                  <p className="text-body-xs font-medium text-text-muted">Why this rating:</p>
                  <ul className="space-y-1 text-body-xs text-text">
                    {honestyDetail.map((d, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span aria-hidden="true">•</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onHonestyToggle}>
                    View Honesty Ledger
                  </Button>
                </div>
              )}
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
      {provenance && provenance.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <Collapsible>
            <CollapsibleTrigger className="text-body-sm text-brand hover:text-brand/80 font-medium flex items-center gap-1">
              Provenance ({provenance.length})
              <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" aria-hidden="true" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 text-body-xs text-text-muted">
              {provenance.map((p, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-surface-muted">
                  <span className="font-mono text-brand/80 shrink-0">{p.sourceId}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text">{p.claim}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="font-mono tabular-nums">{Math.round(p.confidence * 100)}%</span>
                      {p.evidence && (
                        <Badge variant="outline" size="xs">{p.evidence.length} evidence</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
});

CandorStat.displayName = 'CandorStat';