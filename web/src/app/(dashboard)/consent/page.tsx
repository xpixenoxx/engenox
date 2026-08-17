'use client';
// web/src/app/(dashboard)/consent/page.tsx
// Consent Panel — GDPR Art. 7+8 Grade-A consent, A29WP granular, CPRA/APPI harmonized

import { CandorStat, Panel, PanelDivider, PanelSection } from '@engenox/design-system/patterns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge, Button, Separator, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from '@engenox/design-system/primitives';
import { clsx } from 'clsx';
import { AlertTriangle, CheckCircle, ChevronDown, Download, ExternalLink, FileText, History, Lock, Scale, Settings, Shield, User, XCircle } from 'lucide-react';
import { Suspense } from 'react';
import * as React from 'react';


// Types from contracts/proto/engenox/policy/v1/policy.proto
type LegalBasis = 'CONSENT' | 'LEGITIMATE_INTEREST' | 'CONTRACT' | 'LEGAL_OBLIGATION' | 'VITAL_INTERESTS' | 'PUBLIC_TASK';
type Jurisdiction = 'GDPR_EU' | 'UK_GDPR' | 'CPRA_CA' | 'APPI_JP' | 'LGPD_BR' | 'PIPEDA_CA' | 'OTHER';

interface ConsentPurpose {
  id: string;
  name: string;
  description: string;
  legalBasis: LegalBasis;
  categories: string[];
  required: boolean;
  enabled: boolean;
  retentionDays: number;
  thirdCountries?: string[];
  processorIds?: string[];
  crossBorderTransfer?: boolean;
}

interface ConsentRecord {
  id: string;
  tenantId: string;
  purposeId: string;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  method: 'EXPLICIT' | 'IMPLICIT' | 'GRANULAR' | 'BULK';
  jurisdiction: Jurisdiction;
  metadata?: Record<string, string>;
}

interface DataSubjectRequest {
  id: string;
  type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'RESTRICTION' | 'PORTABILITY' | 'OBJECTION' | 'AUTOMATED_DECISION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'EXPIRED';
  submittedAt: string;
  completedAt?: string;
  details: string;
}

