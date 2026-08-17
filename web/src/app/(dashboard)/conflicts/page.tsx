'use client';
// web/src/app/(dashboard)/conflicts/page.tsx
// Conflicts — entity-level conflict detection, triage, and resolution queue

import { CandorStat, ConflictTrio, EmptyStates, Panel, PanelSection, ProvenanceStrip } from '@engenox/design-system/patterns';
import { Badge, Button, Content, Input, Item, Select, Tabs, TabsContent, TabsList, TabsTrigger, Trigger, Viewport } from '@engenox/design-system/primitives';
import * as SelectPrimitive from '@radix-ui/react-select';
import { clsx } from 'clsx';
import { AlertCircle, AlertTriangle, ArrowUpDown, CheckCircle, ChevronDown, Eye, FileText, Filter, Search, XCircle } from 'lucide-react';
import { Suspense } from 'react';
import * as React from 'react';


interface ConflictClaim {
  value: string;
  confidence?: number;
  sources?: string[];
  evidence?: string[];
  status?: 'verified' | 'pending' | 'disputed' | 'fallback';
  integrity?: 'intact' | 'tampered' | 'unknown';
  metadata?: Record<string, string>;
}

interface Conflict {
  id: string;
  entityId: string;
  entityName: string;
  entityType: string;
  entityAvatar?: string;
  surface: 'chatgpt' | 'perplexity' | 'gemini' | 'grok' | 'claude';
  surfaceName: string;
  conflictType: 'missing' | 'conflicting' | 'outdated' | 'hallucinated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'triaged' | 'proposed' | 'approved' | 'rejected' | 'resolved';
  aiClaim: ConflictClaim;
  evidence: ConflictClaim;
  proposal?: ConflictClaim;
  detectedAt: string;
  updatedAt: string;
  candorLevel?: 'high' | 'medium' | 'low';
  candorDetail?: string[];
}

