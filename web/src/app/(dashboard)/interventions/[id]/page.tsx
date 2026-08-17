// web/src/app/(dashboard)/interventions/[id]/page.tsx
// Intervention Detail — candor floor, three-axis ledger, provenance audit, dry-run diff, approval flow

import { getServerControlPlaneClient } from '@/lib/connect/connect-client';
import { CandorStat, DialSliderCard, DiffPreview, EmptyStates, IntegrityChip, IntegrityDot, Panel, PanelDivider, PanelSection, ProvenanceStrip } from '@engenox/design-system/patterns';
import { Badge, Button, Collapsible, CollapsibleContent, CollapsibleTrigger, HoverCard, HoverCardContent, HoverCardTrigger, Separator, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from '@engenox/design-system/primitives';
import { clsx } from 'clsx';
import { AlertCircle, AlertTriangle, ArrowLeft, Check, CheckCircle, ChevronDown, Clock, Download, Eye, FileText, GitBranch, Info, Pause, Play, Settings, Shield, ShieldCheck, X, XCircle, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import * as React from 'react';

interface Intervention {
  id: string;
  title: string;
  description: string;
  type: 'schema' | 'content' | 'technical' | 'competitive';
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  estimatedImpact: { metric: string; uplift: number; ci: [number, number] };
  diffFiles: { path: string; status: string; changes: number }[];
  dryRunResults?: { success: boolean; errors: string[]; previewUrl?: string };
  candorAssessment: {
    level: 'high' | 'medium' | 'low';
    detail: string[];
    provenance: { sourceId: string; claim: string; confidence: number; evidence: string[] }[];
    threeAxis: { safety: boolean; consent: boolean; evidence: boolean; reason?: string };
    demotionAlert?: { active: boolean; axes: number[]; reason: string };
  };
  provenanceChain: {
    id: string;
    sourceId: string;
    claim: string;
    status: 'verified' | 'pending' | 'disputed' | 'fallback';
    confidence?: number;
    evidence?: string[];
    integrity?: 'intact' | 'tampered' | 'unknown';
    timestamp?: Date;
  }[];
  executionLog?: { timestamp: string; step: string; status: 'success' | 'failed' | 'pending'; details?: string }[];
}

async function getIntervention(id: string): Promise<Intervention | null> {
  // In production: fetch from control-plane service via ConnectRPC
  const client = getServerControlPlaneClient();
  // For now, return mock data
  return mockInterventions.find(i => i.id === id) ?? null;
}

const mockInterventions: Intervention[] = [
  {
    id: 'prop_1',
    title: 'Add Organization schema.org markup to homepage',
    description: 'Inject JSON-LD with legalName, foundingDate, founders, and sameAs profiles.',
    type: 'schema',
    status: 'pending',
    priority: 'high',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    estimatedImpact: { metric: 'Entity recognition confidence', uplift: 18, ci: [8, 28] },
    diffFiles: [
      { path: 'src/app/layout.tsx', status: 'modified', changes: 12 },
      { path: 'src/components/SchemaOrg.tsx', status: 'added', changes: 45 },
    ],
    dryRunResults: { success: true, errors: [], previewUrl: '/preview/prop_1' },
    candorAssessment: {
      level: 'high',
      detail: ['Schema.org markup is deterministic; no LLM hallucination risk', 'Impact estimate from historical A/B tests (n=47)'],
      provenance: [
        { sourceId: 'schema.org/Organization', claim: 'Organization schema improves entity recognition', confidence: 0.91, evidence: ['Google Search Central docs', 'Schema.org spec'] },
        { sourceId: 'historical-A/B', claim: '18% uplift in entity recognition', confidence: 0.82, evidence: ['Test ID: exp_2024_003', 'Test ID: exp_2024_011'] },
      ],
      threeAxis: { safety: true, consent: true, evidence: true },
    },
    provenanceChain: [
      { id: 'p1', sourceId: 'extract-seam', claim: 'ChatGPT misses Engenox Organization schema', status: 'verified', confidence: 0.88, evidence: ['Probe q1: "What is Engenox?"'], integrity: 'intact', timestamp: new Date('2024-01-14T10:00:00Z') },
      { id: 'p2', sourceId: 'adjudicate-seam', claim: 'Conflict type: MISSING_ENTITY', status: 'verified', confidence: 0.94, integrity: 'intact', timestamp: new Date('2024-01-14T10:05:00Z') },
      { id: 'p3', sourceId: 'draft-seam', claim: 'Generated Organization JSON-LD with legalName, foundingDate, sameAs', status: 'verified', confidence: 0.91, integrity: 'intact', timestamp: new Date('2024-01-15T10:20:00Z') },
      { id: 'p4', sourceId: 'critique-seam', claim: 'GPT-5 Critic: ACCEPT_WITH_RESERVATIONS - schema valid but sameAs URLs need verification', status: 'verified', confidence: 0.87, integrity: 'intact', timestamp: new Date('2024-01-15T10:25:00Z') },
    ],
    executionLog: [],
  },
  {
    id: 'prop_2',
    title: 'Correct founding entity in knowledge base',
    description: 'Update entity record: founder from "John Smith" → "Pixenox Solutions".',
    type: 'content',
    status: 'approved',
    priority: 'critical',
    createdAt: '2024-01-14T14:22:00Z',
    updatedAt: '2024-01-15T09:15:00Z',
    estimatedImpact: { metric: 'Entity truth score', uplift: 34, ci: [22, 46] },
    diffFiles: [{ path: 'entities/engenox.json', status: 'modified', changes: 3 }],
    dryRunResults: { success: true, errors: [], previewUrl: '/preview/prop_2' },
    candorAssessment: {
      level: 'high',
      detail: ['Primary source: Delaware Corp Registry (authoritative)', 'ChatGPT hallucination confidence: 62% → evidence: 94%'],
      provenance: [
        { sourceId: 'delaware-corp-registry', claim: 'Engenox incorporated 2024, founder: Pixenox Solutions', confidence: 0.99, evidence: ['File 2024123456'] },
        { sourceId: 'chatgpt-extraction', claim: 'Founder: John Smith', confidence: 0.62, evidence: ['Training data artifact'] },
      ],
      threeAxis: { safety: true, consent: true, evidence: true },
    },
    provenanceChain: [
      { id: 'p1', sourceId: 'extract-seam', claim: 'ChatGPT asserts "John Smith" as founder', status: 'disputed', confidence: 0.62, evidence: ['ChatGPT-4o response'], integrity: 'intact', timestamp: new Date('2024-01-13T14:00:00Z') },
      { id: 'p2', sourceId: 'adjudicate-seam', claim: 'Conflict type: HALLUCINATED_ENTITY', status: 'verified', confidence: 0.96, integrity: 'intact', timestamp: new Date('2024-01-13T14:05:00Z') },
      { id: 'p3', sourceId: 'evidence-lookup', claim: 'Delaware registry shows Pixenox Solutions (2024)', status: 'verified', confidence: 0.99, evidence: ['DE File 2024123456'], integrity: 'intact', timestamp: new Date('2024-01-14T09:00:00Z') },
      { id: 'p4', sourceId: 'critique-seam', claim: 'GPT-5 Critic: ACCEPT - correction grounded in primary source', status: 'verified', confidence: 0.93, integrity: 'intact', timestamp: new Date('2024-01-14T14:20:00Z') },
    ],
    executionLog: [],
  },
];

interface InterventionDetailPageProps {
  params: Promise<{ id: string }>;
}

async function InterventionContent({ params }: InterventionDetailPageProps) {
  const { id } = await params;
  const intervention = await getIntervention(id);

  if (!intervention) {
    notFound();
  }

  const statusConfig = {
    draft: { label: 'Draft', icon: FileText, color: 'text-text-muted bg-surface-muted' },
    pending: { label: 'Pending Review', icon: Clock, color: 'text-warning bg-warning/10 border-warning/20' },
    approved: { label: 'Approved', icon: CheckCircle, color: 'text-success bg-success/10 border-success/20' },
    rejected: { label: 'Rejected', icon: XCircle, color: 'text-critical bg-critical/10 border-critical/20' },
    executing: { label: 'Executing', icon: Play, color: 'text-brand bg-brand/10 border-brand/20' },
    completed: { label: 'Completed', icon: ShieldCheck, color: 'text-success bg-success/10' },
    failed: { label: 'Failed', icon: AlertTriangle, color: 'text-critical bg-critical/10 border-critical/20' },
  };

  const config = statusConfig[intervention.status];
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Header with back link */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <a href="/dashboard/interventions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Interventions
          </a>
        </Button>
        <div className="flex-1">
          <h1 className="text-heading-xl font-bold text-text">{intervention.title}</h1>
          <p className="text-body-sm text-text-muted mt-1">{intervention.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={intervention.priority === 'critical' ? 'critical' : intervention.priority === 'high' ? 'warning' : 'outline'} size="sm">
            {intervention.priority}
          </Badge>
          <Badge variant="outline" size="sm" className={config.color}>
            <config.icon className="h-3 w-3 mr-1.5" />
            {config.label}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candor floor assessment */}
          <Panel variant="outlined" density="comfortable">
            <PanelSection
              title={
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-brand" />
                  <span>Candor Floor Assessment</span>
                </div>
              }
              description="Honest evaluation of evidence quality, confidence intervals, and risks. No inflated claims."
            >
              <CandorStat
                data-testid="candor-floor"
                label="Candor Level"
                value={intervention.candorAssessment.level.charAt(0).toUpperCase() + intervention.candorAssessment.level.slice(1)}
                honesty={intervention.candorAssessment.level}
                honestyDetail={intervention.candorAssessment.detail}
                provenance={intervention.candorAssessment.provenance}
              />
            </PanelSection>
          </Panel>

          {/* Three-Axis Ledger */}
          <Panel variant="outlined" density="comfortable">
            <PanelSection
              title={
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-brand" />
                  <span>Three-Axis Escalation Ledger</span>
                </div>
              }
              description="Escalation from Propose → Approve → Execute requires ALL three axes to pass."
            >
              <ThreeAxisLedger
                data-testid="three-axis-ledger"
                axes={intervention.candorAssessment.threeAxis}
                demotionAlert={intervention.candorAssessment.demotionAlert}
              />
            </PanelSection>
          </Panel>

          {/* Provenance Audit Trail */}
          <Panel variant="outlined" density="comfortable">
            <PanelSection
              title={
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-brand" />
                  <span>Provenance Audit Trail</span>
                </div>
              }
              description="Full causal chain from perception → adjudication → draft → critique. Hover for detail."
            >
              <ProvenanceStrip
                data-testid="provenance-strip"
                entries={intervention.provenanceChain}
                showIntegrity
                maxVisible={8}
              />
            </PanelSection>
          </Panel>

          {/* Dry-run Diff */}
          <Panel variant="outlined" density="comfortable">
            <PanelSection
              title={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand" />
                    <span>Dry-Run Diff Preview</span>
                  </div>
                  {intervention.dryRunResults && (
                    <Badge variant={intervention.dryRunResults.success ? 'success' : 'critical'} size="sm">
                      {intervention.dryRunResults.success ? 'Dry-run passed' : 'Dry-run failed'}
                    </Badge>
                  )}
                </div>
              }
              description="Preview changes before approval. No writes occur in dry-run mode."
            >
              <InterventionDiffPreview data-testid="dry-run-diff" diffFiles={intervention.diffFiles} />
              {intervention.dryRunResults && intervention.dryRunResults.errors.length > 0 && (
                <div className="mt-4 p-3 bg-critical/5 border border-critical/20 rounded-lg text-critical text-body-sm">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  <strong>Errors:</strong>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    {intervention.dryRunResults.errors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}
            </PanelSection>
          </Panel>

          {/* Execution Log */}
          {intervention.executionLog && intervention.executionLog.length > 0 && (
            <Panel variant="outlined" density="comfortable">
              <PanelSection title="Execution Log" description="Step-by-step execution trace (populated after approval).">
                <div className="space-y-2">
                  {intervention.executionLog.map((log) => (
                    <ExecutionLogEntry key={log.timestamp + log.step} log={log} />
                  ))}
                </div>
              </PanelSection>
            </Panel>
          )}

          {/* Impact Estimate with CI */}
          <Panel variant="outlined" density="comfortable">
            <PanelSection
              title={
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand" />
                  <span>Estimated Impact</span>
                </div>
              }
              description="Counterfactual uplift estimate with 95% confidence interval. Rendered only with CI — never a point estimate alone."
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-display-sm font-mono tabular-nums text-brand">{intervention.estimatedImpact.uplift}%</span>
                    <span className="text-body-sm text-text-muted">uplift in</span>
                    <span className="font-medium text-text">{intervention.estimatedImpact.metric}</span>
                  </div>
                  <div className="flex items-center gap-4 text-body-sm text-text-muted">
                    <span>CI 95%: [{intervention.estimatedImpact.ci[0]}%, {intervention.estimatedImpact.ci[1]}%]</span>
                    <span className="font-mono">n=estimated</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" asChild>
                    <a href={intervention.dryRunResults?.previewUrl ?? '#'}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </a>
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>
            </PanelSection>
          </Panel>
        </div>

        {/* Sidebar: Dial + Actions + Metadata */}
        <div className="space-y-6">
          {/* Autonomy Dial */}
          <Panel variant="outlined" density="comfortable" data-testid="autonomy-dial">
            <PanelSection title="Autonomy Dial" description="Controls write authority. Default: Propose (Co-Pilot).">
              <DialSliderCard
                data-testid="dial-slider"
                value={1}
                onChange={() => {}}
                dryRunMode={true}
                onDryRunToggle={() => {}}
                demotionAlert={intervention.candorAssessment.demotionAlert}
              />
            </PanelSection>
          </Panel>

          {/* Actions */}
          <Panel variant="outlined" density="comfortable">
            <PanelSection title="Actions">
              <div className="space-y-3">
                {intervention.status === 'pending' && (
                  <>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-critical" onClick={() => {}}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button data-testid="propose-button" variant="primary" size="sm" className="w-full justify-start" onClick={() => {}}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
                {intervention.status === 'approved' && (
                  <Button variant="primary" size="sm" className="w-full justify-start" onClick={() => {}}>
                    <Play className="h-4 w-4 mr-2" />
                    Execute
                  </Button>
                )}
                {intervention.status === 'executing' && (
                  <Button variant="secondary" size="sm" className="w-full justify-start" disabled>
                    <Pause className="h-4 w-4 mr-2" />
                    Executing...
                  </Button>
                )}
                {['completed', 'failed', 'rejected'].includes(intervention.status) && (
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => {}}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Outcome
                  </Button>
                )}

                <Separator className="my-2" />

                <Button variant="secondary" size="sm" className="w-full justify-start" asChild>
                  <a href={`/dashboard/interventions/${intervention.id}`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Intervention Settings
                  </a>
                </Button>
              </div>
            </PanelSection>
          </Panel>

          {/* Metadata */}
          <Panel variant="outlined" density="comfortable">
            <PanelSection title="Metadata">
              <dl className="space-y-3 text-body-sm">
                <div className="flex justify-between">
                  <dt className="text-text-muted">ID</dt>
                  <dd className="font-mono text-text">{intervention.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Type</dt>
                  <dd className="font-medium text-text capitalize">{intervention.type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Created</dt>
                  <dd className="font-mono text-text">{new Date(intervention.createdAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Updated</dt>
                  <dd className="font-mono text-text">{new Date(intervention.updatedAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Files Changed</dt>
                  <dd className="font-medium text-text">{intervention.diffFiles.length}</dd>
                </div>
              </dl>
            </PanelSection>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ThreeAxisLedger({
  axes,
  demotionAlert,
}: {
  axes: { safety: boolean; consent: boolean; evidence: boolean; reason?: string };
  demotionAlert?: { active: boolean; axes: number[]; reason: string } | undefined;
}) {
  const AXIS_LABELS = ['Safety', 'Consent', 'Evidence'] as const;
  const AXIS_ICONS = [Shield, ShieldCheck, AlertTriangle] as const;

  return (
    <div className="space-y-3">
      {AXIS_LABELS.map((axis, i) => {
        const pass = axes[axis.toLowerCase() as keyof typeof axes];
        return (
          <div
            key={axis}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-lg border transition-colors',
              demotionAlert?.axes.includes(i)
                ? 'bg-critical/5 border-critical/20'
                : 'bg-surface-muted border-border'
            )}
          >
            <span className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-mono text-body-xs', pass ? 'bg-success text-background' : 'bg-critical text-background')}>
              {pass ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            </span>
            <span className={clsx('font-medium flex-1', !pass && 'text-critical')}>{axis}</span>
            <span className={clsx('px-2 py-0.5 rounded text-body-xs font-medium', pass ? 'bg-success/10 text-success' : 'bg-critical/10 text-critical')}>
              {pass ? 'PASS' : 'FAIL'}
            </span>
          </div>
        );
      })}

      {demotionAlert?.active && (
        <div className="p-3 bg-critical/5 border border-critical/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-critical mr-2" />
          <div>
            <p className="font-medium text-critical text-body-sm">Auto-demotion triggered</p>
            <p className="text-body-xs text-text-muted mt-0.5">{demotionAlert.reason}</p>
            <p className="text-body-xs text-text-muted mt-1">Manual override required to re-escalate.</p>
          </div>
        </div>
      )}

      {!demotionAlert?.active && axes.safety && axes.consent && axes.evidence && (
        <div className="p-3 bg-success/5 border border-success/20 rounded-lg text-success text-body-sm font-medium">
          <CheckCircle className="h-4 w-4 inline mr-2" />
          All axes pass — eligible for escalation
        </div>
      )}
    </div>
  );
}

function InterventionDiffPreview({ diffFiles }: { diffFiles: { path: string; status: string; changes: number }[] }) {
  return (
    <div className="space-y-3 max-h-96 overflow-auto">
      {diffFiles.map((file, i) => (
        <div key={i} className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-surface-muted border-b border-border">
            <span className="font-mono text-body-sm text-text">{file.path}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" size="xs" className={
                file.status === 'added' ? 'text-success border-success/30' :
                file.status === 'removed' ? 'text-critical border-critical/30' :
                'text-brand border-brand/30'
              }>
                {file.status}
              </Badge>
              <Badge variant="outline" size="xs">{file.changes} changes</Badge>
            </div>
          </div>
          <div className="p-3 font-mono text-body-xs bg-background border-t border-border">
            <div className="text-success">+ Added lines: {file.status === 'added' ? file.changes : Math.floor(file.changes * 0.6)}</div>
            <div className="text-critical">- Removed lines: {file.status === 'removed' ? file.changes : Math.floor(file.changes * 0.4)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExecutionLogEntry({ log }: { log: { timestamp: string; step: string; status: 'success' | 'failed' | 'pending'; details?: string } }) {
  const statusConfig = {
    success: { icon: CheckCircle, color: 'text-success' },
    failed: { icon: XCircle, color: 'text-critical' },
    pending: { icon: Clock, color: 'text-warning' },
  };
  const config = statusConfig[log.status];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted/50">
      <Icon className={clsx('h-4 w-4 mt-0.5 flex-shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{log.step}</span>
          <time className="text-body-xs text-text-muted font-mono">{new Date(log.timestamp).toLocaleTimeString()}</time>
        </div>
        {log.details && <p className="text-body-sm text-text-muted mt-1">{log.details}</p>}
      </div>
      <Badge variant="outline" size="xs" className={config.color}>
        {log.status}
      </Badge>
    </div>
  );
}

export const metadata: Metadata = {
  title: 'Intervention Detail',
  description: 'Review intervention proposal with candor floor, provenance audit, and dry-run preview',
};

export default async function InterventionDetailPage({ params }: InterventionDetailPageProps) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-surface-muted/50 rounded-lg" />}>
      <InterventionContent params={params} />
    </Suspense>
  );
}