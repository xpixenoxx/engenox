'use client';
// web/src/app/(dashboard)/interventions/page.tsx
// Interventions — proposal review, approval, execution, dry-run mode

import { DialSliderCard, DiffPreview, EmptyStates, Panel, PanelDivider, PanelSection } from '@engenox/design-system/patterns';
import { Badge, Button, Select, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from '@engenox/design-system/primitives';
import { clsx } from 'clsx';
import { AlertTriangle, Check, Clock, FileText, Pause, Play, Settings, Shield, X, Zap } from 'lucide-react';
import { Suspense } from 'react';


interface Proposal {
  id: string;
  title: string;
  description: string;
  type: 'schema' | 'content' | 'technical' | 'competitive';
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  estimatedImpact: { metric: string; uplift: number; ci: [number, number] };
  diffFiles: { path: string; status: string; changes: number }[];
  dryRunResults?: { success: boolean; errors: string[]; previewUrl?: string };
}

function InterventionsContent() {
  const proposals: Proposal[] = [
    {
      id: 'prop_1',
      title: 'Add Organization schema.org markup to homepage',
      description: 'Inject JSON-LD with legalName, foundingDate, founders, and sameAs profiles.',
      type: 'schema',
      status: 'pending',
      priority: 'high',
      createdAt: '2024-01-15T10:30:00Z',
      estimatedImpact: { metric: 'Entity recognition confidence', uplift: 18, ci: [8, 28] },
      diffFiles: [
        { path: 'src/app/layout.tsx', status: 'modified', changes: 12 },
        { path: 'src/components/SchemaOrg.tsx', status: 'added', changes: 45 },
      ],
      dryRunResults: { success: true, errors: [], previewUrl: '/preview/prop_1' },
    },
    {
      id: 'prop_2',
      title: 'Correct founding entity in knowledge base',
      description: 'Update entity record: founder from "John Smith" → "Pixenox Solutions".',
      type: 'content',
      status: 'approved',
      priority: 'critical',
      createdAt: '2024-01-14T14:22:00Z',
      estimatedImpact: { metric: 'Entity truth score', uplift: 34, ci: [22, 46] },
      diffFiles: [{ path: 'entities/engenox.json', status: 'modified', changes: 3 }],
    },
    {
      id: 'prop_3',
      title: 'Add competitor comparison page',
      description: 'Create /compare page with structured data for competitive queries.',
      type: 'competitive',
      status: 'draft',
      priority: 'medium',
      createdAt: '2024-01-13T09:15:00Z',
      estimatedImpact: { metric: 'Competitive query visibility', uplift: 12, ci: [2, 22] },
      diffFiles: [
        { path: 'src/app/compare/page.tsx', status: 'added', changes: 120 },
        { path: 'src/components/ComparisonTable.tsx', status: 'added', changes: 85 },
      ],
    },
    {
      id: 'prop_4',
      title: 'Fix robots.txt crawler directives',
      description: 'Allow AI crawlers (GPTBot, PerplexityBot, etc.) while blocking scrapers.',
      type: 'technical',
      status: 'executing',
      priority: 'high',
      createdAt: '2024-01-12T16:45:00Z',
      estimatedImpact: { metric: 'Crawl coverage', uplift: 8, ci: [1, 15] },
      diffFiles: [{ path: 'public/robots.txt', status: 'modified', changes: 8 }],
    },
  ];

  const [activeTab, setActiveTab] = React.useState<string>('all');

  const filtered = proposals.filter((p) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return ['pending', 'draft'].includes(p.status);
    if (activeTab === 'approved') return ['approved', 'executing'].includes(p.status);
    return ['completed', 'failed'].includes(p.status);
  });

  return (
    <div className="space-y-6">
      {/* Header with dial */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-heading-xl font-bold text-text">Interventions</h1>
          <p className="text-body-sm text-text-muted mt-1">
            Review proposals, preview changes in dry-run, approve for execution.
          </p>
        </div>
        <DialSliderCard
          value={1}
          onChange={() => {}}
          dryRunMode={true}
          onDryRunToggle={() => {}}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="all">All ({proposals.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({proposals.filter(p => ['pending', 'draft'].includes(p.status)).length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({proposals.filter(p => ['approved', 'executing'].includes(p.status)).length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({proposals.filter(p => ['completed', 'failed'].includes(p.status)).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          {filtered.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </TabsContent>
        <TabsContent value="pending" className="mt-6 space-y-4">
          {filtered.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </TabsContent>
        <TabsContent value="approved" className="mt-6 space-y-4">
          {filtered.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </TabsContent>
        <TabsContent value="completed" className="mt-6 space-y-4">
          {filtered.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </TabsContent>
      </Tabs>

      {filtered.length === 0 && (
        <EmptyStates.NoProposals
          customPrimaryAction={{
            label: 'Run AtlasCycle',
            onClick: () => { window.location.href = '/dashboard/perception'; },
          }}
        />
      )}
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const statusConfig = {
    draft: { label: 'Draft', icon: FileText, color: 'text-text-muted bg-surface-muted' },
    pending: { label: 'Pending Review', icon: Clock, color: 'text-warning bg-warning/10 border-warning/20' },
    approved: { label: 'Approved', icon: Check, color: 'text-success bg-success/10 border-success/20' },
    rejected: { label: 'Rejected', icon: X, color: 'text-critical bg-critical/10 border-critical/20' },
    executing: { label: 'Executing', icon: Play, color: 'text-brand bg-brand/10 border-brand/20' },
    completed: { label: 'Completed', icon: Shield, color: 'text-success bg-success/10' },
    failed: { label: 'Failed', icon: AlertTriangle, color: 'text-critical bg-critical/10 border-critical/20' },
  };

  const config = statusConfig[proposal.status];
  const Icon = config.icon;
  const priorityColors = {
    low: 'text-text-muted bg-surface-muted',
    medium: 'text-brand bg-brand/10',
    high: 'text-warning bg-warning/10',
    critical: 'text-critical bg-critical/10',
  };

  const diffs = proposal.diffFiles.map((f) => {
    type DiffLine = { type: 'context' | 'added' | 'removed'; content: string; lineNumber?: { old?: number; new?: number } };
    const diff: {
      path: string;
      oldPath?: string;
      newPath?: string;
      status: 'added' | 'removed' | 'modified' | 'renamed';
      hunks: { oldStart: number; oldLines: number; newStart: number; newLines: number; lines: DiffLine[] }[];
      binary: boolean;
    } = {
      path: f.path,
      status: f.status as 'added' | 'removed' | 'modified' | 'renamed',
      hunks: [
        {
          oldStart: 1,
          oldLines: 10,
          newStart: 1,
          newLines: 12,
          lines: [
            { type: 'context', content: '// Existing code' },
            { type: 'added', content: '+  // New intervention code', lineNumber: { new: 2 } },
            { type: 'context', content: '  doSomething()' },
          ],
        },
      ],
      binary: false,
    };
    if (f.status !== 'added') diff.oldPath = f.path;
    if (f.status !== 'removed') diff.newPath = f.path;
    return diff;
  });

  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection
        title={
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-heading-sm font-semibold text-text">{proposal.title}</h3>
                <Badge variant={proposal.priority === 'critical' ? 'critical' : proposal.priority === 'high' ? 'warning' : 'outline'} size="xs">
                  {proposal.priority}
                </Badge>
              </div>
              <p className="text-body-sm text-text-muted">{proposal.description}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge variant="outline" size="xs" className={config.color}>
                <Icon className="h-3 w-3 mr-1" aria-hidden="true" />
                {config.label}
              </Badge>
            </div>
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-4 text-body-xs text-text-muted">
            <span><FileText className="h-3 w-3 inline mr-1" /> {proposal.diffFiles.length} files</span>
            <span><Zap className="h-3 w-3 inline mr-1" /> Est. +{proposal.estimatedImpact.uplift}% {proposal.estimatedImpact.metric}</span>
            <span>CI: [{proposal.estimatedImpact.ci[0]}%, {proposal.estimatedImpact.ci[1]}%]</span>
          </div>
        }
      >
        {/* Diff preview */}
        <DiffPreview diffs={diffs} defaultView="unified" maxLinesPerFile={50} />

        {/* Actions */}
        <PanelDivider className="my-3" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Switch
              checked={false}
              onCheckedChange={() => {}}
              aria-label="Dry-run mode"
            />
            <span className="text-body-sm text-text-muted">Dry-run mode</span>
            {proposal.dryRunResults && (
              <Badge
                variant={proposal.dryRunResults.success ? 'success' : 'critical'}
                size="xs"
              >
                {proposal.dryRunResults.success ? 'Dry-run passed' : 'Dry-run failed'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {proposal.status === 'pending' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => {}}>
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Reject
                </Button>
                <Button variant="primary" size="sm" onClick={() => {}}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Approve
                </Button>
              </>
            )}
            {proposal.status === 'approved' && (
              <Button variant="primary" size="sm" onClick={() => {}}>
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Execute
              </Button>
            )}
            {proposal.status === 'executing' && (
              <Button variant="secondary" size="sm" disabled>
                <Pause className="h-3.5 w-3.5 mr-1.5" />
                Executing...
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <a href={`/dashboard/interventions/${proposal.id}`}>
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Details
              </a>
            </Button>
          </div>
        </div>
      </PanelSection>
    </Panel>
  );
}

import * as React from 'react';

export default function InterventionsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-surface-muted/50 rounded-lg" />}>
      <InterventionsContent />
    </Suspense>
  );
}