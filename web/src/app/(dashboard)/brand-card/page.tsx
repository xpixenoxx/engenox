'use client';
// web/src/app/(dashboard)/brand-card/page.tsx
// Brand Card — entity editor with evidence-backed attributes, provenance per field

import { Panel, PanelDivider, PanelSection } from '@engenox/design-system/patterns';
import { Badge, Button, Input, Select, Item as SelectItem } from '@engenox/design-system/primitives';
import { clsx } from 'clsx';
import { AlertTriangle, CheckCircle, Edit, Eye, Badge as LucideBadge, Plus, Save, Shield, Trash2, XCircle } from 'lucide-react';
import { Suspense } from 'react';

interface EntityAttribute {
  key: string;
  value: string;
  confidence: number;
  status: 'verified' | 'pending' | 'disputed' | 'fallback';
  evidence: string[];
  provenance: { sourceId: string; claim: string; confidence: number }[];
}

interface Entity {
  name: string;
  type: string;
  website: string;
  description: string;
  founded: string;
  founders: string[];
  employees: string;
  industry: string;
  hq: string;
}

const entity: Entity = {
  name: 'Engenox',
  type: 'Organization',
  website: 'https://engenox.com',
  description: 'AI Visibility Operating System — Perceive, Diagnose, Propose, Measure.',
  founded: '2024',
  founders: ['Pixenox Solutions'],
  employees: '1-10',
  industry: 'Software / AI',
  hq: 'San Francisco, CA, USA',
};

const attributes: EntityAttribute[] = [
  {
    key: 'name',
    value: 'Engenox',
    confidence: 0.99,
    status: 'verified',
    evidence: ['Website header', 'DNS records', 'Social profiles'],
    provenance: [{ sourceId: 'engenox-com', claim: 'Engenox', confidence: 0.99 }],
  },
  {
    key: 'foundingDate',
    value: '2024-01-15',
    confidence: 0.94,
    status: 'verified',
    evidence: ['Articles of Incorporation'],
    provenance: [{ sourceId: 'de-corp-registry', claim: '2024-01-15', confidence: 0.98 }],
  },
  {
    key: 'founders',
    value: 'Pixenox Solutions',
    confidence: 0.91,
    status: 'verified',
    evidence: ['Founder interview', 'Press release'],
    provenance: [
      { sourceId: 'founder-interview', claim: 'Pixenox Solutions', confidence: 0.95 },
      { sourceId: 'presse-release-001', claim: 'Pixenox Solutions', confidence: 0.88 },
    ],
  },
  {
    key: 'headquarters',
    value: 'San Francisco, CA, USA',
    confidence: 0.89,
    status: 'pending',
    evidence: ['Website footer', 'LinkedIn'],
    provenance: [
      { sourceId: 'engenox-com', claim: 'San Francisco, CA', confidence: 0.92 },
      { sourceId: 'linkedin', claim: 'San Francisco Bay Area', confidence: 0.85 },
    ],
  },
  {
    key: 'employeeCount',
    value: '1-10',
    confidence: 0.72,
    status: 'fallback',
    evidence: ['Estimated from LinkedIn'],
    provenance: [{ sourceId: 'linkedin-estimate', claim: '1-10 employees', confidence: 0.72 }],
  },
  {
    key: 'primaryProduct',
    value: 'AI Visibility Platform',
    confidence: 0.96,
    status: 'verified',
    evidence: ['Product page', 'Documentation'],
    provenance: [
      { sourceId: 'engenox-com-product', claim: 'AI Visibility Operating System', confidence: 0.98 },
      { sourceId: 'docs-engenox', claim: 'Perceive → Diagnose → Propose → Measure', confidence: 0.94 },
    ],
  },
];

