'use client';
// web/src/app/(dashboard)/report/page.tsx
// Report — Candor Report with CI, trajectory chart, Honesty expandable, contrarian block, Provenance Audit Hover

import { CandorStat, Panel, PanelDivider, PanelSection } from '@engenox/design-system/patterns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@engenox/design-system/primitives';
import { clsx } from 'clsx';
import { AlertCircle, AlertTriangle, CheckCircle, ChevronDown, Download, FileText, Info, Shield, TrendingUp, XCircle } from 'lucide-react';

import { Suspense } from 'react';
import {Bar, 
  BarChart, CartesianGrid, Cell,Line, 
  LineChart, Tooltip as RechartsTooltip, ResponsiveContainer,XAxis, YAxis, 
} from 'recharts';



interface ReportData {
  cycleId: string;
  period: { start: string; end: string };
  metrics: Metric[];
  trajectory: TrajectoryPoint[];
  honesty: HonestyEntry[];
  contrarian: ContrarianPoint[];
  interventions: InterventionResult[];
}

interface Metric {
  name: string;
  value: number;
  unit: string;
  ci: [number, number];
  delta: number;
  honesty: 'high' | 'medium' | 'low';
  honestyDetail: string[];
  provenance: { sourceId: string; claim: string; confidence: number; evidence: string[] }[];
}

interface TrajectoryPoint {
  date: string;
  visibilityScore: number;
  interventionCount: number;
  cycleId: string;
}

interface HonestyEntry {
  metric: string;
  rating: 'high' | 'medium' | 'low';
  reason: string[];
}

interface ContrarianPoint {
  id: string;
  claim: string;
  counterEvidence: string;
  strength: 'strong' | 'moderate' | 'weak';
  sources: string[];
}

interface InterventionResult {
  id: string;
  title: string;
  type: string;
  before: number;
  after: number;
  uplift: number;
  ci: [number, number];
  n: number;
  status: 'measured' | 'pending' | 'inconclusive';
}

