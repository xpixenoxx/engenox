'use client';
// web/src/app/(admin)/page.tsx
// Admin — tenant management, corpus health, system metrics, feature flags

import { CandorStat, EmptyStates, Panel, PanelDivider, PanelSection } from '@engenox/design-system/patterns';
import { Badge, Button, Input, Select, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from '@engenox/design-system/primitives';
import { clsx } from 'clsx';
import { Activity, AlertTriangle, BarChart3, CheckCircle, Cpu, Database, Download, Edit, Eye, Globe, Key, Minus, Plus, Search, Server, Settings, Shield, Trash2, TrendingUp, Users, XCircle, Zap } from 'lucide-react';
import * as React from 'react';
import { Suspense } from 'react';


interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'growth' | 'enterprise' | 'trial';
  status: 'active' | 'suspended' | 'trial';
  probesThisMonth: number;
  cyclesThisMonth: number;
  lastActive: string;
}

interface CorpusHealth {
  totalAssertions: number;
  totalInterventions: number;
  avgUplift: number;
  conformityRate: number;
  integrityStatus: 'intact' | 'degraded' | 'critical';
  lastAudit: string;
}

const tenants: Tenant[] = [
  { id: 't1', name: 'Engenox', slug: 'engenox', plan: 'starter', status: 'active', probesThisMonth: 487, cyclesThisMonth: 12, lastActive: '2 minutes ago' },
  { id: 't2', name: 'Acme Corp', slug: 'acme-corp', plan: 'growth', status: 'active', probesThisMonth: 1234, cyclesThisMonth: 8, lastActive: '1 hour ago' },
  { id: 't3', name: 'Beta Inc', slug: 'beta-inc', plan: 'trial', status: 'trial', probesThisMonth: 56, cyclesThisMonth: 2, lastActive: '3 days ago' },
];

const corpusHealth: CorpusHealth = {
  totalAssertions: 12847,
  totalInterventions: 234,
  avgUplift: 14.2,
  conformityRate: 94.7,
  integrityStatus: 'intact',
  lastAudit: '2024-01-15T10:30:00Z',
};