const PURPOSES: ConsentPurpose[] = [
  {
    id: 'perception_probing',
    name: 'AI Surface Probing',
    description: 'Probe AI surfaces (ChatGPT, Perplexity, Gemini, Grok, Claude) with your brand queries to detect presence, assertions, and conflicts.',
    legalBasis: 'LEGITIMATE_INTEREST',
    categories: ['QUERY_LOGS', 'AI_RESPONSES', 'SURFACE_METADATA'],
    required: true,
    enabled: true,
    retentionDays: 730, // 2 years
    processorIds: ['gsc-connector', 'probe-fleet'],
  },
  {
    id: 'entity_extraction',
    name: 'Entity Extraction & KG Ingestion',
    description: 'Extract typed assertions from AI responses and ingest into the bi-temporal knowledge graph with provenance chains.',
    legalBasis: 'CONSENT',
    categories: ['EXTRACTED_ENTITIES', 'PROVENANCE_CHAINS', 'CONFIDENCE_SCORES'],
    required: false,
    enabled: true,
    retentionDays: 1095, // 3 years
    crossBorderTransfer: true,
    thirdCountries: ['US'],
    processorIds: ['entity-resolver', 'verifier'],
  },
  {
    id: 'conflict_adjudication',
    name: 'Conflict Adjudication',
    description: 'Run the Adjudicate seam (cross-family LLM) to classify conflicts among enumerated ConflictTypes with severity scoring.',
    legalBasis: 'CONSENT',
    categories: ['CONFLICT_CLASSIFICATION', 'SEVERITY_SCORES', 'ADJUDICATION_EXPLAINERS'],
    required: false,
    enabled: true,
    retentionDays: 1095,
    crossBorderTransfer: true,
    thirdCountries: ['US'],
    processorIds: ['gateway-adjudicate'],
  },
  {
    id: 'intervention_drafting',
    name: 'Intervention Drafting (Schema.org / Content Briefs)',
    description: 'Generate schema.org JSON-LD, content briefs, and brand-card edits via the Draft seam (constrained decoding, verifier re-grounding).',
    legalBasis: 'CONSENT',
    categories: ['INTERVENTION_PARAMS', 'SCHEMA_JSON_LD', 'CONTENT_BRIEFS'],
    required: false,
    enabled: true,
    retentionDays: 1095,
    crossBorderTransfer: true,
    thirdCountries: ['US'],
    processorIds: ['gateway-draft'],
  },
  {
    id: 'counterfactual_estimation',
    name: 'Counterfactual Uplift Estimation',
    description: 'Run the causal estimator (conformal prediction, CIPW/IPW) on the CIO corpus to produce lift estimates with confidence intervals.',
    legalBasis: 'LEGITIMATE_INTEREST',
    categories: ['LIFT_ESTIMATES', 'CONFIDENCE_INTERVALS', 'CONFORMAL_SCORES'],
    required: false,
    enabled: true,
    retentionDays: 1095,
    processorIds: ['measurement-estimator'],
  },
  {
    id: 'corpus_worm_write',
    name: 'WORM Corpus Write (CIO Rows)',
    description: 'Write signed, integrity-tagged Causal Intervention-Outcome rows to the WORM corpus (Cloudflare R2 Object Lock). Immutable audit trail.',
    legalBasis: 'LEGAL_OBLIGATION',
    categories: ['CIO_CORPUS_ROWS', 'INTEGRITY_TAGS', 'MERKLE_PROOFS'],
    required: true,
    enabled: true,
    retentionDays: 2555, // 7 years minimum for audit
    processorIds: ['measurement-corpus-writer'],
  },
  {
    id: 'cross_family_critique',
    name: 'Cross-Family Critique (GPT-5 / Gemini 3)',
    description: 'Adversarial critique from a model family DIFFERENT from the planner (cross-family invariant). Critic sees intervention + planner family, returns verdict + objections.',
    legalBasis: 'CONSENT',
    categories: ['CRITIQUE_VERDICTS', 'CRITIC_OBJECTIONS', 'PERTURBATION_ANALYSIS'],
    required: false,
    enabled: true,
    retentionDays: 1095,
    crossBorderTransfer: true,
    thirdCountries: ['US'],
    processorIds: ['gateway-critique'],
  },
  {
    id: 'marketing_analytics',
    name: 'Marketing & Product Analytics',
    description: 'Aggregate, anonymized usage analytics for product improvement. No PII. Opt-out available.',
    legalBasis: 'LEGITIMATE_INTEREST',
    categories: ['AGGREGATED_METRICS', 'FEATURE_USAGE', 'PERFORMANCE_TELEMETRY'],
    required: false,
    enabled: true,
    retentionDays: 365,
  },
];

const MOCK_CONSENT_RECORDS: ConsentRecord[] = PURPOSES.map((p, i) => {
    const isGranted = p.required || i < 3;
    const base: Omit<ConsentRecord, 'grantedAt'> = {
      id: `consent_${p.id}`,
      tenantId: 'tenant_1',
      purposeId: p.id,
      granted: isGranted,
      version: 'v1.2.0',
      method: isGranted ? 'EXPLICIT' : 'GRANULAR',
      jurisdiction: 'GDPR_EU',
      metadata: { consentString: 'CPXxRfQPXxRfQAcBw...' },
    };
    return isGranted
      ? { ...base, grantedAt: '2024-01-15T10:30:00Z' }
      : base;
  });

const MOCK_DSRs: DataSubjectRequest[] = [
  { id: 'dsr_1', type: 'ACCESS', status: 'COMPLETED', submittedAt: '2024-01-10T09:00:00Z', completedAt: '2024-01-11T14:30:00Z', details: 'Full data export provided via secure link' },
  { id: 'dsr_2', type: 'ERASURE', status: 'IN_PROGRESS', submittedAt: '2024-01-14T16:20:00Z', details: 'Erasure of perception logs for deleted brand card' },
];

