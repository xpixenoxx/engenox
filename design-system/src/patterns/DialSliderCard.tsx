// design-system/src/patterns/DialSliderCard.tsx
// DialSliderCard — 4-tier autonomy dial with metaphor labels, three-axis ledger explainer, demotion-on-alert

import * as React from 'react';
import { clsx } from 'clsx';
import { Slider } from '../primitives/Slider';
import { Switch } from '../primitives/Switch';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Panel, PanelSection } from './Panel';
import { IntegrityChip, IntegrityDot } from './IntegrityChip';
import { Tooltip, TooltipTrigger, TooltipContent } from '../primitives/Tooltip';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export type DialPosition = 0 | 1 | 2 | 3;

const DIAL_CONFIG: Record<DialPosition, { label: string; metaphor: string; description: string; color: string }> = {
  0: { label: 'Observe', metaphor: 'Read-only', description: 'No writes. Perception only.', color: 'intelligence-idle' },
  1: { label: 'Propose', metaphor: 'Co-Pilot', description: 'Draft PRs. Human merges.', color: 'intelligence-probing' },
  2: { label: 'Approve', metaphor: 'Auto-Merge', description: 'Auto-merge on green CI.', color: 'intelligence-complete' },
  3: { label: 'Execute', metaphor: 'Autonomous', description: 'Full write authority.', color: 'intelligence-conflict' },
};

const AXIS_LABELS = ['Safety', 'Consent', 'Evidence'] as const;

interface DialSliderCardProps {
  value: DialPosition;
  onChange: (value: DialPosition) => void;
  disabled?: boolean;
  demotionAlert?: { active: boolean; axes: number[]; reason: string } | undefined;
  dryRunMode?: boolean;
  onDryRunToggle?: ((enabled: boolean) => void) | undefined;
  className?: string;
}

export const DialSliderCard = React.forwardRef<HTMLDivElement, DialSliderCardProps>(
  ({
    value,
    onChange,
    disabled,
    demotionAlert,
    dryRunMode = false,
    onDryRunToggle,
    className,
  }: DialSliderCardProps) => {
    const config = DIAL_CONFIG[value];
    const isDemoted = demotionAlert?.active;

    const marks = [
      { value: 0, label: 'Observe' },
      { value: 1, label: 'Propose' },
      { value: 2, label: 'Approve' },
      { value: 3, label: 'Execute' },
    ];

    return (
      <Panel variant="outlined" density="comfortable" className={clsx('w-full max-w-lg', className)}>
        <PanelSection
          title="Autonomy Dial"
          description="Controls write authority for interventions. Default: Propose (Co-Pilot)."
        >
          <div className="space-y-4">
            {/* Main Slider */}
            <div className="relative">
              <Slider
                min={0}
                max={3}
                step={1}
                value={value}
                onValueChange={((v: number | number[]) => onChange((Array.isArray(v) ? v[0] : v) as DialPosition)) as (value: number | number[]) => void}
                disabled={disabled}
                marks={marks}
                className="w-full"
                aria-label="Autonomy level"
              />

              {/* Demotion alert overlay */}
              {isDemoted && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-critical/95 text-background text-body-xs font-medium rounded shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95">
                    <AlertTriangle className="inline h-3 w-3 mr-1" aria-hidden="true" />
                    Demoted: {demotionAlert.reason}
                  </div>
                </div>
              )}
            </div>

            {/* Current state display */}
            <div className={clsx('flex items-center gap-4 p-3 rounded-lg border', isDemoted ? 'bg-critical/5 border-critical/20' : 'bg-surface-muted')}>
              <IntegrityDot integrity={isDemoted ? 'tampered' : 'intact'} size={12} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={isDemoted ? 'critical' : config.color as any} size="md">
                    {config.label}
                  </Badge>
                  <span className="text-body-sm text-text-muted">{config.metaphor}</span>
                </div>
                <p className="text-body-xs text-text-muted mt-0.5">{config.description}</p>
                {isDemoted && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-body-xs text-critical">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    <span>Demoted from {DIAL_CONFIG[Math.min(value + 1, 3) as DialPosition]?.label ?? 'higher'} — {demotionAlert.reason}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Three-axis ledger explainer */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Info className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  <span className="text-body-sm text-text">View Three-Axis Ledger</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" className="w-80">
                <div className="space-y-3 p-1">
                  <p className="text-body-sm font-medium text-text">Escalation requires all three axes:</p>
                  <div className="space-y-2 text-body-xs">
                    {AXIS_LABELS.map((axis, i) => (
                      <div
                        key={axis}
                        className={clsx(
                          'flex items-center gap-2 p-2 rounded bg-surface-muted',
                          demotionAlert?.axes.includes(i) && 'bg-critical/5 border border-critical/20'
                        )}
                      >
                        <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center font-mono text-body-xs', demotionAlert?.axes.includes(i) ? 'bg-critical text-background' : 'bg-success text-background')}>
                          {demotionAlert?.axes.includes(i) ? (
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <CheckCircle className="h-3 w-3" aria-hidden="true" />
                          )}
                        </span>
                        <span className={clsx('font-medium', demotionAlert?.axes.includes(i) && 'text-critical')}>
                          {axis}
                        </span>
                        <span className="text-text-muted flex-1 text-right">
                          {demotionAlert?.axes.includes(i) ? 'FAIL' : 'PASS'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {isDemoted && (
                    <p className="text-body-xs text-critical bg-critical/5 p-2 rounded">
                      Auto-demotion triggered. Manual override required to re-escalate.
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Dry-run / Commit toggle */}
            {onDryRunToggle && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <p className="text-body-sm font-medium text-text">Dry-run mode</p>
                  <p className="text-body-xs text-text-muted">Preview changes without writing</p>
                </div>
                <Switch
                  checked={dryRunMode}
                  onCheckedChange={onDryRunToggle}
                  disabled={disabled}
                  aria-label="Toggle dry-run mode"
                />
              </div>
            )}
          </div>
        </PanelSection>
      </Panel>
    );
  }
);
DialSliderCard.displayName = 'DialSliderCard';