function ConflictsContent() {
  const conflicts: Conflict[] = [
    {
      id: 'conf_1',
      entityId: 'ent_engenox',
      entityName: 'Engenox',
      entityType: 'Organization',
      entityAvatar: '🧭',
      surface: 'chatgpt',
      surfaceName: 'ChatGPT',
      conflictType: 'hallucinated',
      severity: 'critical',
      status: 'open',
      aiClaim: {
        value: '"Engenox was founded in 2023 by John Smith"',
        confidence: 0.62,
        sources: ['ChatGPT-4o training data'],
        evidence: [],
        status: 'disputed',
        integrity: 'unknown',
      },
      evidence: {
        value: 'No public record of "John Smith" as founder. Engenox incorporated 2024. Founder: Pixenox Solutions.',
        confidence: 0.94,
        sources: ['Delaware Corp Registry', 'Engenox.com/about'],
        evidence: ['Certificate of Incorporation 2024', 'Engenox About page'],
        status: 'verified',
        integrity: 'intact',
      },
      proposal: {
        value: 'Correct founding entity to "Pixenox Solutions (2024)". Flag ChatGPT assertion as hallucination.',
        confidence: 0.89,
        status: 'verified',
        integrity: 'intact',
      },
      detectedAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      candorLevel: 'high',
      candorDetail: ['High-confidence evidence from official registry'],
    },
    {
      id: 'conf_2',
      entityId: 'ent_ai_visibility',
      entityName: 'AI Visibility',
      entityType: 'Concept',
      entityAvatar: '👁️',
      surface: 'perplexity',
      surfaceName: 'Perplexity',
      conflictType: 'missing',
      severity: 'high',
      status: 'proposed',
      aiClaim: {
        value: '"AI Visibility is a term coined by Gartner in 2022"',
        confidence: 0.48,
        sources: ['Perplexity web search'],
        status: 'fallback',
        integrity: 'unknown',
      },
      evidence: {
        value: 'Term appears in blog posts from 2021; no Gartner citation found.',
        confidence: 0.72,
        sources: ['Web archive', 'Academic citations'],
        evidence: ['Blog post Jan 2021', 'Twitter thread Feb 2021'],
        status: 'verified',
        integrity: 'intact',
      },
      proposal: {
        value: 'Add citation to earliest known usage; remove Gartner attribution.',
        confidence: 0.78,
        status: 'verified',
        integrity: 'intact',
      },
      detectedAt: '2024-01-14T14:22:00Z',
      updatedAt: '2024-01-15T09:15:00Z',
      candorLevel: 'medium',
      candorDetail: ['Evidence from web archive, not primary source'],
    },
    {
      id: 'conf_3',
      entityId: 'ent_founder',
      entityName: 'Pixenox Solutions',
      entityType: 'Organization',
      entityAvatar: '🏢',
      surface: 'gemini',
      surfaceName: 'Gemini',
      conflictType: 'conflicting',
      severity: 'medium',
      status: 'triaged',
      aiClaim: {
        value: '"Pixenox Solutions is a design agency based in London"',
        confidence: 0.55,
        sources: ['Gemini 1.5 Pro'],
        status: 'disputed',
        integrity: 'unknown',
      },
      evidence: {
        value: 'Pixenox Solutions is registered in Delaware, USA. No UK entity found.',
        confidence: 0.88,
        sources: ['Delaware Corp Registry', 'Crunchbase'],
        evidence: ['DE File Number 2024123456', 'Crunchbase profile'],
        status: 'verified',
        integrity: 'intact',
      },
      proposal: {
        value: 'Update location to "Delaware, USA". Add clarification: agency + SaaS studio.',
        confidence: 0.81,
        status: 'verified',
        integrity: 'intact',
      },
      detectedAt: '2024-01-13T09:15:00Z',
      updatedAt: '2024-01-14T11:30:00Z',
      candorLevel: 'high',
    },
    {
      id: 'conf_4',
      entityId: 'ent_competitor',
      entityName: 'CompetitorX',
      entityType: 'Organization',
      entityAvatar: '⚔️',
      surface: 'grok',
      surfaceName: 'Grok',
      conflictType: 'outdated',
      severity: 'low',
      status: 'resolved',
      aiClaim: {
        value: '"CompetitorX pricing starts at $99/mo"',
        confidence: 0.42,
        sources: ['Grok-2 training data (cutoff 2023)'],
        status: 'fallback',
        integrity: 'intact',
      },
      evidence: {
        value: 'Current pricing: $49/mo (since Q3 2024). Source: CompetitorX.com/pricing',
        confidence: 0.96,
        sources: ['CompetitorX.com/pricing', 'Wayback Machine'],
        status: 'verified',
        integrity: 'intact',
      },
      proposal: {
        value: 'Update pricing reference to current $49/mo with citation.',
        confidence: 0.91,
        status: 'verified',
        integrity: 'intact',
      },
      detectedAt: '2024-01-12T16:45:00Z',
      updatedAt: '2024-01-13T10:00:00Z',
      candorLevel: 'high',
    },
    {
      id: 'conf_5',
      entityId: 'ent_product',
      entityName: 'Engenox Atlas',
      entityType: 'Product',
      entityAvatar: '🗺️',
      surface: 'claude',
      surfaceName: 'Claude',
      conflictType: 'missing',
      severity: 'medium',
      status: 'approved',
      aiClaim: {
        value: '"Engenox Atlas is a feature of the Engenox platform"',
        confidence: 0.35,
        sources: ['Claude training data'],
        status: 'fallback',
        integrity: 'unknown',
      },
      evidence: {
        value: 'Atlas is the internal codename for the closed-loop orchestration engine. Not a user-facing product name.',
        confidence: 0.93,
        sources: ['Internal docs', 'Engenox architecture docs'],
        status: 'verified',
        integrity: 'intact',
      },
      proposal: {
        value: 'Clarify: Atlas is the orchestration engine (internal). User-facing: "Engenox Perception", "Engenox Decision".',
        confidence: 0.87,
        status: 'verified',
        integrity: 'intact',
      },
      detectedAt: '2024-01-11T11:20:00Z',
      updatedAt: '2024-01-12T14:00:00Z',
      candorLevel: 'high',
    },
  ];

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [severityFilter, setSeverityFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<string>('detectedAt_desc');
  const [selectedConflict, setSelectedConflict] = React.useState<Conflict | null>(null);

  const filteredConflicts = conflicts
    .filter((c) => {
      if (searchQuery && !c.entityName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !c.aiClaim.value.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (severityFilter !== 'all' && c.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && c.conflictType !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'detectedAt_desc') return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
      if (sortBy === 'detectedAt_asc') return new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime();
      if (sortBy === 'severity_desc') {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      if (sortBy === 'severity_asc') {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      if (sortBy === 'status') return b.status.localeCompare(a.status);
      if (sortBy === 'entityName') return a.entityName.localeCompare(b.entityName);
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });

  const openConflicts = conflicts.filter(c => ['open', 'triaged', 'proposed'].includes(c.status)).length;
  const resolvedConflicts = conflicts.filter(c => c.status === 'resolved').length;
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-heading-xl font-bold text-text">Conflicts</h1>
          <p className="text-body-sm text-text-muted mt-1">
            Entity-level conflicts detected across AI surfaces. Triage → Propose → Approve → Resolve.
          </p>
        </div>

        {/* Candor-floor summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto">
          <CandorStat
            label="Open Conflicts"
            value={openConflicts}
            delta={{ value: 3, label: 'this week', trend: 'up' }}
            honesty="high"
            honestyDetail={['Includes 2 newly detected this cycle']}
          />
          <CandorStat
            label="Critical"
            value={criticalConflicts}
            unit=""
            delta={{ value: -1, label: 'resolved', trend: 'down' }}
            honesty="high"
          />
          <CandorStat
            label="Resolved"
            value={resolvedConflicts}
            delta={{ value: 4, label: 'this week', trend: 'up' }}
            honesty="high"
          />
          <CandorStat
            label="Avg Resolution"
            value={2.4}
            unit="d"
            ci={{ lower: 1.8, upper: 3.1, level: 0.9 }}
            honesty="medium"
            honestyDetail={['Small sample (n=12); CI will tighten with volume']}
          />
        </div>
      </div>

      {/* Controls */}
      <Panel variant="outlined" density="compact" className="space-y-4 p-4">
        <div className="flex flex-col sm:flex-row gap-4" data-testid="filter-controls">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
            <Input
              data-testid="search-input"
              placeholder="Search conflicts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <Trigger data-testid="status-filter" className="w-full sm:w-40">
              <SelectPrimitive.Value placeholder="All statuses" />
              <ChevronDown className="ml-auto h-4 w-4" aria-hidden="true" />
            </Trigger>
            <Content>
              <Viewport>
                <Item value="all" data-value="all">All statuses</Item>
                <Item value="open" data-value="open">Open</Item>
                <Item value="triaged" data-value="triaged">Triaged</Item>
                <Item value="proposed" data-value="proposed">Proposed</Item>
                <Item value="approved" data-value="approved">Approved</Item>
                <Item value="rejected" data-value="rejected">Rejected</Item>
                <Item value="resolved" data-value="resolved">Resolved</Item>
              </Viewport>
            </Content>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <Trigger data-testid="severity-filter" className="w-full sm:w-40">
              <SelectPrimitive.Value placeholder="All severities" />
              <ChevronDown className="ml-auto h-4 w-4" aria-hidden="true" />
            </Trigger>
            <Content>
              <Viewport>
                <Item value="all" data-value="all">All severities</Item>
                <Item value="critical" data-value="critical">Critical</Item>
                <Item value="high" data-value="high">High</Item>
                <Item value="medium" data-value="medium">Medium</Item>
                <Item value="low" data-value="low">Low</Item>
              </Viewport>
            </Content>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <Trigger data-testid="type-filter" className="w-full sm:w-40">
              <SelectPrimitive.Value placeholder="All types" />
              <ChevronDown className="ml-auto h-4 w-4" aria-hidden="true" />
            </Trigger>
            <Content>
              <Viewport>
                <Item value="all" data-value="all">All types</Item>
                <Item value="missing" data-value="missing">Missing</Item>
                <Item value="conflicting" data-value="conflicting">Conflicting</Item>
                <Item value="outdated" data-value="outdated">Outdated</Item>
                <Item value="hallucinated" data-value="hallucinated">Hallucinated</Item>
              </Viewport>
            </Content>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <Trigger data-testid="sort-select" className="w-full sm:w-44">
              <SelectPrimitive.Value placeholder="Sort by" />
              <ChevronDown className="ml-auto h-4 w-4" aria-hidden="true" />
            </Trigger>
            <Content>
              <Viewport>
                <Item value="detectedAt_desc" data-value="detectedAt_desc">Detected (newest)</Item>
                <Item value="detectedAt_asc" data-value="detectedAt_asc">Detected (oldest)</Item>
                <Item value="severity_desc" data-value="severity_desc">Severity (highest)</Item>
                <Item value="severity_asc" data-value="severity_asc">Severity (lowest)</Item>
                <Item value="status" data-value="status">Status</Item>
                <Item value="entityName" data-value="entityName">Entity Name</Item>
              </Viewport>
            </Content>
          </Select>
        </div>
      </Panel>

      {/* Conflict list */}
      <Panel variant="outlined" density="comfortable" className="overflow-hidden">
        <PanelSection
          title={
            <div className="flex items-center justify-between">
              <span>Conflict Queue</span>
              <Badge variant="outline" size="sm">{filteredConflicts.length} results</Badge>
            </div>
          }
          description="Conflicts detected by the perception layer. Click to view details and propose resolutions."
        >
          {filteredConflicts.length === 0 ? (
            <EmptyStates.NoPerceptionData
              customTitle="No Conflicts Found"
              customDescription="Adjust your filters or run an AtlasCycle to detect new conflicts."
            />
          ) : (
            <div className="divide-y divide-border">
              {filteredConflicts.map((conflict) => (
                <ConflictRow
                  key={conflict.id}
                  conflict={conflict}
                  isSelected={selectedConflict?.id === conflict.id}
                  onClick={() => setSelectedConflict(conflict)}
                />
              ))}
            </div>
          )}
        </PanelSection>
      </Panel>

      {/* Detail panel */}
      {selectedConflict && (
        <ConflictDetailPanel
          conflict={selectedConflict}
          onClose={() => setSelectedConflict(null)}
        />
      )}
    </div>
  );
}

interface ConflictRowProps {
  conflict: Conflict;
  isSelected: boolean;
  onClick: () => void;
}

function ConflictRow({ conflict, isSelected, onClick }: ConflictRowProps) {
  const severityConfig = {
    critical: { color: 'text-critical', bg: 'bg-critical/10', border: 'border-critical/20', icon: AlertTriangle },
    high: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: AlertCircle },
    medium: { color: 'text-brand', bg: 'bg-brand/10', border: 'border-brand/20', icon: FileText },
    low: { color: 'text-text-muted', bg: 'bg-surface-muted', border: 'border-border', icon: FileText },
  };

  const statusConfig = {
    open: { label: 'Open', color: 'text-text-muted bg-surface-muted' },
    triaged: { label: 'Triaged', color: 'text-brand bg-brand/10 border-brand/20' },
    proposed: { label: 'Proposed', color: 'text-warning bg-warning/10 border-warning/20' },
    approved: { label: 'Approved', color: 'text-success bg-success/10 border-success/20' },
    rejected: { label: 'Rejected', color: 'text-critical bg-critical/10 border-critical/20' },
    resolved: { label: 'Resolved', color: 'text-success bg-success/10' },
  };

  const sev = severityConfig[conflict.severity];
  const sta = statusConfig[conflict.status];
  const SevIcon = sev.icon;

  return (
    <button
      type="button"
      data-testid="conflict-row"
      data-conflict-id={conflict.id}
      onClick={onClick}
      className={clsx(
        'w-full px-4 py-4 text-left transition-colors',
        'hover:bg-surface-muted/50',
        isSelected && 'bg-brand/5 border-l-4 border-brand',
        !isSelected && 'border-l-4 border-transparent'
      )}
      aria-pressed={isSelected}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Entity + Surface */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {conflict.entityAvatar && <span className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-lg shrink-0">{conflict.entityAvatar}</span>}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text truncate">{conflict.entityName}</span>
              <Badge variant="outline" size="xs" className="text-body-xs">{conflict.entityType}</Badge>
            </div>
            <div className="flex items-center gap-2 text-body-xs text-text-muted">
              <span className="px-1.5 py-0.5 rounded text-body-xs bg-brand/10 text-brand">
                {conflict.surfaceName}
              </span>
              <span className="px-1.5 py-0.5 rounded text-body-xs bg-surface-muted border border-border">
                {conflict.conflictType}
              </span>
            </div>
          </div>
        </div>

        {/* Severity + Status */}
        <div className="flex items-center gap-4 sm:ml-auto">
          <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border', sev.bg, sev.border)}>
            <SevIcon className={clsx('h-3.5 w-3.5', sev.color)} aria-hidden="true" />
            <span className={clsx('font-medium text-body-xs', sev.color)}>{conflict.severity}</span>
          </div>
          <Badge variant="outline" size="sm" className={sta.color}>
            {sta.label}
          </Badge>
          <Eye className="h-4 w-4 text-text-muted opacity-50 hover:opacity-100 transition-opacity" aria-hidden="true" />
        </div>
      </div>

      {/* AI Claim preview */}
      <div className="mt-3 pl-12 sm:pl-0 sm:ml-12 border-t border-border/50 pt-3">
        <div className="flex items-start gap-3 text-body-xs">
          <span className="flex-shrink-0 w-16 text-text-muted font-medium">AI Claim:</span>
          <p className="text-text-muted flex-1 line-clamp-2">{conflict.aiClaim.value}</p>
          <Badge variant={conflict.aiClaim.status === 'verified' ? 'success' : conflict.aiClaim.status === 'fallback' ? 'warning' : 'outline'} size="xs">
            {conflict.aiClaim.status || 'pending'}
          </Badge>
        </div>
      </div>
    </button>
  );
}

function ConflictDetailPanel({ conflict, onClose }: { conflict: Conflict; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 lg:relative lg:static lg:z-auto">
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 bg-background/95 backdrop-blur-sm z-40" onClick={onClose} />

      <Panel variant="outlined" className="lg:w-full animate-in slide-in-from-right">
        <PanelSection
          title={
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {conflict.entityAvatar && <span className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-xl">{conflict.entityAvatar}</span>}
                <div>
                  <h3 className="text-heading-md font-semibold text-text">{conflict.entityName}</h3>
                  <p className="text-body-sm text-text-muted">{conflict.entityType} • {conflict.surfaceName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-2 text-text-muted hover:text-text hover:bg-surface-muted rounded-lg transition-colors"
                aria-label="Close panel"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          }
        >
          {/* Conflict Trio */}
          <ConflictTrio
            aiClaim={conflict.aiClaim}
            evidence={conflict.evidence}
            proposal={conflict.proposal ?? { value: '', status: 'pending', integrity: 'unknown' }}
            entity={{ name: conflict.entityName, type: conflict.entityType, avatar: conflict.entityAvatar ?? '' }}
            onViewEvidence={(claim) => alert(JSON.stringify(claim, null, 2))}
          />

          {/* Candor Assessment */}
          {conflict.candorLevel && (
            <>
              <PanelDivider className="my-4" />
              <CandorStat
                label="Candor Assessment"
                value={conflict.candorLevel}
                honesty={conflict.candorLevel}
                honestyDetail={conflict.candorDetail ?? []}
              />
            </>
          )}

          {/* Provenance */}
          {conflict.proposal && (
            <>
              <PanelDivider className="my-4" />
              <div className="space-y-2">
                <p className="font-medium text-text">Provenance Chain</p>
                <ProvenanceStrip
                  entries={[
                    { id: '1', sourceId: 'perception:chatgpt', claim: `Extracted from ${conflict.surfaceName}`, status: 'verified', confidence: 0.62, evidence: ['GSC response'], timestamp: new Date(conflict.detectedAt), integrity: 'intact' },
                    { id: '2', sourceId: 'adjudicate:conflict', claim: `Adjudicated as ${conflict.conflictType}`, status: 'verified', confidence: 0.88, evidence: ['Brand truth KB'], timestamp: new Date(conflict.updatedAt), integrity: 'intact' },
                  ]}
                  showIntegrity
                  density="compact"
                />
              </div>
            </>
          )}

          <div className="mt-4 flex items-center justify-end gap-2 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-body-sm border border-border text-text hover:bg-surface-muted rounded-md transition-colors">
              Close
            </button>
            <button type="button" className="px-4 py-2 text-body-sm bg-brand text-background hover:bg-brand/90 rounded-md transition-colors">
              View Full Details →
            </button>
          </div>
        </PanelSection>
      </Panel>
    </div>
  );
}

const PanelDivider = ({ className }: React.HTMLAttributes<HTMLHRElement>) => <hr className={clsx('border-border', className)} />;

export default function ConflictsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-surface-muted/50 rounded-lg" />}>
      <ConflictsContent />
    </Suspense>
  );
}