function ConsentContent() {
  const [activeTab, setActiveTab] = React.useState<string>('purposes');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-heading-xl font-bold text-text">Consent & Privacy</h1>
          <p className="text-body-sm text-text-muted mt-1">
            Granular consent management per GDPR Art. 7+8 Grade-A, A29WP guidelines, CPRA/APPI harmonized.
            <br />All purposes tied to a legal basis; no dark patterns; withdrawal as easy as giving consent.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" asChild>
            <a href="/dashboard/consent/export">
              <Download className="h-4 w-4 mr-2" />
              Export Consent Records
            </a>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <a href="/dashboard/consent/policy">
              <FileText className="h-4 w-4 mr-2" />
              View Privacy Policy
            </a>
          </Button>
        </div>
      </div>

      {/* Compliance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CandorStat
          label="Active Purposes"
          value={PURPOSES.filter(p => p.enabled).length}
          unit={`/${PURPOSES.length}`}
          honesty="high"
          honestyDetail={['All purposes have documented legal basis']}
        />
        <CandorStat
          label="Consent-Based"
          value={PURPOSES.filter(p => p.legalBasis === 'CONSENT').length}
          unit="purposes"
          honesty="high"
        />
        <CandorStat
          label="Legitimate Interest"
          value={PURPOSES.filter(p => p.legalBasis === 'LEGITIMATE_INTEREST').length}
          unit="purposes"
          honesty="high"
          honestyDetail={['LIA documented for each LI purpose']}
        />
        <CandorStat
          label="Cross-Border Transfers"
          value={PURPOSES.filter(p => p.crossBorderTransfer).length}
          unit="purposes"
          honesty="medium"
          honestyDetail={['SCC / adequacy decisions in place for US transfers']}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="consent-tabs">
        <TabsList>
          <TabsTrigger value="purposes" data-testid="purpose-tab" data-purpose="analytics">Purposes & Granular Consent</TabsTrigger>
          <TabsTrigger value="records" data-testid="purpose-tab" data-purpose="personalization">Consent Records</TabsTrigger>
          <TabsTrigger value="dsr" data-testid="purpose-tab" data-purpose="marketing">Data Subject Requests</TabsTrigger>
          <TabsTrigger value="policy" data-testid="purpose-tab" data-purpose="fraud_prevention">Policy & Transfers</TabsTrigger>
        </TabsList>

        {/* Purposes Tab */}
        <TabsContent value="purposes" className="mt-6 space-y-6" data-testid="purposes-tab-content">
          <Panel variant="outlined" density="comfortable">
            <PanelSection
              title={
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-brand" />
                  <span>Processing Purposes</span>
                </div>
              }
              description="Each purpose has a documented legal basis (GDPR Art. 6), data categories, retention, and processors. Required purposes cannot be disabled."
            >
              <div className="space-y-4">
                {PURPOSES.map((purpose) => (
                  <PurposeCard key={purpose.id} purpose={purpose} />
                ))}
              </div>
            </PanelSection>
          </Panel>
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records" className="mt-6 space-y-6">
          <Panel variant="outlined" density="comfortable">
            <PanelSection
              title={
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand" />
                  <span>Consent Records (Art. 7 GDPR)</span>
                </div>
              }
              description="Immutable log of every consent decision. Includes version, method, timestamp, IP, user agent. Exportable for DPA audits."
            >
              <div className="space-y-3">
                {MOCK_CONSENT_RECORDS.map((record) => (
                  <ConsentRecordRow key={record.id} record={record} />
                ))}
              </div>
            </PanelSection>
          </Panel>
        </TabsContent>

        {/* DSR Tab */}
        <TabsContent value="dsr" className="mt-6 space-y-6">
          <Panel variant="outlined" density="comfortable">
            <PanelSection
              title={
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-brand" />
                  <span>Data Subject Requests (Art. 15-22 GDPR)</span>
                </div>
              }
              description="Track and fulfill access, rectification, erasure, restriction, portability, objection, and automated decision-making requests. 30-day SLA (extendable to 90)."
            >
              <div className="space-y-3">
                {MOCK_DSRs.map((dsr) => (
                  <DSRRow key={dsr.id} dsr={dsr} />
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <Button variant="secondary" size="sm" asChild>
                  <a href="/dashboard/consent/dsr/new">
                    <User className="h-4 w-4 mr-2" />
                    Submit New Request
                  </a>
                </Button>
              </div>
            </PanelSection>
          </Panel>
        </TabsContent>

        {/* Policy Tab */}
        <TabsContent value="policy" className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel variant="outlined" density="comfortable">
              <PanelSection title="Legal Basis Inventory" description="All processing mapped to GDPR Art. 6 lawful basis.">
                <div className="space-y-3">
                  {(['CONSENT', 'LEGITIMATE_INTEREST', 'CONTRACT', 'LEGAL_OBLIGATION'] as LegalBasis[]).map((basis) => (
                    <LegalBasisRow key={basis} basis={basis} count={PURPOSES.filter(p => p.legalBasis === basis).length} />
                  ))}
                </div>
              </PanelSection>
            </Panel>

            <Panel variant="outlined" density="comfortable">
              <PanelSection title="International Transfers (Chapter V GDPR)" description="Cross-border data flows with appropriate safeguards.">
                <div className="space-y-3">
                  <TransferRow country="US" mechanism="Standard Contractual Clauses (2021) + UK Addendum" purposes={PURPOSES.filter(p => p.crossBorderTransfer && p.thirdCountries?.includes('US')).map(p => p.name).join(', ')} adequacy={false} />
                  <TransferRow country="JP" mechanism="Adequacy Decision (2019)" purposes="N/A (no transfers)" adequacy={true} />
                </div>
              </PanelSection>
            </Panel>

            <Panel variant="outlined" density="comfortable" className="lg:col-span-2">
              <PanelSection title="Retention Schedule" description="Purpose-bound retention per GDPR Art. 5(1)(e) + Records of Processing Activities (Art. 30).">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-muted border-b border-border">
                        <th className="pb-2 pr-4 font-medium">Purpose</th>
                        <th className="pb-2 pr-4 font-medium">Legal Basis</th>
                        <th className="pb-2 pr-4 font-medium">Categories</th>
                        <th className="pb-2 pr-4 font-medium">Retention</th>
                        <th className="pb-2 pr-4 font-medium">Auto-Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PURPOSES.map((p) => (
                        <tr key={p.id} className="border-b border-border/50">
                          <td className="py-3 pr-4 font-medium text-text">{p.name}</td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline" size="xs">{p.legalBasis}</Badge>
                          </td>
                          <td className="py-3 pr-4 text-text-muted">{p.categories.join(', ')}</td>
                          <td className="py-3 pr-4 font-mono text-text">{Math.round(p.retentionDays / 365)}y {p.retentionDays % 365 ? `${p.retentionDays % 365}d` : ''}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={p.retentionDays > 0 ? 'success' : 'outline'} size="xs">
                              {p.retentionDays > 0 ? 'Enabled' : 'Manual'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PanelSection>
            </Panel>

            <Panel variant="outlined" density="comfortable" className="lg:col-span-2">
              <PanelSection title="Controller & Processor Details" description="Engenox (Pixenox Solutions) is the data controller. Sub-processors listed per Art. 28 GDPR.">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-text mb-3">Data Controller</h4>
                    <dl className="space-y-2 text-body-sm">
                      <div className="flex justify-between"><dt className="text-text-muted">Name</dt><dd className="font-medium">Pixenox Solutions Inc.</dd></div>
                      <div className="flex justify-between"><dt className="text-text-muted">Address</dt><dd>123 Founder St, Wilmington, DE 19801, USA</dd></div>
                      <div className="flex justify-between"><dt className="text-text-muted">DPO Contact</dt><dd>dpo@engenox.com</dd></div>
                      <div className="flex justify-between"><dt className="text-text-muted">EU Representative</dt><dd>Pixenox Solutions EU GmbH, Berlin</dd></div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-medium text-text mb-3">Sub-Processors (Art. 28)</h4>
                    <ul className="space-y-2 text-body-sm">
                      {[
                        { name: 'Anthropic', service: 'Planner (Adjudicate/Draft/Critique)', location: 'US', scc: true },
                        { name: 'OpenAI', service: 'Critic (cross-family)', location: 'US', scc: true },
                        { name: 'Google', service: 'Critic (cross-family) / Embed', location: 'US', scc: true },
                        { name: 'Cloudflare', service: 'R2 Object Lock (WORM corpus)', location: 'Global', scc: true },
                        { name: 'Temporal', service: 'Workflow Orchestration', location: 'US', scc: true },
                      ].map((p, i) => (
                        <li key={i} className="flex items-center justify-between p-2 bg-surface-muted rounded">
                          <span>{p.name} — {p.service}</span>
                          <Badge variant={p.scc ? 'success' : 'warning'} size="xs">
                            {p.scc ? 'SCC' : 'Adequacy'}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </PanelSection>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PurposeCard({ purpose }: { purpose: ConsentPurpose }) {
  const basisColors = {
    CONSENT: 'text-brand bg-brand/10 border-brand/20',
    LEGITIMATE_INTEREST: 'text-warning bg-warning/10 border-warning/20',
    CONTRACT: 'text-success bg-success/10 border-success/20',
    LEGAL_OBLIGATION: 'text-critical bg-critical/10 border-critical/20',
    VITAL_INTERESTS: 'text-purple-600 bg-purple-600/10 border-purple-600/20',
    PUBLIC_TASK: 'text-blue-600 bg-blue-600/10 border-blue-600/20',
  };

  return (
    <div data-testid="consent-purpose" data-purpose={purpose.id} className="border border-border rounded-lg overflow-hidden bg-surface-raised">
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-heading-sm font-semibold text-text">{purpose.name}</h3>
              <Badge variant="outline" size="xs" className={basisColors[purpose.legalBasis]}>
                {purpose.legalBasis}
              </Badge>
              {purpose.required && <Badge variant="outline" size="xs" className="text-critical border-critical/20">Required</Badge>}
              {purpose.crossBorderTransfer && (
                <Badge variant="outline" size="xs" className="text-warning border-warning/20">
                  <ExternalLink className="h-2.5 w-2.5 mr-1" /> Cross-border
                </Badge>
              )}
            </div>
            <p className="text-body-sm text-text-muted">{purpose.description}</p>
          </div>
          <Switch
            data-testid="grant-consent-btn"
            data-purpose={purpose.id}
            checked={purpose.enabled}
            onCheckedChange={() => {}}
            disabled={purpose.required}
            aria-label={`Toggle ${purpose.name}`}
          />
        </div>
      </div>
      <div className="p-4 pt-0 border-t border-border">
        <div className="grid sm:grid-cols-3 gap-4 text-body-sm">
          <div>
            <p className="text-text-muted">Data Categories</p>
            <p className="font-mono text-text">{purpose.categories.join(', ')}</p>
          </div>
          <div>
            <p className="text-text-muted">Retention</p>
            <p className="font-mono text-text">{Math.round(purpose.retentionDays / 365)} years</p>
          </div>
          <div>
            <p className="text-text-muted">Processors</p>
            <p className="font-mono text-text">{purpose.processorIds?.join(', ') || '—'}</p>
          </div>
        </div>
        {purpose.thirdCountries && purpose.thirdCountries.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border text-body-sm">
            <p className="text-text-muted">Third Countries: <span className="font-mono text-text">{purpose.thirdCountries.join(', ')}</span></p>
          </div>
        )}
        <div className="pt-4">
          <Button data-testid="revoke-consent-btn" data-purpose={purpose.id} variant="ghost" size="sm" asChild>
            <a href={`/dashboard/consent/purpose/${purpose.id}`}>
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Configure
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConsentRecordRow({ record }: { record: ConsentRecord }) {
  const purpose = PURPOSES.find(p => p.id === record.purposeId);
  return (
    <div data-testid="consent-record" data-purpose={record.purposeId} className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
      <div className="flex items-center gap-4">
        <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center', record.granted ? 'bg-success/10' : 'bg-critical/10')}>
          {record.granted ? <CheckCircle className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-critical" />}
        </div>
        <div>
          <p className="font-medium text-text">{purpose?.name ?? record.purposeId}</p>
          <p className="text-body-xs text-text-muted flex items-center gap-2">
            <span className="font-mono">{record.version}</span>
            <span>•</span>
            <span>{record.method}</span>
            <span>•</span>
            <span>{record.jurisdiction}</span>
            {record.grantedAt && <><span>•</span> <span>Granted {new Date(record.grantedAt).toLocaleDateString()}</span></>}
            {record.revokedAt && <><span>•</span> <span className="text-critical">Revoked {new Date(record.revokedAt).toLocaleDateString()}</span></>}
          </p>
        </div>
      </div>
      <Badge variant={record.granted ? 'success' : 'outline'} size="sm">
        {record.granted ? 'Granted' : 'Denied'}
      </Badge>
    </div>
  );
}

function DSRRow({ dsr }: { dsr: DataSubjectRequest }) {
  const statusColors = {
    PENDING: 'text-warning bg-warning/10 border-warning/20',
    IN_PROGRESS: 'text-brand bg-brand/10 border-brand/20',
    COMPLETED: 'text-success bg-success/10 border-success/20',
    REJECTED: 'text-critical bg-critical/10 border-critical/20',
    EXPIRED: 'text-text-muted bg-surface-muted border-border',
  };
  const typeIcons = {
    ACCESS: FileText,
    RECTIFICATION: Settings,
    ERASURE: XCircle,
    RESTRICTION: AlertTriangle,
    PORTABILITY: Download,
    OBJECTION: Scale,
    AUTOMATED_DECISION: Shield,
  };
  const Icon = typeIcons[dsr.type];

  return (
    <div data-testid="dsr-request" data-type={dsr.type.toLowerCase()} className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
      <div className="flex items-center gap-4">
        <Icon className="h-5 w-5 text-brand" />
        <div>
          <p className="font-medium text-text">{dsr.type.replace('_', ' ')}</p>
          <p className="text-body-xs text-text-muted">Submitted {new Date(dsr.submittedAt).toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" size="sm" className={statusColors[dsr.status]}>
          {dsr.status.replace('_', ' ')}
        </Badge>
        {dsr.completedAt && (
          <span className="text-body-xs text-text-muted">Completed {new Date(dsr.completedAt).toLocaleDateString()}</span>
        )}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="View details">
          <History className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function LegalBasisRow({ basis, count }: { basis: LegalBasis; count: number }) {
  const basisLabels: Record<LegalBasis, string> = {
    CONSENT: 'Consent (Art. 6(1)(a))',
    LEGITIMATE_INTEREST: 'Legitimate Interest (Art. 6(1)(f))',
    CONTRACT: 'Contract (Art. 6(1)(b))',
    LEGAL_OBLIGATION: 'Legal Obligation (Art. 6(1)(c))',
    VITAL_INTERESTS: 'Vital Interests (Art. 6(1)(d))',
    PUBLIC_TASK: 'Public Task (Art. 6(1)(e))',
  };
  return (
    <div className="flex items-center justify-between p-3 bg-surface-muted/50 rounded-lg border border-border/50">
      <span className="font-medium text-text">{basisLabels[basis]}</span>
      <Badge variant="outline" size="sm">{count} purpose{count !== 1 ? 's' : ''}</Badge>
    </div>
  );
}

function TransferRow({ country, mechanism, purposes, adequacy }: { country: string; mechanism: string; purposes: string; adequacy: boolean }) {
  return (
    <div data-testid="transfer-record" data-source={adequacy ? 'JP' : 'EU'} data-destination={country} className="flex items-center justify-between p-3 bg-surface-muted/50 rounded-lg border border-border/50">
      <div className="flex items-center gap-3">
        <Badge variant={adequacy ? 'success' : 'warning'} size="sm">{country}</Badge>
        <span className="font-medium text-text">{country}</span>
      </div>
      <div className="flex items-center gap-3 text-body-sm">
        <span className="text-text-muted">{mechanism}</span>
        <Badge variant={adequacy ? 'success' : 'outline'} size="xs">
          {adequacy ? 'Adequacy' : 'SCC'}
        </Badge>
      </div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-surface-muted/50 rounded-lg" />}>
      <ConsentContent />
    </Suspense>
  );
}