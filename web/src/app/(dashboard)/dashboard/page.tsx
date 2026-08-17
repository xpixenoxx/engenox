'use client';
// web/src/app/(dashboard)/dashboard/page.tsx
// Dashboard — the cockpit: brand context, perception summary, autonomy dial, quick actions

import { Panel, PanelDivider, PanelSection } from '@engenox/design-system/patterns';
import { CandorStat } from '@engenox/design-system/patterns';
import { DialSliderCard } from '@engenox/design-system/patterns';
import { EmptyStates } from '@engenox/design-system/patterns';
import { Button } from '@engenox/design-system/primitives';
import { AlertTriangle, Brain, FileText, Search, Target, TrendingUp, Zap } from 'lucide-react';
import { Suspense } from 'react';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-surface-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-surface-muted/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-surface-muted/50 rounded-lg animate-pulse" />
      </div>
      <div className="h-48 bg-surface-muted/50 rounded-lg animate-pulse" />
    </div>
  );
}

async function PerceptionSummary() {
  // In production, this would fetch from the perception service
  // For now, return mock data structure
  const perceptionData = {
    totalQueries: 127,
    surfacesProbed: 5,
    assertionsExtracted: 342,
    confidenceAvg: 0.73,
    conflicts: 12,
    fallbacks: 8,
  };

  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection title="Perception Summary" description="Latest AtlasCycle results across all surfaces">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CandorStat
            label="Queries Probed"
            value={perceptionData.totalQueries}
            delta={{ value: 12, label: 'last cycle', trend: 'up' }}
            honesty="high"
          />
          <CandorStat
            label="Surfaces"
            value={perceptionData.surfacesProbed}
            unit=" / 5"
            honesty="high"
          />
          <CandorStat
            label="Assertions"
            value={perceptionData.assertionsExtracted}
            delta={{ value: 5.2, label: 'vs baseline', trend: 'up' }}
            honesty="medium"
            honestyDetail={['Some assertions from fallback responses']}
          />
          <CandorStat
            label="Avg Confidence"
            value={Math.round(perceptionData.confidenceAvg * 100)}
            unit="%"
            ci={{ lower: 0.68, upper: 0.78, level: 0.95 }}
            honesty="high"
          />
        </div>
      </PanelSection>

      <PanelDivider />

      <PanelSection title="Signal Quality" description="Conflict and fallback rates">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CandorStat
            label="Conflicts Detected"
            value={perceptionData.conflicts}
            delta={{ value: -2, label: 'vs last cycle', trend: 'down' }}
            honesty="high"
            honestyDetail={['AI surfaces disagree on entity attributes', 'Review Conflict Trio for details']}
          />
          <CandorStat
            label="Fallback Rate"
            value={Math.round((perceptionData.fallbacks / perceptionData.assertionsExtracted) * 100)}
            unit="%"
            delta={{ value: 1.2, label: 'vs baseline', trend: 'up' }}
            honesty="low"
            honestyDetail={['High fallback rate reduces confidence', 'Consider adding more buyer queries']}
            provenance={[
              { sourceId: 'chatgpt-4o', claim: 'Entity not found in training', confidence: 0.12, evidence: [] },
              { sourceId: 'perplexity', claim: 'No verifiable sources', confidence: 0.08, evidence: [] },
            ]}
          />
        </div>
      </PanelSection>
    </Panel>
  );
}

async function AutonomyDial() {
  // In production, this would come from the org settings / control-plane
  const currentDial = 1; // Propose
  const dryRun = true;
  const demotionAlert = { active: false, axes: [] as number[], reason: '' };

  return (
    <Panel variant="outlined" density="comfortable">
      <DialSliderCard
        value={currentDial}
        onChange={() => {}} // Would call Server Action
        dryRunMode={dryRun}
        onDryRunToggle={() => {}} // Would call Server Action
        demotionAlert={demotionAlert}
      />
    </Panel>
  );
}