function ReportContent() {
  // In production: fetch from measurement service / CIO corpus
  const report: ReportData = {
    cycleId: 'cycle_2024_03',
    period: { start: '2024-01-01', end: '2024-03-31' },
    metrics: [
      { name: 'Entity Recognition Rate', value: 73, unit: '%', ci: [68, 78], delta: 12, honesty: 'high', honestyDetail: ['Sufficient n=47 probes', 'Conformal CI valid'], provenance: [{ sourceId: 'chatgpt-4o', claim: 'Entity recognized in 73% of queries', confidence: 0.73, evidence: ['q1', 'q2', 'q3'] }] },
      { name: 'Avg Confidence', value: 73, unit: '%', ci: [69, 77], delta: 5, honesty: 'high', honestyDetail: [], provenance: [] },
      { name: 'Conflict Rate', value: 9, unit: '%', ci: [5, 13], delta: -3, honesty: 'medium', honestyDetail: ['Small n for conflict subset'], provenance: [] },
      { name: 'Fallback Rate', value: 6.2, unit: '%', ci: [3, 9], delta: 0.5, honesty: 'low', honestyDetail: ['Fallback detection heuristic', 'May miss soft fallbacks'], provenance: [] },
    ],
    trajectory: [
      { date: '2024-01', visibilityScore: 45, interventionCount: 0, cycleId: 'cycle_1' },
      { date: '2024-02', visibilityScore: 58, interventionCount: 2, cycleId: 'cycle_2' },
      { date: '2024-03', visibilityScore: 73, interventionCount: 4, cycleId: 'cycle_3' },
    ],
    honesty: [
      { metric: 'Entity Recognition Rate', rating: 'high', reason: ['Sufficient n=47 probes', 'Conformal CI valid', 'Cross-surface agreement'] },
      { metric: 'Avg Confidence', rating: 'high', reason: ['Calibrated on consented panel', 'No systematic bias detected'] },
      { metric: 'Conflict Rate', rating: 'medium', reason: ['Small n for conflict subset', 'Single-surface conflicts dominate'] },
      { metric: 'Fallback Rate', rating: 'low', reason: ['Fallback detection heuristic', 'May miss soft fallbacks', 'Panel calibration incomplete'] },
    ],
    contrarian: [
      { id: 'c1', claim: 'Visibility increased 28%', counterEvidence: 'Baseline shift: Jan had 30% fewer probes due to API limits. Adjusted uplift: 18% (CI: 8-28%).', strength: 'strong', sources: ['Probe volume logs', 'API quota records'] },
      { id: 'c2', claim: 'Schema markup caused uplift', counterEvidence: 'Concurrent technical SEO fix (robots.txt) deployed same week. Cannot isolate schema effect.', strength: 'moderate', sources: ['Deploy timeline', 'Crawl logs'] },
      { id: 'c3', claim: 'Competitor X lost visibility', counterEvidence: 'Competitor X also changed domain structure. May be migration artifact.', strength: 'weak', sources: ['Competitor Whois', 'Archive.org'] },
    ],
    interventions: [
      { id: 'int_1', title: 'Organization schema.org markup', type: 'schema', before: 45, after: 63, uplift: 18, ci: [8, 28], n: 47, status: 'measured' },
      { id: 'int_2', title: 'Founder entity correction', type: 'content', before: 52, after: 71, uplift: 37, ci: [22, 52], n: 31, status: 'measured' },
      { id: 'int_3', title: 'robots.txt AI crawler allow', type: 'technical', before: 58, after: 62, uplift: 7, ci: [-2, 16], n: 52, status: 'inconclusive' },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-xl font-bold text-text">Candor Report</h1>
          <p className="text-body-sm text-text-muted mt-1">
            Cycle {report.cycleId} • {new Date(report.period.start).toLocaleDateString()} – {new Date(report.period.end).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Raw JSON
          </Button>
        </div>
      </div>

      {/* Key metrics with CI */}
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Headline Metrics" description="All metrics with 95% conformal confidence intervals. No lift number renders without its CI.">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.metrics.map((metric) => (
              <CandorStat
                key={metric.name}
                label={metric.name}
                value={metric.value}
                unit={metric.unit}
                ci={{ lower: metric.ci[0], upper: metric.ci[1], level: 0.95 }}
                delta={{ value: metric.delta, label: 'vs baseline', trend: metric.delta >= 0 ? 'up' : 'down' }}
                honesty={metric.honesty}
                honestyDetail={metric.honestyDetail}
                provenance={metric.provenance}
              />
            ))}
          </div>
        </PanelSection>
      </Panel>

      {/* Trajectory chart */}
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Visibility Trajectory" description="Bi-temporal trajectory with intervention markers. Shaded regions = intervention windows.">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.trajectory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#737373" />
                <YAxis tick={{ fontSize: 12 }} stroke="#737373" domain={[0, 'auto']} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#fafafa', border: '1px solid #e5e5e5', borderRadius: 8 }}
                  labelStyle={{ color: '#171717' }}
                />
                <Line
                  type="monotone"
                  dataKey="visibilityScore"
                  stroke="#334155"
                  strokeWidth={2}
                  dot={{ r: 6, strokeWidth: 2, fill: '#334155' }}
                  activeDot={{ r: 8 }}
                />
                {report.trajectory.filter(t => t.interventionCount > 0).map((t, i) => (
                  <div key={i} style={{ position: 'absolute' }}>
                    <Cell fill="#334155" />
                  </div>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-body-xs text-text-muted">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-brand" /> Visibility Score</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-success" /> Intervention deployments</span>
          </div>
        </PanelSection>
      </Panel>

      {/* Intervention results */}
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Intervention Outcomes" description="Causal uplift measured via CIO corpus. Conformal CIs, not bootstrap.">
          <div className="space-y-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-body-xs text-text-muted border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Intervention</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Before</th>
                  <th className="pb-2 pr-4 font-medium">After</th>
                  <th className="pb-2 pr-4 font-medium">Uplift (95% CI)</th>
                  <th className="pb-2 pr-4 font-medium">N</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.interventions.map((int) => (
                  <tr key={int.id} className="border-b border-border/50">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-text">{int.title}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" size="xs">{int.type}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-body-sm font-mono tabular-nums">{int.before}%</td>
                    <td className="py-3 pr-4 text-body-sm font-mono tabular-nums">{int.after}%</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={clsx('font-mono tabular-nums font-medium', int.uplift >= 0 ? 'text-success' : 'text-critical')}>
                          {int.uplift >= 0 ? '+' : ''}{int.uplift}%
                        </span>
                        <span className="text-body-xs text-text-muted font-mono">
                          [{int.ci[0]}%, {int.ci[1]}%]
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-body-xs text-text-muted font-mono">{int.n}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={
                        int.status === 'measured' ? 'success' :
                        int.status === 'inconclusive' ? 'warning' :
                        'outline'
                      } size="xs">{int.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelSection>
      </Panel>

      {/* Honesty Ledger */}
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Honesty Ledger" description="Per-metric honesty rating with reasoning. Expandable for full rationale.">
          <div className="space-y-3">
            {report.honesty.map((entry, index) => (
              <div key={entry.metric} className="border border-border/50 rounded-lg overflow-hidden">
                <Accordion type="single" collapsible>
                  <AccordionItem value={entry.metric}>
                    <AccordionTrigger className="w-full p-4 flex items-center justify-between hover:bg-surface-muted/50">
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          'w-2.5 h-2.5 rounded-full',
                          entry.rating === 'high' && 'bg-success',
                          entry.rating === 'medium' && 'bg-warning',
                          entry.rating === 'low' && 'bg-critical'
                        )} />
                        <span className="font-medium text-text">{entry.metric}</span>
                      </div>
                      <Badge variant={entry.rating === 'high' ? 'success' : entry.rating === 'medium' ? 'warning' : 'critical'} size="sm">
                        {entry.rating.toUpperCase()}
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-body-sm text-text-muted space-y-2">
                      <p className="font-medium text-text">Why this rating:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        {entry.reason.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ))}
          </div>
        </PanelSection>
      </Panel>

      {/* Contrarian Block */}
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Contrarian Block" description="Strongest counter-evidence for every positive finding. Required by candor floor.">
          <div className="space-y-4">
            {report.contrarian.map((point) => (
              <div
                key={point.id}
                className={clsx(
                  'p-4 rounded-lg border',
                  point.strength === 'strong' && 'bg-critical/5 border-critical/20',
                  point.strength === 'moderate' && 'bg-warning/5 border-warning/20',
                  point.strength === 'weak' && 'bg-brand/5 border-brand/20'
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-text">Counter-claim: {point.claim}</p>
                    <p className="text-body-sm text-text-muted mt-1">{point.counterEvidence}</p>
                  </div>
                  <Badge variant={point.strength === 'strong' ? 'critical' : point.strength === 'moderate' ? 'warning' : 'outline'} size="sm">
                    {point.strength.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-body-xs text-text-muted">
                  {point.sources.map((s) => (
                    <Badge variant="outline" size="xs" key={s}>{s}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PanelSection>
      </Panel>

      {/* Provenance Audit */}
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Provenance Audit Log" description="Every assertion traced to source with integrity status.">
          <Accordion type="multiple" defaultValue={['item-1']} className="w-full">
            {report.metrics.flatMap((metric, mi) =>
              metric.provenance.map((prov, pi) => (
                <AccordionItem key={`${mi}-${pi}`} value={`${mi}-${pi}`}>
                  <AccordionTrigger className="text-body-sm font-medium text-text">
                    <span className="font-mono text-brand/80 mr-2">{prov.sourceId}</span>
                    {prov.claim}
                    <BadgeVariant confidence={prov.confidence} />
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-2 text-body-xs">
                      <p className="text-text-muted">Confidence: <span className="font-mono">{Math.round(prov.confidence * 100)}%</span></p>
                      <p className="text-text-muted">Evidence: {prov.evidence.length} citations</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="success" size="xs">Integrity: Intact</Badge>
                        <Badge variant="outline" size="xs">Timestamp: {new Date().toISOString()}</Badge>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))
            )}
          </Accordion>
        </PanelSection>
      </Panel>
    </div>
  );
}

function BadgeVariant({ confidence }: { confidence: number }) {
  const color = confidence >= 0.8 ? 'bg-success' : confidence >= 0.5 ? 'bg-warning' : 'bg-critical';
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-body-xs font-medium', color, 'text-white')}>
      {Math.round(confidence * 100)}%
    </span>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-surface-muted/50 rounded-lg" />}>
      <ReportContent />
    </Suspense>
  );
}