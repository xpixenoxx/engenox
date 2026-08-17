'use client';
// web/src/app/(dashboard)/perception/page.tsx
// Perception — surface results, query-level evidence, assertions, provenance

import { ConflictTrio, Panel, PanelDivider, PanelSection, ProvenanceStrip } from '@engenox/design-system/patterns';
import { CandorStat, EmptyStates } from '@engenox/design-system/patterns';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@engenox/design-system/primitives';
import { clsx } from 'clsx';
import { AlertTriangle, Download, Eye, FileText, Filter, Search } from 'lucide-react';
import { Suspense } from 'react';

interface SurfaceResult {
  surface: 'chatgpt' | 'perplexity' | 'gemini' | 'grok' | 'claude';
  query: string;
  response: string;
  assertions: Assertion[];
  confidence: number;
  timestamp: string;
}

interface Assertion {
  id: string;
  claim: string;
  confidence: number;
  status: 'verified' | 'pending' | 'disputed' | 'fallback';
  evidence: string[];
  sources: string[];
}

function PerceptionContent() {
  // In production: fetch from perception service
  const surfaces = [
    { id: 'chatgpt', name: 'ChatGPT', color: 'text-surface-chatgpt' },
    { id: 'perplexity', name: 'Perplexity', color: 'text-surface-perplexity' },
    { id: 'gemini', name: 'Gemini', color: 'text-surface-gemini' },
    { id: 'grok', name: 'Grok', color: 'text-surface-grok' },
    { id: 'claude', name: 'Claude', color: 'text-surface-claude' },
  ];

  const queries = [
    { id: 'q1', text: 'What is Engenox?', buyerIntent: 'awareness' },
    { id: 'q2', text: 'How does Engenox compare to other AI visibility tools?', buyerIntent: 'evaluation' },
    { id: 'q3', text: 'Who founded Engenox?', buyerIntent: 'entity-truth' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-xl font-bold text-text">Perception</h1>
          <p className="text-body-sm text-text-muted mt-1">
            Query-level results across all probed AI surfaces. Evidence, confidence, and provenance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Search queries
          </Button>
          <Button variant="secondary" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="primary" size="sm" onClick={() => window.location.href = '/dashboard/perception/new'}>
            <Search className="h-4 w-4 mr-2" />
            Run Probe
          </Button>
        </div>
      </div>

      {/* Surface tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          {surfaces.map((s) => (
            <TabsTrigger
              key={s.id}
              value={s.id}
              className={clsx(
                'data-[state=active]:bg-brand data-[state=active]:text-background',
                s.color
              )}
            >
              {s.name}
            </TabsTrigger>
          ))}
          <TabsTrigger value="overview" className="col-span-2">
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CandorStat
              label="Total Queries"
              value={127}
              delta={{ value: 12, label: 'this week', trend: 'up' }}
              honesty="high"
            />
            <CandorStat
              label="Assertions"
              value={342}
              delta={{ value: 8, label: 'vs last cycle', trend: 'up' }}
              honesty="medium"
              honestyDetail={['Some assertions from fallback responses']}
            />
            <CandorStat
              label="Avg Confidence"
              value={73}
              unit="%"
              ci={{ lower: 68, upper: 78, level: 0.95 }}
              honesty="high"
            />
            <CandorStat
              label="Conflicts"
              value={12}
              delta={{ value: -3, label: 'resolved', trend: 'down' }}
              honesty="high"
            />
          </div>

          {/* Query-level results */}
          <Panel variant="outlined" density="comfortable" actions={
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          }>
            <PanelSection
              title="Query Results"
              description="Per-query perception across surfaces"
            >
              <div className="space-y-3 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-body-xs text-text-muted border-b border-border">
                      <th className="pb-2 pr-4 font-medium">Query</th>
                      <th className="pb-2 pr-4 font-medium">Buyer Intent</th>
                      <th className="pb-2 pr-4 font-medium">Surfaces</th>
                      <th className="pb-2 pr-4 font-medium">Assertions</th>
                      <th className="pb-2 pr-4 font-medium">Avg Confidence</th>
                      <th className="pb-2 pr-4 font-medium">Conflicts</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queries.map((query) => (
                      <tr key={query.id} className="border-b border-border/50 hover:bg-surface-muted/50">
                        <td className="py-3 pr-4">
                          <p className="text-body-sm font-medium text-text truncate max-w-xs">{query.text}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 rounded-full text-body-xs bg-brand/10 text-brand">
                            {query.buyerIntent}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {surfaces.map((s) => (
                              <span
                                key={s.id}
                                className={`px-1.5 py-0.5 rounded text-body-xs ${s.color} bg-current/10 border border-current/20`}
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-body-sm text-text">42</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-surface-muted rounded-full overflow-hidden">
                              <div className="h-full bg-brand rounded-full" style={{ width: '73%' }} />
                            </div>
                            <span className="text-body-xs font-mono text-text-muted">73%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 rounded-full text-body-xs bg-warning/10 text-warning">
                            2 conflicts
                          </span>
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm" onClick={() => window.location.href = `/dashboard/perception/query/${query.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelSection>
          </Panel>

          {/* Conflict example */}
          <Panel variant="outlined" density="comfortable">
            <ConflictTrio
              aiClaim={{
                value: '"Engenox was founded in 2023 by John Smith"',
                confidence: 0.62,
                sources: ['ChatGPT-4o training data'],
                status: 'disputed',
                integrity: 'intact',
              }}
              evidence={{
                value: 'No public record of "John Smith" as founder. Engenox incorporation: 2024. Founder: Pixenox Solutions.',
                confidence: 0.94,
                sources: ['Delaware Corp Registry', 'Engenox.com/about'],
                status: 'verified',
                integrity: 'intact',
              }}
              proposal={{
                value: 'Correct founding entity to "Pixenox Solutions (2024)". Flag ChatGPT assertion as hallucination.',
                confidence: 0.89,
              }}
              entity={{ name: 'Engenox', type: 'Organization', avatar: '🧭' }}
              onAcceptProposal={() => {}}
              onRejectProposal={() => {}}
              onViewEvidence={() => {}}
            />
          </Panel>
        </TabsContent>

        {surfaces.map((surface) => (
          <TabsContent key={surface.id} value={surface.id} className="mt-6 space-y-6">
            <Panel variant="outlined" density="comfortable">
              <PanelSection title={`${surface.name} Surface Detail`}>
                <p className="text-body-sm text-text-muted">
                  Detailed assertions, evidence chains, and provenance for {surface.name}.
                </p>
              </PanelSection>
            </Panel>
            <EmptyStates.NoPerceptionData
              customTitle={`No ${surface.name} Data`}
              customDescription={`Run an AtlasCycle to probe ${surface.name} with your buyer queries.`}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function PerceptionPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-surface-muted/50 rounded-lg" />}>
      <PerceptionContent />
    </Suspense>
  );
}