function QuickActions() {
  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection title="Quick Actions" description="Common workflows from the cockpit">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            variant="primary" size="md"
            className="h-24 flex flex-col items-start justify-center gap-2 p-4 text-left"
            onClick={() => window.location.href = '/dashboard/perception'}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 rounded-lg text-brand">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-text">Run AtlasCycle</p>
                <p className="text-body-xs text-text-muted">Probe all 5 AI surfaces</p>
              </div>
            </div>
          </Button>

          <Button
            variant="secondary" size="md"
            className="h-24 flex flex-col items-start justify-center gap-2 p-4 text-left"
            onClick={() => window.location.href = '/dashboard/brand-card'}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-surface-muted rounded-lg text-text">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-text">Edit Brand Card</p>
                <p className="text-body-xs text-text-muted">Update entity attributes</p>
              </div>
            </div>
          </Button>

          <Button
            variant="secondary" size="md"
            className="h-24 flex flex-col items-start justify-center gap-2 p-4 text-left"
            onClick={() => window.location.href = '/dashboard/interventions'}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 rounded-lg text-brand">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-text">Review Proposals</p>
                <p className="text-body-xs text-text-muted">{3} pending approval</p>
              </div>
            </div>
          </Button>

          <Button
            variant="secondary" size="md"
            className="h-24 flex flex-col items-start justify-center gap-2 p-4 text-left"
            onClick={() => window.location.href = '/dashboard/report'}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg text-success">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-text">View Candor Report</p>
                <p className="text-body-xs text-text-muted">Latest measurement cycle</p>
              </div>
            </div>
          </Button>
        </div>
      </PanelSection>
    </Panel>
  );
}

async function RecentActivity() {
  // In production: fetch from measurement service / CIO corpus
  const activities = [
    { id: 'act-1', type: 'atlas_cycle', label: 'AtlasCycle completed', time: '2 hours ago', status: 'success' },
    { id: 'act-2', type: 'proposal', label: 'Intervention proposed: schema.org markup', time: '4 hours ago', status: 'pending' },
    { id: 'act-3', type: 'conflict', label: 'Conflict detected: ChatGPT vs Perplexity on founding date', time: '6 hours ago', status: 'warning' },
    { id: 'act-4', type: 'measurement', label: 'Uplift measured: +12% visibility (CI: 3-21%)', time: '1 day ago', status: 'success' },
    { id: 'act-5', type: 'dial', label: 'Autonomy dial demoted: Evidence axis failed', time: '2 days ago', status: 'critical' },
  ];

  return (
    <Panel variant="outlined" density="compact">
      <PanelSection title="Recent Activity" description="Last 7 days of perception and intervention events">
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-4 p-3 bg-surface-muted/50 rounded-lg"
            >
              <div
                className={`p-2 rounded-lg ${
                  activity.status === 'success' ? 'bg-success/10 text-success' :
                  activity.status === 'warning' ? 'bg-warning/10 text-warning' :
                  activity.status === 'critical' ? 'bg-critical/10 text-critical' :
                  'bg-brand/10 text-brand'
                }`}
              >
                {activity.type === 'atlas_cycle' && <Search className="h-4 w-4" />}
                {activity.type === 'proposal' && <Zap className="h-4 w-4" />}
                {activity.type === 'conflict' && <AlertTriangle className="h-4 w-4" />}
                {activity.type === 'measurement' && <TrendingUp className="h-4 w-4" />}
                {activity.type === 'dial' && <Target className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-text truncate">{activity.label}</p>
                <p className="text-body-xs text-text-muted">{activity.time}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-body-xs font-medium ${
                  activity.status === 'success' ? 'bg-success/10 text-success' :
                  activity.status === 'pending' ? 'bg-brand/10 text-brand' :
                  activity.status === 'warning' ? 'bg-warning/10 text-warning' :
                  'bg-critical/10 text-critical'
                }`}
              >
                {activity.status}
              </span>
            </div>
          ))}
        </div>
      </PanelSection>
    </Panel>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-xl font-bold text-text">Dashboard</h1>
          <p className="text-body-sm text-text-muted mt-1">
            Your AI visibility cockpit — perception, autonomy, and intervention at a glance
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => window.location.href = '/dashboard/perception'}>
          <Search className="h-4 w-4 mr-2" />
          Run AtlasCycle
        </Button>
      </div>

      {/* Stats row */}
      <Suspense fallback={<DashboardSkeleton />}>
        <PerceptionSummary />
      </Suspense>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<DashboardSkeleton />}>
            <AutonomyDial />
          </Suspense>
          <Suspense fallback={<DashboardSkeleton />}>
            <QuickActions />
          </Suspense>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<DashboardSkeleton />}>
            <RecentActivity />
          </Suspense>

          {/* Empty state for new users - shown conditionally */}
          <EmptyStates.NoPerceptionData
            customPrimaryAction={{
              label: 'Run First AtlasCycle',
              onClick: () => { window.location.href = '/dashboard/perception'; },
            }}
          />
        </div>
      </div>
    </div>
  );
}