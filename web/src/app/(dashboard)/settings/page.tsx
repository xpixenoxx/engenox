'use client';
// web/src/app/(dashboard)/settings/page.tsx
// Settings — brand, queries, consent, dial, billing, team, integrations

import { DialSliderCard, EmptyStates, Panel, PanelDivider, PanelSection } from '@engenox/design-system/patterns';
import { Badge, Button, Input, Select, Item as SelectItem, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from '@engenox/design-system/primitives';
import { clsx } from 'clsx';
import { AlertTriangle, Bell, CheckCircle, Cloud, CreditCard, Database, Download, Edit, Eye, Github, Gitlab, Globe, Key, LogOut, MessageSquare, Plus, Save, Search, Settings, Shield, Trash, User, Users, Zap } from 'lucide-react';
import { Suspense } from 'react';
import * as React from 'react';


function SettingsContent() {
  const [activeTab, setActiveTab] = React.useState<string>('brand');

  const tabs = [
    { value: 'brand', label: 'Brand', icon: Globe },
    { value: 'queries', label: 'Buyer Queries', icon: Search },
    { value: 'consent', label: 'Consent Panel', icon: Shield },
    { value: 'dial', label: 'Autonomy Dial', icon: Zap },
    { value: 'integrations', label: 'Integrations', icon: Database },
    { value: 'notifications', label: 'Notifications', icon: Bell },
    { value: 'billing', label: 'Billing', icon: CreditCard },
    { value: 'team', label: 'Team', icon: Users },
    { value: 'account', label: 'Account', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-heading-xl font-bold text-text">Settings</h1>
        <p className="text-body-sm text-text-muted mt-1">
          Configure your brand, perception probes, consent panel, and autonomy controls.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 sm:grid-cols-9 gap-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="brand" className="mt-6 space-y-6">
          <BrandSettings />
        </TabsContent>
        <TabsContent value="queries" className="mt-6 space-y-6">
          <QueriesSettings />
        </TabsContent>
        <TabsContent value="consent" className="mt-6 space-y-6">
          <ConsentSettings />
        </TabsContent>
        <TabsContent value="dial" className="mt-6 space-y-6">
          <DialSettings />
        </TabsContent>
        <TabsContent value="integrations" className="mt-6 space-y-6">
          <IntegrationsSettings />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <NotificationsSettings />
        </TabsContent>
        <TabsContent value="billing" className="mt-6 space-y-6">
          <BillingSettings />
        </TabsContent>
        <TabsContent value="team" className="mt-6 space-y-6">
          <TeamSettings />
        </TabsContent>
        <TabsContent value="account" className="mt-6 space-y-6">
          <AccountSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BrandSettings() {
  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection title="Brand Configuration" description="Core entity identity used across all perception probes">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input label="Entity Name" value="Engenox" onChange={() => {}} helperText="Primary display name" />
            <Select
              label="Entity Type"
              value="Organization"
              onValueChange={() => {}}
            >
              <SelectItem value="Organization">Organization</SelectItem>
              <SelectItem value="Product">Product</SelectItem>
              <SelectItem value="Brand">Brand</SelectItem>
              <SelectItem value="Person">Person</SelectItem>
            </Select>
            <Input label="Website" type="url" value="https://engenox.com" onChange={() => {}} helperText="Canonical URL" />
            <Input label="Description" value="AI Visibility Operating System" onChange={() => {}} helperText="One-sentence description for buyer queries" />
          </div>
          <div className="space-y-4">
            <Input label="Founded" value="2024" onChange={() => {}} helperText="YYYY or YYYY-MM-DD" />
            <Input label="Founders" value="Pixenox Solutions" onChange={() => {}} helperText="Comma-separated" />
            <Input label="Employees" value="1-10" onChange={() => {}} helperText="Range for public display" />
            <Input label="Industry" value="Software / AI" onChange={() => {}} />
            <Input label="Headquarters" value="San Francisco, CA, USA" onChange={() => {}} />
          </div>
        </div>
        <div className="pt-4 border-t border-border flex justify-end">
          <Button variant="primary" size="md"><Save className="h-4 w-4 mr-2" /> Save Brand</Button>
        </div>
      </PanelSection>
    </Panel>
  );
}

function QueriesSettings() {
  const queries = [
    { id: 'q1', text: 'What is Engenox?', intent: 'awareness', active: true },
    { id: 'q2', text: 'How does Engenox compare to other AI visibility tools?', intent: 'evaluation', active: true },
    { id: 'q3', text: 'Who founded Engenox?', intent: 'entity-truth', active: true },
    { id: 'q4', text: 'What is Engenox pricing?', intent: 'purchase', active: false },
  ];

  return (
    <>
      <Panel variant="outlined" density="comfortable" actions={
            <Button variant="primary" size="sm" asChild>
              <a href="/dashboard/settings/queries/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Query
              </a>
            </Button>
          }>
        <PanelSection
          title="Buyer Queries"
          description="Questions your buyers ask AI systems. These drive perception probes."
        >
          <div className="space-y-3">
            {queries.map((q) => (
              <div key={q.id} className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-4 flex-1">
                  <input type="checkbox" checked={q.active} onChange={() => {}} className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
                  <div>
                    <p className="font-medium text-text">{q.text}</p>
                    <Badge variant="outline" size="xs">{q.intent}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={q.active ? 'success' : 'outline'} size="xs">{q.active ? 'Active' : 'Inactive'}</Badge>
                  <Button variant="ghost" size="sm"><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="text-critical hover:bg-critical/5"><Trash className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </PanelSection>
      </Panel>

      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Query Templates" description="Pre-built query sets for common industries">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'SaaS / B2B', queries: 12, description: 'Feature comparison, pricing, integrations' },
              { name: 'E-commerce', queries: 10, description: 'Product specs, shipping, returns' },
              { name: 'Professional Services', queries: 8, description: 'Expertise, pricing, case studies' },
            ].map((t) => (
              <Button key={t.name} variant="secondary" size="md" className="h-28 flex flex-col items-start justify-center gap-2 p-4 text-left" onClick={() => window.location.href = `/dashboard/settings/queries/templates/${t.name}`}>
                  <h4 className="font-medium text-text">{t.name}</h4>
                  <p className="text-body-xs text-text-muted">{t.description}</p>
                  <Badge variant="outline" size="xs">{t.queries} queries</Badge>
                </Button>
            ))}
          </div>
        </PanelSection>
      </Panel>
    </>
  );
}

function ConsentSettings() {
  const panelists = [
    { id: 'p1', name: 'Dr. Sarah Chen', role: 'AI Ethics Researcher', email: 'sarah@university.edu', status: 'active', consented: true },
    { id: 'p2', name: 'Marcus Johnson', role: 'Senior ML Engineer', email: 'marcus@techcorp.com', status: 'active', consented: true },
    { id: 'p3', name: 'Lisa Park', role: 'Product Manager', email: 'lisa@startup.io', status: 'pending', consented: false },
  ];

  return (
    <>
      <Panel variant="outlined" density="comfortable" actions={
            <Button variant="primary" size="sm" asChild>
              <a href="/dashboard/settings/consent/invite">
                <Plus className="h-4 w-4 mr-2" />
                Invite Panelist
              </a>
            </Button>
          }>
        <PanelSection
          title="Consented Panel"
          description="Human evaluators who provide calibrated ground truth. Required for MVP candor floor."
        >
          <div className="space-y-3">
            {panelists.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-medium">
                    {p.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-text">{p.name}</p>
                    <p className="text-body-xs text-text-muted">{p.role} • {p.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={p.consented ? 'success' : 'warning'} size="sm">
                    {p.consented ? 'Consented' : 'Pending Consent'}
                  </Badge>
                  <Badge variant={p.status === 'active' ? 'success' : 'outline'} size="sm">
                    {p.status}
                  </Badge>
                  <Button variant="ghost" size="sm"><Edit className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </PanelSection>
      </Panel>

      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Consent Configuration" description="Configure consent requirements and evaluation protocols">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text">Require consent for all evaluations</p>
                  <p className="text-body-xs text-text-muted">Panelists must explicitly consent before each evaluation cycle</p>
                </div>
                <Switch checked={true} onCheckedChange={() => {}} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text">Allow panelist self-selection</p>
                  <p className="text-body-xs text-text-muted">Panelists choose which queries to evaluate</p>
                </div>
                <Switch checked={false} onCheckedChange={() => {}} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text">Blind evaluation mode</p>
                  <p className="text-body-xs text-text-muted">Hide brand identity from panelists during evaluation</p>
                </div>
                <Switch checked={true} onCheckedChange={() => {}} />
              </div>
            </div>
            <div className="space-y-4">
              <Input label="Minimum panelists per cycle" type="number" value="3" onChange={() => {}} helperText="Minimum consented panelists required" />
              <Input label="Evaluation deadline (days)" type="number" value="7" onChange={() => {}} helperText="Days to complete evaluation" />
              <Select
                label="Calibration method"
                value="conformal"
                onValueChange={() => {}}
              >
                <SelectItem value="conformal">Conformal Prediction (Recommended)</SelectItem>
                <SelectItem value="bootstrap">Bootstrap CI</SelectItem>
                <SelectItem value="bayesian">Bayesian Credible Intervals</SelectItem>
              </Select>
            </div>
          </div>
        </PanelSection>
      </Panel>
    </>
  );
}

function DialSettings() {
  return (
    <DialSliderCard
      value={1}
      onChange={() => {}}
      disabled={false}
      dryRunMode={true}
      onDryRunToggle={() => {}}
    />
  );
}

function IntegrationsSettings() {
  const integrations = [
    { name: 'GitHub', status: 'connected', description: 'Auto-create PRs for approved interventions', icon: Github },
    { name: 'GitLab', status: 'disconnected', description: 'Deploy interventions via merge requests', icon: Gitlab },
    { name: 'Cloudflare', status: 'connected', description: 'Edge workers for probe execution', icon: Cloud },
    { name: 'Slack', status: 'disconnected', description: 'Alert channel for demotion events', icon: MessageSquare },
    { name: 'Temporal', status: 'connected', description: 'Workflow orchestration backend', icon: Zap },
  ];

  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection title="Integrations" description="Connected services for automated intervention execution">
        <div className="space-y-3">
          {integrations.map((int) => (
            <div key={int.name} className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                  <int.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-text">{int.name}</p>
                  <p className="text-body-xs text-text-muted">{int.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={int.status === 'connected' ? 'success' : 'outline'} size="sm">
                  {int.status === 'connected' ? 'Connected' : 'Disconnected'}
                </Badge>
                <Button variant="ghost" size="sm">
                  {int.status === 'connected' ? 'Configure' : 'Connect'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PanelSection>
    </Panel>
  );
}

function NotificationsSettings() {
  return (
    <Panel variant="outlined" density="comfortable">
      <PanelSection title="Notification Preferences" description="Configure alerts for perception changes, demotions, and intervention events">
        <div className="space-y-4">
          {[
            { label: 'Autonomy dial demotion', desc: 'Alert when dial is auto-demoted on alert axis failure', enabled: true },
            { label: 'Perception conflict detected', desc: 'New conflicts between AI surfaces on entity attributes', enabled: true },
            { label: 'Proposal ready for review', desc: 'New intervention proposals awaiting approval', enabled: true },
            { label: 'Intervention execution complete', desc: 'Results from completed intervention deployments', enabled: true },
            { label: 'Measurement cycle finished', desc: 'New CIO corpus row with uplift measurements', enabled: true },
            { label: 'Consent panel evaluation ready', desc: 'Human evaluation tasks awaiting panelist response', enabled: false },
            { label: 'Weekly digest', desc: 'Summary of perception changes and intervention outcomes', enabled: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="font-medium text-text">{item.label}</p>
                <p className="text-body-xs text-text-muted">{item.desc}</p>
              </div>
              <Switch checked={item.enabled} onCheckedChange={() => {}} />
            </div>
          ))}
        </div>
      </PanelSection>
    </Panel>
  );
}

function BillingSettings() {
  return (
    <>
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Current Plan" description="Starter plan — $129/month">
          <div className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
            <div>
              <p className="font-semibold text-text">Starter</p>
              <p className="text-body-xs text-text-muted">$129/month • Billed monthly</p>
            </div>
            <Badge variant="success" size="sm">Active</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-center">
            <div className="p-4 bg-surface-muted/50 rounded-lg">
              <p className="text-heading-sm font-bold text-brand">129</p>
              <p className="text-body-xs text-text-muted">USD/month</p>
            </div>
            <div className="p-4 bg-surface-muted/50 rounded-lg">
              <p className="text-heading-sm font-bold text-text">5</p>
              <p className="text-body-xs text-text-muted">AI Surfaces</p>
            </div>
            <div className="p-4 bg-surface-muted/50 rounded-lg">
              <p className="text-heading-sm font-bold text-text">50</p>
              <p className="text-body-xs text-text-muted">Buyer Queries</p>
            </div>
            <div className="p-4 bg-surface-muted/50 rounded-lg">
              <p className="text-heading-sm font-bold text-text">Unlimited</p>
              <p className="text-body-xs text-text-muted">AtlasCycles</p>
            </div>
          </div>
          <div className="pt-4 border-t border-border flex justify-end">
            <Button variant="secondary" size="md">Manage Billing</Button>
          </div>
        </PanelSection>
      </Panel>

      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Usage This Month" description="Track your usage against plan limits">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <UsageMetric label="AtlasCycles" used={12} limit={null} />
            <UsageMetric label="Probes Executed" used={487} limit={10000} />
            <UsageMetric label="Interventions" used={8} limit={null} />
            <UsageMetric label="Panel Evaluations" used={24} limit={100} />
          </div>
        </PanelSection>
      </Panel>
    </>
  );
}

function TeamSettings() {
  const members = [
    { name: 'You (Owner)', email: 'founder@engenox.com', role: 'Owner', status: 'active' },
    { name: 'Team Member', email: 'member@company.com', role: 'Admin', status: 'active' },
  ];

  return (
    <Panel variant="outlined" density="comfortable" actions={
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        }>
      <PanelSection
        title="Team Members"
        description="Invite team members to collaborate on perception and interventions"
      >
        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-medium">
                  {m.name.split(' ')[0]?.[0] || ''}
                </div>
                <div>
                  <p className="font-medium text-text">{m.name}</p>
                  <p className="text-body-xs text-text-muted">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" size="sm">{m.role}</Badge>
                <Badge variant={m.status === 'active' ? 'success' : 'warning'} size="sm">{m.status}</Badge>
                <Button variant="ghost" size="sm"><Settings className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </PanelSection>
    </Panel>
  );
}

function AccountSettings() {
  return (
    <div className="space-y-6">
      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Profile" description="Your personal account settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input label="First Name" value="John" onChange={() => {}} />
              <Input label="Last Name" value="Doe" onChange={() => {}} />
              <Input label="Email" type="email" value="founder@engenox.com" onChange={() => {}} disabled={true} helperText="Email changes require verification" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-brand/10 flex items-center justify-center text-brand text-2xl font-bold">
                  JD
                </div>
                <Button variant="secondary" size="md">Change Avatar</Button>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-border flex justify-end">
            <Button variant="primary" size="md"><Save className="h-4 w-4 mr-2" /> Save Profile</Button>
          </div>
        </PanelSection>
      </Panel>

      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Security" description="Manage authentication and access">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="font-medium text-text">Two-Factor Authentication</p>
                <p className="text-body-xs text-text-muted">Add an extra layer of security to your account</p>
              </div>
              <Button variant="secondary" size="md">Enable 2FA</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="font-medium text-text">Password</p>
                <p className="text-body-xs text-text-muted">Last changed 30 days ago</p>
              </div>
              <Button variant="secondary" size="md">Change Password</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="font-medium text-text">Active Sessions</p>
                <p className="text-body-xs text-text-muted">Manage devices logged into your account</p>
              </div>
              <Button variant="secondary" size="md">View Sessions</Button>
            </div>
          </div>
        </PanelSection>
      </Panel>

      <Panel variant="outlined" density="comfortable">
        <PanelSection title="Danger Zone" description="Irreversible actions">
          <div className="flex items-center justify-between p-4 bg-critical/5 border border-critical/20 rounded-lg">
            <div>
              <p className="font-medium text-critical">Delete Account</p>
              <p className="text-body-xs text-text-muted">Permanently delete your account and all data. This cannot be undone.</p>
            </div>
            <Button variant="danger" size="md">Delete Account</Button>
          </div>
        </PanelSection>
      </Panel>
    </div>
  );
}

function UsageMetric({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percent = limit ? (used / limit) * 100 : null;
  return (
    <div className="p-4 bg-surface-muted/50 rounded-lg border border-border/50 text-center">
      <p className="text-body-xs text-text-muted">{label}</p>
      <p className="text-heading-lg font-bold text-text mt-1">{used.toLocaleString()}</p>
      {percent !== null && (
        <div className="mt-2">
          <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${Math.min(percent, 100)}%` }} />
          </div>
          <p className="text-body-xs text-text-muted mt-1">{Math.round(percent)}% of limit</p>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-surface-muted/50 rounded-lg" />}>
      <SettingsContent />
    </Suspense>
  );
}