'use client';
// web/src/app/(dashboard)/competitors/page.tsx
// Competitors — relative visibility tracking, comparative perception

import { CandorStat, EmptyStates, Panel, PanelSection } from '@engenox/design-system/patterns';
import { Badge, Button, Input, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@engenox/design-system/primitives';
import { clsx } from 'clsx';
import { AlertTriangle, Clock, Download, Eye, Plus, Search, Target, TrendingUp, Users } from 'lucide-react';

import * as React from 'react';
import { Suspense } from 'react';



interface Competitor {
  id: string;
  name: string;
  website: string;
  industry: string;
  status: 'tracking' | 'pending' | 'error';
  lastProbed: string;
  metrics: {
    visibilityScore: number;
    avgConfidence: number;
    assertionCount: number;
    conflictCount: number;
    [key: string]: number;
  };
  delta: {
    visibility: number;
    confidence: number;
    [key: string]: number;
  };
}

function CompetitorsContent() {
  const competitors: Competitor[] = [
    {
      id: 'comp_1',
      name: 'Competitor Alpha',
      website: 'https://alpha.ai',
      industry: 'AI Visibility',
      status: 'tracking',
      lastProbed: '2 hours ago',
      metrics: { visibilityScore: 67, avgConfidence: 0.72, assertionCount: 289, conflictCount: 8 },
      delta: { visibility: 5.2, confidence: 0.03 },
    },
    {
      id: 'comp_2',
      name: 'Competitor Beta',
      website: 'https://beta.io',
      industry: 'Brand Monitoring',
      status: 'tracking',
      lastProbed: '4 hours ago',
      metrics: { visibilityScore: 54, avgConfidence: 0.68, assertionCount: 201, conflictCount: 12 },
      delta: { visibility: -2.1, confidence: -0.01 },
    },
    {
      id: 'comp_3',
      name: 'Competitor Gamma',
      website: 'https://gamma.com',
      industry: 'SEO/AI',
      status: 'pending',
      lastProbed: 'Never',
      metrics: { visibilityScore: 0, avgConfidence: 0, assertionCount: 0, conflictCount: 0 },
      delta: { visibility: 0, confidence: 0 },
    },
  ];

  const [activeTab, setActiveTab] = React.useState<string>('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-xl font-bold text-text">Competitors</h1>
          <p className="text-body-sm text-text-muted mt-1">
            Track competitive AI visibility. Compare perception, conflicts, and entity truth.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => window.location.href = '/dashboard/competitors/add'}>
            <Plus className="h-4 w-4 mr-2" />
            Add Competitor
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CandorStat
          label="Tracked"
          value={competitors.filter(c => c.status === 'tracking').length}
          unit=" competitors"
          honesty="high"
        />
        <CandorStat
          label="Avg Visibility"
          value={Math.round(competitors.filter(c => c.status === 'tracking').reduce((a, c) => a + c.metrics.visibilityScore, 0) / competitors.filter(c => c.status === 'tracking').length)}
          unit="%"
          delta={{ value: 1.8, label: 'vs last week', trend: 'up' }}
          honesty="medium"
          honestyDetail={['Small sample size (n=2 active)']}
        />
        <CandorStat
          label="Total Assertions"
          value={competitors.reduce((a, c) => a + c.metrics.assertionCount, 0)}
          delta={{ value: 45, label: 'new this cycle', trend: 'up' }}
          honesty="high"
        />
        <CandorStat
          label="Active Conflicts"
          value={competitors.reduce((a, c) => a + c.metrics.conflictCount, 0)}
          delta={{ value: -3, label: 'resolved', trend: 'down' }}
          honesty="high"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-4">
          {competitors.map((comp) => (
            <CompetitorCard key={comp.id} competitor={comp} />
          ))}
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          <CompareView competitors={competitors} />
        </TabsContent>
      </Tabs>

      {competitors.length === 0 && (
        <EmptyStates.NoCompetitors
          customPrimaryAction={{
            label: 'Add First Competitor',
            onClick: () => { window.location.href = '/dashboard/competitors/add'; },
          }}
        />
      )}
    </div>
  );
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  const statusConfig = {
    tracking: { label: 'Tracking', color: 'text-success bg-success/10 border-success/20', icon: Users },
    pending: { label: 'Pending', color: 'text-warning bg-warning/10 border-warning/20', icon: Clock },
    error: { label: 'Error', color: 'text-critical bg-critical/10 border-critical/20', icon: AlertTriangle },
  };

  const config = statusConfig[competitor.status];
  const Icon = config.icon;

  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text">{competitor.name}</h3>
                <p className="text-body-xs text-text-muted">{competitor.website}</p>
              </div>
            </div>
            <Badge variant="outline" size="xs" className={config.color}>
              <Icon className="h-3 w-3 mr-1" aria-hidden="true" />
              {config.label}
            </Badge>
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-4 text-body-xs text-text-muted">
            <span>Industry: {competitor.industry}</span>
            <span>Last probed: {competitor.lastProbed}</span>
          </div>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            label="Visibility Score"
            value={competitor.metrics.visibilityScore}
            unit="%"
            delta={competitor.delta.visibility}
            icon={Target}
          />
          <MetricTile
            label="Avg Confidence"
            value={Math.round(competitor.metrics.avgConfidence * 100)}
            unit="%"
            delta={Math.round(competitor.delta.confidence * 100)}
            icon={TrendingUp}
          />
          <MetricTile
            label="Assertions"
            value={competitor.metrics.assertionCount}
            delta={competitor.status === 'tracking' ? 12 : 0}
            icon={Users}
          />
          <MetricTile
            label="Conflicts"
            value={competitor.metrics.conflictCount}
            delta={competitor.status === 'tracking' ? -2 : 0}
            icon={AlertTriangle}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = `/dashboard/competitors/${competitor.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            Detail
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = `/dashboard/perception?competitor=${competitor.id}`}>
            <Search className="h-4 w-4 mr-2" />
            Compare Queries
          </Button>
        </div>
      </PanelSection>
    </Panel>
  );
}

function MetricTile({ label, value, unit, delta, icon: Icon }: { label: string; value: number; unit?: string; delta?: number; icon: React.ElementType }) {
  const trend = delta !== undefined ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral') : 'neutral';
  return (
    <div className="p-4 bg-surface-muted/50 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-text-muted" />
        <span className="text-body-xs text-text-muted">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-heading-sm font-bold text-text">{value}</span>
        {unit && <span className="text-body-sm text-text-muted">{unit}</span>}
      </div>
      {delta !== undefined && delta !== 0 && (
        <div className={clsx('mt-1 flex items-center gap-1 text-body-xs font-medium', trend === 'up' ? 'text-success' : trend === 'down' ? 'text-critical' : 'text-text-muted')}>
          <TrendingUp className={clsx('h-3 w-3', trend === 'down' && 'rotate-180')} />
          <span>{Math.abs(delta) > 1 ? delta : delta.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function CompareView({ competitors }: { competitors: Competitor[] }) {
  const activeCompetitors = competitors.filter(c => c.status === 'tracking');

  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection title="Comparative Analysis" description="Side-by-side perception comparison across tracked competitors">
        {activeCompetitors.length < 2 ? (
          <EmptyStates.NoCompetitors
            customTitle="Add more competitors to compare"
            customDescription="At least 2 actively tracked competitors are needed for comparative analysis."
          />
        ) : (
          <div className="space-y-6">
            {/* Comparison table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-body-xs text-text-muted border-b border-border">
                    <th className="pb-2 pr-4 font-medium w-48">Metric</th>
                    {activeCompetitors.map(c => (
                      <th key={c.id} className="pb-2 pr-4 font-medium text-center">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'visibilityScore', label: 'Visibility Score', unit: '%' },
                    { key: 'avgConfidence', label: 'Avg Confidence', unit: '%', transform: (v: number) => Math.round(v * 100) },
                    { key: 'assertionCount', label: 'Assertions', unit: '' },
                    { key: 'conflictCount', label: 'Conflicts', unit: '' },
                  ].map((metric) => (
                    <tr key={metric.key} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-medium text-text">{metric.label}</td>
                      {activeCompetitors.map((comp) => {
                        const rawVal = comp.metrics[metric.key] ?? 0;
                        const val = metric.transform ? metric.transform(rawVal) : rawVal;
                        return (
                          <td key={comp.id} className="py-3 pr-4 text-center">
                            <div className="text-heading-sm font-bold text-text">{val}{metric.unit}</div>
                            {comp.delta && comp.delta[metric.key as keyof typeof comp.delta] !== undefined && (() => {
                                const deltaVal = comp.delta[metric.key as keyof typeof comp.delta];
                                if (deltaVal === undefined) return null;
                                return (
                                  <div className="text-body-xs font-medium text-success">
                                    {deltaVal > 0 ? '+' : ''}{deltaVal}{metric.unit === '%' ? '%' : ''}
                                  </div>
                                );
                              })()}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick surface comparison */}
            <div className="pt-4 border-t border-border">
              <h4 className="text-body-sm font-medium text-text mb-4">Per-Surface Comparison</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['ChatGPT', 'Perplexity', 'Gemini', 'Grok', 'Claude'].map((surface) => (
                  <div key={surface} className="p-4 bg-surface-muted/50 rounded-lg border border-border/50 text-center">
                    <div className="text-headline-sm font-bold text-brand mb-2">{surface}</div>
                    <div className="text-body-xs text-text-muted space-y-1">
                      {activeCompetitors.map((comp) => (
                        <div key={comp.id} className="flex justify-between gap-2">
                          <span className="truncate">{comp.name}</span>
                          <span className="font-mono text-brand">{Math.floor(Math.random() * 30) + 50}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </PanelSection>
    </Panel>
  );
}

export default function CompetitorsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-surface-muted/50 rounded-lg" />}>
      <CompetitorsContent />
    </Suspense>
  );
}