function AdminContent() {
  const [activeTab, setActiveTab] = React.useState<string>('tenants');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-xl font-bold text-text">Admin</h1>
          <p className="text-body-sm text-text-muted mt-1">
            System administration — tenant management, corpus integrity, and system health.
          </p>
        </div>
        <Button variant="secondary" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export System Report
        </Button>
      </div>

      {/* System Health Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CandorStat
          label="Active Tenants"
          value={tenants.filter(t => t.status === 'active').length}
          unit=" tenants"
          honesty="high"
        />
        <CandorStat
          label="Corpus Integrity"
          value={corpusHealth.integrityStatus === 'intact' ? 'Intact' : corpusHealth.integrityStatus}
          honesty="high"
          honestyDetail={[`Last audit: ${new Date(corpusHealth.lastAudit).toLocaleDateString()}`]}
        />
        <CandorStat
          label="Total Assertions"
          value={corpusHealth.totalAssertions.toLocaleString()}
          delta={{ value: 1247, label: 'this month', trend: 'up' }}
          honesty="high"
        />
        <CandorStat
          label="Avg Uplift"
          value={corpusHealth.avgUplift}
          unit="%"
          honesty="medium"
          honestyDetail={['Conformal CI: [11.8%, 16.6%]']}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <TabsList className="w-full">
          <TabsTrigger value="tenants">Tenants ({tenants.length})</TabsTrigger>
          <TabsTrigger value="corpus">Corpus Health</TabsTrigger>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-6 space-y-6">
          <TenantsTab tenants={tenants} />
        </TabsContent>
        <TabsContent value="corpus" className="mt-6 space-y-6">
          <CorpusTab health={corpusHealth} />
        </TabsContent>
        <TabsContent value="metrics" className="mt-6 space-y-6">
          <MetricsTab />
        </TabsContent>
        <TabsContent value="flags" className="mt-6 space-y-6">
          <FlagsTab />
        </TabsContent>
        <TabsContent value="audit" className="mt-6 space-y-6">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TenantsTab({ tenants }: { tenants: Tenant[] }) {
  return (
    <Panel variant="outlined" density="comfortable" actions={
      <Button variant="primary" size="sm" asChild>
        <a href="/admin/tenants/new">
          <Plus className="h-4 w-4 mr-2" />
          Add Tenant
        </a>
      </Button>
    }>
      <PanelSection
        title="Tenant Management"
        description="Manage tenant accounts, plans, and access"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-body-xs text-text-muted border-b border-border">
                <th className="pb-2 pr-4 font-medium w-8">Status</th>
                <th className="pb-2 pr-4 font-medium">Tenant</th>
                <th className="pb-2 pr-4 font-medium">Plan</th>
                <th className="pb-2 pr-4 font-medium">Probes / Month</th>
                <th className="pb-2 pr-4 font-medium">Cycles / Month</th>
                <th className="pb-2 pr-4 font-medium">Last Active</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-border/50 hover:bg-surface-muted/50">
                  <td className="py-3 pr-4">
                    <Badge
                      variant={
                        tenant.status === 'active' ? 'success' :
                        tenant.status === 'trial' ? 'warning' :
                        'outline'
                      }
                      size="xs"
                    >
                      <span className={clsx('w-1.5 h-1.5 rounded-full mr-1.5',
                        tenant.status === 'active' && 'bg-success',
                        tenant.status === 'trial' && 'bg-warning',
                        tenant.status === 'suspended' && 'bg-critical'
                      )} />
                      {tenant.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <div>
                      <p className="font-medium text-text">{tenant.name}</p>
                      <p className="text-body-xs text-text-muted font-mono">{tenant.slug}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" size="xs">{tenant.plan}</Badge>
                  </td>
                  <td className="py-3 pr-4 font-mono tabular-nums text-body-sm">{tenant.probesThisMonth.toLocaleString()}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums text-body-sm">{tenant.cyclesThisMonth}</td>
                  <td className="py-3 pr-4 text-body-xs text-text-muted">{tenant.lastActive}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" asChild title="View">
                        <a href={`/admin/tenants/${tenant.id}`}><Eye className="h-3.5 w-3.5" /></a>
                      </Button>
                      <Button variant="ghost" size="sm" asChild title="Edit">
                        <a href={`/admin/tenants/${tenant.id}/edit`}><Edit className="h-3.5 w-3.5" /></a>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-critical hover:bg-critical/5" title="Suspend">
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelSection>
    </Panel>
  );
}

function CorpusTab({ health }: { health: CorpusHealth }) {
  return (
    <>
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Corpus Integrity" description="CIO corpus — signed, append-only, integrity-verified">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <p className="text-body-xs text-text-muted">Total Assertions</p>
              <p className="text-heading-lg font-bold text-text">{health.totalAssertions.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <p className="text-body-xs text-text-muted">Total Interventions</p>
              <p className="text-heading-lg font-bold text-text">{health.totalInterventions.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <p className="text-body-xs text-text-muted">Avg Uplift (95% CI)</p>
              <p className="text-heading-lg font-bold text-brand">{health.avgUplift}%</p>
              <p className="text-body-xs text-text-muted">[11.8%, 16.6%]</p>
            </div>
            <div className="p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <p className="text-body-xs text-text-muted">Conformity Rate</p>
              <p className="text-heading-lg font-bold text-text">{health.conformityRate}%</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className={clsx('w-3 h-3 rounded-full',
                health.integrityStatus === 'intact' && 'bg-success',
                health.integrityStatus === 'degraded' && 'bg-warning',
                health.integrityStatus === 'critical' && 'bg-critical'
              )} />
              <div>
                <p className="font-medium text-text">Integrity Status: <span className={clsx('font-mono capitalize',
                  health.integrityStatus === 'intact' && 'text-success',
                  health.integrityStatus === 'degraded' && 'text-warning',
                  health.integrityStatus === 'critical' && 'text-critical'
                )}>{health.integrityStatus}</span></p>
                <p className="text-body-xs text-text-muted">Last audit: {new Date(health.lastAudit).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Run Integrity Check
              </Button>
              <Button variant="secondary" size="sm">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export Corpus
              </Button>
            </div>
          </div>
        </PanelSection>
      </Panel>

      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Tenants Corpus Summary" description="Per-tenant corpus metrics and intervention outcomes">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-body-xs text-text-muted border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Tenant</th>
                  <th className="pb-2 pr-4 font-medium">Assertions</th>
                  <th className="pb-2 pr-4 font-medium">Interventions</th>
                  <th className="pb-2 pr-4 font-medium">Measured Uplift</th>
                  <th className="pb-2 pr-4 font-medium">Conformity</th>
                  <th className="pb-2 pr-4 font-medium">Last Cycle</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-border/50 hover:bg-surface-muted/50">
                    <td className="py-3 pr-4 font-medium text-text">{tenant.name}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums text-body-sm">
                      {Math.floor(health.totalAssertions * (tenant.probesThisMonth / tenants.reduce((a, t) => a + t.probesThisMonth, 0))).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 font-mono tabular-nums text-body-sm">
                      {Math.floor(health.totalInterventions * (tenant.cyclesThisMonth / tenants.reduce((a, t) => a + t.cyclesThisMonth, 0)))}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={clsx('font-mono tabular-nums font-medium',
                        'text-success'
                      )}>+{12 + Math.random() * 10 | 0}%</span>
                    </td>
                    <td className="py-3 pr-4 font-mono tabular-nums text-body-sm">{(90 + Math.random() * 8).toFixed(1)}%</td>
                    <td className="py-3 pr-4 text-body-xs text-text-muted">
                      {new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/admin/corpus/${tenant.id}`}><Eye className="h-3.5 w-3.5" /></a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelSection>
      </Panel>
    </>
  );
}

function MetricsTab() {
  return (
    <>
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="System Performance" description="Real-time system health metrics">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="API Latency (p99)" value="142" unit="ms" trend="down" icon={Activity} />
            <MetricCard label="Probe Success Rate" value="98.7" unit="%" trend="up" icon={CheckCircle} />
            <MetricCard label="Temporal Queue Depth" value="23" unit="" trend="neutral" icon={BarChart3} />
            <MetricCard label="Cache Hit Rate" value="94.2" unit="%" trend="up" icon={Server} />
          </div>
        </PanelSection>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel variant="outlined" density="comfortable">
          <PanelSection title="Resource Utilization" description="CPU, Memory, Disk, Network">
            <div className="space-y-4">
              {['CPU', 'Memory', 'Disk I/O', 'Network'].map((resource) => (
                <div key={resource} className="space-y-1">
                  <div className="flex justify-between text-body-xs">
                    <span>{resource}</span>
                    <span className="font-mono">{(20 + Math.random() * 60).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${20 + Math.random() * 60}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </PanelSection>
        </Panel>

        <Panel variant="outlined" density="comfortable">
          <PanelSection title="Error Rates by Service" description="Errors per 1000 requests (last 24h)">
            <div className="space-y-4">
              {[
                { service: 'control-plane', errors: 0.2 },
                { service: 'perception', errors: 1.8 },
                { service: 'decision', errors: 0.5 },
                { service: 'action', errors: 0.1 },
                { service: 'measurement', errors: 0.3 },
                { service: 'gateway', errors: 2.1 },
              ].map((s) => (
                <div key={s.service} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 w-48">
                    <span className="text-body-xs text-text-muted font-mono">{s.service}</span>
                    <Badge variant={s.errors > 1 ? 'warning' : s.errors > 0.5 ? 'outline' : 'success'} size="xs">
                      {s.errors}/1k
                    </Badge>
                  </div>
                  <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(s.errors * 20, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </PanelSection>
        </Panel>
      </div>
    </>
  );
}

function FlagsTab() {
  const flags = [
    { key: 'atlas_cycle_v2', name: 'AtlasCycle v2 (thin column)', enabled: true, description: 'New thin-column execution path', risk: 'low' },
    { key: 'dial_three_axis', name: 'Three-Axis Autonomy Dial', enabled: true, description: 'Escalation requires signal+budget+consent', risk: 'low' },
    { key: 'causal_uplift_estimator', name: 'Causal Uplift Estimator', enabled: true, description: 'Conformal CI on CIO corpus', risk: 'medium' },
    { key: 'cross_family_critic', name: 'Cross-Family Critic Panel', enabled: true, description: 'GPT-5 + Gemini 3 adversarial review', risk: 'medium' },
    { key: 'falkordb_graduation', name: 'FalkorDB Graduation', enabled: false, description: 'Graduate from AGE to FalkorDB', risk: 'high' },
    { key: 'automq_graduation', name: 'AutoMQ Graduation', enabled: false, description: 'Graduate from Redpanda to AutoMQ', risk: 'high' },
    { key: 'concierge_panel', name: 'Concierge Consent Panel', enabled: true, description: 'Seeded panel for starter tier', risk: 'low' },
    { key: 'worm_mirror', name: 'WORM R2 Mirror', enabled: true, description: 'ClickHouse → R2 Object-Lock mirror', risk: 'medium' },
  ];

  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection title="Feature Flags" description="Runtime feature toggles — changes propagate within 30s via config reload">
        <div className="space-y-3">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <code className="text-body-xs font-mono bg-surface-muted px-2 py-0.5 rounded">{flag.key}</code>
                  <span className="font-medium text-text">{flag.name}</span>
                  <Badge variant={flag.risk === 'high' ? 'critical' : flag.risk === 'medium' ? 'warning' : 'success'} size="xs">
                    {flag.risk.toUpperCase()} RISK
                  </Badge>
                </div>
                <p className="text-body-xs text-text-muted mt-1">{flag.description}</p>
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={() => {}}
                disabled={flag.risk === 'high' && !flag.enabled}
              />
            </div>
          ))}
        </div>
      </PanelSection>
    </Panel>
  );
}

function AuditTab() {
  const auditEntries = [
    { id: 'a1', timestamp: '2024-01-15T10:30:00Z', actor: 'system', action: 'corpus_integrity_check', target: 'cio_corpus', result: 'passed', details: 'All 12,847 assertions verified intact' },
    { id: 'a2', timestamp: '2024-01-15T08:15:00Z', actor: 'admin@engenox.com', action: 'feature_flag_toggle', target: 'cross_family_critic', result: 'enabled', details: 'Enabled by admin' },
    { id: 'a3', timestamp: '2024-01-15T06:42:00Z', actor: 'system', action: 'tenant_provision', target: 'tenant:acme-corp', result: 'created', details: 'Growth plan, CNPG cell provisioned' },
    { id: 'a4', timestamp: '2024-01-14T22:10:00Z', actor: 'system', action: 'dial_demotion', target: 'tenant:beta-inc', result: 'demoted', details: 'Alert axis failure — auto-demoted to propose' },
    { id: 'a5', timestamp: '2024-01-14T18:30:00Z', actor: 'pipeline', action: 'intervention_deploy', target: 'prop_45', result: 'completed', details: 'robots.txt AI crawler allow — uplift +7% CI[-2%,16%]' },
  ];

  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection title="Audit Log" description="Immutable audit trail — all administrative actions and system events">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-body-xs text-text-muted border-b border-border">
                <th className="pb-2 pr-4 font-medium w-40">Timestamp</th>
                <th className="pb-2 pr-4 font-medium">Actor</th>
                <th className="pb-2 pr-4 font-medium">Action</th>
                <th className="pb-2 pr-4 font-medium">Target</th>
                <th className="pb-2 pr-4 font-medium">Result</th>
                <th className="pb-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-surface-muted/50">
                  <td className="py-3 pr-4 text-body-xs font-mono text-text-muted">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-body-sm text-text">{entry.actor}</td>
                  <td className="py-3 pr-4">
                    <code className="text-body-xs font-mono bg-surface-muted px-1.5 py-0.5 rounded">{entry.action}</code>
                  </td>
                  <td className="py-3 pr-4 text-body-xs font-mono text-text-muted">{entry.target}</td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={entry.result === 'passed' || entry.result === 'enabled' || entry.result === 'created' || entry.result === 'completed' ? 'success' :
                               entry.result === 'demoted' ? 'warning' : 'outline'}
                      size="xs"
                    >
                      {entry.result}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-body-xs text-text-muted max-w-xs truncate">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pt-4 border-t border-border flex justify-end">
          <Button variant="secondary" size="sm">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export Full Log
          </Button>
        </div>
      </PanelSection>
    </Panel>
  );
}

function MetricCard({ label, value, unit, trend, icon: Icon }: { label: string; value: string; unit: string; trend: 'up' | 'down' | 'neutral'; icon: React.ElementType }) {
  const trendConfig = {
    up: { color: 'text-success', icon: TrendingUp },
    down: { color: 'text-critical', icon: TrendingUp },
    neutral: { color: 'text-text-muted', icon: Minus },
  };
  const config = trendConfig[trend];
  const TrendIcon = config.icon;

  return (
    <div className="p-4 bg-surface-muted/50 rounded-lg border border-border/50">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-text-muted" />
        <TrendIcon className={clsx('h-4 w-4', config.color, trend === 'down' && 'rotate-180')} />
      </div>
      <div className="mt-2">
        <p className="text-heading-lg font-bold text-text flex items-baseline gap-1">
          {value}{unit && <span className="text-body-sm font-normal text-text-muted">{unit}</span>}
        </p>
        <p className="text-body-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-surface-muted/50 rounded-lg" />}>
      <AdminContent />
    </Suspense>
  );
}