function ConfidenceBar({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const styles = {
    sm: 'h-1.5 w-20',
    md: 'h-2 w-32',
  };
  const color = value >= 0.8 ? 'bg-success' : value >= 0.5 ? 'bg-warning' : 'bg-critical';
  return (
    <div className={clsx(styles[size], 'bg-surface-muted rounded-full overflow-hidden')}>
      <div className={clsx('h-full rounded-full transition-all duration-normal', color)} style={{ width: `${value * 100}%` }} />
    </div>
  );
}

function EntityBadge({ status }: { status: EntityAttribute['status'] }) {
  const icons = {
    verified: CheckCircle,
    pending: AlertTriangle,
    disputed: XCircle,
    fallback: AlertTriangle,
  };
  const colors = {
    verified: 'text-success bg-success/10 border-success/20',
    pending: 'text-warning bg-warning/10 border-warning/20',
    disputed: 'text-critical bg-critical/10 border-critical/20',
    fallback: 'text-text-muted bg-surface-muted border-border',
  };
  const Icon = icons[status];
  return (
    <Badge variant="outline" size="xs" className={colors[status]}>
      <Icon className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
      {status}
    </Badge>
  );
}

function BrandCardContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-xl font-bold text-text">Brand Card</h1>
          <p className="text-body-sm text-text-muted mt-1">
            Entity attributes with evidence-backed provenance. Every claim traces to sources.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => window.location.href = '/dashboard/brand-card/history'}>
            <Eye className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button variant="primary" size="md">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Core identity */}
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Core Identity" description="Primary entity attributes — used across all perception probes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Entity Name"
                  value={entity.name}
                  onChange={() => {}}
                  helperText="Primary display name across all surfaces"
                />
                <Select
                  label="Entity Type"
                  value={entity.type}
                  onValueChange={() => {}}
                >
                  <SelectItem value="Organization">Organization</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="Person">Person</SelectItem>
                  <SelectItem value="Brand">Brand</SelectItem>
                </Select>
              </div>
              <Input
                label="Website"
                type="url"
                value={entity.website}
                onChange={() => {}}
                helperText="Canonical URL for provenance linking"
              />
              <Input
                label="Description"
                value={entity.description}
                onChange={() => {}}
                helperText="One-sentence description for buyer queries"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Founded"
                value={entity.founded}
                onChange={() => {}}
                helperText="YYYY or YYYY-MM-DD"
              />
              <Input
                label="Founders"
                value={entity.founders.join(', ')}
                onChange={() => {}}
                helperText="Comma-separated"
              />
              <Input
                label="Employees"
                value={entity.employees}
                onChange={() => {}}
                helperText="Range for public display"
              />
              <Input
                label="Industry"
                value={entity.industry}
                onChange={() => {}}
              />
              <Input
                label="Headquarters"
                value={entity.hq}
                onChange={() => {}}
              />
            </div>
          </div>
        </PanelSection>
      </Panel>

      {/* Attributes table */}
      <Panel variant="outlined" density="comfortable" actions={
        <Button variant="secondary" size="sm" onClick={() => window.location.href = '/dashboard/brand-card/attributes/new'}>
          <Plus className="h-4 w-4 mr-2" />
          Add Attribute
        </Button>
      }>
        <PanelSection
          title="All Attributes"
          description="Evidence-backed entity attributes with confidence and provenance"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-body-xs text-text-muted border-b border-border">
                  <th className="pb-2 pr-4 font-medium w-40">Attribute</th>
                  <th className="pb-2 pr-4 font-medium">Value</th>
                  <th className="pb-2 pr-4 font-medium">Confidence</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Evidence</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((attr) => (
                  <tr key={attr.key} className="border-b border-border/50 hover:bg-surface-muted/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <code className="text-body-xs font-mono text-text-muted bg-surface-muted px-1.5 py-0.5 rounded">
                          {attr.key}
                        </code>
                        <EntityBadge status={attr.status} />
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-body-sm text-text max-w-xs truncate">{attr.value}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <ConfidenceBar value={attr.confidence} />
                        <span className="text-body-xs font-mono text-text-muted">{Math.round(attr.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <EntityBadge status={attr.status} />
                    </td>
                    <td className="py-3 pr-4 text-body-xs text-text-muted">{attr.evidence.length} sources</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" title="View provenance">
                          <Shield className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-critical hover:bg-critical/5 hover:text-critical" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Provenance detail */}
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Provenance Detail" description="Source-level evidence for selected attribute">
          <div className="space-y-4">
            {attributes[0]?.provenance.map((prov, i) => (
              <div key={`${prov.sourceId}-${i}`} className="p-4 bg-surface-muted/50 rounded-lg border border-border/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-body-xs text-brand">{prov.sourceId}</span>
                      <BadgeVariant confidence={prov.confidence} />
                    </div>
                    <p className="text-body-sm text-text">{prov.claim}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

export default function BrandCardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-surface-muted/50 rounded-lg" />}>
      <BrandCardContent />
    </Suspense>
  );
}